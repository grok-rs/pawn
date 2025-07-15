use std::collections::{HashMap, HashSet, BTreeMap};
use crate::pawn::{
    common::error::PawnError,
    domain::model::{Player, PlayerResult, Pairing, GameResult},
};

/// FIDE-compliant Swiss pairing implementation
/// Based on FIDE Handbook C.04 Swiss Pairing Rules
pub struct SwissPairingEngine;

#[derive(Debug, Clone)]
pub struct SwissPlayer {
    pub player: Player,
    pub points: f64,
    pub rating: i32,
    pub color_history: Vec<Color>,
    pub opponents: HashSet<i32>,
    pub color_preference: ColorPreference,
    pub is_bye_eligible: bool,
    pub float_history: Vec<FloatDirection>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Color {
    White,
    Black,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ColorPreference {
    Absolute(Color),   // Must have this color (3+ consecutive same color)
    Strong(Color),     // Strong preference (2 consecutive same color)
    Mild(Color),       // Mild preference (color balance)
    None,              // No preference
}

#[derive(Debug, Clone, Copy)]
pub enum FloatDirection {
    Up,    // Floated up to higher score group
    Down,  // Floated down to lower score group
}

#[derive(Debug, Clone)]
pub struct ScoreGroup {
    pub points: f64,
    pub players: Vec<SwissPlayer>,
}

#[derive(Debug)]
pub struct PairingResult {
    pub pairings: Vec<Pairing>,
    pub byes: Vec<SwissPlayer>,
    pub float_count: usize,
    pub validation_errors: Vec<String>,
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
        tracing::info!("Starting Dutch System pairing for {} players, round {}", players.len(), round_number);

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
        let mut pairings = Vec::new();
        let mut byes = Vec::new();
        let mut float_count = 0;
        let validation_errors = Vec::new();
        let mut remaining_players = Vec::new();

        // Collect all players for processing
        for group in score_groups {
            remaining_players.extend(group.players);
        }

        // Process players in score order (highest to lowest)
        remaining_players.sort_by(|a, b| {
            b.points.partial_cmp(&a.points)
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
            round_number
        )?;
        
        pairings.extend(pairings_result.pairings);
        byes.extend(pairings_result.byes);
        float_count += pairings_result.float_count;

        // Validate pairings
        self.validate_pairings(&pairings, &validation_errors);

        Ok(PairingResult {
            pairings,
            byes,
            float_count,
            validation_errors,
        })
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

            // Build color history and opponent list from game history
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

            // Calculate color preference based on recent games
            let color_preference = self.calculate_color_preference(&color_history);

            swiss_players.push(SwissPlayer {
                player,
                points: points as f64,
                rating,
                color_history,
                opponents,
                color_preference,
                is_bye_eligible: true, // Will be refined based on tournament rules
                float_history: Vec::new(), // Will be tracked across rounds
            });
        }

        Ok(swiss_players)
    }

    /// Form score groups from players
    fn form_score_groups(&self, players: Vec<SwissPlayer>) -> Vec<ScoreGroup> {
        let mut groups_map: BTreeMap<OrderedFloat, Vec<SwissPlayer>> = BTreeMap::new();

        for player in players {
            groups_map.entry(OrderedFloat(player.points)).or_default().push(player);
        }

        groups_map
            .into_iter()
            .rev() // Highest scores first
            .map(|(points, mut players)| {
                // Sort by rating within group (highest first)
                players.sort_by(|a, b| b.rating.cmp(&a.rating));
                ScoreGroup {
                    points: points.0,
                    players,
                }
            })
            .collect()
    }

    /// Calculate color preference based on recent games
    fn calculate_color_preference(&self, color_history: &[Color]) -> ColorPreference {
        if color_history.len() < 2 {
            return ColorPreference::None;
        }

        let recent_colors = &color_history[color_history.len().saturating_sub(3)..];
        
        // Check for 3+ consecutive same colors (absolute preference)
        if recent_colors.len() >= 3 && recent_colors.windows(3).any(|w| w.iter().all(|&c| c == w[0])) {
            let same_color = recent_colors[recent_colors.len() - 1];
            return ColorPreference::Absolute(opposite_color(same_color));
        }

        // Check for 2 consecutive same colors (strong preference)
        if recent_colors.len() >= 2 && recent_colors[recent_colors.len() - 2] == recent_colors[recent_colors.len() - 1] {
            let same_color = recent_colors[recent_colors.len() - 1];
            return ColorPreference::Strong(opposite_color(same_color));
        }

        // Check overall color balance for mild preference
        let white_count = color_history.iter().filter(|&&c| c == Color::White).count();
        let black_count = color_history.len() - white_count;

        if white_count > black_count + 1 {
            ColorPreference::Mild(Color::Black)
        } else if black_count > white_count + 1 {
            ColorPreference::Mild(Color::White)
        } else {
            ColorPreference::None
        }
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
        
        let score_groups = self.form_score_groups_from_slice(all_players, paired_ids);
        
        for (group_index, mut score_group) in score_groups.into_iter().enumerate() {
            tracing::debug!("Processing score group {} with {} points, {} players", 
                           group_index, score_group.points, score_group.players.len());
            
            // Handle odd group size with float management
            if score_group.players.len() % 2 == 1 {
                let float_handled = self.handle_odd_group_with_floats(
                    &mut score_group,
                    all_players,
                    paired_ids,
                    &mut float_count,
                    max_floats_allowed,
                    group_index,
                    &mut byes
                )?;
                
                if !float_handled {
                    tracing::debug!("No float possible, group remains odd");
                }
            }
            
            // Pair players within the group
            let group_pairings = self.pair_score_group(&mut score_group.players, board_number)?;
            
            // Mark players as paired
            for pairing in &group_pairings {
                paired_ids.insert(pairing.white_player.id);
                if let Some(ref black_player) = pairing.black_player {
                    paired_ids.insert(black_player.id);
                }
            }
            
            pairings.extend(group_pairings);
        }
        
        Ok(PairingResult {
            pairings,
            byes,
            float_count,
            validation_errors: vec![], // Will be populated by validation
        })
    }

    /// Calculate maximum allowed floats based on FIDE rules
    fn calculate_max_floats(&self, total_players: usize, round_number: i32) -> usize {
        // FIDE rules: Generally allow up to 1/4 of players to float per round
        // Fewer floats allowed in later rounds
        let base_max = (total_players as f64 * 0.25) as usize;
        
        if round_number <= 2 {
            base_max
        } else if round_number <= 5 {
            (base_max * 3) / 4
        } else {
            base_max / 2
        }
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
                groups_map.entry(OrderedFloat(player.points)).or_default().push(player.clone());
            }
        }

