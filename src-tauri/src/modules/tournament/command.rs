use std::collections::HashMap;
use tauri::State;
use tracing::instrument;

use crate::{
    common::{error::PawnError, types::CommandResult},
    competition::dto::CreateGame,
    competition::model::{Game, GameResult},
    db::*,
    participant::dto::CreatePlayer,
    participant::model::{Player, PlayerResult},
    standings::model::{
        StandingsCalculationResult, TiebreakBreakdown, TiebreakType, TournamentTiebreakConfig,
    },
    state::PawnState,
    tournament::dto::{
        BatchUpdatePlayerSeeding, CreateTimeControl, CreateTournament,
        CreateTournamentSeedingSettings, GeneratePairingNumbersRequest, GenerateSeedingRequest,
        SeedingAnalysis, SeedingPreview, TimeControlFilter, TimeControlValidation,
        UpdateTimeControl, UpdateTournament, UpdateTournamentSeedingSettings,
        UpdateTournamentSettings, UpdateTournamentStatus,
    },
    tournament::model::{
        TimeControl, TimeControlTemplate, Tournament, TournamentDetails, TournamentSeedingSettings,
    },
};

// === Tournament operations ===

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_tournaments(state: State<'_, PawnState>) -> CommandResult<Vec<Tournament>> {
    state.tournament_service.get_tournaments().await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_tournament(state: State<'_, PawnState>, id: i32) -> CommandResult<Tournament> {
    state.tournament_service.get_tournament(id).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn create_tournament(
    state: State<'_, PawnState>,
    data: CreateTournament,
) -> CommandResult<Tournament> {
    state.tournament_service.create_tournament(data).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_tournament_details(
    state: State<'_, PawnState>,
    id: i32,
) -> CommandResult<TournamentDetails> {
    state.tournament_service.get_tournament_details(id).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn delete_tournament(state: State<'_, PawnState>, id: i32) -> CommandResult<()> {
    state.tournament_service.delete_tournament(id).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn update_tournament_status(
    state: State<'_, PawnState>,
    data: UpdateTournamentStatus,
) -> CommandResult<Tournament> {
    state
        .tournament_service
        .update_tournament_status(data)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn update_tournament(
    state: State<'_, PawnState>,
    data: UpdateTournament,
) -> CommandResult<Tournament> {
    state.tournament_service.update_tournament(data).await
}

// Player operations (delegated through tournament service)
#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_players_by_tournament(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Vec<Player>> {
    state
        .tournament_service
        .get_players_by_tournament(tournament_id)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn create_player(
    state: State<'_, PawnState>,
    data: CreatePlayer,
) -> CommandResult<Player> {
    state.tournament_service.create_player(data).await
}

// Game operations
#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_games_by_tournament(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Vec<Game>> {
    state
        .tournament_service
        .get_games_by_tournament(tournament_id)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn create_game(state: State<'_, PawnState>, data: CreateGame) -> CommandResult<Game> {
    state.tournament_service.create_game(data).await
}

// Statistics
#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_player_results(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Vec<PlayerResult>> {
    state
        .tournament_service
        .get_player_results(tournament_id)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_game_results(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Vec<GameResult>> {
    state
        .tournament_service
        .get_game_results(tournament_id)
        .await
}

// Utility for development
#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn populate_mock_data(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<()> {
    state
        .tournament_service
        .populate_mock_data(tournament_id)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn populate_mock_tournaments(state: State<'_, PawnState>) -> CommandResult<()> {
    state.tournament_service.populate_mock_tournaments().await
}

// Standings with tiebreaks
#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_tournament_standings(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<StandingsCalculationResult> {
    let config = match state.db.get_tournament_settings(tournament_id).await? {
        Some(config) => config,
        None => TournamentTiebreakConfig {
            tournament_id,
            ..Default::default()
        },
    };

    state
        .tiebreak_calculator
        .calculate_standings(tournament_id, &config)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_tiebreak_breakdown(
    state: State<'_, PawnState>,
    tournament_id: i32,
    player_id: i32,
    tiebreak_type: TiebreakType,
) -> CommandResult<TiebreakBreakdown> {
    let players = state
        .player_service
        .get_players_by_tournament(tournament_id)
        .await?;
    let games = state
        .tournament_service
        .get_games_by_tournament(tournament_id)
        .await?;
    let player_results = state
        .tournament_service
        .get_player_results(tournament_id)
        .await?;

    let mut results_map = HashMap::new();
    for result in player_results {
        results_map.insert(result.player.id, result);
    }

    let player = players
        .iter()
        .find(|p| p.id == player_id)
        .ok_or_else(|| PawnError::NotFound("Player not found".to_string()))?;

    state
        .tiebreak_calculator
        .generate_tiebreak_breakdown(player, tiebreak_type, &games, &players, &results_map)
        .await
}

// Real-time standings
#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_realtime_standings(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<StandingsCalculationResult> {
    state
        .realtime_standings_service
        .get_realtime_standings(tournament_id)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn force_recalculate_standings(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<StandingsCalculationResult> {
    state
        .realtime_standings_service
        .force_recalculate_standings(tournament_id)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn clear_standings_cache(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<()> {
    state
        .realtime_standings_service
        .clear_cache(tournament_id)
        .await;
    Ok(())
}

// Tournament settings
#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_tournament_settings(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<TournamentTiebreakConfig> {
    match state.db.get_tournament_settings(tournament_id).await? {
        Some(config) => Ok(config),
        None => Ok(TournamentTiebreakConfig {
            tournament_id,
            ..Default::default()
        }),
    }
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn update_tournament_settings(
    state: State<'_, PawnState>,
    settings: UpdateTournamentSettings,
) -> CommandResult<()> {
    state.db.upsert_tournament_settings(&settings).await?;
    tracing::info!(
        "Tournament settings updated successfully for tournament {}",
        settings.tournament_id
    );
    Ok(())
}

// === Seeding commands ===

#[tauri::command]
#[specta::specta]
pub async fn create_tournament_seeding_settings(
    state: State<'_, PawnState>,
    settings: CreateTournamentSeedingSettings,
) -> CommandResult<TournamentSeedingSettings> {
    state
        .seeding_service
        .create_seeding_settings(settings)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn get_tournament_seeding_settings(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Option<TournamentSeedingSettings>> {
    state
        .seeding_service
        .get_seeding_settings(tournament_id)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn update_tournament_seeding_settings(
    state: State<'_, PawnState>,
    settings: UpdateTournamentSeedingSettings,
) -> CommandResult<TournamentSeedingSettings> {
    state
        .seeding_service
        .update_seeding_settings(settings)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn generate_tournament_seeding(
    state: State<'_, PawnState>,
    request: GenerateSeedingRequest,
) -> CommandResult<Vec<SeedingPreview>> {
    state.seeding_service.generate_seeding(request).await
}

#[tauri::command]
#[specta::specta]
pub async fn apply_tournament_seeding(
    state: State<'_, PawnState>,
    batch_update: BatchUpdatePlayerSeeding,
) -> CommandResult<Vec<Player>> {
    state.seeding_service.apply_seeding(batch_update).await
}

#[tauri::command]
#[specta::specta]
pub async fn generate_pairing_numbers(
    state: State<'_, PawnState>,
    request: GeneratePairingNumbersRequest,
) -> CommandResult<Vec<Player>> {
    state
        .seeding_service
        .generate_pairing_numbers(request)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn analyze_tournament_seeding(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<SeedingAnalysis> {
    state.seeding_service.analyze_seeding(tournament_id).await
}

// === Time control commands ===

#[tauri::command]
#[specta::specta]
pub async fn create_time_control(
    state: State<'_, PawnState>,
    data: CreateTimeControl,
) -> Result<TimeControl, PawnError> {
    state.time_control_service.create_time_control(data).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_time_control(
    state: State<'_, PawnState>,
    id: i32,
) -> Result<TimeControl, PawnError> {
    state.time_control_service.get_time_control(id).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_time_controls(
    state: State<'_, PawnState>,
    filter: Option<TimeControlFilter>,
) -> Result<Vec<TimeControl>, PawnError> {
    state.time_control_service.get_time_controls(filter).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_default_time_controls(
    state: State<'_, PawnState>,
) -> Result<Vec<TimeControl>, PawnError> {
    state.time_control_service.get_default_time_controls().await
}

#[tauri::command]
#[specta::specta]
pub async fn update_time_control(
    state: State<'_, PawnState>,
    data: UpdateTimeControl,
) -> Result<TimeControl, PawnError> {
    state.time_control_service.update_time_control(data).await
}

#[tauri::command]
#[specta::specta]
pub async fn delete_time_control(state: State<'_, PawnState>, id: i32) -> Result<(), PawnError> {
    state.time_control_service.delete_time_control(id).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_time_control_templates(
    state: State<'_, PawnState>,
) -> Result<Vec<TimeControlTemplate>, PawnError> {
    state
        .time_control_service
        .get_time_control_templates()
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn validate_time_control_data(
    state: State<'_, PawnState>,
    data: CreateTimeControl,
) -> Result<TimeControlValidation, PawnError> {
    state.time_control_service.validate_time_control_data(&data)
}
