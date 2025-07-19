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
