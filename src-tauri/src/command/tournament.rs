use tauri::State;
use tracing::instrument;

use crate::{
    common::types::CommandResult,
    db::*,
    domain::{
        dto::{
            CreateGame, CreatePlayer, CreateTournament, UpdateTournamentSettings,
            UpdateTournamentStatus,
        },
        model::{Game, GameResult, Player, PlayerResult, Tournament, TournamentDetails},
        tiebreak::{
            StandingsCalculationResult, TiebreakBreakdown, TiebreakType, TournamentTiebreakConfig,
        },
    },
    state::PawnState,
};

// Tournament operations
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

// Player operations
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
    // Load config from database or use defaults
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

// Tiebreak breakdown
#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_tiebreak_breakdown(
    state: State<'_, PawnState>,
    tournament_id: i32,
    player_id: i32,
    tiebreak_type: TiebreakType,
) -> CommandResult<TiebreakBreakdown> {
    // Get tournament data
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

    // Convert player results to HashMap for efficient lookup
    let mut results_map = std::collections::HashMap::new();
    for result in player_results {
        results_map.insert(result.player.id, result);
    }

    // Find the specific player
    let player = players.iter().find(|p| p.id == player_id).ok_or_else(|| {
        crate::common::error::PawnError::NotFound("Player not found".to_string())
    })?;

    // Generate breakdown
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

