#![allow(dead_code)]

mod bye_and_float;
mod color;
mod team_avoidance;
pub mod types;

pub use types::{Color, PairingResult, ScoreGroup, SwissPlayer};

use crate::{
    common::error::PawnError,
    competition::model::{GameResult, Pairing},
    participant::model::{Player, PlayerResult},
};
use std::collections::{BTreeMap, HashMap, HashSet};
use types::OrderedFloat;

/// FIDE-compliant Swiss pairing implementation
/// Based on FIDE Handbook C.04 Swiss Pairing Rules
pub struct SwissPairingEngine;

impl Default for SwissPairingEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl SwissPairingEngine {
    pub fn new() -> Self {
        Self
    }

    /// Generate FIDE-compliant Swiss pairings using the Dutch System
    pub fn generate_dutch_system_pairings(
        &self,
        players: Vec<Player>,
        player_results: Vec<PlayerResult>,
        game_history: Vec<GameResult>,
        round_number: i32,
    ) -> Result<PairingResult, PawnError> {
        tracing::info!(
            "Starting Dutch System pairing for {} players, round {}",
            players.len(),
            round_number
        );

        if players.is_empty() {
            return Ok(PairingResult {
                pairings: vec![],
                byes: vec![],
                float_count: 0,
                validation_errors: vec![],
            });
        }

        // Convert to Swiss players with enhanced data
        let mut swiss_players = self.build_swiss_players(players, player_results, game_history)?;

        // Apply accelerated pairing adjustments for early rounds
        if round_number <= 2 && swiss_players.len() >= 16 {
            self.apply_accelerated_pairings(&mut swiss_players, round_number);
        }

        // Form score groups
        let score_groups = self.form_score_groups(swiss_players);
        tracing::debug!("Formed {} score groups", score_groups.len());

        // Generate pairings using Dutch System algorithm
        let mut remaining_players = Vec::new();
        for group in score_groups {
            remaining_players.extend(group.players);
        }

        // Process players in score order (highest to lowest)
        remaining_players.sort_by(|a, b| {
            b.points
                .partial_cmp(&a.points)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| b.rating.cmp(&a.rating))
        });

        let mut paired_ids = HashSet::new();
        let mut board_number = 1;

        // Enhanced Dutch System algorithm with proper float management
        let pairings_result = self.process_score_groups_with_floats(
            &remaining_players,
            &mut paired_ids,
            &mut board_number,
            round_number,
        )?;

        // Validate pairings
        self.validate_pairings(
            &pairings_result.pairings,
            &pairings_result.validation_errors,
        );

