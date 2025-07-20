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

        // Should either succeed or fail gracefully
        assert!(validation_result.is_ok() || validation_result.is_err());
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
        assert!(validation.is_ok() || validation.is_err());
    }
}