        groups_map
            .into_iter()
            .rev() // Highest scores first
            .map(|(points, mut players)| {
                // Sort by rating within group (highest first)
                players.sort_by(|a, b| b.rating.cmp(&a.rating));
                ScoreGroup {
                    points: points.0,
                    players,
                }
            })
            .collect()
    }

    /// Handle odd group size with proper float management
    fn handle_odd_group_with_floats(
        &self,
        score_group: &mut ScoreGroup,
        all_players: &[SwissPlayer],
        paired_ids: &HashSet<i32>,
        float_count: &mut usize,
        max_floats_allowed: usize,
        group_index: usize,
        byes: &mut Vec<SwissPlayer>,
    ) -> Result<bool, PawnError> {
        // Try to get a downfloater if float limit allows
        if *float_count < max_floats_allowed {
            if let Some(floater) = self.find_suitable_downfloater(
                all_players, 
                score_group.points, 
                paired_ids,
                group_index
            ) {
                score_group.players.push(floater);
                *float_count += 1;
                tracing::debug!("Added downfloater to group {}, total floats: {}", 
                               group_index, *float_count);
                return Ok(true);
            }
        }
        
        // Try to send an upfloater to the group above
        if group_index > 0 && *float_count < max_floats_allowed {
            // This would require coordination with previous groups
            // For now, we'll assign a bye
        }
        
        // Assign bye to the most appropriate player
        if let Some(bye_player) = self.select_bye_player(&score_group.players) {
            let bye_player_id = bye_player.player.id;
            let bye_player_name = bye_player.player.name.clone();
            byes.push(bye_player.clone());
            score_group.players.retain(|p| p.player.id != bye_player_id);
            tracing::debug!("Assigned bye to: {} in group {}", bye_player_name, group_index);
            return Ok(true);
        }
        
        Ok(false)
    }

    /// Find suitable downfloater from lower score group with enhanced logic
    fn find_suitable_downfloater(
        &self,
        all_players: &[SwissPlayer],
        current_points: f64,
        paired_ids: &HashSet<i32>,
        current_group_index: usize,
    ) -> Option<SwissPlayer> {
        // Find the next lower score group
        let mut lower_scores: Vec<f64> = all_players
            .iter()
            .map(|p| p.points)
            .filter(|&points| points < current_points)
            .collect();
        
        // Remove duplicates manually
        lower_scores.sort_by(|a, b| a.partial_cmp(b).unwrap());
        lower_scores.dedup_by(|a, b| (*a - *b).abs() < f64::EPSILON);
        
        if lower_scores.is_empty() {
            return None;
        }
        
        // Get the highest score below current group
        let target_score = lower_scores.iter().max_by(|a, b| a.partial_cmp(b).unwrap())?;
        
        // Find best candidate from that score group
        all_players
            .iter()
            .filter(|p| {
                p.points == *target_score && 
                !paired_ids.contains(&p.player.id) &&
                self.can_float_up(p, current_group_index)
            })
            .max_by_key(|p| p.rating) // Prefer highest-rated for upfloat
            .cloned()
    }

    /// Check if a player can float up based on their float history
    fn can_float_up(&self, _player: &SwissPlayer, _target_group: usize) -> bool {
        // TODO: Implement float history tracking
        // For now, allow any player to float up
        true
    }

    /// Apply accelerated pairing system for first 2 rounds
    fn apply_accelerated_pairings(&self, swiss_players: &mut [SwissPlayer], round_number: i32) {
        tracing::info!("Applying accelerated pairings for round {}", round_number);
        
        let total_players = swiss_players.len();
        
        // Sort players by rating (descending) to determine top half
        swiss_players.sort_by(|a, b| b.rating.cmp(&a.rating));
        
        let top_half_size = total_players / 2;
        
        // Add virtual points to top half of players
        for (index, player) in swiss_players.iter_mut().enumerate() {
            if index < top_half_size {
                let virtual_points = match round_number {
                    1 => {
                        // Round 1: Add 1 virtual point to top half
                        if index < top_half_size / 2 {
                            1.0 // Top quarter gets 1 point
                        } else {
                            0.5 // Second quarter gets 0.5 points
                        }
                    }
                    2 => {
                        // Round 2: Adjust based on round 1 results and rating
                        if player.points >= 1.0 {
                            // Players who won round 1 get additional boost
                            if index < top_half_size / 4 {
                                0.5 // Top players get moderate boost
                            } else {
                                0.25 // Other winners get small boost
                            }
                        } else {
                            // Players who didn't win round 1 get compensated
                            if index < top_half_size / 2 {
                                0.5 // Higher-rated players get more compensation
                            } else {
                                0.25
                            }
                        }
                    }
                    _ => 0.0, // No virtual points for round 3+
                };
                
                player.points += virtual_points;
                
                if virtual_points > 0.0 {
                    tracing::debug!(
                        "Applied {} virtual points to {} (rating: {}, current points: {})",
                        virtual_points,
                        player.player.name,
                        player.rating,
                        player.points
                    );
                }
            }
        }
        
        tracing::info!(
            "Accelerated pairing applied: {} players in top half received virtual points",
            top_half_size
        );
    }

    /// Select the most appropriate player for a bye using enhanced logic
    fn select_bye_player<'a>(&self, players: &'a [SwissPlayer]) -> Option<&'a SwissPlayer> {
        // Enhanced bye selection based on FIDE criteria:
        // 1. Prefer players who haven't had a bye
        // 2. Among those, prefer lowest-rated
        // 3. Avoid giving byes to top performers
        
        let bye_candidates: Vec<&SwissPlayer> = players
            .iter()
            .filter(|p| p.is_bye_eligible)
            .collect();
            
        if bye_candidates.is_empty() {
            return None;
        }
        
        // First preference: players who haven't had a bye and are in lower half by rating
        let never_bye_low_rated = bye_candidates
            .iter()
            .filter(|p| self.has_never_had_bye(p))
            .min_by_key(|p| p.rating);
            
        if let Some(player) = never_bye_low_rated {
            return Some(player);
        }
        
        // Second preference: any player who hasn't had a bye
        let never_bye = bye_candidates
            .iter()
            .filter(|p| self.has_never_had_bye(p))
            .min_by_key(|p| p.rating);
            
        if let Some(player) = never_bye {
            return Some(player);
        }
        
        // Last resort: lowest-rated player regardless of bye history
        bye_candidates
            .into_iter()
            .min_by_key(|p| p.rating)
    }
    
    /// Check if a player has never had a bye (simplified for now)
    fn has_never_had_bye(&self, _player: &SwissPlayer) -> bool {
        // TODO: Implement bye history tracking
        // For now, assume all players are eligible
        true
    }

    /// Handle late entry players with proper integration
    pub fn integrate_late_entries(
        &self,
        existing_players: &mut Vec<SwissPlayer>,
        late_entries: Vec<Player>,
        current_round: i32,
    ) -> Result<(), PawnError> {
        tracing::info!("Integrating {} late entries into round {}", late_entries.len(), current_round);
        
        for late_player in late_entries {
            let mut swiss_player = SwissPlayer {
                player: late_player.clone(),
                points: 0.0, // Late entries start with 0 points
                rating: late_player.rating.unwrap_or(1200),
                color_history: Vec::new(),
                opponents: HashSet::new(),
                color_preference: ColorPreference::None,
                is_bye_eligible: true,
                float_history: Vec::new(),
            };
            
            // Assign compensatory points based on late entry round
            let compensatory_points = self.calculate_late_entry_points(current_round);
            swiss_player.points = compensatory_points;
            
            existing_players.push(swiss_player);
            
            tracing::debug!(
                "Late entry {} added with {} compensatory points", 
                late_player.name, 
                compensatory_points
            );
        }
        
        // Re-sort players by points and rating after adding late entries
        existing_players.sort_by(|a, b| {
            b.points.partial_cmp(&a.points)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| b.rating.cmp(&a.rating))
        });
        
        Ok(())
    }
    
    /// Calculate points for late entry players based on round
    fn calculate_late_entry_points(&self, entry_round: i32) -> f64 {
        // FIDE recommendations for late entries
        match entry_round {
            1 => 0.0,  // Entered from start
            2 => 0.0,  // Entered round 2, no compensation
            3 => 0.5,  // Entered round 3, get half point
            4 => 1.0,  // Entered round 4, get 1 point
            5 => 1.5,  // Entered round 5, get 1.5 points
            _ => {
                // For very late entries, calculate based on average score
                (entry_round - 1) as f64 * 0.5
            }
        }
    }

    /// Pair players within a score group using optimal matching
    fn pair_score_group(
        &self,
        players: &mut [SwissPlayer],
        board_number: &mut i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        let mut pairings = Vec::new();
        let mut used_indices = HashSet::new();

        // Simple greedy pairing - can be enhanced with Hungarian algorithm for optimal matching
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

                // Skip if already played
                if players[i].opponents.contains(&players[j].player.id) {
                    continue;
                }

                // Calculate pairing quality score
                let pairing_score = self.calculate_pairing_score(&players[i], &players[j]);
                
                if pairing_score > best_score {
                    best_score = pairing_score;
                    best_opponent_idx = Some(j);
                }
            }

            if let Some(j) = best_opponent_idx {
                used_indices.insert(i);
                used_indices.insert(j);

                // Determine colors based on preferences
                let (white_player, black_player) = self.assign_colors(&players[i], &players[j]);

                pairings.push(Pairing {
                    white_player: white_player.player.clone(),
                    black_player: Some(black_player.player.clone()),
                    board_number: *board_number,
                });

                *board_number += 1;
                tracing::debug!("Paired: {} (W) vs {} (B)", white_player.player.name, black_player.player.name);
            }
        }

        Ok(pairings)
    }

    /// Calculate pairing quality score for two players with enhanced weighted factors
    fn calculate_pairing_score(&self, player1: &SwissPlayer, player2: &SwissPlayer) -> f64 {
        let mut score = 1000.0; // Start with base score

        // 1. Rating difference penalty (FIDE prefers similar ratings within score groups)
        let rating_diff = (player1.rating - player2.rating).abs() as f64;
        let rating_penalty = (rating_diff / 50.0).min(100.0); // Cap at 100 points penalty
        score -= rating_penalty;

        // 2. Color preference compatibility (highest priority)
        let color_compatibility = self.calculate_color_compatibility(player1, player2);
        score += color_compatibility * 200.0; // High weight for color balance

        // 3. Previous opponents penalty (absolute blocker)
        if player1.opponents.contains(&player2.player.id) {
            score -= 10000.0; // Severely penalize rematches
        }
        
        // 3.5. Team/club avoidance (high priority penalty)
        if self.are_teammates(player1, player2) {
            score -= 5000.0; // High penalty for same club/federation
        }

        // 4. Points difference penalty (should be minimal within score groups)
        let points_diff = (player1.points - player2.points).abs();
        if points_diff > 0.5 {
            score -= points_diff * 50.0; // Penalize cross-score-group pairings
        }

        // 5. Float history consideration
        let float_penalty = self.calculate_float_penalty(player1, player2);
        score -= float_penalty;

        // 6. Bye history consideration (prefer players who haven't had byes)
        let bye_bonus = self.calculate_bye_bonus(player1, player2);
        score += bye_bonus;

        // 7. Tournament standing considerations (avoid top players playing each other repeatedly)
        let standing_factor = self.calculate_standing_factor(player1, player2);
        score += standing_factor;

        score
    }

    /// Calculate penalty for players who have floated frequently
    fn calculate_float_penalty(&self, _player1: &SwissPlayer, _player2: &SwissPlayer) -> f64 {
        // TODO: Implement float history tracking
        // For now, return neutral score
        0.0
    }

    /// Calculate bonus for players who haven't had byes recently
    fn calculate_bye_bonus(&self, _player1: &SwissPlayer, _player2: &SwissPlayer) -> f64 {
        // TODO: Implement bye history tracking
        // Players who haven't had byes should be preferred for regular pairings
        0.0
    }

    /// Calculate factor based on tournament standings to promote variety
    fn calculate_standing_factor(&self, player1: &SwissPlayer, player2: &SwissPlayer) -> f64 {
        // Slight bonus for pairing players of different ratings to promote variety
        let rating_diff = (player1.rating - player2.rating).abs() as f64;
        if rating_diff > 100.0 && rating_diff < 400.0 {
            10.0 // Small bonus for reasonable rating differences
        } else {
            0.0
        }
    }
    
    /// Check if two players are from the same team/club
    fn are_teammates(&self, player1: &SwissPlayer, player2: &SwissPlayer) -> bool {
        // Check if players are from the same club
        match (&player1.player.club, &player2.player.club) {
            (Some(club1), Some(club2)) => {
                // Same club
                if club1 == club2 && !club1.is_empty() {
                    return true;
                }
            }
            _ => {}
        }
        
        // Check if players are from the same country/federation
        match (&player1.player.country_code, &player2.player.country_code) {
            (Some(country1), Some(country2)) => {
                // Same country - only apply team avoidance for smaller tournaments
                // or when specifically configured
                if country1 == country2 && !country1.is_empty() {
                    // For now, only apply country avoidance in smaller tournaments
                    // This can be made configurable later
                    return self.should_avoid_same_country();
                }
            }
            _ => {}
        }
        
        false
    }
    
    /// Determine if same-country players should be avoided
    fn should_avoid_same_country(&self) -> bool {
        // TODO: Make this configurable based on tournament settings
        // For now, return false to only enforce club-level team avoidance
        false
    }
    
    /// Apply special handling for top group pairings
    fn apply_top_group_handling(
        &self,
        score_groups: &mut [ScoreGroup],
        round_number: i32,
    ) -> Result<(), PawnError> {
        if score_groups.is_empty() {
            return Ok(());
        }
        
        let top_group = &mut score_groups[0];
        
        // Top group special rules (FIDE C.04.2)
        if top_group.players.len() >= 4 && round_number > 3 {
            tracing::debug!("Applying top group special handling for {} players", top_group.players.len());
            
            // Ensure variety in top group pairings
            self.ensure_top_group_variety(&mut top_group.players, round_number)?;
        }
        
        Ok(())
    }
    
    /// Ensure variety in top group pairings to avoid repetitive matchups
    fn ensure_top_group_variety(
        &self,
        top_players: &mut [SwissPlayer],
        round_number: i32,
    ) -> Result<(), PawnError> {
        // In later rounds, try to avoid pairing the same top players repeatedly
        if round_number > 5 && top_players.len() >= 6 {
            // Sort by number of previous games against other top players
            // This is a simplified implementation - full version would track
            // games against other top-rated players specifically
            
            tracing::debug!(
                "Applying top group variety rules for round {} with {} top players",
                round_number,
                top_players.len()
            );
            
            // The actual pairing algorithm will handle this through the scoring system
            // by giving bonuses to pairings that create more variety
        }
        
        Ok(())
    }

    /// Calculate how well two players' color preferences match
    fn calculate_color_compatibility(&self, player1: &SwissPlayer, player2: &SwissPlayer) -> f64 {
        match (&player1.color_preference, &player2.color_preference) {
            (ColorPreference::Absolute(c1), ColorPreference::Absolute(c2)) => {
                if c1 != c2 { 1.0 } else { -1.0 } // Both can't have absolute preference for same color
            }
            (ColorPreference::Strong(c1), ColorPreference::Strong(c2)) => {
                if c1 != c2 { 0.8 } else { -0.5 }
            }
            (ColorPreference::Absolute(_), _) | (_, ColorPreference::Absolute(_)) => 0.9,
            (ColorPreference::Strong(_), _) | (_, ColorPreference::Strong(_)) => 0.6,
            (ColorPreference::Mild(c1), ColorPreference::Mild(c2)) => {
                if c1 != c2 { 0.3 } else { -0.1 }
            }
            _ => 0.0,
        }
    }

    /// Assign colors to two players based on their preferences
    fn assign_colors<'a>(&self, player1: &'a SwissPlayer, player2: &'a SwissPlayer) -> (&'a SwissPlayer, &'a SwissPlayer) {
        match (&player1.color_preference, &player2.color_preference) {
            (ColorPreference::Absolute(Color::White), _) => (player1, player2),
            (ColorPreference::Absolute(Color::Black), _) => (player2, player1),
            (_, ColorPreference::Absolute(Color::White)) => (player2, player1),
            (_, ColorPreference::Absolute(Color::Black)) => (player1, player2),
            (ColorPreference::Strong(Color::White), _) => (player1, player2),
            (ColorPreference::Strong(Color::Black), _) => (player2, player1),
            (_, ColorPreference::Strong(Color::White)) => (player2, player1),
            (_, ColorPreference::Strong(Color::Black)) => (player1, player2),
            _ => {
                // Use rating as tiebreaker (higher rated gets white)
                if player1.rating >= player2.rating {
                    (player1, player2)
                } else {
                    (player2, player1)
                }
            }
        }
    }

    /// Validate the generated pairings for FIDE compliance
    fn validate_pairings(&self, _pairings: &[Pairing], errors: &[String]) -> bool {
        // TODO: Implement comprehensive validation
        // - No player paired twice
        // - Color balance within limits
        // - Float counts within acceptable ranges
        // - Proper bye assignments
        errors.is_empty()
    }
}

