use crate::pawn::domain::model::{
    BracketType, BracketPosition, BracketPositionStatus, KnockoutBracket, 
    Player, Pairing
};
use crate::pawn::common::error::PawnError;
use std::collections::HashMap;

pub struct KnockoutService;

impl KnockoutService {
    /// Calculate the number of rounds needed for a knockout tournament
    pub fn calculate_rounds(player_count: i32) -> i32 {
        if player_count <= 1 {
            return 0;
        }
        (player_count as f64).log2().ceil() as i32
    }

    /// Calculate the next power of 2 that accommodates all players
    pub fn next_power_of_two(player_count: i32) -> i32 {
        if player_count <= 1 {
            return 2;
        }
        let mut power = 1;
        while power < player_count {
            power *= 2;
        }
        power
    }

    /// Generate a single elimination bracket
    pub fn generate_single_elimination_bracket(
        tournament_id: i32,
        players: Vec<Player>,
    ) -> Result<KnockoutBracket, PawnError> {
        let player_count = players.len() as i32;
        if player_count < 2 {
            return Err(PawnError::InvalidInput("At least 2 players required for knockout tournament".to_string()));
        }

        let total_rounds = Self::calculate_rounds(player_count);
        let _bracket_size = Self::next_power_of_two(player_count);

        Ok(KnockoutBracket {
            id: 0, // Will be set by database
            tournament_id,
            bracket_type: BracketType::SingleElimination.to_str().to_string(),
            total_rounds,
            created_at: chrono::Utc::now().to_rfc3339(),
        })
    }

    /// Generate bracket positions for the first round
    pub fn generate_first_round_positions(
        bracket_id: i32,
        players: Vec<Player>,
    ) -> Vec<BracketPosition> {
        let player_count = players.len() as i32;
        let bracket_size = Self::next_power_of_two(player_count);
        let mut positions = Vec::new();

        // Seed players into first round positions
        let seeded_players = Self::seed_players(players);
        
        for i in 0..bracket_size {
            let position = BracketPosition {
                id: 0, // Will be set by database
                bracket_id,
                round_number: 1,
                position_number: i + 1,
                player_id: seeded_players.get(i as usize).map(|p| p.id),
                advanced_from_position: None,
                status: if seeded_players.get(i as usize).is_some() {
                    BracketPositionStatus::Ready.to_str().to_string()
                } else {
                    BracketPositionStatus::Bye.to_str().to_string()
                },
                created_at: chrono::Utc::now().to_rfc3339(),
            };
            positions.push(position);
        }

        positions
    }

    /// Seed players using standard tournament seeding
    /// 1 vs lowest, 2 vs second-lowest, etc.
    fn seed_players(mut players: Vec<Player>) -> Vec<Player> {
        // Sort by rating (highest first) for seeding
        players.sort_by(|a, b| {
            let rating_a = a.rating.unwrap_or(1000);
            let rating_b = b.rating.unwrap_or(1000);
            rating_b.cmp(&rating_a)
        });

        let player_count = players.len();
        let bracket_size = Self::next_power_of_two(player_count as i32) as usize;
        let mut seeded = vec![None; bracket_size];

        // Standard seeding pattern
        for (i, player) in players.into_iter().enumerate() {
            let seed_position = Self::get_seed_position(i + 1, bracket_size);
            if seed_position > 0 && seed_position <= bracket_size {
                seeded[seed_position - 1] = Some(player);
            }
        }

        seeded.into_iter().flatten().collect()
    }

    /// Calculate standard tournament seed position
    /// Uses the standard bracket seeding algorithm
    fn get_seed_position(seed: usize, bracket_size: usize) -> usize {
        if seed == 1 {
            return 1;
        }
        if seed == 2 {
            return bracket_size;
        }

        // For other seeds, use recursive pattern
        let half = bracket_size / 2;
        if seed <= half {
            let pos = Self::get_seed_position(seed, half);
            if pos <= half / 2 {
                pos
            } else {
                half + 1 - (pos - half / 2)
            }
        } else {
            let pos = Self::get_seed_position(seed - half, half);
            half + pos
        }
    }

