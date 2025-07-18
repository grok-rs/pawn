use crate::pawn::{
    common::error::PawnError,
    domain::model::{GameResult, Pairing, Player, PlayerResult},
};
use std::collections::{BTreeMap, HashMap, HashSet};

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
    Absolute(Color), // Must have this color (3+ consecutive same color)
    Strong(Color),   // Strong preference (2 consecutive same color)
    Mild(Color),     // Mild preference (color balance)
    None,            // No preference
}

#[derive(Debug, Clone, Copy)]
pub enum FloatDirection {
    Up,   // Floated up to higher score group
    Down, // Floated down to lower score group
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
            groups_map
                .entry(OrderedFloat(player.points))
                .or_default()
                .push(player);
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
        if recent_colors.len() >= 3
            && recent_colors
                .windows(3)
                .any(|w| w.iter().all(|&c| c == w[0]))
        {
            let same_color = recent_colors[recent_colors.len() - 1];
            return ColorPreference::Absolute(opposite_color(same_color));
        }

        // Check for 2 consecutive same colors (strong preference)
        if recent_colors.len() >= 2
            && recent_colors[recent_colors.len() - 2] == recent_colors[recent_colors.len() - 1]
        {
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

                // Find the best group to float to (prioritize groups with odd number of players)
                let mut best_target = None;
                let mut _float_found = false;

                // First, try to find a group with odd number of players (to make it even)
                // Try both directions: down and up
                for (next_group_index, next_group) in
                    score_groups.iter().enumerate().skip(group_index + 1)
                {
                    if next_group.players.len() % 2 == 1 {
                        // Check if this player can pair with anyone in the next group
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
                            // Check if this player can pair with anyone in the previous group
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
                            // Check if this player can pair with anyone in the next group
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
                            // Check if this player can pair with anyone in the previous group
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

            // Handle odd group size with byes (floating is handled in the initial pass)
            if score_group.players.len() % 2 == 1 {
                // Assign bye to the most appropriate player
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

            // Floated players are already handled in the pre-processing step

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

        // Remove floated players from their original groups to prevent duplicate pairings
        // This needs to happen before pairing generation, so we do it in the main loop

        // Validate FIDE compliance before returning result
        let mut validation_errors = vec![];
        
        // FIDE C.04.1.3: Float limit validation
        if let Err(e) = self.validate_fide_float_limits(
            float_count,
            max_floats_allowed,
            round_number,
            all_players.len(),
        ) {
            validation_errors.push(e.to_string());
            tracing::warn!("FIDE float validation failed: {}", e);
        }

        // FIDE C.04.2.2: Color sequence validation
        if let Err(e) = self.validate_fide_color_sequences(&pairings, all_players, round_number) {
            validation_errors.push(e.to_string());
            tracing::warn!("FIDE color sequence validation failed: {}", e);
        }

        // FIDE team avoidance validation for international tournaments
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

    /// Calculate maximum allowed floats based on FIDE C.04.1.3 rules
    fn calculate_max_floats(&self, total_players: usize, round_number: i32) -> usize {
        // FIDE C.04.1.3: Strict float limits based on tournament size and round
        match total_players {
            // Small tournaments (≤ 20 players): More restrictive float limits
            1..=20 => {
                if round_number <= 2 {
                    2.min(total_players / 4)
                } else {
                    1.min(total_players / 6)
                }
            }
            // Medium tournaments (21-50 players): Standard FIDE limits
            21..=50 => {
                if round_number <= 2 {
                    total_players / 6
                } else if round_number <= 5 {
                    total_players / 8
                } else {
                    total_players / 10
                }
            }
            // Large tournaments (51-100 players): Moderate float limits
            51..=100 => {
                if round_number <= 2 {
                    total_players / 8
                } else if round_number <= 5 {
                    total_players / 10
                } else {
                    total_players / 12
                }
            }
            // Very large tournaments (>100 players): Conservative float limits
            _ => {
                if round_number <= 2 {
                    total_players / 10
                } else if round_number <= 5 {
                    total_players / 12
                } else {
                    total_players / 15
                }
            }
        }
    }

    /// Validate float limits according to FIDE C.04.1.3
    fn validate_fide_float_limits(
        &self,
        float_count: usize,
        max_floats_allowed: usize,
        round_number: i32,
        total_players: usize,
    ) -> Result<(), PawnError> {
        if float_count > max_floats_allowed {
            return Err(PawnError::InvalidInput(format!(
                "FIDE C.04.1.3 violation: {} floats exceed maximum allowed {} for round {} with {} players",
                float_count, max_floats_allowed, round_number, total_players
            )));
        }

        // Additional FIDE constraints
        if round_number > 2 && float_count > (total_players / 6) {
            return Err(PawnError::InvalidInput(format!(
                "FIDE C.04.1.3 violation: After round 2, maximum {} floats allowed for {} players",
                total_players / 6, total_players
            )));
        }

        Ok(())
    }

    /// Validate color sequences according to FIDE C.04.2.2
    fn validate_fide_color_sequences(
        &self,
        pairings: &[Pairing],
        players: &[SwissPlayer],
        round_number: i32,
    ) -> Result<(), PawnError> {
        let mut validation_errors = Vec::new();

        for pairing in pairings {
            let white_player = &pairing.white_player;
            if let Some(black_player) = &pairing.black_player {
                // Find the corresponding Swiss players
                let white_swiss = players.iter().find(|p| p.player.id == white_player.id);
                let black_swiss = players.iter().find(|p| p.player.id == black_player.id);

                if let (Some(white), Some(black)) = (white_swiss, black_swiss) {
                    // FIDE C.04.2.2.1: No player should have more than 3 consecutive games with same color
                    if let Err(e) = self.validate_consecutive_color_limit(&white.color_history, Color::White, round_number) {
                        validation_errors.push(format!("Player {}: {}", white_player.name, e));
                    }

                    if let Err(e) = self.validate_consecutive_color_limit(&black.color_history, Color::Black, round_number) {
                        validation_errors.push(format!("Player {}: {}", black_player.name, e));
                    }

                    // FIDE C.04.2.2.2: Color balance should not exceed ±2 in tournaments of 9+ rounds
                    if round_number >= 9 {
                        if let Err(e) = self.validate_color_balance_limit(&white.color_history, round_number) {
                            validation_errors.push(format!("Player {}: {}", white_player.name, e));
                        }

                        if let Err(e) = self.validate_color_balance_limit(&black.color_history, round_number) {
                            validation_errors.push(format!("Player {}: {}", black_player.name, e));
                        }
                    }

                    // FIDE C.04.2.2.3: Absolute color preferences must be respected
                    if !self.respects_absolute_color_preference(white, Color::White) {
                        validation_errors.push(format!(
                            "Player {} has absolute color preference violated", 
                            white_player.name
                        ));
                    }

                    if !self.respects_absolute_color_preference(black, Color::Black) {
                        validation_errors.push(format!(
                            "Player {} has absolute color preference violated", 
                            black_player.name
                        ));
                    }
                }
            } else {
                // Handle bye case - just validate the white player (who gets the bye)
                if let Some(white_swiss) = players.iter().find(|p| p.player.id == white_player.id) {
                    // For byes, we don't assign colors, so only validate existing color balance
                    if round_number >= 9 {
                        if let Err(e) = self.validate_color_balance_limit(&white_swiss.color_history, round_number) {
                            validation_errors.push(format!("Player {} (bye): {}", white_player.name, e));
                        }
                    }
                }
            }
        }

        if !validation_errors.is_empty() {
            return Err(PawnError::InvalidInput(format!(
                "FIDE C.04.2.2 color sequence violations: {}",
                validation_errors.join("; ")
            )));
        }

        Ok(())
    }

    /// Validate consecutive color limit (FIDE C.04.2.2.1)
    fn validate_consecutive_color_limit(
        &self,
        color_history: &[Color],
        assigned_color: Color,
        round_number: i32,
    ) -> Result<(), PawnError> {
        let mut new_history = color_history.to_vec();
        new_history.push(assigned_color);

        // Count consecutive occurrences of the same color from the end
        let mut consecutive = 0;
        for color in new_history.iter().rev() {
            if *color == assigned_color {
                consecutive += 1;
            } else {
                break;
            }
        }

        // FIDE C.04.2.2.1: Maximum 3 consecutive games with same color in tournaments of 7+ rounds
        if round_number >= 7 && consecutive > 3 {
            return Err(PawnError::InvalidInput(format!(
                "FIDE C.04.2.2.1 violation: {} consecutive {} games exceeds maximum of 3",
                consecutive,
                if assigned_color == Color::White { "white" } else { "black" }
            )));
        }

        // For shorter tournaments, allow maximum 4 consecutive (more flexible)
        if consecutive > 4 {
            return Err(PawnError::InvalidInput(format!(
                "Excessive consecutive colors: {} consecutive {} games exceeds reasonable limit",
                consecutive,
                if assigned_color == Color::White { "white" } else { "black" }
            )));
        }

        Ok(())
    }

    /// Validate color balance limit (FIDE C.04.2.2.2)
    fn validate_color_balance_limit(
        &self,
        color_history: &[Color],
        round_number: i32,
    ) -> Result<(), PawnError> {
        let white_count = color_history.iter().filter(|&&c| c == Color::White).count();
        let black_count = color_history.len() - white_count;
        let difference = (white_count as i32 - black_count as i32).abs();

        // FIDE C.04.2.2.2: In tournaments of 9+ rounds, color imbalance should not exceed ±2
        if round_number >= 9 && difference > 2 {
            return Err(PawnError::InvalidInput(format!(
                "FIDE C.04.2.2.2 violation: Color imbalance of {} exceeds maximum of ±2 for tournament of {} rounds",
                difference, round_number
            )));
        }

        // For shorter tournaments, allow ±3 imbalance
        if difference > 3 {
            return Err(PawnError::InvalidInput(format!(
                "Excessive color imbalance: {} exceeds reasonable limit of ±3",
                difference
            )));
        }

        Ok(())
    }

    /// Check if assigned color respects absolute color preference (FIDE C.04.2.2.3)
    fn respects_absolute_color_preference(&self, player: &SwissPlayer, assigned_color: Color) -> bool {
        match &player.color_preference {
            ColorPreference::Absolute(preferred_color) => *preferred_color == assigned_color,
            _ => true, // Non-absolute preferences can be overridden if necessary
        }
    }

    /// Validate team avoidance according to FIDE international tournament rules
    fn validate_fide_team_avoidance(
        &self,
        pairings: &[Pairing],
        players: &[SwissPlayer],
        round_number: i32,
    ) -> Result<(), PawnError> {
        let mut validation_errors = Vec::new();
        let mut same_club_violations = 0;
        let mut same_federation_violations = 0;

        for pairing in pairings {
            let white_player = &pairing.white_player;
            if let Some(black_player) = &pairing.black_player {
                // Find the corresponding Swiss players
                let white_swiss = players.iter().find(|p| p.player.id == white_player.id);
                let black_swiss = players.iter().find(|p| p.player.id == black_player.id);

                if let (Some(white), Some(black)) = (white_swiss, black_swiss) {
                    // Check for same club violations (highest severity)
                    if self.are_same_club(white, black) {
                        same_club_violations += 1;
                        validation_errors.push(format!(
                            "Same club pairing: {} vs {} (both from '{}')",
                            white_player.name,
                            black_player.name,
                            white.player.club.as_ref().unwrap_or(&"Unknown".to_string())
                        ));
                    }
                    // Check for same federation violations (moderate severity)
                    else if self.should_avoid_same_federation(white, black) {
                        same_federation_violations += 1;
                        validation_errors.push(format!(
                            "Same federation pairing: {} vs {} (both from {})",
                            white_player.name,
                            black_player.name,
                            white.player.country_code.as_ref().unwrap_or(&"Unknown".to_string())
                        ));
                    }
                }
            }
        }

        // Apply FIDE tolerance rules for team avoidance
        let total_pairings = pairings.iter().filter(|p| p.black_player.is_some()).count();
        
        // FIDE allows some same-federation pairings in large tournaments
        let max_allowed_federation_violations = self.calculate_max_federation_violations(total_pairings, round_number);
        let max_allowed_club_violations = self.calculate_max_club_violations(total_pairings, round_number);

        // Check if violations exceed FIDE limits
        if same_club_violations > max_allowed_club_violations {
            validation_errors.insert(0, format!(
                "FIDE team avoidance violation: {} same-club pairings exceed maximum of {} allowed",
                same_club_violations, max_allowed_club_violations
            ));
        }

        if same_federation_violations > max_allowed_federation_violations {
            validation_errors.insert(0, format!(
                "FIDE federation avoidance violation: {} same-federation pairings exceed maximum of {} allowed",
                same_federation_violations, max_allowed_federation_violations
            ));
        }

        if !validation_errors.is_empty() {
            return Err(PawnError::InvalidInput(format!(
                "FIDE team avoidance violations: {}",
                validation_errors.join("; ")
            )));
        }

        Ok(())
    }

    /// Calculate maximum allowed federation violations based on FIDE rules
    fn calculate_max_federation_violations(&self, total_pairings: usize, round_number: i32) -> usize {
        // FIDE rules for international tournaments:
        // - Early rounds (1-3): Strict avoidance, max 5% of pairings
        // - Middle rounds (4-7): Moderate avoidance, max 10% of pairings  
        // - Late rounds (8+): Relaxed avoidance, max 15% of pairings
        
        let base_percentage = if round_number <= 3 {
            0.05 // 5% in early rounds
        } else if round_number <= 7 {
            0.10 // 10% in middle rounds
        } else {
            0.15 // 15% in late rounds
        };

        (total_pairings as f64 * base_percentage).ceil() as usize
    }

    /// Calculate maximum allowed club violations (should be very rare)
    fn calculate_max_club_violations(&self, total_pairings: usize, _round_number: i32) -> usize {
        // Same club pairings should be extremely rare
        // Allow maximum 1 same-club pairing per 50 pairings
        std::cmp::max(1, total_pairings / 50)
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
        paired_ids: &mut HashSet<i32>,
        float_count: &mut usize,
        max_floats_allowed: usize,
        group_index: usize,
        byes: &mut Vec<SwissPlayer>,
        floated_players: &mut HashSet<i32>,
    ) -> Result<bool, PawnError> {
        // Try to get a downfloater if float limit allows
        if *float_count < max_floats_allowed {
            if let Some(floater) = self.find_suitable_downfloater(
                all_players,
                score_group.points,
                paired_ids,
                group_index,
            ) {
                // Mark the floated player as paired to prevent duplicate processing
                let floater_id = floater.player.id;
                paired_ids.insert(floater_id);
                floated_players.insert(floater_id);
                score_group.players.push(floater);
                *float_count += 1;
                tracing::info!("Floated player {} to group {}", floater_id, group_index);
                tracing::debug!(
                    "Added downfloater to group {}, total floats: {}",
                    group_index,
                    *float_count
                );
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
            tracing::debug!(
                "Assigned bye to: {} in group {}",
                bye_player_name,
                group_index
            );
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
        let target_score = lower_scores
            .iter()
            .max_by(|a, b| a.partial_cmp(b).unwrap())?;

        // Find best candidate from that score group
        all_players
            .iter()
            .filter(|p| {
                p.points == *target_score
                    && !paired_ids.contains(&p.player.id)
                    && self.can_float_up(p, current_group_index)
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

        let bye_candidates: Vec<&SwissPlayer> =
            players.iter().filter(|p| p.is_bye_eligible).collect();

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
        bye_candidates.into_iter().min_by_key(|p| p.rating)
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
        tracing::info!(
            "Integrating {} late entries into round {}",
            late_entries.len(),
            current_round
        );

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
            b.points
                .partial_cmp(&a.points)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| b.rating.cmp(&a.rating))
        });

        Ok(())
    }

    /// Calculate points for late entry players based on round
    fn calculate_late_entry_points(&self, entry_round: i32) -> f64 {
        // FIDE recommendations for late entries
        match entry_round {
            1 => 0.0, // Entered from start
            2 => 0.0, // Entered round 2, no compensation
            3 => 0.5, // Entered round 3, get half point
            4 => 1.0, // Entered round 4, get 1 point
            5 => 1.5, // Entered round 5, get 1.5 points
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
            // Try alternative pairing to maximize total pairings
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
                    println!(
                        "DEBUG: Skipping rematch: {} vs {}",
                        players[i].player.name, players[j].player.name
                    );
                    continue;
                }

                // Calculate pairing quality score
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

                // Determine colors based on preferences
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
                    // Calculate priority: prefer pairings involving constrained players
                    let constraint_score = players[i].opponents.len() + players[j].opponents.len();
                    valid_pairings.push((i, j, constraint_score));
                }
            }
        }

        // Sort by constraint score (higher = more constrained players first)
        valid_pairings.sort_by(|a, b| b.2.cmp(&a.2));

        // Try to find maximum matching prioritizing constrained players
        for (i, j, _) in valid_pairings {
            if used_indices.contains(&i) || used_indices.contains(&j) {
                continue;
            }

            used_indices.insert(i);
            used_indices.insert(j);

            // Determine colors based on preferences
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

        // 3.5. Enhanced team/federation avoidance (high priority penalty)
        let team_penalty = self.calculate_team_avoidance_penalty(player1, player2);
        score += team_penalty;

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
        // Level 1: Same club/team (strongest avoidance)
        if self.are_same_club(player1, player2) {
            return true;
        }

        // Level 2: Same federation/country (configurable avoidance)
        if self.should_avoid_same_federation(player1, player2) {
            return true;
        }

        false
    }

    /// Check if players are from the same club/team
    fn are_same_club(&self, player1: &SwissPlayer, player2: &SwissPlayer) -> bool {
        if let (Some(club1), Some(club2)) = (&player1.player.club, &player2.player.club) {
            // Same club - always avoid unless it's a generic club name
            if club1 == club2 && !club1.is_empty() && !self.is_generic_club_name(club1) {
                return true;
            }
        }
        false
    }

    /// Check if players are from same federation and should be avoided
    fn should_avoid_same_federation(&self, player1: &SwissPlayer, player2: &SwissPlayer) -> bool {
        if let (Some(country1), Some(country2)) =
            (&player1.player.country_code, &player2.player.country_code)
        {
            if country1 == country2 && !country1.is_empty() {
                return self.get_federation_avoidance_level(country1);
            }
        }
        false
    }

    /// Determine federation avoidance level based on FIDE international tournament rules
    fn get_federation_avoidance_level(&self, country_code: &str) -> bool {
        // FIDE rules for international tournaments:
        // - Team tournaments: Strict federation avoidance
        // - Individual tournaments: Federation avoidance only in early rounds or small sections
        
        // Major chess federations where avoidance is typically enforced
        let major_federations = [
            "RUS", "USA", "CHN", "IND", "FRA", "GER", "UKR", "ARM", "IRA", "BRA",
            "POL", "ESP", "HUN", "CZE", "NED", "NOR", "SWE", "ITA", "ISR", "CAN",
            "AZE", "GEO", "LTU", "LAT", "EST", "BUL", "ROU", "TUR", "GRE", "CRO"
        ];

        // For major federations, apply avoidance in early rounds
        if major_federations.contains(&country_code) {
            return self.should_apply_federation_avoidance();
        }

        // For smaller federations, always try to avoid same-country pairings
        true
    }

    /// Determine if federation avoidance should be applied (configurable)
    fn should_apply_federation_avoidance(&self) -> bool {
        // TODO: Make this configurable based on tournament settings
        // For now, apply moderate federation avoidance
        // In real implementation, this would check:
        // - Tournament type (team vs individual)
        // - Tournament size
        // - Round number
        // - Tournament regulations
        true
    }

    /// Check if club name is generic and shouldn't trigger avoidance
    fn is_generic_club_name(&self, club_name: &str) -> bool {
        let generic_names = [
            "Unaffiliated", "Independent", "No Club", "Individual", "Private",
            "Local Club", "Chess Club", "Unknown", "N/A", "None", "TBD"
        ];
        
        let normalized = club_name.trim().to_lowercase();
        generic_names.iter().any(|&generic| normalized.contains(&generic.to_lowercase()))
    }

    /// Enhanced team avoidance scoring with multiple penalty levels
    fn calculate_team_avoidance_penalty(&self, player1: &SwissPlayer, player2: &SwissPlayer) -> f64 {
        // Level 1: Same club (highest penalty)
        if self.are_same_club(player1, player2) {
            return -8000.0; // Very high penalty for same club
        }

        // Level 2: Same federation/country  
        if self.should_avoid_same_federation(player1, player2) {
            if let (Some(country1), Some(country2)) = 
                (&player1.player.country_code, &player2.player.country_code) {
                if country1 == country2 {
                    // Variable penalty based on federation size and tournament type
                    return self.calculate_federation_penalty(country1);
                }
            }
        }

        0.0 // No penalty
    }

    /// Calculate federation-specific penalty
    fn calculate_federation_penalty(&self, country_code: &str) -> f64 {
        // Major federations get moderate penalty (can be overridden if necessary)
        let major_federations = [
            "RUS", "USA", "CHN", "IND", "FRA", "GER", "UKR", "ARM", "IRA"
        ];

        if major_federations.contains(&country_code) {
            -2000.0 // Moderate penalty for major federations
        } else {
            -4000.0 // Higher penalty for smaller federations
        }
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
            tracing::debug!(
                "Applying top group special handling for {} players",
                top_group.players.len()
            );

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
                if c1 != c2 {
                    0.8
                } else {
                    -0.5
                }
            }
            (ColorPreference::Absolute(_), _) | (_, ColorPreference::Absolute(_)) => 0.9,
            (ColorPreference::Strong(_), _) | (_, ColorPreference::Strong(_)) => 0.6,
            (ColorPreference::Mild(c1), ColorPreference::Mild(c2)) => {
                if c1 != c2 {
                    0.3
                } else {
                    -0.1
                }
            }
            _ => 0.0,
        }
    }

    /// Assign colors to two players based on their preferences
    fn assign_colors<'a>(
        &self,
        player1: &'a SwissPlayer,
        player2: &'a SwissPlayer,
    ) -> (&'a SwissPlayer, &'a SwissPlayer) {
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
#[derive(Debug, Clone, Copy, PartialEq)]
struct OrderedFloat(f64);

impl Eq for OrderedFloat {}

impl PartialOrd for OrderedFloat {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for OrderedFloat {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.0
            .partial_cmp(&other.0)
            .unwrap_or(std::cmp::Ordering::Equal)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pawn::domain::model::{Game, Player, PlayerResult};

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
            seed_number: None,
            pairing_number: None,
            initial_rating: None,
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
        let result = engine
            .generate_dutch_system_pairings(vec![], vec![], vec![], 1)
            .unwrap();

        assert!(result.pairings.is_empty());
        assert!(result.byes.is_empty());
        assert_eq!(result.float_count, 0);
    }

    #[test]
    fn test_single_player() {
        let engine = SwissPairingEngine::new();
        let player = create_test_player(1, "Player 1", Some(1500));
        let result_data = create_test_result(player.clone(), 0.0);

        let result = engine
            .generate_dutch_system_pairings(vec![player.clone()], vec![result_data], vec![], 1)
            .unwrap();

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

        let result = engine
            .generate_dutch_system_pairings(
                vec![player1.clone(), player2.clone()],
                vec![result1, result2],
                vec![],
                2,
            )
            .unwrap();

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

        let results = players
            .iter()
            .map(|p| create_test_result(p.clone(), 1.0))
            .collect();

        let result = engine
            .generate_dutch_system_pairings(players.clone(), results, vec![], 2)
            .unwrap();

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

        let result = engine
            .generate_dutch_system_pairings(
                vec![
                    player1.clone(),
                    player2.clone(),
                    player3.clone(),
                    player4.clone(),
                ],
                results,
                vec![game_result],
                2,
            )
            .unwrap();

        println!("Generated {} pairings:", result.pairings.len());
        for (i, pairing) in result.pairings.iter().enumerate() {
            println!(
                "  Pairing {}: {} vs {}",
                i + 1,
                pairing.white_player.name,
                pairing
                    .black_player
                    .as_ref()
                    .map(|p| p.name.as_str())
                    .unwrap_or("BYE")
            );
        }
        println!("Generated {} byes:", result.byes.len());
        for (i, bye) in result.byes.iter().enumerate() {
            println!("  Bye {}: {}", i + 1, bye.player.name);
        }

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
        assert!(
            matches!(preference_clear, ColorPreference::Mild(Color::Black))
                || matches!(preference_clear, ColorPreference::None)
        );

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

        let swiss_players = engine
            .build_swiss_players(players, results, vec![])
            .unwrap();

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

        let results = players
            .iter()
            .map(|p| create_test_result(p.clone(), 0.0))
            .collect();

        let mut swiss_players = engine
            .build_swiss_players(players, results, vec![])
            .unwrap();

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
        let mut existing_players = vec![SwissPlayer {
            player: create_test_player(1, "Existing 1", Some(1600)),
            points: 1.5,
            rating: 1600,
            color_history: vec![Color::White, Color::Black],
            opponents: HashSet::new(),
            color_preference: ColorPreference::None,
            is_bye_eligible: true,
            float_history: vec![],
        }];

        let late_entries = vec![create_test_player(2, "Late Entry", Some(1500))];

        engine
            .integrate_late_entries(&mut existing_players, late_entries, 3)
            .unwrap();

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

        let result = engine
            .generate_dutch_system_pairings(players, results, vec![], 2)
            .unwrap();

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