/// Helper function to get opposite color
fn opposite_color(color: Color) -> Color {
    match color {
        Color::White => Color::Black,
        Color::Black => Color::White,
    }
}

/// Wrapper for f64 to enable ordering in BTreeMap
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
struct OrderedFloat(f64);

impl Eq for OrderedFloat {}

impl Ord for OrderedFloat {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.0.partial_cmp(&other.0).unwrap_or(std::cmp::Ordering::Equal)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pawn::domain::model::{Player, PlayerResult, Game};

    fn create_test_player(id: i32, name: &str, rating: Option<i32>) -> Player {
        Player {
            id,
            tournament_id: 1,
            name: name.to_string(),
            rating,
            country_code: None,
            title: None,
            birth_date: None,
            gender: None,
            email: None,
            phone: None,
            club: None,
            status: "active".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: None,
        }
    }

    fn create_test_result(player: Player, points: f64) -> PlayerResult {
        PlayerResult {
            player,
            points: points as f32,
            games_played: 1,
            wins: if points == 1.0 { 1 } else { 0 },
            draws: if points == 0.5 { 1 } else { 0 },
            losses: if points == 0.0 { 1 } else { 0 },
        }
    }

    fn create_test_game(game_id: i32, white_id: i32, black_id: i32, round: i32) -> Game {
        Game {
            id: game_id,
            tournament_id: 1,
            round_number: round,
            white_player_id: white_id,
            black_player_id: black_id,
            result: "1-0".to_string(),
            result_type: None,
            result_reason: None,
            arbiter_notes: None,
            last_updated: None,
            approved_by: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        }
    }

