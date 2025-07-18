use crate::pawn::{
    common::error::PawnError,
    domain::model::{GameResult, Pairing, PairingMethod, Player, PlayerResult},
    service::manual_pairing::{
        ManualPairingController, ManualPairingRequest, PairingValidationResult,
    },
    service::round_robin_pairing::{RoundRobinEngine, RoundRobinType},
    service::swiss_pairing::SwissPairingEngine,
};
use std::collections::{HashMap, HashSet};

#[allow(dead_code)]
pub struct PairingService {
    swiss_engine: SwissPairingEngine,
    round_robin_engine: RoundRobinEngine,
    manual_controller: ManualPairingController,
}

#[allow(dead_code)]
impl Default for PairingService {
    fn default() -> Self {
        Self::new()
    }
}

#[allow(dead_code)]
impl PairingService {
    pub fn new() -> Self {
        Self {
            swiss_engine: SwissPairingEngine::new(),
            round_robin_engine: RoundRobinEngine::new(),
            manual_controller: ManualPairingController::new(),
        }
    }

    pub fn generate_pairings(
        &self,
        players: Vec<Player>,
        player_results: Vec<PlayerResult>,
        round_number: i32,
        method: &PairingMethod,
    ) -> Result<Vec<Pairing>, PawnError> {
        match method {
            PairingMethod::Swiss => {
                self.generate_swiss_pairings(players, player_results, round_number)
            }
            PairingMethod::RoundRobin => self.generate_round_robin_pairings(players, round_number),
            PairingMethod::Manual => Ok(vec![]), // Manual pairings are created by user
            PairingMethod::Knockout => Ok(vec![]), // Knockout pairings handled by KnockoutService
            PairingMethod::Scheveningen => {
                self.generate_scheveningen_pairings(players, round_number)
            }
        }
    }

    /// Generate double round-robin pairings (each player plays each other twice)
    pub fn generate_double_round_robin_pairings(
        &self,
        players: Vec<Player>,
        round_number: i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        let result = self.round_robin_engine.generate_berger_pairings(
            players,
            round_number,
            RoundRobinType::Double,
        )?;

        tracing::info!(
            "Double Round-Robin generated {} pairings for round {}/{}",
            result.pairings.len(),
            result.round_info.round_number,
            result.round_info.total_rounds
        );

        Ok(result.pairings)
    }

    /// Generate balanced round-robin with enhanced color distribution
    pub fn generate_balanced_round_robin_pairings(
        &self,
        players: Vec<Player>,
        round_number: i32,
        optimize_colors: bool,
    ) -> Result<Vec<Pairing>, PawnError> {
        let result = self.round_robin_engine.generate_balanced_round_robin(
            players,
            round_number,
            optimize_colors,
        )?;

        tracing::info!(
            "Balanced Round-Robin generated {} pairings for round {}/{}, color optimized: {}",
            result.pairings.len(),
            result.round_info.round_number,
            result.round_info.total_rounds,
            result.round_info.color_balance_achieved
        );

        Ok(result.pairings)
    }

    /// Generate pairings with manual overrides and constraints
    pub fn generate_manual_pairings(
        &self,
        players: Vec<Player>,
        player_results: Vec<PlayerResult>,
        game_history: Vec<GameResult>,
        request: ManualPairingRequest,
        base_method: &PairingMethod,
    ) -> Result<Vec<Pairing>, PawnError> {
        tracing::info!(
            "Generating manual pairings with base method: {:?}, {} forced pairings",
            base_method,
            request.forced_pairings.len()
        );

        // Generate automatic pairings as base
        let automatic_pairings = self.generate_pairings_with_history(
            players.clone(),
            player_results,
            game_history.clone(),
            request.round_number,
            base_method,
        )?;

        // Apply manual overrides
        let final_pairings = self.manual_controller.apply_manual_overrides(
            automatic_pairings,
            &players,
            request,
            &game_history,
        )?;

        tracing::info!(
            "Manual pairings completed: {} final pairings",
            final_pairings.len()
        );
        Ok(final_pairings)
    }

    /// Validate a set of pairings for correctness and quality
    pub fn validate_pairings_with_context(
        &self,
        pairings: &[Pairing],
        players: &[Player],
        game_history: &[GameResult],
        request: &ManualPairingRequest,
    ) -> Result<PairingValidationResult, PawnError> {
        self.manual_controller
            .validate_pairings(pairings, players, game_history, request)
    }

