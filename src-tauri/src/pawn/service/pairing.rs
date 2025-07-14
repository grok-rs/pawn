use std::collections::{HashMap, HashSet};
use crate::pawn::{
    common::error::PawnError,
    domain::model::{Player, PlayerResult, Pairing, PairingMethod, GameResult, Team, TeamMembership, BoardPairing},
};

pub struct PairingService;

impl PairingService {
    pub fn new() -> Self {
        Self
    }

    pub fn generate_pairings(
        &self,
        players: Vec<Player>,
        player_results: Vec<PlayerResult>,
        round_number: i32,
        method: &PairingMethod,
    ) -> Result<Vec<Pairing>, PawnError> {
        match method {
            PairingMethod::Swiss => self.generate_swiss_pairings(players, player_results, round_number),
            PairingMethod::RoundRobin => self.generate_round_robin_pairings(players, round_number),
            PairingMethod::Manual => Ok(vec![]), // Manual pairings are created by user
            PairingMethod::Knockout => Ok(vec![]), // Knockout pairings handled by KnockoutService
            PairingMethod::Scheveningen => self.generate_scheveningen_pairings(players, round_number),
        }
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
            PairingMethod::Swiss => self.generate_swiss_pairings_with_history(players, player_results, game_history, round_number),
            PairingMethod::RoundRobin => self.generate_round_robin_pairings(players, round_number),
            PairingMethod::Manual => Ok(vec![]), // Manual pairings are created by user
            PairingMethod::Knockout => Ok(vec![]), // Knockout pairings handled by KnockoutService
            PairingMethod::Scheveningen => self.generate_scheveningen_pairings(players, round_number),
        }
    }

    fn generate_swiss_pairings(
        &self,
        players: Vec<Player>,
        player_results: Vec<PlayerResult>,
        round_number: i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        tracing::info!("Starting Swiss pairing generation for {} players, round {}", players.len(), round_number);
        
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
            
            points_b.partial_cmp(&points_a)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| {
                    b.rating.unwrap_or(0).cmp(&a.rating.unwrap_or(0))
                })
        });

        tracing::debug!("Sorted players by points and rating. Top 3 players: {:?}", 
                      sorted_players.iter().take(3).map(|p| (p.name.clone(), results_map.get(&p.id).map(|r| r.points).unwrap_or(0.0))).collect::<Vec<_>>());

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

        tracing::info!("Swiss pairing completed: {} pairings generated", pairings.len());
        Ok(pairings)
    }

    fn generate_swiss_pairings_with_history(
        &self,
        players: Vec<Player>,
        player_results: Vec<PlayerResult>,
        game_history: Vec<GameResult>,
        round_number: i32,
    ) -> Result<Vec<Pairing>, PawnError> {
        tracing::info!("Starting Swiss pairing with history for {} players, round {}", players.len(), round_number);
        
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
                opponent_history.entry(white_id).or_default().insert(black_id);
                opponent_history.entry(black_id).or_default().insert(white_id);
                
                // Track color usage
                let white_colors = color_history.entry(white_id).or_insert((0, 0));
                white_colors.0 += 1;
                
                let black_colors = color_history.entry(black_id).or_insert((0, 0));
                black_colors.1 += 1;
            }
        }

        tracing::debug!("Built opponent history for {} players", opponent_history.len());

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
            
            points_b.partial_cmp(&points_a)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| {
                    b.rating.unwrap_or(0).cmp(&a.rating.unwrap_or(0))
                })
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
                
                let (white_player, black_player) = if player_white_preference < opponent_white_preference {
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

                tracing::debug!("Paired {} (white) vs {} (black) on board {}", 
                              white_player.name, black_player.name, board_number);

                pairings.push(Pairing {
                    white_player,
                    black_player: Some(black_player),
                    board_number,
                });
                board_number += 1;
            } else {
                // No valid opponent found - give a bye
                tracing::debug!("No valid opponent found for player {} ({}), assigning bye", player.name, player.id);
                pairings.push(Pairing {
                    white_player: player.clone(),
                    black_player: None,
                    board_number,
                });
                paired_indices.insert(i);
                board_number += 1;
            }
        }

        tracing::info!("Advanced Swiss pairing completed: {} pairings generated", pairings.len());
        Ok(pairings)
    }

    fn generate_round_robin_pairings(
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
                created_at: String::new(),
                updated_at: None,
            });
        }

        let total_players = working_players.len();
        let rounds_needed = total_players - 1;

        // Ensure round_number is valid
        if round_number < 1 || round_number > rounds_needed as i32 {
            return Err(PawnError::InvalidInput(format!(
                "Round number {} is invalid. Must be between 1 and {}",
                round_number, rounds_needed
            )));
        }

        // Generate pairings for the specific round
        let round_idx = (round_number - 1) as usize;
        let mut used_positions = std::collections::HashSet::new();
        
        for i in 0..total_players / 2 {
            let pos1 = if i == 0 { 0 } else { (round_idx + i) % (total_players - 1) + 1 };
            let pos2 = (total_players - 1 + round_idx - i) % (total_players - 1) + 1;
            let pos2 = if pos2 == pos1 { 0 } else { pos2 };

            // Validate that we're not reusing positions
            if used_positions.contains(&pos1) || used_positions.contains(&pos2) {
                return Err(PawnError::InvalidInput(format!(
                    "Round-robin algorithm error: duplicate position assignment for round {}, iteration {}. pos1={}, pos2={}",
                    round_number, i, pos1, pos2
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
        // Note: This is a simplified implementation
        // In a full implementation, we would need team information from the database
        // For now, we'll group players by some criteria (e.g., rating) to simulate teams
        
        if players.len() < 2 {
            return Ok(vec![]);
        }

        // Sort players by rating (descending)
        let mut sorted_players = players;
        sorted_players.sort_by(|a, b| {
            b.rating.unwrap_or(0).cmp(&a.rating.unwrap_or(0))
        });

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