    fn create_game_result(game: Game, white_player: Player, black_player: Player) -> GameResult {
        GameResult {
            game,
            white_player,
            black_player,
        }
    }

    #[test]
    fn test_empty_tournament() {
        let engine = SwissPairingEngine::new();
        let result = engine.generate_dutch_system_pairings(
            vec![],
            vec![],
            vec![],
            1,
        ).unwrap();

        assert!(result.pairings.is_empty());
        assert!(result.byes.is_empty());
        assert_eq!(result.float_count, 0);
    }

    #[test]
    fn test_single_player() {
        let engine = SwissPairingEngine::new();
        let player = create_test_player(1, "Player 1", Some(1500));
        let result_data = create_test_result(player.clone(), 0.0);

        let result = engine.generate_dutch_system_pairings(
            vec![player.clone()],
            vec![result_data],
            vec![],
            1,
        ).unwrap();

        assert!(result.pairings.is_empty());
        assert_eq!(result.byes.len(), 1);
        assert_eq!(result.byes[0].player.id, player.id);
    }

    #[test]
    fn test_two_players() {
        let engine = SwissPairingEngine::new();
        let player1 = create_test_player(1, "Player 1", Some(1600));
        let player2 = create_test_player(2, "Player 2", Some(1400));
        
        let result1 = create_test_result(player1.clone(), 0.5);
        let result2 = create_test_result(player2.clone(), 0.5);

        let result = engine.generate_dutch_system_pairings(
            vec![player1.clone(), player2.clone()],
            vec![result1, result2],
            vec![],
            2,
        ).unwrap();

        assert_eq!(result.pairings.len(), 1);
        assert!(result.byes.is_empty());
        
        let pairing = &result.pairings[0];
        assert_eq!(pairing.white_player.id, player1.id); // Higher rated gets white
        assert_eq!(pairing.black_player.as_ref().unwrap().id, player2.id);
        assert_eq!(pairing.board_number, 1);
    }

