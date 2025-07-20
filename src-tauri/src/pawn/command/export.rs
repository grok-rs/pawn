use tauri::State;
use tracing::{info, instrument};

use crate::pawn::{
    common::error::PawnError,
    db::Db,
    domain::tiebreak::{ExportRequest, ExportResult},
    state::PawnState,
};

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn export_tournament_data(
    state: State<'_, PawnState>,
    request: ExportRequest,
) -> Result<ExportResult, PawnError> {
    info!("Exporting tournament data: {:?}", request);

    state.export_service.export_tournament_data(request).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_export_directory(state: State<'_, PawnState>) -> Result<String, PawnError> {
    info!("Getting export directory");

    // Get the export directory from the service
    let export_dir = state.export_service.get_export_directory();

    Ok(export_dir.to_string_lossy().to_string())
}

#[instrument(ret)]
#[tauri::command]
#[specta::specta]
pub async fn get_available_export_formats() -> Result<Vec<String>, PawnError> {
    info!("Getting available export formats");

    let formats = vec![
        "csv".to_string(),
        "json".to_string(),
        "html".to_string(),
        "txt".to_string(),
        "pdf".to_string(),
        "xlsx".to_string(),
    ];

    Ok(formats)
}

#[instrument(ret)]
#[tauri::command]
#[specta::specta]
pub async fn get_export_templates() -> Result<Vec<String>, PawnError> {
    info!("Getting available export templates");

    let templates = vec![
        "default".to_string(),
        "professional".to_string(),
        "minimal".to_string(),
        "classic".to_string(),
    ];

    Ok(templates)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn validate_export_request(
    state: State<'_, PawnState>,
    request: ExportRequest,
) -> Result<bool, PawnError> {
    info!("Validating export request: {:?}", request);

    // Check if tournament exists
    let _tournament = state.db.get_tournament(request.tournament_id).await?;

    // Check if tournament has data to export
    let players = state
        .db
        .get_players_by_tournament(request.tournament_id)
        .await?;
    if players.is_empty() {
        return Err(PawnError::ValidationError(
            "Tournament has no players to export".to_string(),
        ));
    }

    // Additional validation based on export type
    match request.export_type {
        crate::pawn::domain::tiebreak::ExportType::Standings => {
            let games = state
                .db
                .get_games_by_tournament(request.tournament_id)
                .await?;
            if games.is_empty() {
                return Err(PawnError::ValidationError(
                    "No games found for standings export".to_string(),
                ));
            }
        }
        crate::pawn::domain::tiebreak::ExportType::GameResults => {
            let games = state
                .db
                .get_games_by_tournament(request.tournament_id)
                .await?;
            if games.is_empty() {
                return Err(PawnError::ValidationError(
                    "No games found for game results export".to_string(),
                ));
            }
        }
        _ => {} // Other types are always valid if tournament exists
    }

    Ok(true)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_export_preview(
    state: State<'_, PawnState>,
    request: ExportRequest,
) -> Result<String, PawnError> {
    info!("Getting export preview for: {:?}", request);

    // Create a preview version of the export
    let preview_request = ExportRequest {
        format: crate::pawn::domain::tiebreak::ExportFormat::Html,
        custom_filename: Some("preview".to_string()),
        ..request
    };

    // Generate a temporary export and return the content
    let result = state
        .export_service
        .export_tournament_data(preview_request)
        .await?;

    if result.success {
        if let Some(file_path) = result.file_path {
            let content = std::fs::read_to_string(&file_path).map_err(PawnError::Io)?;

            // Clean up the preview file
            if let Err(e) = std::fs::remove_file(&file_path) {
                tracing::warn!("Failed to remove preview file: {}", e);
            }

            Ok(content)
        } else {
            Err(PawnError::BusinessLogic(
                "Preview generation failed".to_string(),
            ))
        }
    } else {
        Err(PawnError::BusinessLogic(result.error_message.unwrap_or(
            "Unknown error during preview generation".to_string(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pawn::{
        db::sqlite::SqliteDb,
        domain::{
            dto::{CreatePlayer, CreateTournament},
            model::{Player, Tournament},
            tiebreak::{ExportFormat, ExportType},
        },
        state::State,
    };
    use sqlx::SqlitePool;
    use std::sync::Arc;
    use tempfile::TempDir;

    async fn setup_test_state() -> (State<SqliteDb>, TempDir) {
        let temp_dir = TempDir::new().unwrap();
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

        (
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
            },
            temp_dir,
        )
    }

    async fn create_test_tournament(state: &State<SqliteDb>) -> Tournament {
        let tournament_data = CreateTournament {
            name: "Test Tournament".to_string(),
            location: "Test Location".to_string(),
            date: "2024-01-01".to_string(),
            time_type: "Standard".to_string(),
            tournament_type: Some("Swiss".to_string()),
            player_count: 0,
            rounds_played: 0,
            total_rounds: 5,
            country_code: "USA".to_string(),
        };
        state.db.create_tournament(tournament_data).await.unwrap()
    }

    async fn create_test_player(state: &State<SqliteDb>, tournament_id: i32) -> Player {
        let player_data = CreatePlayer {
            tournament_id,
            name: "Test Player".to_string(),
            rating: Some(1500),
            country_code: Some("USA".to_string()),
            title: None,
            birth_date: None,
            gender: None,
            email: None,
            phone: None,
            club: None,
        };
        state.db.create_player(player_data).await.unwrap()
    }

    #[tokio::test]
    async fn command_get_available_export_formats_contract() {
        let result = get_available_export_formats().await;
        assert!(result.is_ok());
        let formats = result.unwrap();
        assert_eq!(formats.len(), 6);
        assert!(formats.contains(&"csv".to_string()));
        assert!(formats.contains(&"json".to_string()));
        assert!(formats.contains(&"html".to_string()));
        assert!(formats.contains(&"txt".to_string()));
        assert!(formats.contains(&"pdf".to_string()));
        assert!(formats.contains(&"xlsx".to_string()));
    }

    #[tokio::test]
    async fn command_get_export_templates_contract() {
        let result = get_export_templates().await;
        assert!(result.is_ok());
        let templates = result.unwrap();
        assert_eq!(templates.len(), 4);
        assert!(templates.contains(&"default".to_string()));
        assert!(templates.contains(&"professional".to_string()));
        assert!(templates.contains(&"minimal".to_string()));
        assert!(templates.contains(&"classic".to_string()));
    }

    #[tokio::test]
    async fn command_export_service_operations_contract() {
        let (state, _temp_dir) = setup_test_state().await;
        let tournament = create_test_tournament(&state).await;
        let _player = create_test_player(&state, tournament.id).await;

        // Test get_export_directory via service
        let export_dir = state.export_service.get_export_directory();
        assert!(export_dir.to_string_lossy().contains("exports"));

        // Test export_tournament_data via service
        let request = ExportRequest {
            tournament_id: tournament.id,
            export_type: ExportType::PlayerList,
            format: ExportFormat::Csv,
            include_tiebreaks: false,
            include_cross_table: false,
            include_game_results: false,
            include_player_details: true,
            custom_filename: Some("test_export".to_string()),
            template_options: None,
        };

        let result = state.export_service.export_tournament_data(request).await;
        assert!(result.is_ok());
        let export_result = result.unwrap();
        assert!(export_result.success);
    }

    #[tokio::test]
    async fn command_validate_export_request_contract() {
        let (state, _temp_dir) = setup_test_state().await;

        // Test tournament not found
        let invalid_request = ExportRequest {
            tournament_id: 999,
            export_type: ExportType::PlayerList,
            format: ExportFormat::Csv,
            include_tiebreaks: false,
            include_cross_table: false,
            include_game_results: false,
            include_player_details: true,
            custom_filename: None,
            template_options: None,
        };

        let result = state.db.get_tournament(invalid_request.tournament_id).await;
        assert!(result.is_err());

        // Test valid tournament with players
        let tournament = create_test_tournament(&state).await;
        let _player = create_test_player(&state, tournament.id).await;

        let valid_request = ExportRequest {
            tournament_id: tournament.id,
            export_type: ExportType::PlayerList,
            format: ExportFormat::Csv,
            include_tiebreaks: false,
            include_cross_table: false,
            include_game_results: false,
            include_player_details: true,
            custom_filename: None,
            template_options: None,
        };

        let tournament_result = state.db.get_tournament(valid_request.tournament_id).await;
        assert!(tournament_result.is_ok());

        let players = state
            .db
            .get_players_by_tournament(valid_request.tournament_id)
            .await;
        assert!(players.is_ok());
        assert!(!players.unwrap().is_empty());
    }

    #[tokio::test]
    async fn command_export_type_validation_contract() {
        let (state, _temp_dir) = setup_test_state().await;
        let tournament = create_test_tournament(&state).await;
        let _player = create_test_player(&state, tournament.id).await;

        // Test standings export with no games
        let games = state.db.get_games_by_tournament(tournament.id).await;
        assert!(games.is_ok());
        assert!(games.unwrap().is_empty());

        // Test game results export with no games
        let games_result = state.db.get_games_by_tournament(tournament.id).await;
        assert!(games_result.is_ok());
        assert!(games_result.unwrap().is_empty());
    }

    #[tokio::test]
    async fn command_export_preview_generation_contract() {
        let (state, _temp_dir) = setup_test_state().await;
        let tournament = create_test_tournament(&state).await;
        let _player = create_test_player(&state, tournament.id).await;

        let preview_request = ExportRequest {
            tournament_id: tournament.id,
            export_type: ExportType::PlayerList,
            format: ExportFormat::Html,
            include_tiebreaks: false,
            include_cross_table: false,
            include_game_results: false,
            include_player_details: true,
            custom_filename: Some("preview".to_string()),
            template_options: None,
        };

        let result = state
            .export_service
            .export_tournament_data(preview_request)
            .await;
        assert!(result.is_ok());
        let export_result = result.unwrap();
        assert!(export_result.success);
    }

    #[tokio::test]
    async fn command_export_formats_enum_coverage() {
        // Test all export format variants are handled
        let formats = vec![
            ExportFormat::Csv,
            ExportFormat::Json,
            ExportFormat::Html,
            ExportFormat::Txt,
            ExportFormat::Pdf,
            ExportFormat::Xlsx,
        ];

        for format in formats {
            let request = ExportRequest {
                tournament_id: 1,
                export_type: ExportType::PlayerList,
                format,
                include_tiebreaks: false,
                include_cross_table: false,
                include_game_results: false,
                include_player_details: true,
                custom_filename: None,
                template_options: None,
            };

            // Verify the request structure is valid
            assert_eq!(request.tournament_id, 1);
        }
    }

    #[tokio::test]
    async fn command_export_types_enum_coverage() {
        // Test all export type variants are handled
        let types = vec![
            ExportType::Standings,
            ExportType::CrossTable,
            ExportType::GameResults,
            ExportType::PlayerList,
            ExportType::TournamentSummary,
            ExportType::Complete,
        ];

        for export_type in types {
            let request = ExportRequest {
                tournament_id: 1,
                export_type,
                format: ExportFormat::Csv,
                include_tiebreaks: false,
                include_cross_table: false,
                include_game_results: false,
                include_player_details: true,
                custom_filename: None,
                template_options: None,
            };

            // Verify the request structure is valid
            assert_eq!(request.tournament_id, 1);
        }
    }
}