        Ok(pairings_result)
    }

    /// Build Swiss players with enhanced data from game history
    fn build_swiss_players(
        &self,
        players: Vec<Player>,
        player_results: Vec<PlayerResult>,
        game_history: Vec<GameResult>,
    ) -> Result<Vec<SwissPlayer>, PawnError> {
        let results_map: HashMap<i32, &PlayerResult> = player_results
            .iter()
            .map(|result| (result.player.id, result))
            .collect();

        let mut swiss_players = Vec::new();

        for player in players {
            let points = results_map.get(&player.id).map(|r| r.points).unwrap_or(0.0);
            let rating = player.rating.unwrap_or(1200);

            let mut color_history = Vec::new();
            let mut opponents = HashSet::new();

            for game in &game_history {
                if game.white_player.id == player.id {
                    color_history.push(Color::White);
                    if game.black_player.id > 0 {
                        opponents.insert(game.black_player.id);
                    }
                } else if game.black_player.id == player.id {
                    color_history.push(Color::Black);
                    opponents.insert(game.white_player.id);
                }
            }

            let color_preference = self.calculate_color_preference(&color_history);

            swiss_players.push(SwissPlayer {
                player,
                points: points as f64,
                rating,
                color_history,
                opponents,
                color_preference,
                is_bye_eligible: true,
                float_history: Vec::new(),
            });
        }

        Ok(swiss_players)
    }

    /// Form score groups from players
    fn form_score_groups(&self, players: Vec<SwissPlayer>) -> Vec<ScoreGroup> {
        let mut groups_map: BTreeMap<OrderedFloat, Vec<SwissPlayer>> = BTreeMap::new();

        for player in players {
            groups_map
                .entry(OrderedFloat(player.points))
                .or_default()
                .push(player);
        }

        groups_map
            .into_iter()
            .rev()
            .map(|(points, mut players)| {
                players.sort_by(|a, b| b.rating.cmp(&a.rating));
                ScoreGroup {
                    points: points.0,
                    players,
                }
            })
            .collect()
    }

    /// Form score groups from a slice of players, excluding already paired
    fn form_score_groups_from_slice(
        &self,
        players: &[SwissPlayer],
        paired_ids: &HashSet<i32>,
    ) -> Vec<ScoreGroup> {
        let mut groups_map: BTreeMap<OrderedFloat, Vec<SwissPlayer>> = BTreeMap::new();

        for player in players {
            if !paired_ids.contains(&player.player.id) {
                groups_map
                    .entry(OrderedFloat(player.points))
                    .or_default()
                    .push(player.clone());
            }
        }

        groups_map
            .into_iter()
            .rev()
            .map(|(points, mut players)| {
                players.sort_by(|a, b| b.rating.cmp(&a.rating));
                ScoreGroup {
                    points: points.0,
                    players,
                }
            })
            .collect()
    }

    /// Process score groups with enhanced float management
    fn process_score_groups_with_floats(
        &self,
        all_players: &[SwissPlayer],
        paired_ids: &mut HashSet<i32>,
        board_number: &mut i32,
        round_number: i32,
    ) -> Result<PairingResult, PawnError> {
        let mut pairings = Vec::new();
        let mut byes = Vec::new();
        let mut float_count = 0;
        let max_floats_allowed = self.calculate_max_floats(all_players.len(), round_number);

        let mut score_groups = self.form_score_groups_from_slice(all_players, paired_ids);
        let mut floated_players: HashSet<i32> = HashSet::new();

        // First pass: handle single-player groups by floating them strategically
        let mut players_to_float = Vec::new();
        for (group_index, score_group) in score_groups.iter().enumerate() {
            tracing::debug!(
                "Score group {} has {} players: {:?}",
                group_index,
                score_group.players.len(),
                score_group
                    .players
                    .iter()
                    .map(|p| p.player.name.clone())
                    .collect::<Vec<_>>()
            );
            if score_group.players.len() == 1 {
                let player_to_float = &score_group.players[0];
                tracing::debug!(
                    "Single player group {}: {}",
                    group_index,
                    player_to_float.player.name
                );

                let mut best_target = None;
                let mut _float_found = false;

                // Try to find a group with odd number of players (to make it even)
                for (next_group_index, next_group) in
                    score_groups.iter().enumerate().skip(group_index + 1)
                {
                    if next_group.players.len() % 2 == 1 {
                        let can_pair = next_group
                            .players
                            .iter()
                            .any(|p| !player_to_float.opponents.contains(&p.player.id));

                        if can_pair {
                            best_target = Some(next_group_index);
                            _float_found = true;
                            break;
                        }
                    }
                }

                // Try floating up to previous groups with odd number of players
                if !_float_found {
                    for prev_group_index in (0..group_index).rev() {
                        if score_groups[prev_group_index].players.len() % 2 == 1 {
                            let can_pair = score_groups[prev_group_index]
                                .players
                                .iter()
                                .any(|p| !player_to_float.opponents.contains(&p.player.id));

                            if can_pair {
                                best_target = Some(prev_group_index);
                                _float_found = true;
                                break;
                            }
                        }
                    }
                }

                // If no odd groups found, try even groups (down first, then up)
                if !_float_found {
                    for (next_group_index, next_group) in
                        score_groups.iter().enumerate().skip(group_index + 1)
                    {
                        if !next_group.players.is_empty() {
                            let can_pair = next_group
                                .players
                                .iter()
                                .any(|p| !player_to_float.opponents.contains(&p.player.id));

                            if can_pair {
                                best_target = Some(next_group_index);
                                _float_found = true;
                                break;
                            }
                        }
                    }
                }

                // Try floating up to previous groups with even number of players
                if !_float_found {
                    for prev_group_index in (0..group_index).rev() {
                        if !score_groups[prev_group_index].players.is_empty() {
                            let can_pair = score_groups[prev_group_index]
                                .players
                                .iter()
                                .any(|p| !player_to_float.opponents.contains(&p.player.id));

                            if can_pair {
                                best_target = Some(prev_group_index);
                                _float_found = true;
                                break;
                            }
                        }
                    }
                }

                if let Some(target_group) = best_target {
                    players_to_float.push((group_index, target_group, player_to_float.clone()));
                } else {
                    tracing::debug!(
                        "No float target found for player {}, will get bye",
                        player_to_float.player.name
                    );
                }
            }
        }

        // Apply the floats
        for (from_group, to_group, player_to_float) in players_to_float {
            tracing::debug!(
                "Floating player {} from group {} to group {}",
                player_to_float.player.name,
                from_group,
                to_group
            );

            score_groups[to_group].players.push(player_to_float.clone());
            score_groups[from_group].players.clear();
            floated_players.insert(player_to_float.player.id);
            float_count += 1;
        }

        for (group_index, score_group) in score_groups.iter_mut().enumerate() {
            tracing::debug!(
                "Processing score group {} with {} points, {} players",
                group_index,
                score_group.points,
                score_group.players.len()
            );

            // Handle odd group size with byes
            if score_group.players.len() % 2 == 1 {
                if let Some(bye_player) = self.select_bye_player(&score_group.players) {
                    let bye_player_id = bye_player.player.id;
                    let bye_player_name = bye_player.player.name.clone();
                    byes.push(bye_player.clone());
                    score_group.players.retain(|p| p.player.id != bye_player_id);
                    tracing::debug!(
                        "Assigned bye to: {} in group {}",
                        bye_player_name,
                        group_index
                    );
                }
            }

            // Pair players within the group
            tracing::debug!(
                "Pairing group {} with {} players",
                group_index,
                score_group.players.len()
            );
            for (i, player) in score_group.players.iter().enumerate() {
                tracing::debug!(
                    "  Player {}: {} (opponents: {:?})",
                    i,
                    player.player.name,
                    player.opponents
                );
            }
            let group_pairings = self.pair_score_group(&mut score_group.players, board_number)?;
            tracing::debug!(
                "Group {} generated {} pairings",
                group_index,
                group_pairings.len()
            );

            // Mark players as paired
            for pairing in &group_pairings {
                paired_ids.insert(pairing.white_player.id);
                if let Some(ref black_player) = pairing.black_player {
                    paired_ids.insert(black_player.id);
                }
            }

            pairings.extend(group_pairings);
        }

        // Validate FIDE compliance
        let mut validation_errors = vec![];

        if let Err(e) = self.validate_fide_float_limits(
            float_count,
            max_floats_allowed,
            round_number,
            all_players.len(),
        ) {
            validation_errors.push(e.to_string());
            tracing::warn!("FIDE float validation failed: {}", e);
        }

        if let Err(e) = self.validate_fide_color_sequences(&pairings, all_players, round_number) {
            validation_errors.push(e.to_string());
            tracing::warn!("FIDE color sequence validation failed: {}", e);
        }

        if let Err(e) = self.validate_fide_team_avoidance(&pairings, all_players, round_number) {
            validation_errors.push(e.to_string());
            tracing::warn!("FIDE team avoidance validation failed: {}", e);
        }

        Ok(PairingResult {
            pairings,
            byes,
            float_count,
            validation_errors,
        })
    }

    /// Pair players within a score group using optimal matching
    fn pair_score_group(
        &self,
        players: &mut [SwissPlayer],
        board_number: &mut i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        let mut pairings = Vec::new();
        let mut used_indices = HashSet::new();

        println!("DEBUG: Pairing {} players with opponents:", players.len());
        for (i, player) in players.iter().enumerate() {
            println!(
                "  Player {}: {} (opponents: {:?})",
                i, player.player.name, player.opponents
            );
        }

        // Try different pairing strategies to maximize pairings
        let initial_pairings =
            self.generate_greedy_pairings(players, &mut used_indices, board_number);

        // If greedy approach leaves many players unpaired, try alternative strategies
        let unpaired_count = players.len() - (used_indices.len());
        if unpaired_count >= 2 {
            let alt_pairings = self.generate_alternative_pairings(players, board_number);
            if alt_pairings.len() > initial_pairings.len() {
                println!(
                    "DEBUG: Using alternative pairing strategy ({} vs {} pairings)",
                    alt_pairings.len(),
                    initial_pairings.len()
                );
                return Ok(alt_pairings);
            }
        }

        pairings.extend(initial_pairings);

        Ok(pairings)
    }

    /// Generate pairings using greedy approach
    fn generate_greedy_pairings(
        &self,
        players: &[SwissPlayer],
        used_indices: &mut HashSet<usize>,
        board_number: &mut i32,
    ) -> Vec<Pairing> {
        let mut pairings = Vec::new();

        for i in 0..players.len() {
            if used_indices.contains(&i) {
                continue;
            }

            let mut best_opponent_idx = None;
            let mut best_score = f64::NEG_INFINITY;

            for j in (i + 1)..players.len() {
                if used_indices.contains(&j) {
                    continue;
                }

                if players[i].opponents.contains(&players[j].player.id) {
                    println!(
                        "DEBUG: Skipping rematch: {} vs {}",
                        players[i].player.name, players[j].player.name
                    );
                    continue;
                }

                let pairing_score = self.calculate_pairing_score(&players[i], &players[j]);
                println!(
                    "DEBUG: Pairing score for {} vs {}: {}",
                    players[i].player.name, players[j].player.name, pairing_score
                );

                if pairing_score > best_score {
                    best_score = pairing_score;
                    best_opponent_idx = Some(j);
                }
            }

            if let Some(j) = best_opponent_idx {
                used_indices.insert(i);
                used_indices.insert(j);

                let (white_player, black_player) = self.assign_colors(&players[i], &players[j]);

                println!(
                    "DEBUG: Creating pairing: {} vs {}",
                    white_player.player.name, black_player.player.name
                );
                pairings.push(Pairing {
                    white_player: white_player.player.clone(),
                    black_player: Some(black_player.player.clone()),
                    board_number: *board_number,
                });

                *board_number += 1;
                tracing::debug!(
                    "Paired: {} (W) vs {} (B)",
                    white_player.player.name,
                    black_player.player.name
                );
            }
        }

        pairings
    }

    /// Generate alternative pairings to maximize total pairings
    fn generate_alternative_pairings(
        &self,
        players: &[SwissPlayer],
        board_number: &mut i32,
    ) -> Vec<Pairing> {
        let mut pairings = Vec::new();
        let mut used_indices = HashSet::new();

        // Build a graph of valid pairings with priority
        let mut valid_pairings = Vec::new();
        for i in 0..players.len() {
            for j in (i + 1)..players.len() {
                if !players[i].opponents.contains(&players[j].player.id) {
                    let constraint_score = players[i].opponents.len() + players[j].opponents.len();
                    valid_pairings.push((i, j, constraint_score));
                }
            }
        }

        // Sort by constraint score (higher = more constrained players first)
        valid_pairings.sort_by(|a, b| b.2.cmp(&a.2));

        for (i, j, _) in valid_pairings {
            if used_indices.contains(&i) || used_indices.contains(&j) {
                continue;
            }

            used_indices.insert(i);
            used_indices.insert(j);

            let (white_player, black_player) = self.assign_colors(&players[i], &players[j]);

            println!(
                "DEBUG: Alternative pairing: {} vs {}",
                white_player.player.name, black_player.player.name
            );
            pairings.push(Pairing {
                white_player: white_player.player.clone(),
                black_player: Some(black_player.player.clone()),
                board_number: *board_number,
            });

            *board_number += 1;
        }

        pairings
    }

    /// Calculate pairing quality score for two players with enhanced weighted factors
    fn calculate_pairing_score(&self, player1: &SwissPlayer, player2: &SwissPlayer) -> f64 {
        let mut score = 1000.0;

        // 1. Rating difference penalty
        let rating_diff = (player1.rating - player2.rating).abs() as f64;
        let rating_penalty = (rating_diff / 50.0).min(100.0);
        score -= rating_penalty;

        // 2. Color preference compatibility (highest priority)
        let color_compatibility = self.calculate_color_compatibility(player1, player2);
        score += color_compatibility * 200.0;

        // 3. Previous opponents penalty (absolute blocker)
        if player1.opponents.contains(&player2.player.id) {
            score -= 10000.0;
        }

        // 3.5. Team/federation avoidance
        let team_penalty = self.calculate_team_avoidance_penalty(player1, player2);
        score += team_penalty;

        // 4. Points difference penalty
        let points_diff = (player1.points - player2.points).abs();
        if points_diff > 0.5 {
            score -= points_diff * 50.0;
        }

        // 5. Float history consideration
        let float_penalty = self.calculate_float_penalty(player1, player2);
        score -= float_penalty;

        // 6. Bye history consideration
        let bye_bonus = self.calculate_bye_bonus(player1, player2);
        score += bye_bonus;

        // 7. Tournament standing considerations
        let standing_factor = self.calculate_standing_factor(player1, player2);
        score += standing_factor;

        score
    }

    /// Calculate penalty for players who have floated frequently
    fn calculate_float_penalty(&self, _player1: &SwissPlayer, _player2: &SwissPlayer) -> f64 {
        // TODO: Implement float history tracking
        0.0
    }

    /// Calculate bonus for players who haven't had byes recently
    fn calculate_bye_bonus(&self, _player1: &SwissPlayer, _player2: &SwissPlayer) -> f64 {
        // TODO: Implement bye history tracking
        0.0
    }

    /// Calculate factor based on tournament standings to promote variety
    fn calculate_standing_factor(&self, player1: &SwissPlayer, player2: &SwissPlayer) -> f64 {
        let rating_diff = (player1.rating - player2.rating).abs() as f64;
        if rating_diff > 100.0 && rating_diff < 400.0 {
            10.0
        } else {
            0.0
        }
    }

    /// Validate the generated pairings for FIDE compliance
    fn validate_pairings(&self, _pairings: &[Pairing], errors: &[String]) -> bool {
        errors.is_empty()
    }
}