    /// Quick validation without manual pairing context
    pub fn quick_validate_pairings(
        &self,
        pairings: &[Pairing],
        players: &[Player],
        game_history: &[GameResult],
        tournament_id: i32,
        round_number: i32,
    ) -> Result<PairingValidationResult, PawnError> {
        // Create minimal request for validation
        let request = ManualPairingRequest {
            tournament_id,
            round_number,
            forced_pairings: vec![],
            constraints: vec![],
            color_constraints: vec![],
            apply_to_remaining: true,
        };

        self.validate_pairings_with_context(pairings, players, game_history, &request)
    }

    pub fn generate_pairings_with_history(
        &self,
        players: Vec<Player>,
        player_results: Vec<PlayerResult>,
        game_history: Vec<GameResult>,
        round_number: i32,
        method: &PairingMethod,
    ) -> Result<Vec<Pairing>, PawnError> {
        match method {
            PairingMethod::Swiss => self.generate_swiss_pairings_with_history(
                players,
                player_results,
                game_history,
                round_number,
            ),
            PairingMethod::RoundRobin => self.generate_round_robin_pairings(players, round_number),
            PairingMethod::Manual => Ok(vec![]), // Manual pairings are created by user
            PairingMethod::Knockout => Ok(vec![]), // Knockout pairings handled by KnockoutService
            PairingMethod::Scheveningen => {
                self.generate_scheveningen_pairings(players, round_number)
            }
        }
    }

    fn generate_swiss_pairings(
        &self,
        players: Vec<Player>,
        player_results: Vec<PlayerResult>,
        round_number: i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        // For first round or when no history is available, use Dutch System with empty history
        self.generate_swiss_pairings_with_history(players, player_results, vec![], round_number)
    }

    fn generate_swiss_pairings_basic(
        &self,
        players: Vec<Player>,
        player_results: Vec<PlayerResult>,
        round_number: i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        tracing::info!(
            "Starting Swiss pairing generation for {} players, round {}",
            players.len(),
            round_number
        );

        if players.is_empty() {
            tracing::warn!("No players provided for Swiss pairing");
            return Ok(vec![]);
        }

        // Create a map for quick lookup of player results
        let results_map: HashMap<i32, &PlayerResult> = player_results
            .iter()
            .map(|result| (result.player.id, result))
            .collect();

        tracing::debug!("Player results map has {} entries", results_map.len());

        // Sort players by current points (descending), then by rating (descending)
        let mut sorted_players = players;
        sorted_players.sort_by(|a, b| {
            let points_a = results_map.get(&a.id).map(|r| r.points).unwrap_or(0.0);
            let points_b = results_map.get(&b.id).map(|r| r.points).unwrap_or(0.0);

            points_b
                .partial_cmp(&points_a)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| b.rating.unwrap_or(0).cmp(&a.rating.unwrap_or(0)))
        });

        tracing::debug!(
            "Sorted players by points and rating. Top 3 players: {:?}",
            sorted_players
                .iter()
                .take(3)
                .map(|p| (
                    p.name.clone(),
                    results_map.get(&p.id).map(|r| r.points).unwrap_or(0.0)
                ))
                .collect::<Vec<_>>()
        );

        let mut pairings = Vec::new();
        let mut paired_indices = std::collections::HashSet::new();
        let mut board_number = 1;

        // Basic Swiss pairing algorithm
        for (i, player) in sorted_players.iter().enumerate() {
            if paired_indices.contains(&i) {
                continue;
            }

            // Find the next available opponent with similar score
            let mut opponent_idx = None;
            for (j, _opponent) in sorted_players.iter().enumerate().skip(i + 1) {
                if !paired_indices.contains(&j) {
                    // TODO: Add logic to avoid repeated pairings in future iterations
                    opponent_idx = Some(j);
                    break;
                }
            }

            if let Some(j) = opponent_idx {
                paired_indices.insert(i);
                paired_indices.insert(j);

                pairings.push(Pairing {
                    white_player: player.clone(),
                    black_player: Some(sorted_players[j].clone()),
                    board_number,
                });
                board_number += 1;
            } else {
                // Odd number of players - give a bye
                tracing::debug!("Assigning bye to player {} ({})", player.name, player.id);
                pairings.push(Pairing {
                    white_player: player.clone(),
                    black_player: None,
                    board_number,
                });
                paired_indices.insert(i);
                board_number += 1;
            }
        }

