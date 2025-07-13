use tauri::State;
use tracing::instrument;

use crate::pawn::{
    common::types::CommandResult,
    domain::{
        dto::{CreateTournament, CreatePlayer, CreateGame, UpdateTournamentSettings},
        model::{Tournament, Player, Game, TournamentDetails, PlayerResult, GameResult},
        tiebreak::{StandingsCalculationResult, TournamentTiebreakConfig},
    },
    state::PawnState,
};

// Tournament operations
#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_tournaments(state: State<'_, PawnState>) -> CommandResult<Vec<Tournament>> {
    Ok(state.tournament_service.get_tournaments().await?)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_tournament(state: State<'_, PawnState>, id: i32) -> CommandResult<Tournament> {
    Ok(state.tournament_service.get_tournament(id).await?)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn create_tournament(
    state: State<'_, PawnState>,
    data: CreateTournament,
) -> CommandResult<Tournament> {
    Ok(state.tournament_service.create_tournament(data).await?)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_tournament_details(
    state: State<'_, PawnState>,
    id: i32,
) -> CommandResult<TournamentDetails> {
    Ok(state.tournament_service.get_tournament_details(id).await?)
}

// Player operations
#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_players_by_tournament(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Vec<Player>> {
    Ok(state.tournament_service.get_players_by_tournament(tournament_id).await?)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn create_player(
    state: State<'_, PawnState>,
    data: CreatePlayer,
) -> CommandResult<Player> {
    Ok(state.tournament_service.create_player(data).await?)
}

// Game operations
#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_games_by_tournament(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Vec<Game>> {
    Ok(state.tournament_service.get_games_by_tournament(tournament_id).await?)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn create_game(
    state: State<'_, PawnState>,
    data: CreateGame,
) -> CommandResult<Game> {
    Ok(state.tournament_service.create_game(data).await?)
}

// Statistics
#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_player_results(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Vec<PlayerResult>> {
    Ok(state.tournament_service.get_player_results(tournament_id).await?)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_game_results(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Vec<GameResult>> {
    Ok(state.tournament_service.get_game_results(tournament_id).await?)
}

// Utility for development
#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn populate_mock_data(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<()> {
    Ok(state.tournament_service.populate_mock_data(tournament_id).await?)
}

// Standings with tiebreaks
#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_tournament_standings(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<StandingsCalculationResult> {
    // TODO: Load config from database once implemented
    let mut config = TournamentTiebreakConfig::default();
    config.tournament_id = tournament_id;
    
    Ok(state.tiebreak_calculator.calculate_standings(tournament_id, &config).await?)
}

// Tournament settings
#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_tournament_settings(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<TournamentTiebreakConfig> {
    // TODO: Load from database once implemented
    let mut config = TournamentTiebreakConfig::default();
    config.tournament_id = tournament_id;
    Ok(config)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn update_tournament_settings(
    state: State<'_, PawnState>,
    settings: UpdateTournamentSettings,
) -> CommandResult<()> {
    // TODO: Save to database once implemented
    tracing::info!("Updating tournament settings: {:?}", settings);
    Ok(())
}