    /// Generate pairings for a specific round
    pub fn generate_round_pairings(
        _bracket_id: i32,
        round_number: i32,
        positions: &[BracketPosition],
    ) -> Vec<Pairing> {
        let round_positions: Vec<&BracketPosition> = positions
            .iter()
            .filter(|p| p.round_number == round_number && p.status == BracketPositionStatus::Ready.to_str())
            .collect();

        let mut pairings = Vec::new();
        let mut board_number = 1;

        for chunk in round_positions.chunks(2) {
            if chunk.len() == 2 {
                let white_pos = chunk[0];
                let black_pos = chunk[1];

                // Only create pairing if both positions have players
                if let (Some(white_id), Some(black_id)) = (white_pos.player_id, black_pos.player_id) {
                    // Note: This is a simplified pairing - in real implementation,
                    // we'd need to load the actual Player objects from the database
                    pairings.push(Pairing {
                        white_player: Player {
                            id: white_id,
                            tournament_id: 0,
                            name: format!("Player {}", white_id),
                            rating: None,
                            country_code: None,
                            title: None,
                            birth_date: None,
                            gender: None,
                            email: None,
                            phone: None,
                            club: None,
                            status: "active".to_string(),
                            created_at: chrono::Utc::now().to_rfc3339(),
                            updated_at: None,
                        },
                        black_player: Some(Player {
                            id: black_id,
                            tournament_id: 0,
                            name: format!("Player {}", black_id),
                            rating: None,
                            country_code: None,
                            title: None,
                            birth_date: None,
                            gender: None,
                            email: None,
                            phone: None,
                            club: None,
                            status: "active".to_string(),
                            created_at: chrono::Utc::now().to_rfc3339(),
                            updated_at: None,
                        }),
                        board_number,
                    });
                    board_number += 1;
                }
            } else if chunk.len() == 1 {
                // Bye situation - player advances automatically
                let bye_pos = chunk[0];
                if let Some(player_id) = bye_pos.player_id {
                    pairings.push(Pairing {
                        white_player: Player {
                            id: player_id,
                            tournament_id: 0,
                            name: format!("Player {}", player_id),
                            rating: None,
                            country_code: None,
                            title: None,
                            birth_date: None,
                            gender: None,
                            email: None,
                            phone: None,
                            club: None,
                            status: "active".to_string(),
                            created_at: chrono::Utc::now().to_rfc3339(),
                            updated_at: None,
                        },
                        black_player: None, // Bye
                        board_number,
                    });
                    board_number += 1;
                }
            }
        }

        pairings
    }

    /// Advance winners to the next round
    pub fn advance_winners(
        bracket_id: i32,
        round_number: i32,
        game_results: &[(i32, i32)], // (white_player_id, black_player_id) for winners
    ) -> Vec<BracketPosition> {
        let mut next_round_positions = Vec::new();
        let next_round = round_number + 1;
        let positions_per_round = (game_results.len() as f64 / 2.0).ceil() as i32;

        for (i, (winner_id, _)) in game_results.iter().enumerate() {
            let position = BracketPosition {
                id: 0, // Will be set by database
                bracket_id,
                round_number: next_round,
                position_number: (i + 1) as i32,
                player_id: Some(*winner_id),
                advanced_from_position: Some((round_number - 1) * positions_per_round + i as i32 + 1),
                status: BracketPositionStatus::Ready.to_str().to_string(),
                created_at: chrono::Utc::now().to_rfc3339(),
            };
            next_round_positions.push(position);
        }

        next_round_positions
    }

    /// Check if tournament is complete
    pub fn is_tournament_complete(positions: &[BracketPosition], total_rounds: i32) -> bool {
        // Tournament is complete when we have a winner in the final round
        positions
            .iter()
            .any(|p| p.round_number == total_rounds + 1 && p.player_id.is_some())
    }

    /// Get tournament winner
    pub fn get_tournament_winner(positions: &[BracketPosition], total_rounds: i32) -> Option<i32> {
        positions
            .iter()
            .find(|p| p.round_number == total_rounds + 1 && p.player_id.is_some())
            .and_then(|p| p.player_id)
    }

    /// Validate bracket integrity
    pub fn validate_bracket(positions: &[BracketPosition]) -> Result<(), PawnError> {
        // Check that all rounds have proper number of positions
        let mut rounds: HashMap<i32, Vec<&BracketPosition>> = HashMap::new();
        
        for position in positions {
            rounds.entry(position.round_number).or_default().push(position);
        }

        for (round_num, round_positions) in rounds.iter() {
            let expected_count = if *round_num == 1 {
                // First round can have any power of 2
                let count = round_positions.len();
                if !count.is_power_of_two() {
                    return Err(PawnError::InvalidInput(format!(
                        "Round {} must have power of 2 positions, found {}",
                        round_num, count
                    )));
                }
                count
            } else {
                // Subsequent rounds should have half the positions of previous round
                let prev_count = rounds.get(&(round_num - 1))
                    .map(|v| v.len())
                    .unwrap_or(0);
                prev_count / 2
            };

            if round_positions.len() != expected_count {
                return Err(PawnError::InvalidInput(format!(
                    "Round {} has {} positions, expected {}",
                    round_num, round_positions.len(), expected_count
                )));
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_rounds() {
        assert_eq!(KnockoutService::calculate_rounds(2), 1);
        assert_eq!(KnockoutService::calculate_rounds(4), 2);
        assert_eq!(KnockoutService::calculate_rounds(8), 3);
        assert_eq!(KnockoutService::calculate_rounds(16), 4);
        assert_eq!(KnockoutService::calculate_rounds(5), 3); // 5 players need 3 rounds (8 bracket)
    }

    #[test]
    fn test_next_power_of_two() {
        assert_eq!(KnockoutService::next_power_of_two(1), 2);
        assert_eq!(KnockoutService::next_power_of_two(2), 2);
        assert_eq!(KnockoutService::next_power_of_two(3), 4);
        assert_eq!(KnockoutService::next_power_of_two(8), 8);
        assert_eq!(KnockoutService::next_power_of_two(9), 16);
    }

    #[test]
    fn test_seed_position() {
        // Standard 8-player bracket seeding
        assert_eq!(KnockoutService::get_seed_position(1, 8), 1);
        assert_eq!(KnockoutService::get_seed_position(2, 8), 8);
        assert_eq!(KnockoutService::get_seed_position(3, 8), 5);
        assert_eq!(KnockoutService::get_seed_position(4, 8), 4);
    }
}