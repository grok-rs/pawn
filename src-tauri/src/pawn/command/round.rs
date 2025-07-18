use tauri::State;
use tracing::instrument;

use crate::pawn::{
    common::types::CommandResult,
    domain::{
        dto::{
            CreateRound, EnhancedPairingRequest, EnhancedPairingResult, GeneratePairingsRequest,
            PairingValidationResults, RoundExportRequest, RoundHistory, RoundProgression,
            RoundRobinAnalysis, RoundRobinOptions, SwissPairingAnalysis, SwissPairingOptions,
            UpdateRoundStatus, UpdateTournamentPairingMethod,
        },
        model::{GameResult, Pairing, Round, RoundDetails},
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
    state
        .round_service
        .get_rounds_by_tournament(tournament_id)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_current_round(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Option<Round>> {
    state.round_service.get_current_round(tournament_id).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn create_round(state: State<'_, PawnState>, data: CreateRound) -> CommandResult<Round> {
    state.round_service.create_round(data).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn update_round_status(
    state: State<'_, PawnState>,
    data: UpdateRoundStatus,
) -> CommandResult<Round> {
    state.round_service.update_round_status(data).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_round_details(
    state: State<'_, PawnState>,
    round_id: i32,
) -> CommandResult<RoundDetails> {
    state.round_service.get_round_details(round_id).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn generate_pairings(
    state: State<'_, PawnState>,
    request: GeneratePairingsRequest,
) -> CommandResult<Vec<Pairing>> {
    state.round_service.generate_pairings(request).await
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
    state
        .round_service
        .create_pairings_as_games(tournament_id, round_number, pairings)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn complete_round(state: State<'_, PawnState>, round_id: i32) -> CommandResult<Round> {
    state.round_service.complete_round(round_id).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn create_next_round(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Round> {
    state.round_service.create_next_round(tournament_id).await
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

// Enhanced Pairing System Commands

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn generate_enhanced_pairings(
    state: State<'_, PawnState>,
    request: EnhancedPairingRequest,
) -> CommandResult<EnhancedPairingResult> {
    // TODO: Implement enhanced pairing generation using the new engines
    // This would integrate with the SwissPairingEngine, RoundRobinEngine,
    // ManualPairingController, and PairingOptimizer

    // For now, fall back to basic pairing generation
    let basic_request = GeneratePairingsRequest {
        tournament_id: request.tournament_id,
        round_number: request.round_number,
        pairing_method: request.pairing_method,
    };

    let pairings = state.round_service.generate_pairings(basic_request).await?;

    // Create a basic enhanced result
    let validation_results = PairingValidationResults {
        is_valid: true,
        critical_errors: vec![],
        warnings: vec![],
        suggestions: vec![],
    };

    Ok(EnhancedPairingResult {
        pairings,
        validation_results,
        performance_metrics: None,
        warnings: vec![],
    })
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn analyze_swiss_pairings(
    state: State<'_, PawnState>,
    tournament_id: i32,
    round_number: i32,
    options: SwissPairingOptions,
) -> CommandResult<SwissPairingAnalysis> {
    state
        .swiss_analysis_service
        .analyze_swiss_pairings(tournament_id, round_number, options)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn analyze_round_robin_pairings(
    state: State<'_, PawnState>,
    tournament_id: i32,
    round_number: i32,
    options: RoundRobinOptions,
) -> CommandResult<RoundRobinAnalysis> {
    state
        .round_robin_analysis_service
        .analyze_round_robin_pairings(tournament_id, round_number, options)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn validate_pairing_configuration(
    state: State<'_, PawnState>,
    tournament_id: i32,
    pairings: Vec<Pairing>,
) -> CommandResult<PairingValidationResults> {
    // TODO: Implement comprehensive pairing validation using ManualPairingController
    // This would check for conflicts, color balance, and tournament rules

    let _ = (state, tournament_id, pairings); // Suppress unused warnings

    // Placeholder implementation
    Ok(PairingValidationResults {
        is_valid: true,
        critical_errors: vec![],
        warnings: vec![],
        suggestions: vec![],
    })
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn benchmark_pairing_performance(
    state: State<'_, PawnState>,
    player_counts: Vec<usize>,
) -> CommandResult<Vec<crate::pawn::domain::dto::PairingPerformanceMetrics>> {
    // TODO: Implement performance benchmarking using PairingOptimizer
    // This would test pairing generation speed with different player counts

    let _ = (state, player_counts); // Suppress unused warnings

    // Placeholder implementation
    Ok(vec![])
}

// Round History Commands

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_round_history(
    state: State<'_, PawnState>,
    tournament_id: i32,
    round_number: i32,
) -> CommandResult<RoundHistory> {
    state
        .round_history_service
        .get_round_history(tournament_id, round_number)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_tournament_progression(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<RoundProgression> {
    state
        .round_history_service
        .get_tournament_progression(tournament_id)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn export_round_data(
    state: State<'_, PawnState>,
    request: RoundExportRequest,
) -> CommandResult<Vec<u8>> {
    state
        .round_history_service
        .export_round_data(request)
        .await
}