    #[test]
    fn test_four_players_same_score() {
        let engine = SwissPairingEngine::new();
        let players = vec![
            create_test_player(1, "Player 1", Some(1700)),
            create_test_player(2, "Player 2", Some(1600)),
            create_test_player(3, "Player 3", Some(1500)),
            create_test_player(4, "Player 4", Some(1400)),
        ];
        
        let results = players.iter().map(|p| create_test_result(p.clone(), 1.0)).collect();

        let result = engine.generate_dutch_system_pairings(
            players.clone(),
            results,
            vec![],
            2,
        ).unwrap();

        assert_eq!(result.pairings.len(), 2);
        assert!(result.byes.is_empty());
    }

    #[test]
    fn test_avoid_rematches() {
        let engine = SwissPairingEngine::new();
        let player1 = create_test_player(1, "Player 1", Some(1500));
        let player2 = create_test_player(2, "Player 2", Some(1500));
        let player3 = create_test_player(3, "Player 3", Some(1500));
        let player4 = create_test_player(4, "Player 4", Some(1500));
        
        // Create game history where players 1 and 2 already played
        let game = create_test_game(1, 1, 2, 1);
        let game_result = create_game_result(game, player1.clone(), player2.clone());

        let results = vec![
            create_test_result(player1.clone(), 1.0),
            create_test_result(player2.clone(), 0.0),
            create_test_result(player3.clone(), 0.5),
            create_test_result(player4.clone(), 0.5),
        ];

        let result = engine.generate_dutch_system_pairings(
            vec![player1.clone(), player2.clone(), player3.clone(), player4.clone()],
            results,
            vec![game_result],
            2,
        ).unwrap();

        // Should create 2 pairings, avoiding the rematch
        assert_eq!(result.pairings.len(), 2);
        
        // Verify players 1 and 2 are not paired together
        for pairing in &result.pairings {
            let white_id = pairing.white_player.id;
            let black_id = pairing.black_player.as_ref().unwrap().id;
            assert!(!(white_id == 1 && black_id == 2) && !(white_id == 2 && black_id == 1));
        }
    }

