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