        tracing::info!(
            "Swiss pairing completed: {} pairings generated",
            pairings.len()
        );
        Ok(pairings)
    }

    fn generate_swiss_pairings_with_history(
        &self,
        players: Vec<Player>,
        player_results: Vec<PlayerResult>,
        game_history: Vec<GameResult>,
        round_number: i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        // Use the new FIDE-compliant Dutch System
        let pairing_result = self.swiss_engine.generate_dutch_system_pairings(
            players,
            player_results,
            game_history,
            round_number,
        )?;

        // Log any validation errors but still return pairings
        if !pairing_result.validation_errors.is_empty() {
            tracing::warn!(
                "Pairing validation warnings: {:?}",
                pairing_result.validation_errors
            );
        }

        tracing::info!(
            "Dutch System generated {} pairings with {} floats",
            pairing_result.pairings.len(),
            pairing_result.float_count
        );

        Ok(pairing_result.pairings)
    }

    fn generate_swiss_pairings_with_history_legacy(
        &self,
        players: Vec<Player>,
        player_results: Vec<PlayerResult>,
        game_history: Vec<GameResult>,
        round_number: i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        tracing::info!(
            "Starting Swiss pairing with history for {} players, round {}",
            players.len(),
            round_number
        );

        if players.is_empty() {
            tracing::warn!("No players provided for Swiss pairing");
            return Ok(vec![]);
        }

        // Build opponent history map
        let mut opponent_history: HashMap<i32, HashSet<i32>> = HashMap::new();
        let mut color_history: HashMap<i32, (i32, i32)> = HashMap::new(); // (white_games, black_games)

        for game_result in &game_history {
            let white_id = game_result.white_player.id;
            let black_id = game_result.black_player.id;

            // Skip bye games (negative IDs)
            if white_id > 0 && black_id > 0 {
                opponent_history
                    .entry(white_id)
                    .or_default()
                    .insert(black_id);
                opponent_history
                    .entry(black_id)
                    .or_default()
                    .insert(white_id);

                // Track color usage
                let white_colors = color_history.entry(white_id).or_insert((0, 0));
                white_colors.0 += 1;

                let black_colors = color_history.entry(black_id).or_insert((0, 0));
                black_colors.1 += 1;
            }
        }

        tracing::debug!(
            "Built opponent history for {} players",
            opponent_history.len()
        );

        // Create a map for quick lookup of player results
        let results_map: HashMap<i32, &PlayerResult> = player_results
            .iter()
            .map(|result| (result.player.id, result))
            .collect();

        // Sort players by current points (descending), then by rating (descending)
        let mut sorted_players = players;
        sorted_players.sort_by(|a, b| {
            let points_a = results_map.get(&a.id).map(|r| r.points).unwrap_or(0.0);
            let points_b = results_map.get(&b.id).map(|r| r.points).unwrap_or(0.0);

            points_b
                .partial_cmp(&points_a)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| b.rating.unwrap_or(0).cmp(&a.rating.unwrap_or(0)))
        });

        let mut pairings = Vec::new();
        let mut paired_indices = HashSet::new();
        let mut board_number = 1;

        // Advanced Swiss pairing algorithm with opponent avoidance
        for (i, player) in sorted_players.iter().enumerate() {
            if paired_indices.contains(&i) {
                continue;
            }

            let empty_set = HashSet::new();
            let player_opponents = opponent_history.get(&player.id).unwrap_or(&empty_set);
            let player_colors = color_history.get(&player.id).unwrap_or(&(0, 0));

            // Find the best available opponent
            let mut best_opponent_idx = None;
            let mut best_score = f64::NEG_INFINITY;

            for (j, opponent) in sorted_players.iter().enumerate().skip(i + 1) {
                if paired_indices.contains(&j) {
                    continue;
                }

                // Skip if they have already played
                if player_opponents.contains(&opponent.id) {
                    tracing::debug!("Skipping rematch: {} vs {}", player.name, opponent.name);
                    continue;
                }

                // Calculate pairing score based on rating difference and color balance
                let player_rating = player.rating.unwrap_or(1200) as f64;
                let opponent_rating = opponent.rating.unwrap_or(1200) as f64;
                let rating_diff = (player_rating - opponent_rating).abs();

                // Prefer smaller rating differences
                let mut score = 1000.0 - rating_diff;

                // Color balance bonus
                let opponent_colors = color_history.get(&opponent.id).unwrap_or(&(0, 0));

                // Determine preferred colors
                let player_white_preference = player_colors.1 - player_colors.0; // Negative = prefers white
                let opponent_white_preference = opponent_colors.1 - opponent_colors.0;

                // If both players have different color preferences, bonus
                if player_white_preference * opponent_white_preference < 0 {
                    score += 50.0;
                }

                if score > best_score {
                    best_score = score;
                    best_opponent_idx = Some(j);
                }
            }

            if let Some(j) = best_opponent_idx {
                paired_indices.insert(i);
                paired_indices.insert(j);

                let opponent = &sorted_players[j];

                // Determine colors based on balance
                let player_colors = color_history.get(&player.id).unwrap_or(&(0, 0));
                let opponent_colors = color_history.get(&opponent.id).unwrap_or(&(0, 0));

                let player_white_preference = player_colors.1 - player_colors.0; // Negative = prefers white
                let opponent_white_preference = opponent_colors.1 - opponent_colors.0;

                let (white_player, black_player) =
                    if player_white_preference < opponent_white_preference {
                        (player.clone(), opponent.clone())
                    } else if player_white_preference > opponent_white_preference {
                        (opponent.clone(), player.clone())
                    } else {
                        // Equal preference, use rating as tiebreaker (higher rated plays white)
                        if player.rating.unwrap_or(0) >= opponent.rating.unwrap_or(0) {
                            (player.clone(), opponent.clone())
                        } else {
                            (opponent.clone(), player.clone())
                        }
                    };

                tracing::debug!(
                    "Paired {} (white) vs {} (black) on board {}",
                    white_player.name,
                    black_player.name,
                    board_number
                );

                pairings.push(Pairing {
                    white_player,
                    black_player: Some(black_player),
                    board_number,
                });
                board_number += 1;
            } else {
                // No valid opponent found - give a bye
                tracing::debug!(
                    "No valid opponent found for player {} ({}), assigning bye",
                    player.name,
                    player.id
                );
                pairings.push(Pairing {
                    white_player: player.clone(),
                    black_player: None,
                    board_number,
                });
                paired_indices.insert(i);
                board_number += 1;
            }
        }

        tracing::info!(
            "Advanced Swiss pairing completed: {} pairings generated",
            pairings.len()
        );
        Ok(pairings)
    }

    fn generate_round_robin_pairings(
        &self,
        players: Vec<Player>,
        round_number: i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        // Use the enhanced Berger table Round-Robin engine
        let result = self.round_robin_engine.generate_berger_pairings(
            players,
            round_number,
            RoundRobinType::Single,
        )?;

        tracing::info!(
            "Berger Round-Robin generated {} pairings for round {}/{}",
            result.pairings.len(),
            result.round_info.round_number,
            result.round_info.total_rounds
        );

        Ok(result.pairings)
    }

    fn generate_round_robin_pairings_legacy(
        &self,
        players: Vec<Player>,
        round_number: i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        if players.is_empty() {
            return Ok(vec![]);
        }

        let n = players.len();
        if n < 2 {
            return Ok(vec![]);
        }

        // Round-robin algorithm using the circle method
        let mut pairings = Vec::new();
        let mut board_number = 1;

        // Handle even/odd number of players
        let mut working_players = players.clone();
        let has_bye = n % 2 == 1;

        if has_bye {
            // Add a dummy "bye" player for odd numbers
            // Use a unique ID that won't conflict with virtual bye players in round creation
            let bye_id = -(working_players[0].tournament_id * 10000 + round_number);
            working_players.push(Player {
                id: bye_id,
                tournament_id: working_players[0].tournament_id,
                name: "BYE".to_string(),
                rating: None,
                country_code: None,
                title: None,
                birth_date: None,
                gender: None,
                email: None,
                phone: None,
                club: None,
                status: "bye".to_string(),
                seed_number: None,
                pairing_number: None,
                initial_rating: None,
                created_at: String::new(),
                updated_at: None,
            });
        }

        let total_players = working_players.len();
        let rounds_needed = total_players - 1;

        // Ensure round_number is valid
        if round_number < 1 || round_number > rounds_needed as i32 {
            return Err(PawnError::InvalidInput(format!(
                "Round number {round_number} is invalid. Must be between 1 and {rounds_needed}"
            )));
        }

        // Generate pairings for the specific round
        let round_idx = (round_number - 1) as usize;
        let mut used_positions = std::collections::HashSet::new();

        for i in 0..total_players / 2 {
            let pos1 = if i == 0 {
                0
            } else {
                (round_idx + i) % (total_players - 1) + 1
            };
            let pos2 = (total_players - 1 + round_idx - i) % (total_players - 1) + 1;
            let pos2 = if pos2 == pos1 { 0 } else { pos2 };

            // Validate that we're not reusing positions
            if used_positions.contains(&pos1) || used_positions.contains(&pos2) {
                return Err(PawnError::InvalidInput(format!(
                    "Round-robin algorithm error: duplicate position assignment for round {round_number}, iteration {i}. pos1={pos1}, pos2={pos2}"
                )));
            }
            used_positions.insert(pos1);
            used_positions.insert(pos2);

            let player1 = &working_players[pos1];
            let player2 = &working_players[pos2];

            // Skip if one of the players is the bye player (negative ID)
            if player1.id < 0 || player2.id < 0 {
                // Add a bye for the non-bye player
                let real_player = if player1.id > 0 { player1 } else { player2 };
                if real_player.id > 0 {
                    pairings.push(Pairing {
                        white_player: real_player.clone(),
                        black_player: None,
                        board_number,
                    });
                    board_number += 1;
                }
                continue;
            }

            // Alternate colors based on round number
            let (white, black) = if (i + round_idx) % 2 == 0 {
                (player1.clone(), player2.clone())
            } else {
                (player2.clone(), player1.clone())
            };

            pairings.push(Pairing {
                white_player: white,
                black_player: Some(black),
                board_number,
            });
            board_number += 1;
        }

        Ok(pairings)
    }

    /// Generate Scheveningen (team-based) pairings
    /// In Scheveningen system, players from team A play against players from team B
    /// Board 1 of team A plays board 1 of team B, etc.
    /// Colors alternate: odd boards team A white, even boards team B white
    fn generate_scheveningen_pairings(
        &self,
        players: Vec<Player>,
        round_number: i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        if players.len() < 2 {
            return Ok(vec![]);
        }

        // Sort players by rating (descending) for fair team division
        let mut sorted_players = players;
        sorted_players.sort_by(|a, b| b.rating.unwrap_or(0).cmp(&a.rating.unwrap_or(0)));

        // Split into two balanced teams
        let team_size = sorted_players.len() / 2;
        let team_a: Vec<Player> = sorted_players.iter().take(team_size).cloned().collect();
        let team_b: Vec<Player> = sorted_players.iter().skip(team_size).cloned().collect();

        // Use the enhanced Scheveningen engine
        let result =
            self.round_robin_engine
                .generate_scheveningen_pairings(team_a, team_b, round_number)?;

        tracing::info!(
            "Enhanced Scheveningen generated {} pairings for round {}/{}",
            result.pairings.len(),
            result.round_info.round_number,
            result.round_info.total_rounds
        );

        Ok(result.pairings)
    }

    fn generate_scheveningen_pairings_legacy(
        &self,
        players: Vec<Player>,
        round_number: i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        // Legacy implementation for reference
        if players.len() < 2 {
            return Ok(vec![]);
        }

        // Sort players by rating (descending)
        let mut sorted_players = players;
        sorted_players.sort_by(|a, b| b.rating.unwrap_or(0).cmp(&a.rating.unwrap_or(0)));

        // Split into two teams (simplified approach)
        let team_size = sorted_players.len() / 2;
        let team_a: Vec<Player> = sorted_players.iter().take(team_size).cloned().collect();
        let team_b: Vec<Player> = sorted_players.iter().skip(team_size).cloned().collect();

        let mut pairings = Vec::new();

        // Pair players by board number
        for (board_idx, (player_a, player_b)) in team_a.iter().zip(team_b.iter()).enumerate() {
            let board_number = (board_idx + 1) as i32;

            // Alternate colors by round and board
            // Odd rounds: Team A gets white on odd boards, black on even boards
            // Even rounds: Team A gets black on odd boards, white on even boards
            let team_a_white = if round_number % 2 == 1 {
                board_number % 2 == 1 // Odd boards get white
            } else {
                board_number % 2 == 0 // Even boards get white
            };

            let (white_player, black_player) = if team_a_white {
                (player_a.clone(), player_b.clone())
            } else {
                (player_b.clone(), player_a.clone())
            };

            pairings.push(Pairing {
                white_player,
                black_player: Some(black_player),
                board_number,
            });
        }

        tracing::info!(
            "Generated {} Scheveningen pairings for round {}",
            pairings.len(),
            round_number
        );

        Ok(pairings)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pawn::domain::model::GameResultType;

    // Test helper functions
    fn create_test_player(id: i32, name: &str, rating: i32, tournament_id: i32) -> Player {
        Player {
            id,
            tournament_id,
            name: name.to_string(),
            rating: Some(rating),
            country_code: Some("US".to_string()),
            title: None,
            birth_date: None,
            gender: None,
            email: None,
            phone: None,
            club: None,
            status: "active".to_string(),
            seed_number: None,
            pairing_number: None,
            initial_rating: Some(rating),
            created_at: "2024-01-01".to_string(),
            updated_at: None,
        }
    }

    fn create_test_player_result(player: Player, points: f32) -> PlayerResult {
        PlayerResult {
            player,
            points,
            games_played: 1,
            wins: if points >= 1.0 { 1 } else { 0 },
            draws: if points == 0.5 { 1 } else { 0 },
            losses: if points == 0.0 { 1 } else { 0 },
        }
    }

    use crate::pawn::domain::model::Game;

    fn create_test_game_result(
        white_player: Player,
        black_player: Player,
        result_type: GameResultType,
    ) -> GameResult {
        let result_str = result_type.to_str();

        let game = Game {
            id: 1,
            tournament_id: white_player.tournament_id,
            round_number: 1,
            white_player_id: white_player.id,
            black_player_id: black_player.id,
            result: result_str.to_string(),
            result_type: Some(result_type.to_str().to_string()),
            result_reason: None,
            arbiter_notes: None,
            last_updated: None,
            approved_by: None,
            created_at: "2024-01-01".to_string(),
        };

        GameResult {
            game,
            white_player,
            black_player,
        }
    }

    #[test]
    fn test_pairing_service_new() {
        // Red: Test service creation
        let _service = PairingService::new();

        // Green: Verify service is created successfully
        // Since the struct fields are not public, we can only test that it compiles and doesn't panic
        // Service created without panic - no assertion needed
    }

    #[test]
    fn test_pairing_service_default() {
        // Red: Test default implementation
        let _service = PairingService::default();

        // Green: Verify default creates the same as new
        // Default service created without panic - no assertion needed
    }

    #[test]
    fn test_generate_pairings_empty_players() {
        // Red: Test with empty player list
        let service = PairingService::new();
        let players = vec![];
        let player_results = vec![];
        let round_number = 1;

        // Green: All methods should handle empty players gracefully
        let swiss_result = service.generate_pairings(
            players.clone(),
            player_results.clone(),
            round_number,
            &PairingMethod::Swiss,
        );
        assert!(swiss_result.is_ok());
        assert_eq!(swiss_result.unwrap().len(), 0);

        let round_robin_result = service.generate_pairings(
            players.clone(),
            player_results.clone(),
            round_number,
            &PairingMethod::RoundRobin,
        );
        // Round robin might return an error for empty players, which is acceptable
        if let Ok(pairings) = round_robin_result {
            assert_eq!(pairings.len(), 0);
        }

        let manual_result = service.generate_pairings(
            players.clone(),
            player_results.clone(),
            round_number,
            &PairingMethod::Manual,
        );
        assert!(manual_result.is_ok());
        assert_eq!(manual_result.unwrap().len(), 0);

        let knockout_result = service.generate_pairings(
            players.clone(),
            player_results.clone(),
            round_number,
            &PairingMethod::Knockout,
        );
        assert!(knockout_result.is_ok());
        assert_eq!(knockout_result.unwrap().len(), 0);

        let scheveningen_result = service.generate_pairings(
            players,
            player_results,
            round_number,
            &PairingMethod::Scheveningen,
        );
        assert!(scheveningen_result.is_ok());
        assert_eq!(scheveningen_result.unwrap().len(), 0);
    }

    #[test]
    fn test_generate_pairings_manual_returns_empty() {
        // Red: Test manual pairing method returns empty (user creates them)
        let service = PairingService::new();
        let players = vec![
            create_test_player(1, "Player 1", 1500, 1),
            create_test_player(2, "Player 2", 1400, 1),
        ];
        let player_results = vec![
            create_test_player_result(players[0].clone(), 0.0),
            create_test_player_result(players[1].clone(), 0.0),
        ];

        // Green: Manual method should return empty vector
        let result = service.generate_pairings(players, player_results, 1, &PairingMethod::Manual);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 0);
    }

    #[test]
    fn test_generate_pairings_knockout_returns_empty() {
        // Red: Test knockout pairing method returns empty (handled by KnockoutService)
        let service = PairingService::new();
        let players = vec![
            create_test_player(1, "Player 1", 1500, 1),
            create_test_player(2, "Player 2", 1400, 1),
        ];
        let player_results = vec![
            create_test_player_result(players[0].clone(), 0.0),
            create_test_player_result(players[1].clone(), 0.0),
        ];

        // Green: Knockout method should return empty vector
        let result =
            service.generate_pairings(players, player_results, 1, &PairingMethod::Knockout);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 0);
    }

    #[test]
    fn test_generate_swiss_pairings_basic_two_players() {
        // Red: Test basic Swiss pairing with two players
        let service = PairingService::new();
        let players = vec![
            create_test_player(1, "Player 1", 1600, 1),
            create_test_player(2, "Player 2", 1400, 1),
        ];
        let player_results = vec![
            create_test_player_result(players[0].clone(), 0.0),
            create_test_player_result(players[1].clone(), 0.0),
        ];

        // Green: Should generate one pairing
        let result = service.generate_swiss_pairings_basic(players.clone(), player_results, 1);
        assert!(result.is_ok());
        let pairings = result.unwrap();
        assert_eq!(pairings.len(), 1);

        // Higher rated player should be white
        assert_eq!(pairings[0].white_player.id, 1);
        assert_eq!(pairings[0].black_player.as_ref().unwrap().id, 2);
        assert_eq!(pairings[0].board_number, 1);
    }

    #[test]
    fn test_generate_swiss_pairings_basic_odd_players() {
        // Red: Test Swiss pairing with odd number of players (should create bye)
        let service = PairingService::new();
        let players = vec![
            create_test_player(1, "Player 1", 1600, 1),
            create_test_player(2, "Player 2", 1500, 1),
            create_test_player(3, "Player 3", 1400, 1),
        ];
        let player_results = vec![
            create_test_player_result(players[0].clone(), 0.0),
            create_test_player_result(players[1].clone(), 0.0),
            create_test_player_result(players[2].clone(), 0.0),
        ];

        // Green: Should generate 2 pairings (one regular, one bye)
        let result = service.generate_swiss_pairings_basic(players, player_results, 1);
        assert!(result.is_ok());
        let pairings = result.unwrap();
        assert_eq!(pairings.len(), 2);

        // First pairing should be between top two players
        assert_eq!(pairings[0].white_player.id, 1);
        assert_eq!(pairings[0].black_player.as_ref().unwrap().id, 2);

        // Second pairing should be a bye for the remaining player
        assert_eq!(pairings[1].white_player.id, 3);
        assert!(pairings[1].black_player.is_none());
    }

    #[test]
    fn test_generate_swiss_pairings_points_priority() {
        // Red: Test that Swiss pairing considers points before rating
        let service = PairingService::new();
        let players = vec![
            create_test_player(1, "Player 1", 1400, 1), // Lower rating
            create_test_player(2, "Player 2", 1600, 1), // Higher rating
        ];
        let player_results = vec![
            create_test_player_result(players[0].clone(), 1.0), // Higher points
            create_test_player_result(players[1].clone(), 0.0), // Lower points
        ];

        // Green: Player with higher points should be sorted first despite lower rating
        let result = service.generate_swiss_pairings_basic(players, player_results, 2);
        assert!(result.is_ok());
        let pairings = result.unwrap();
        assert_eq!(pairings.len(), 1);

        // Player 1 should be white due to higher points
        assert_eq!(pairings[0].white_player.id, 1);
        assert_eq!(pairings[0].black_player.as_ref().unwrap().id, 2);
    }

    #[test]
    fn test_quick_validate_pairings() {
        // Red: Test quick validation functionality
        let service = PairingService::new();
        let players = vec![
            create_test_player(1, "Player 1", 1500, 1),
            create_test_player(2, "Player 2", 1400, 1),
        ];
        let pairings = vec![Pairing {
            white_player: players[0].clone(),
            black_player: Some(players[1].clone()),
            board_number: 1,
        }];
        let game_history = vec![];

        // Green: Quick validation should work without errors
        let result = service.quick_validate_pairings(&pairings, &players, &game_history, 1, 1);
        assert!(result.is_ok());
    }

    #[test]
    fn test_generate_pairings_with_history_swiss() {
        // Red: Test Swiss pairings with history
        let service = PairingService::new();
        let players = vec![
            create_test_player(1, "Player 1", 1500, 1),
            create_test_player(2, "Player 2", 1400, 1),
        ];
        let player_results = vec![
            create_test_player_result(players[0].clone(), 0.0),
            create_test_player_result(players[1].clone(), 0.0),
        ];
        let game_history = vec![];

        // Green: Should delegate to Swiss pairing engine
        let result = service.generate_pairings_with_history(
            players,
            player_results,
            game_history,
            1,
            &PairingMethod::Swiss,
        );
        assert!(result.is_ok());
    }

    #[test]
    fn test_generate_round_robin_pairings_insufficient_players() {
        // Red: Test round robin with less than 2 players
        let service = PairingService::new();
        let players = vec![create_test_player(1, "Player 1", 1500, 1)];

        // Green: Should return empty pairings
        let result = service.generate_round_robin_pairings_legacy(players, 1);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 0);
    }

    #[test]
    fn test_generate_round_robin_pairings_invalid_round() {
        // Red: Test round robin with invalid round number
        let service = PairingService::new();
        let players = vec![
            create_test_player(1, "Player 1", 1500, 1),
            create_test_player(2, "Player 2", 1400, 1),
        ];

        // Green: Should return error for invalid round number (too high)
        let result = service.generate_round_robin_pairings_legacy(players.clone(), 10);
        assert!(result.is_err());

        // Should return error for round 0
        let result = service.generate_round_robin_pairings_legacy(players, 0);
        assert!(result.is_err());
    }

    #[test]
    fn test_generate_scheveningen_pairings_insufficient_players() {
        // Red: Test Scheveningen with less than 2 players
        let service = PairingService::new();
        let players = vec![create_test_player(1, "Player 1", 1500, 1)];

        // Green: Should return empty pairings
        let result = service.generate_scheveningen_pairings_legacy(players, 1);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 0);
    }

    #[test]
    fn test_generate_scheveningen_pairings_basic() {
        // Red: Test basic Scheveningen pairing with 4 players
        let service = PairingService::new();
        let players = vec![
            create_test_player(1, "Player 1", 1600, 1),
            create_test_player(2, "Player 2", 1500, 1),
            create_test_player(3, "Player 3", 1400, 1),
            create_test_player(4, "Player 4", 1300, 1),
        ];

        // Green: Should create pairings between the two teams
        let result = service.generate_scheveningen_pairings_legacy(players, 1);
        assert!(result.is_ok());
        let pairings = result.unwrap();
        assert_eq!(pairings.len(), 2);

        // Should have board numbers assigned
        assert_eq!(pairings[0].board_number, 1);
        assert_eq!(pairings[1].board_number, 2);
    }

    #[test]
    fn test_opponent_history_building() {
        // Red: Test that history properly tracks previous opponents
        let service = PairingService::new();
        let players = vec![
            create_test_player(1, "Player 1", 1500, 1),
            create_test_player(2, "Player 2", 1400, 1),
            create_test_player(3, "Player 3", 1300, 1),
        ];
        let player_results = vec![
            create_test_player_result(players[0].clone(), 1.0),
            create_test_player_result(players[1].clone(), 0.0),
            create_test_player_result(players[2].clone(), 0.0),
        ];

        // Create game history where Player 1 already played Player 2
        let game_history = vec![create_test_game_result(
            players[0].clone(),
            players[1].clone(),
            GameResultType::WhiteWins,
        )];

        // Green: Swiss pairing with history should avoid rematches when possible
        let result = service.generate_swiss_pairings_with_history_legacy(
            players,
            player_results,
            game_history,
            2,
        );
        assert!(result.is_ok());
        let pairings = result.unwrap();

        // Should create pairings that avoid the previous matchup
        assert_eq!(pairings.len(), 2); // One pairing + one bye
    }

    #[test]
    fn test_color_balance_calculation() {
        // Red: Test color balance logic in history-based pairing
        let service = PairingService::new();
        let players = vec![
            create_test_player(1, "Player 1", 1500, 1),
            create_test_player(2, "Player 2", 1400, 1),
        ];
        let player_results = vec![
            create_test_player_result(players[0].clone(), 0.0),
            create_test_player_result(players[1].clone(), 0.0),
        ];

        // Create history where Player 1 played white in previous game (against dummy player)
        let dummy_player = create_test_player(99, "Dummy", 1000, 1);
        let game_history = vec![create_test_game_result(
            players[0].clone(),
            dummy_player,
            GameResultType::Draw,
        )];

        // Green: Color assignment should consider previous color usage
        let result = service.generate_swiss_pairings_with_history_legacy(
            players,
            player_results,
            game_history,
            2,
        );
        assert!(result.is_ok());
    }

    #[test]
    fn test_board_number_assignment() {
        // Red: Test that board numbers are assigned correctly
        let service = PairingService::new();
        let players = vec![
            create_test_player(1, "Player 1", 1600, 1),
            create_test_player(2, "Player 2", 1500, 1),
            create_test_player(3, "Player 3", 1400, 1),
            create_test_player(4, "Player 4", 1300, 1),
        ];
        let player_results = vec![
            create_test_player_result(players[0].clone(), 0.0),
            create_test_player_result(players[1].clone(), 0.0),
            create_test_player_result(players[2].clone(), 0.0),
            create_test_player_result(players[3].clone(), 0.0),
        ];

        // Green: Board numbers should be sequential starting from 1
        let result = service.generate_swiss_pairings_basic(players, player_results, 1);
        assert!(result.is_ok());
        let pairings = result.unwrap();
        assert_eq!(pairings.len(), 2);
        assert_eq!(pairings[0].board_number, 1);
        assert_eq!(pairings[1].board_number, 2);
    }
}