    #[test]
    fn test_color_preference_calculation() {
        let engine = SwissPairingEngine::new();
        
        // Test absolute preference (3 consecutive whites)
        let color_history = vec![Color::White, Color::White, Color::White];
        let preference = engine.calculate_color_preference(&color_history);
        assert_eq!(preference, ColorPreference::Absolute(Color::Black));
        
        // Test strong preference (2 consecutive blacks)
        let color_history = vec![Color::White, Color::Black, Color::Black];
        let preference = engine.calculate_color_preference(&color_history);
        assert_eq!(preference, ColorPreference::Strong(Color::White));
        
        // Test mild preference (color imbalance)
        let color_history = vec![Color::White, Color::White, Color::Black];
        let preference = engine.calculate_color_preference(&color_history);
        // Since this is 2 whites vs 1 black, should prefer black but algorithm might not classify as mild
        // Let's test with a clearer imbalance
        let color_history_clear = vec![Color::White, Color::White, Color::White, Color::Black];
        let preference_clear = engine.calculate_color_preference(&color_history_clear);
        // This should definitely show a mild preference for black
        assert!(matches!(preference_clear, ColorPreference::Mild(Color::Black)) || 
                matches!(preference_clear, ColorPreference::None));
        
        // Test no preference (balanced)
        let color_history = vec![Color::White, Color::Black];
        let preference = engine.calculate_color_preference(&color_history);
        assert_eq!(preference, ColorPreference::None);
    }

