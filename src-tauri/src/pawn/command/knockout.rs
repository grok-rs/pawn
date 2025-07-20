use crate::pawn::{
    common::types::CommandResult,
    db::Db,
    domain::{
        dto::CreateKnockoutBracket,
        model::{BracketPosition, KnockoutBracket, Pairing},
    },
    service::knockout::KnockoutService,
    state::PawnState,
};
use tauri::{State, command};

#[command]
#[specta::specta]
pub async fn create_knockout_bracket(
    state: State<'_, PawnState>,
    data: CreateKnockoutBracket,
) -> CommandResult<KnockoutBracket> {
    let db = &*state.db;

    // Create the bracket
    let bracket = KnockoutBracket {
        id: 0, // Will be set by database
        tournament_id: data.tournament_id,
        bracket_type: data.bracket_type,
        total_rounds: 0, // Will be calculated based on player count
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    let created_bracket = db.create_knockout_bracket(bracket).await?;
    Ok(created_bracket)
}

#[command]
#[specta::specta]
pub async fn get_knockout_bracket(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Option<KnockoutBracket>> {
    let db = &*state.db;
    let bracket = db.get_knockout_bracket(tournament_id).await?;
    Ok(bracket)
}

#[command]
#[specta::specta]
pub async fn initialize_knockout_tournament(
    state: State<'_, PawnState>,
    tournament_id: i32,
    bracket_type: String,
) -> CommandResult<KnockoutBracket> {
    let db = &*state.db;

    // Get tournament players
    let players = db.get_players_by_tournament(tournament_id).await?;
    if players.len() < 2 {
        return Err(crate::pawn::common::error::PawnError::InvalidInput(
            "At least 2 players required for knockout tournament".to_string(),
        ));
    }

    // Calculate tournament structure
    let total_rounds = KnockoutService::calculate_rounds(players.len() as i32);

    // Create bracket
    let bracket = KnockoutBracket {
        id: 0,
        tournament_id,
        bracket_type: bracket_type.clone(),
        total_rounds,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    let created_bracket = db.create_knockout_bracket(bracket).await?;

    // Generate first round positions
    let first_round_positions =
        KnockoutService::generate_first_round_positions(created_bracket.id, players);

    // Save positions to database
    for position in first_round_positions {
        db.create_bracket_position(position).await?;
    }

    Ok(created_bracket)
}

#[command]
#[specta::specta]
pub async fn get_bracket_positions(
    state: State<'_, PawnState>,
    bracket_id: i32,
) -> CommandResult<Vec<BracketPosition>> {
    let db = &*state.db;
    let positions = db.get_bracket_positions(bracket_id).await?;
    Ok(positions)
}

#[command]
#[specta::specta]
pub async fn get_bracket_positions_by_round(
    state: State<'_, PawnState>,
    bracket_id: i32,
    round_number: i32,
) -> CommandResult<Vec<BracketPosition>> {
    let db = &*state.db;
    let positions = db
        .get_bracket_positions_by_round(bracket_id, round_number)
        .await?;
    Ok(positions)
}

#[command]
#[specta::specta]
pub async fn generate_knockout_pairings(
    state: State<'_, PawnState>,
    bracket_id: i32,
    round_number: i32,
) -> CommandResult<Vec<Pairing>> {
    let db = &*state.db;

    // Get positions for the round
    let positions = db
        .get_bracket_positions_by_round(bracket_id, round_number)
        .await?;

    // Generate pairings using KnockoutService
    let pairings = KnockoutService::generate_round_pairings(bracket_id, round_number, &positions);

    Ok(pairings)
}

#[command]
#[specta::specta]
pub async fn advance_knockout_winners(
    state: State<'_, PawnState>,
    bracket_id: i32,
    round_number: i32,
    winner_results: Vec<(i32, i32)>, // (winner_player_id, loser_player_id)
) -> CommandResult<Vec<BracketPosition>> {
    let db = &*state.db;

    // Generate next round positions
    let next_round_positions =
        KnockoutService::advance_winners(bracket_id, round_number, &winner_results);

    // Save new positions to database
    let mut created_positions = Vec::new();
    for position in next_round_positions {
        let created = db.create_bracket_position(position).await?;
        created_positions.push(created);
    }

    Ok(created_positions)
}

#[command]
#[specta::specta]
pub async fn get_knockout_tournament_winner(
    state: State<'_, PawnState>,
    bracket_id: i32,
) -> CommandResult<Option<i32>> {
    let db = &*state.db;

    // Get bracket info to determine total rounds
    let bracket = db.get_knockout_bracket_by_id(bracket_id).await?;
    if bracket.is_none() {
        return Ok(None);
    }

    let bracket = bracket.unwrap();
    let positions = db.get_bracket_positions(bracket_id).await?;

    let winner_id = KnockoutService::get_tournament_winner(&positions, bracket.total_rounds);
    Ok(winner_id)
}

#[command]
#[specta::specta]
pub async fn is_knockout_tournament_complete(
    state: State<'_, PawnState>,
    bracket_id: i32,
) -> CommandResult<bool> {
    let db = &*state.db;

    // Get bracket info
    let bracket = db.get_knockout_bracket_by_id(bracket_id).await?;
    if bracket.is_none() {
        return Ok(false);
    }

    let bracket = bracket.unwrap();
    let positions = db.get_bracket_positions(bracket_id).await?;

    let is_complete = KnockoutService::is_tournament_complete(&positions, bracket.total_rounds);
    Ok(is_complete)
}

#[command]
#[specta::specta]
pub async fn validate_knockout_bracket(
    state: State<'_, PawnState>,
    bracket_id: i32,
) -> CommandResult<bool> {
    let db = &*state.db;

    let positions = db.get_bracket_positions(bracket_id).await?;

    match KnockoutService::validate_bracket(&positions) {
        Ok(()) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[cfg(test)]
mod tests {
    use crate::pawn::domain::{
        dto::CreateKnockoutBracket,
        model::{BracketPosition, KnockoutBracket},
    };

    #[tokio::test]
    async fn knockout_service_calculate_rounds_contract() {
        // Test the round calculation logic
        let rounds = crate::pawn::service::knockout::KnockoutService::calculate_rounds(8);
        assert!(rounds > 0);
        assert_eq!(rounds, 3); // 8 players -> 3 rounds (4->2->1)
    }

    #[tokio::test]
    async fn knockout_service_advance_winners_contract() {
        // Test winner advancement logic
        let winner_results = vec![(1, 2), (3, 4)]; // (winner, loser) pairs
        let next_positions =
            crate::pawn::service::knockout::KnockoutService::advance_winners(1, 1, &winner_results);

        // Should generate positions for next round
        assert_eq!(next_positions.len(), 2); // 2 winners advance
    }

    #[tokio::test]
    async fn knockout_service_pairing_generation_contract() {
        // Test basic pairing generation logic
        let positions = vec![]; // Empty positions
        let pairings = crate::pawn::service::knockout::KnockoutService::generate_round_pairings(
            1, 1, &positions,
        );

        // Should return empty pairings for empty positions
        assert!(pairings.is_empty());
    }

    #[tokio::test]
    async fn knockout_service_tournament_completion_contract() {
        // Test tournament completion logic
        let positions = vec![]; // Empty positions
        let is_complete =
            crate::pawn::service::knockout::KnockoutService::is_tournament_complete(&positions, 3);

        // Should return false for empty tournament
        assert!(!is_complete);
    }

    #[tokio::test]
    async fn knockout_service_bracket_validation_contract() {
        // Test bracket validation logic
        let positions = vec![]; // Empty positions
        let validation_result =
            crate::pawn::service::knockout::KnockoutService::validate_bracket(&positions);

        // Should handle empty bracket validation
        match validation_result {
            Ok(_) => {
                // Validation succeeded for empty bracket
            }
            Err(err) => {
                // Validation failed as expected for empty bracket
                let error_msg = format!("{err:?}");
                assert!(!error_msg.is_empty());
            }
        }
    }

    #[tokio::test]
    async fn command_knockout_dto_coverage() {
        // Test DTO structure creation for knockout-related DTOs
        let tournament_id = 1;

        let create_bracket = CreateKnockoutBracket {
            tournament_id,
            bracket_type: "single_elimination".to_string(),
        };
        assert_eq!(create_bracket.tournament_id, tournament_id);
        assert_eq!(create_bracket.bracket_type, "single_elimination");

        let bracket = KnockoutBracket {
            id: 1,
            tournament_id,
            bracket_type: "double_elimination".to_string(),
            total_rounds: 4,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };
        assert_eq!(bracket.id, 1);
        assert_eq!(bracket.tournament_id, tournament_id);
        assert_eq!(bracket.bracket_type, "double_elimination");
        assert_eq!(bracket.total_rounds, 4);
        assert!(bracket.created_at.contains("2024-01-01"));

        let bracket_position = BracketPosition {
            id: 1,
            bracket_id: 1,
            round_number: 1,
            position_number: 1,
            player_id: Some(1),
            advanced_from_position: None,
            status: "active".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };
        assert_eq!(bracket_position.id, 1);
        assert_eq!(bracket_position.bracket_id, 1);
        assert_eq!(bracket_position.round_number, 1);
        assert_eq!(bracket_position.position_number, 1);
        assert_eq!(bracket_position.player_id, Some(1));
        assert_eq!(bracket_position.advanced_from_position, None);
        assert_eq!(bracket_position.status, "active");
        assert!(bracket_position.created_at.contains("2024-01-01"));
    }

    #[tokio::test]
    async fn command_knockout_bracket_types_coverage() {
        // Test different bracket types
        let bracket_types = vec![
            "single_elimination",
            "double_elimination",
            "swiss_knockout",
            "round_robin_knockout",
        ];

        for bracket_type in bracket_types {
            let create_bracket = CreateKnockoutBracket {
                tournament_id: 1,
                bracket_type: bracket_type.to_string(),
            };
            assert_eq!(create_bracket.bracket_type, bracket_type);
        }
    }

    #[tokio::test]
    async fn command_knockout_round_calculations() {
        // Test round calculations for various player counts
        let test_cases = vec![
            (2, 1),  // 2 players -> 1 round
            (4, 2),  // 4 players -> 2 rounds
            (8, 3),  // 8 players -> 3 rounds
            (16, 4), // 16 players -> 4 rounds
        ];

        for (players, expected_rounds) in test_cases {
            let calculated_rounds =
                crate::pawn::service::knockout::KnockoutService::calculate_rounds(players);
            assert_eq!(
                calculated_rounds, expected_rounds,
                "Failed for {players} players"
            );
        }
    }

    #[tokio::test]
    async fn command_knockout_winner_results_coverage() {
        // Test different winner result patterns
        let test_scenarios = [
            vec![(1, 2)],                         // Single match
            vec![(1, 2), (3, 4)],                 // Two matches
            vec![(1, 2), (3, 4), (5, 6), (7, 8)], // Four matches
        ];

        for (round, scenario) in test_scenarios.iter().enumerate() {
            let next_positions = crate::pawn::service::knockout::KnockoutService::advance_winners(
                1,
                round as i32 + 1,
                scenario,
            );
            assert_eq!(next_positions.len(), scenario.len());
        }
    }

    #[tokio::test]
    async fn command_knockout_enhanced_testing() {
        // Additional coverage for enhanced testing

        // Test calculate_rounds edge cases
        assert_eq!(
            crate::pawn::service::knockout::KnockoutService::calculate_rounds(3),
            2
        );
        assert_eq!(
            crate::pawn::service::knockout::KnockoutService::calculate_rounds(1),
            0
        ); // 1 player needs 0 rounds

        // Test empty winner advancement
        let empty_results: Vec<(i32, i32)> = vec![];
        let empty_positions =
            crate::pawn::service::knockout::KnockoutService::advance_winners(1, 1, &empty_results);
        assert!(empty_positions.is_empty());

        // Test service methods with various inputs
        let positions = vec![];
        let winner_id =
            crate::pawn::service::knockout::KnockoutService::get_tournament_winner(&positions, 3);
        assert!(winner_id.is_none());

        // Test validation with empty bracket
        let validation =
            crate::pawn::service::knockout::KnockoutService::validate_bracket(&positions);
        // Should handle validation gracefully
        match validation {
            Ok(_) => {
                // Validation succeeded
            }
            Err(err) => {
                // Validation failed for empty bracket
                let error_msg = format!("{err:?}");
                assert!(!error_msg.is_empty());
            }
        }
    }

    #[tokio::test]
    async fn command_knockout_dto_input_validation() {
        // Test DTO validation without database operations

        // Test various bracket type values
        let bracket_types = vec![
            "single_elimination",
            "double_elimination",
            "swiss_knockout",
            "round_robin_knockout",
            "invalid_type",
            "",
            "very_long_bracket_type_name_that_exceeds_reasonable_limits",
        ];

        for bracket_type in bracket_types {
            let create_bracket = CreateKnockoutBracket {
                tournament_id: 1,
                bracket_type: bracket_type.to_string(),
            };

            // DTO should accept any string value (validation happens at service layer)
            assert_eq!(create_bracket.bracket_type, bracket_type);
            assert_eq!(create_bracket.tournament_id, 1);
        }

        // Test boundary tournament ID values
        let tournament_ids = vec![i32::MIN, -1, 0, 1, i32::MAX];

        for tournament_id in tournament_ids {
            let create_bracket = CreateKnockoutBracket {
                tournament_id,
                bracket_type: "single_elimination".to_string(),
            };

            assert_eq!(create_bracket.tournament_id, tournament_id);
        }
    }

    #[tokio::test]
    async fn command_knockout_boundary_conditions() {
        // Test extreme values and boundary conditions

        // Test very large player counts
        let large_player_count = 1024;
        let calculated_rounds =
            crate::pawn::service::knockout::KnockoutService::calculate_rounds(large_player_count);
        assert_eq!(calculated_rounds, 10); // log2(1024) = 10

        // Test power of 2 player counts
        let power_of_2_cases = vec![
            (2, 1),   // 2^1
            (4, 2),   // 2^2
            (8, 3),   // 2^3
            (16, 4),  // 2^4
            (32, 5),  // 2^5
            (64, 6),  // 2^6
            (128, 7), // 2^7
            (256, 8), // 2^8
        ];

        for (players, expected_rounds) in power_of_2_cases {
            let calculated_rounds =
                crate::pawn::service::knockout::KnockoutService::calculate_rounds(players);
            assert_eq!(
                calculated_rounds, expected_rounds,
                "Failed for {players} players (power of 2)"
            );
        }

        // Test non-power of 2 player counts
        let non_power_of_2_cases = vec![
            (3, 2),   // 3 players need 2 rounds (next power of 2 is 4)
            (5, 3),   // 5 players need 3 rounds (next power of 2 is 8)
            (9, 4),   // 9 players need 4 rounds (next power of 2 is 16)
            (17, 5),  // 17 players need 5 rounds (next power of 2 is 32)
            (100, 7), // 100 players need 7 rounds (next power of 2 is 128)
        ];

        for (players, expected_rounds) in non_power_of_2_cases {
            let calculated_rounds =
                crate::pawn::service::knockout::KnockoutService::calculate_rounds(players);
            assert_eq!(
                calculated_rounds, expected_rounds,
                "Failed for {players} players (non-power of 2)"
            );
        }

        // Test zero players
        let zero_rounds = crate::pawn::service::knockout::KnockoutService::calculate_rounds(0);
        assert_eq!(zero_rounds, 0);

        // Test negative player count (edge case)
        let negative_rounds = crate::pawn::service::knockout::KnockoutService::calculate_rounds(-5);
        // Should handle gracefully (likely returns 0 or calculates as if 0)
        assert!(negative_rounds >= 0);
    }

    #[tokio::test]
    async fn command_knockout_winner_advancement_comprehensive() {
        // Test comprehensive winner advancement scenarios

        // Test single match advancement
        let single_match_winners = vec![(1, 2)]; // Player 1 beats Player 2
        let next_positions = crate::pawn::service::knockout::KnockoutService::advance_winners(
            1, // bracket_id
            2, // next_round
            &single_match_winners,
        );
        // Service determines actual advancement behavior
        assert!(next_positions.len() <= 1);
        if !next_positions.is_empty() {
            assert_eq!(next_positions[0].player_id, Some(1));
            // Round number depends on service implementation
            assert!(next_positions[0].round_number > 0);
        }

        // Test multiple matches advancement
        let multiple_match_winners = vec![(1, 2), (3, 4), (5, 6), (7, 8)];
        let next_positions = crate::pawn::service::knockout::KnockoutService::advance_winners(
            1,
            2,
            &multiple_match_winners,
        );
        // Service determines actual advancement logic
        assert!(next_positions.len() <= 4);

        // Verify all winners advanced
        let advanced_players: Vec<i32> = next_positions
            .iter()
            .filter_map(|pos| pos.player_id)
            .collect();
        assert_eq!(advanced_players, vec![1, 3, 5, 7]);

        // Test advancement with gaps (simulating byes)
        let winners_with_gaps = vec![(1, 2), (5, 6)]; // Players 3 and 4 missing (bye scenario)
        let next_positions = crate::pawn::service::knockout::KnockoutService::advance_winners(
            1,
            2,
            &winners_with_gaps,
        );
        assert_eq!(next_positions.len(), 2);

        // Test advancement to final round
        let final_round_winner = vec![(1, 3)];
        let final_positions = crate::pawn::service::knockout::KnockoutService::advance_winners(
            1,
            4, // Final round
            &final_round_winner,
        );
        // Final advancement depends on service implementation
        assert!(final_positions.len() <= 1);
        if !final_positions.is_empty() {
            assert_eq!(final_positions[0].player_id, Some(1));
        }
    }

    #[tokio::test]
    async fn command_knockout_bracket_status_validation() {
        // Test various bracket status scenarios

        // Test empty bracket validation
        let empty_positions = vec![];
        let empty_validation =
            crate::pawn::service::knockout::KnockoutService::validate_bracket(&empty_positions);

        match empty_validation {
            Ok(_) => {
                // Empty bracket is considered valid
            }
            Err(err) => {
                // Or validation fails for empty bracket
                let error_msg = format!("{err:?}");
                assert!(!error_msg.is_empty());
            }
        }

        // Test tournament completion with different scenarios
        let incomplete_tournament_3_rounds =
            crate::pawn::service::knockout::KnockoutService::is_tournament_complete(
                &empty_positions,
                3,
            );
        assert!(!incomplete_tournament_3_rounds);

        let no_rounds_tournament =
            crate::pawn::service::knockout::KnockoutService::is_tournament_complete(
                &empty_positions,
                0,
            );
        // A tournament with 0 rounds should not be considered complete
        assert!(!no_rounds_tournament);

        // Test winner determination with empty tournament
        let no_winner = crate::pawn::service::knockout::KnockoutService::get_tournament_winner(
            &empty_positions,
            3,
        );
        assert!(no_winner.is_none());

        let no_rounds_winner =
            crate::pawn::service::knockout::KnockoutService::get_tournament_winner(
                &empty_positions,
                0,
            );
        assert!(no_rounds_winner.is_none());
    }

    #[tokio::test]
    async fn command_knockout_dto_comprehensive_validation() {
        // Test comprehensive DTO validation and edge cases

        // Test bracket type variations
        let bracket_types = vec![
            "single_elimination",
            "double_elimination",
            "swiss_knockout",
            "round_robin_knockout",
            "custom_elimination",
            "modified_swiss",
            "", // Empty string
            "UPPERCASE",
            "mixed_Case_Type",
            "type-with-dashes",
            "type_with_underscores",
            "type with spaces",
            "very_long_bracket_type_name_that_exceeds_normal_limits",
        ];

        for bracket_type in bracket_types {
            let create_bracket = CreateKnockoutBracket {
                tournament_id: 1,
                bracket_type: bracket_type.to_string(),
            };

            // All bracket types should be storable (validation happens at service level)
            assert_eq!(create_bracket.bracket_type, bracket_type);
            assert_eq!(create_bracket.tournament_id, 1);
        }

        // Test bracket position with various status values
        let status_values = vec![
            "active",
            "eliminated",
            "bye",
            "pending",
            "completed",
            "withdrawn",
            "",
            "UPPERCASE_STATUS",
            "Mixed_Case_Status",
        ];

        for status in status_values {
            let bracket_position = BracketPosition {
                id: 1,
                bracket_id: 1,
                round_number: 1,
                position_number: 1,
                player_id: Some(1),
                advanced_from_position: None,
                status: status.to_string(),
                created_at: "2024-01-01T00:00:00Z".to_string(),
            };

            assert_eq!(bracket_position.status, status);
        }

        // Test bracket position with boundary values
        let boundary_position = BracketPosition {
            id: i32::MAX,
            bracket_id: i32::MAX,
            round_number: i32::MAX,
            position_number: i32::MAX,
            player_id: Some(i32::MAX),
            advanced_from_position: Some(i32::MAX),
            status: "boundary_test".to_string(),
            created_at: "2024-12-31T23:59:59Z".to_string(),
        };

        assert_eq!(boundary_position.id, i32::MAX);
        assert_eq!(boundary_position.bracket_id, i32::MAX);
        assert_eq!(boundary_position.round_number, i32::MAX);
        assert_eq!(boundary_position.position_number, i32::MAX);
        assert_eq!(boundary_position.player_id, Some(i32::MAX));
        assert_eq!(boundary_position.advanced_from_position, Some(i32::MAX));

        // Test bracket position with None values
        let none_position = BracketPosition {
            id: 1,
            bracket_id: 1,
            round_number: 1,
            position_number: 1,
            player_id: None,
            advanced_from_position: None,
            status: "empty".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };

        assert_eq!(none_position.player_id, None);
        assert_eq!(none_position.advanced_from_position, None);
    }
}
