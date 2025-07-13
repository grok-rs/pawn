use tauri::State;
use tracing::instrument;

use crate::pawn::{
    common::types::CommandResult,
    domain::{
        dto::{CreateRound, UpdateRoundStatus, GeneratePairingsRequest, UpdateTournamentPairingMethod},
        model::{Round, RoundDetails, Pairing, GameResult},
    },
    state::PawnState,
};

// Round operations
#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_rounds_by_tournament(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Vec<Round>> {
    Ok(state.round_service.get_rounds_by_tournament(tournament_id).await?)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_current_round(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Option<Round>> {
    Ok(state.round_service.get_current_round(tournament_id).await?)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn create_round(
    state: State<'_, PawnState>,
    data: CreateRound,
) -> CommandResult<Round> {
    Ok(state.round_service.create_round(data).await?)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn update_round_status(
    state: State<'_, PawnState>,
    data: UpdateRoundStatus,
) -> CommandResult<Round> {
    Ok(state.round_service.update_round_status(data).await?)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_round_details(
    state: State<'_, PawnState>,
    round_id: i32,
) -> CommandResult<RoundDetails> {
    Ok(state.round_service.get_round_details(round_id).await?)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn generate_pairings(
    state: State<'_, PawnState>,
    request: GeneratePairingsRequest,
) -> CommandResult<Vec<Pairing>> {
    Ok(state.round_service.generate_pairings(request).await?)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn create_pairings_as_games(
    state: State<'_, PawnState>,
    tournament_id: i32,
    round_number: i32,
    pairings: Vec<Pairing>,
) -> CommandResult<Vec<GameResult>> {
    Ok(state.round_service.create_pairings_as_games(tournament_id, round_number, pairings).await?)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn complete_round(
    state: State<'_, PawnState>,
    round_id: i32,
) -> CommandResult<Round> {
    Ok(state.round_service.complete_round(round_id).await?)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn create_next_round(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Round> {
    Ok(state.round_service.create_next_round(tournament_id).await?)
}

#[instrument(ret, skip(_state))]
#[tauri::command]
#[specta::specta]
pub async fn update_tournament_pairing_method(
    _state: State<'_, PawnState>,
    _data: UpdateTournamentPairingMethod,
) -> CommandResult<()> {
    // Update the tournament's pairing method
    // This would need to be implemented in the tournament service
    // For now, we'll just return Ok(())
    // TODO: Implement tournament pairing method update
    Ok(())
}