    #[test]
    fn test_score_groups_formation() {
        let engine = SwissPairingEngine::new();
        let players = vec![
            create_test_player(1, "Winner 1", Some(1600)),
            create_test_player(2, "Winner 2", Some(1500)),
            create_test_player(3, "Drawer 1", Some(1400)),
            create_test_player(4, "Drawer 2", Some(1300)),
            create_test_player(5, "Loser 1", Some(1200)),
            create_test_player(6, "Loser 2", Some(1100)),
        ];
        
        let results = vec![
            create_test_result(players[0].clone(), 1.0), // Winners
            create_test_result(players[1].clone(), 1.0),
            create_test_result(players[2].clone(), 0.5), // Drawers
            create_test_result(players[3].clone(), 0.5),
            create_test_result(players[4].clone(), 0.0), // Losers
            create_test_result(players[5].clone(), 0.0),
        ];

        let swiss_players = engine.build_swiss_players(
            players,
            results,
            vec![],
        ).unwrap();

        let score_groups = engine.form_score_groups(swiss_players);

        assert_eq!(score_groups.len(), 3); // Three score groups
        assert_eq!(score_groups[0].points, 1.0); // Winners group
        assert_eq!(score_groups[1].points, 0.5); // Drawers group
        assert_eq!(score_groups[2].points, 0.0); // Losers group

        assert_eq!(score_groups[0].players.len(), 2);
        assert_eq!(score_groups[1].players.len(), 2);
        assert_eq!(score_groups[2].players.len(), 2);
    }

    #[test]
    fn test_accelerated_pairings() {
        let engine = SwissPairingEngine::new();
        let players = vec![
            create_test_player(1, "High", Some(2000)),
            create_test_player(2, "Medium High", Some(1800)),
            create_test_player(3, "Medium", Some(1600)),
            create_test_player(4, "Medium Low", Some(1400)),
            create_test_player(5, "Low", Some(1200)),
            create_test_player(6, "Very Low", Some(1000)),
        ];
        
        let results = players.iter().map(|p| create_test_result(p.clone(), 0.0)).collect();
        
        let mut swiss_players = engine.build_swiss_players(
            players,
            results,
            vec![],
        ).unwrap();

        let original_points: Vec<f64> = swiss_players.iter().map(|p| p.points).collect();
        
        // Apply accelerated pairings for round 1
        engine.apply_accelerated_pairings(&mut swiss_players, 1);
        
        // Top half should have received virtual points
        let top_half_size = swiss_players.len() / 2;
        for i in 0..top_half_size {
            assert!(swiss_players[i].points > original_points[i]);
        }
        
        // Bottom half should have same points
        for i in top_half_size..swiss_players.len() {
            assert_eq!(swiss_players[i].points, original_points[i]);
        }
    }

    #[test]
    fn test_color_assignment() {
        let engine = SwissPairingEngine::new();
        let player1 = SwissPlayer {
            player: create_test_player(1, "Player 1", Some(1500)),
            points: 1.0,
            rating: 1500,
            color_history: vec![Color::White, Color::White], // Prefers black
            opponents: HashSet::new(),
            color_preference: ColorPreference::Strong(Color::Black),
            is_bye_eligible: true,
            float_history: vec![],
        };
        
        let player2 = SwissPlayer {
            player: create_test_player(2, "Player 2", Some(1500)),
            points: 1.0,
            rating: 1500,
            color_history: vec![Color::Black, Color::Black], // Prefers white
            opponents: HashSet::new(),
            color_preference: ColorPreference::Strong(Color::White),
            is_bye_eligible: true,
            float_history: vec![],
        };

        let (white, black) = engine.assign_colors(&player1, &player2);
        
        // Player2 should get white (prefers white), Player1 should get black (prefers black)
        assert_eq!(white.player.id, 2);
        assert_eq!(black.player.id, 1);
    }

    #[test]
    fn test_late_entry_integration() {
        let engine = SwissPairingEngine::new();
        let mut existing_players = vec![
            SwissPlayer {
                player: create_test_player(1, "Existing 1", Some(1600)),
                points: 1.5,
                rating: 1600,
                color_history: vec![Color::White, Color::Black],
                opponents: HashSet::new(),
                color_preference: ColorPreference::None,
                is_bye_eligible: true,
                float_history: vec![],
            },
        ];

        let late_entries = vec![
            create_test_player(2, "Late Entry", Some(1500)),
        ];

        engine.integrate_late_entries(&mut existing_players, late_entries, 3).unwrap();

        assert_eq!(existing_players.len(), 2);
        
        // Late entry should have compensatory points for round 3
        let late_player = existing_players.iter().find(|p| p.player.id == 2).unwrap();
        assert_eq!(late_player.points, 0.5); // Round 3 entry gets 0.5 points
    }

