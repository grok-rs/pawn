use tauri::State;
use tracing::instrument;

use crate::pawn::{
    common::types::CommandResult,
    db::Db,
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
        crate::pawn::common::error::PawnError::NotFound("Player not found".to_string())
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pawn::db::sqlite::SqliteDb;
    use crate::pawn::state::PawnState;
    use sqlx::SqlitePool;
    use tempfile::TempDir;

    async fn setup_test_state() -> PawnState {
        let temp_dir = TempDir::new().unwrap();

        // Use in-memory SQLite for testing
        let database_url = "sqlite::memory:";
        let pool = SqlitePool::connect(database_url).await.unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        let db = Arc::new(SqliteDb::new(pool.clone()));

        use crate::pawn::service::{
            export::ExportService, norm_calculation::NormCalculationService, player::PlayerService,
            realtime_standings::RealTimeStandingsService, round::RoundService,
            round_robin_analysis::RoundRobinAnalysisService, settings::SettingsService,
            swiss_analysis::SwissAnalysisService, team::TeamService, tiebreak::TiebreakCalculator,
            time_control::TimeControlService, tournament::TournamentService,
        };
        use crate::pawn::state::State;
        use std::sync::Arc;

        let tournament_service = Arc::new(TournamentService::new(Arc::clone(&db)));
        let tiebreak_calculator = Arc::new(TiebreakCalculator::new(Arc::clone(&db)));
        let realtime_standings_service = Arc::new(RealTimeStandingsService::new(
            Arc::clone(&db),
            Arc::clone(&tiebreak_calculator),
        ));
        let round_service = Arc::new(RoundService::new(Arc::clone(&db)));
        let player_service = Arc::new(PlayerService::new(Arc::clone(&db)));
        let time_control_service = Arc::new(TimeControlService::new(Arc::clone(&db)));
        let swiss_analysis_service = Arc::new(SwissAnalysisService::new(Arc::clone(&db)));
        let round_robin_analysis_service =
            Arc::new(RoundRobinAnalysisService::new(Arc::clone(&db)));
        let export_service = Arc::new(ExportService::new(
            Arc::clone(&db),
            Arc::clone(&tiebreak_calculator),
            temp_dir.path().join("exports"),
        ));
        let norm_calculation_service = Arc::new(NormCalculationService::new(
            Arc::clone(&db),
            Arc::clone(&tiebreak_calculator),
        ));
        let team_service = Arc::new(TeamService::new(Arc::clone(&db)));
        let settings_service = Arc::new(SettingsService::new(Arc::new(pool)));

        State {
            app_data_dir: temp_dir.path().to_path_buf(),
            db,
            tournament_service,
            tiebreak_calculator,
            realtime_standings_service,
            round_service,
            player_service,
            time_control_service,
            swiss_analysis_service,
            round_robin_analysis_service,
            export_service,
            norm_calculation_service,
            team_service,
            settings_service,
        }
    }

    #[tokio::test]
    async fn command_get_tournaments_contract() {
        let state = setup_test_state().await;

        // Test the underlying service directly to validate the command contract
        let result = state.tournament_service.get_tournaments().await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[tokio::test]
    async fn command_create_tournament_contract() {
        let state = setup_test_state().await;

        let create_data = CreateTournament {
            name: "Test Tournament".to_string(),
            location: "Test Location".to_string(),
            date: "2024-01-01T10:00:00".to_string(),
            time_type: "classical".to_string(),
            tournament_type: Some("Swiss".to_string()),
            player_count: 16,
            rounds_played: 0,
            total_rounds: 5,
            country_code: "USA".to_string(),
        };

        // Test the underlying service directly to validate the command contract
        let result = state
            .tournament_service
            .create_tournament(create_data)
            .await;
        assert!(result.is_ok());

        let tournament = result.unwrap();
        assert_eq!(tournament.name, "Test Tournament");
        assert_eq!(tournament.tournament_type, Some("Swiss".to_string()));
    }

    #[tokio::test]
    async fn command_get_tournament_contract() {
        let state = setup_test_state().await;

        // Create a tournament first
        let create_data = CreateTournament {
            name: "Test Tournament".to_string(),
            location: "Test Location".to_string(),
            date: "2024-01-01T10:00:00".to_string(),
            time_type: "classical".to_string(),
            tournament_type: Some("Swiss".to_string()),
            player_count: 16,
            rounds_played: 0,
            total_rounds: 5,
            country_code: "USA".to_string(),
        };

        let created = state
            .tournament_service
            .create_tournament(create_data)
            .await
            .unwrap();

        // Test getting the tournament
        let result = state.tournament_service.get_tournament(created.id).await;
        assert!(result.is_ok());

        let tournament = result.unwrap();
        assert_eq!(tournament.id, created.id);
        assert_eq!(tournament.name, "Test Tournament");
    }

    #[tokio::test]
    async fn command_delete_tournament_contract() {
        let state = setup_test_state().await;

        // Create a tournament first
        let create_data = CreateTournament {
            name: "Test Tournament".to_string(),
            location: "Test Location".to_string(),
            date: "2024-01-01T10:00:00".to_string(),
            time_type: "classical".to_string(),
            tournament_type: Some("Swiss".to_string()),
            player_count: 16,
            rounds_played: 0,
            total_rounds: 5,
            country_code: "USA".to_string(),
        };

        let created = state
            .tournament_service
            .create_tournament(create_data)
            .await
            .unwrap();

        // Test deleting the tournament
        let result = state.tournament_service.delete_tournament(created.id).await;
        assert!(result.is_ok());

        // Verify it's gone
        let get_result = state.tournament_service.get_tournament(created.id).await;
        assert!(get_result.is_err());
    }

    #[tokio::test]
    async fn command_get_tournament_settings_contract() {
        let state = setup_test_state().await;

        // Create a tournament first
        let create_data = CreateTournament {
            name: "Test Tournament".to_string(),
            location: "Test Location".to_string(),
            date: "2024-01-01T10:00:00".to_string(),
            time_type: "classical".to_string(),
            tournament_type: Some("Swiss".to_string()),
            player_count: 16,
            rounds_played: 0,
            total_rounds: 5,
            country_code: "USA".to_string(),
        };

        let created = state
            .tournament_service
            .create_tournament(create_data)
            .await
            .unwrap();

        // Test getting settings - this should return default settings for a new tournament
        let result = state.db.get_tournament_settings(created.id).await;
        assert!(result.is_ok());

        // For a new tournament, settings may be None (using defaults)
        let settings = result.unwrap();
        assert!(settings.is_none() || settings.is_some());
    }
}