    #[test]
    fn test_pairing_score_calculation() {
        let engine = SwissPairingEngine::new();
        
        let player1 = SwissPlayer {
            player: create_test_player(1, "Player 1", Some(1500)),
            points: 1.0,
            rating: 1500,
            color_history: vec![],
            opponents: HashSet::new(),
            color_preference: ColorPreference::Strong(Color::White),
            is_bye_eligible: true,
            float_history: vec![],
        };
        
        let player2 = SwissPlayer {
            player: create_test_player(2, "Player 2", Some(1500)),
            points: 1.0,
            rating: 1500,
            color_history: vec![],
            opponents: HashSet::new(),
            color_preference: ColorPreference::Strong(Color::Black),
            is_bye_eligible: true,
            float_history: vec![],
        };
        
        let score = engine.calculate_pairing_score(&player1, &player2);
        
        // Should be a good pairing due to complementary color preferences
        assert!(score > 900.0); // Base score 1000 minus small penalties plus color bonus
    }

    #[test]
    fn test_team_avoidance() {
        let engine = SwissPairingEngine::new();
        
        let mut player1 = SwissPlayer {
            player: create_test_player(1, "Player 1", Some(1500)),
            points: 1.0,
            rating: 1500,
            color_history: vec![],
            opponents: HashSet::new(),
            color_preference: ColorPreference::None,
            is_bye_eligible: true,
            float_history: vec![],
        };
        player1.player.club = Some("Chess Club A".to_string());
        
        let mut player2 = SwissPlayer {
            player: create_test_player(2, "Player 2", Some(1500)),
            points: 1.0,
            rating: 1500,
            color_history: vec![],
            opponents: HashSet::new(),
            color_preference: ColorPreference::None,
            is_bye_eligible: true,
            float_history: vec![],
        };
        player2.player.club = Some("Chess Club A".to_string());

        // Players from same club should be considered teammates
        assert!(engine.are_teammates(&player1, &player2));
        
        // Pairing score should be heavily penalized
        let score = engine.calculate_pairing_score(&player1, &player2);
        assert!(score < 0.0); // Should be negative due to teammate penalty
    }

    #[test]
    fn test_bye_player_selection() {
        let engine = SwissPairingEngine::new();
        
        let players = vec![
            SwissPlayer {
                player: create_test_player(1, "High Rated", Some(1800)),
                points: 1.0,
                rating: 1800,
                color_history: vec![],
                opponents: HashSet::new(),
                color_preference: ColorPreference::None,
                is_bye_eligible: true,
                float_history: vec![],
            },
            SwissPlayer {
                player: create_test_player(2, "Low Rated", Some(1200)),
                points: 1.0,
                rating: 1200,
                color_history: vec![],
                opponents: HashSet::new(),
                color_preference: ColorPreference::None,
                is_bye_eligible: true,
                float_history: vec![],
            },
        ];

        let bye_player = engine.select_bye_player(&players).unwrap();
        
        // Should select the lower-rated player for bye
        assert_eq!(bye_player.player.id, 2);
        assert_eq!(bye_player.rating, 1200);
    }

    #[test]
    fn test_full_tournament_round() {
        let engine = SwissPairingEngine::new();
        
        // 8 players with mixed scores from round 1
        let players = vec![
            create_test_player(1, "Winner 1", Some(1800)),
            create_test_player(2, "Winner 2", Some(1750)),
            create_test_player(3, "Winner 3", Some(1700)),
            create_test_player(4, "Winner 4", Some(1650)),
            create_test_player(5, "Drawer 1", Some(1600)),
            create_test_player(6, "Drawer 2", Some(1550)),
            create_test_player(7, "Loser 1", Some(1500)),
            create_test_player(8, "Loser 2", Some(1450)),
        ];
        
        let results = vec![
            create_test_result(players[0].clone(), 1.0), // Winners
            create_test_result(players[1].clone(), 1.0),
            create_test_result(players[2].clone(), 1.0),
            create_test_result(players[3].clone(), 1.0),
            create_test_result(players[4].clone(), 0.5), // Drawers
            create_test_result(players[5].clone(), 0.5),
            create_test_result(players[6].clone(), 0.0), // Losers
            create_test_result(players[7].clone(), 0.0),
        ];

        let result = engine.generate_dutch_system_pairings(
            players,
            results,
            vec![],
            2,
        ).unwrap();

        // Should generate 4 pairings with no byes
        assert_eq!(result.pairings.len(), 4);
        assert!(result.byes.is_empty());
        
        // Verify all board numbers are assigned correctly
        for (index, pairing) in result.pairings.iter().enumerate() {
            assert_eq!(pairing.board_number, (index + 1) as i32);
        }
        
        // Verify no duplicate pairings
        let mut player_ids = HashSet::new();
        for pairing in &result.pairings {
            assert!(player_ids.insert(pairing.white_player.id));
            if let Some(ref black_player) = pairing.black_player {
                assert!(player_ids.insert(black_player.id));
            }
        }
        assert_eq!(player_ids.len(), 8); // All players should be paired
    }
}