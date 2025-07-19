use tauri::State;
use tracing::{info, instrument, warn};

use crate::pawn::{
    common::error::PawnError,
    db::Db,
    domain::{
        dto::*,
        model::{EnhancedGameResult, Game, GameResultAudit},
    },
    service::validation::ResultValidationService,
    state::PawnState,
};

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn update_game_result(
    state: State<'_, PawnState>,
    data: UpdateGameResult,
) -> Result<Game, PawnError> {
    info!("Updating game result: {:?}", data);

    let db = &*state.db;

    // First validate the result
    let validation = ResultValidationService::validate_game_result(
        db,
        data.game_id,
        &data.result,
        data.result_type.as_deref(),
        0, // Tournament ID will be fetched from game
        data.changed_by.as_deref(),
    )
    .await?;

    if !validation.is_valid {
        warn!("Game result validation failed: {:?}", validation.errors);
        return Err(PawnError::ValidationError(validation.errors.join("; ")));
    }

    if !validation.warnings.is_empty() {
        info!("Validation warnings: {:?}", validation.warnings);
    }

    // Update the game result
    let updated_game = db.update_game_result(data).await?;

    info!(
        "Successfully updated game {} result to {}",
        updated_game.id, updated_game.result
    );

    // Trigger real-time standings update
    let affected_players = vec![updated_game.white_player_id, updated_game.black_player_id];
    if let Err(e) = state
        .realtime_standings_service
        .handle_game_result_update(updated_game.tournament_id, affected_players)
        .await
    {
        warn!("Failed to update real-time standings: {}", e);
        // Don't fail the entire operation if standings update fails
    }

    Ok(updated_game)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn validate_game_result(
    state: State<'_, PawnState>,
    data: ValidateGameResult,
) -> Result<GameResultValidation, PawnError> {
    info!("Validating game result: {:?}", data);

    let db = &*state.db;

    let validation = ResultValidationService::validate_game_result(
        db,
        data.game_id,
        &data.result,
        data.result_type.as_deref(),
        data.tournament_id,
        data.changed_by.as_deref(),
    )
    .await?;

    Ok(GameResultValidation {
        is_valid: validation.is_valid,
        errors: validation.errors,
        warnings: validation.warnings,
    })
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn batch_update_results(
    state: State<'_, PawnState>,
    data: BatchUpdateResults,
) -> Result<BatchValidationResult, PawnError> {
    info!(
        "Batch updating {} results for tournament {}",
        data.updates.len(),
        data.tournament_id
    );

    let db = &*state.db;

    // Validate all results first
    let validation_results =
        ResultValidationService::validate_batch_results(db, &data.updates, data.tournament_id)
            .await?;

    let mut results = Vec::new();
    let mut overall_valid = true;

    for (index, validation) in validation_results {
        if !validation.is_valid {
            overall_valid = false;
        }

        results.push((
            index,
            GameResultValidation {
                is_valid: validation.is_valid,
                errors: validation.errors,
                warnings: validation.warnings,
            },
        ));
    }

    // If validate_only is true, return validation results without updating
    if data.validate_only {
        return Ok(BatchValidationResult {
            overall_valid,
            results,
        });
    }

    // If validation failed, don't proceed with updates
    if !overall_valid {
        warn!("Batch validation failed, aborting updates");
        return Ok(BatchValidationResult {
            overall_valid,
            results,
        });
    }

    // Perform all updates in a transaction-like manner
    // Note: For true ACID compliance, this should use database transactions
    let _update_results: Vec<String> = Vec::new();
    for update_request in data.updates {
        match db.update_game_result(update_request.clone()).await {
            Ok(_) => {
                info!("Successfully updated game {}", update_request.game_id);
            }
            Err(e) => {
                warn!("Failed to update game {}: {}", update_request.game_id, e);
                // Add this as an error to the corresponding result
                if let Some(_result_index) = results.iter_mut().find(|(_, _)| true) {
                    // This is a simplified error handling - in production you'd want more precise mapping
                    overall_valid = false;
                }
            }
        }
    }

    info!(
        "Batch update completed with overall_valid: {}",
        overall_valid
    );
    Ok(BatchValidationResult {
        overall_valid,
        results,
    })
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_enhanced_game_result(
    state: State<'_, PawnState>,
    game_id: i32,
) -> Result<EnhancedGameResult, PawnError> {
    info!("Getting enhanced game result for game {}", game_id);

    let db = &*state.db;
    let enhanced_result = db.get_enhanced_game_result(game_id).await?;

    Ok(enhanced_result)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_game_audit_trail(
    state: State<'_, PawnState>,
    game_id: i32,
) -> Result<Vec<GameResultAudit>, PawnError> {
    info!("Getting audit trail for game {}", game_id);

    let db = &*state.db;
    let audit_trail = db.get_game_audit_trail(game_id).await?;

    Ok(audit_trail)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn approve_game_result(
    state: State<'_, PawnState>,
    data: ApproveGameResult,
) -> Result<(), PawnError> {
    info!("Approving game result: {:?}", data);

    let db = &*state.db;
    db.approve_game_result(data).await?;

    info!("Game result approved successfully");
    Ok(())
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_pending_approvals(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> Result<Vec<EnhancedGameResult>, PawnError> {
    info!("Getting pending approvals for tournament {}", tournament_id);

    let db = &*state.db;
    let pending = db.get_pending_approvals(tournament_id).await?;

    info!("Found {} pending approvals", pending.len());
    Ok(pending)
}

#[instrument(ret)]
#[tauri::command]
#[specta::specta]
pub async fn get_game_result_types() -> Result<Vec<(String, String)>, PawnError> {
    info!("Getting available game result types");

    let result_types = vec![
        ("1-0".to_string(), "White wins".to_string()),
        ("0-1".to_string(), "Black wins".to_string()),
        ("1/2-1/2".to_string(), "Draw".to_string()),
        ("*".to_string(), "Ongoing".to_string()),
        ("0-1F".to_string(), "White forfeit".to_string()),
        ("1-0F".to_string(), "Black forfeit".to_string()),
        ("0-1D".to_string(), "White default".to_string()),
        ("1-0D".to_string(), "Black default".to_string()),
        ("ADJ".to_string(), "Adjourned".to_string()),
        ("0-1T".to_string(), "Timeout (White)".to_string()),
        ("1-0T".to_string(), "Timeout (Black)".to_string()),
        ("0-0".to_string(), "Double forfeit".to_string()),
        ("CANC".to_string(), "Cancelled".to_string()),
    ];

    Ok(result_types)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn import_results_csv(
    state: State<'_, PawnState>,
    data: CsvResultImport,
) -> Result<CsvImportResult, PawnError> {
    info!(
        "Importing results from CSV for tournament {}",
        data.tournament_id
    );

    let db = &*state.db;

    // Parse CSV content
    let mut csv_reader = csv::Reader::from_reader(data.csv_content.as_bytes());
    let mut csv_rows = Vec::new();
    let mut errors = Vec::new();
    let warnings = Vec::new();

    // Parse headers
    let headers = match csv_reader.headers() {
        Ok(headers) => headers.clone(),
        Err(e) => {
            return Ok(CsvImportResult {
                success: false,
                total_rows: 0,
                valid_rows: 0,
                processed_rows: 0,
                errors: vec![CsvImportError {
                    row_number: 0,
                    field: None,
                    message: format!("Failed to parse CSV headers: {e}"),
                    row_data: "".to_string(),
                }],
                warnings,
            });
        }
    };

    // Expected column names (case insensitive)
    let board_col = find_column_index(&headers, &["board", "board_number", "board #", "table"]);
    let white_col = find_column_index(&headers, &["white", "white_player", "white player"]);
    let black_col = find_column_index(&headers, &["black", "black_player", "black player"]);
    let result_col = find_column_index(&headers, &["result", "score", "outcome"]);
    let type_col = find_column_index(&headers, &["type", "result_type", "result type"]);
    let reason_col = find_column_index(&headers, &["reason", "notes", "comment"]);

    if result_col.is_none() {
        return Ok(CsvImportResult {
            success: false,
            total_rows: 0,
            valid_rows: 0,
            processed_rows: 0,
            errors: vec![CsvImportError {
                row_number: 0,
                field: Some("result".to_string()),
                message: "Required column 'result' not found. Expected columns: board, white, black, result".to_string(),
                row_data: headers.iter().collect::<Vec<_>>().join(", "),
            }],
            warnings,
        });
    }

    // Parse each row
    for (row_index, record) in csv_reader.records().enumerate() {
        let row_number = row_index + 2; // +2 because we have header row and 0-based index

        match record {
            Ok(record) => {
                let board_number = board_col
                    .and_then(|i| record.get(i))
                    .and_then(|s| s.trim().parse::<i32>().ok());

                let white_player = white_col
                    .and_then(|i| record.get(i))
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty());

                let black_player = black_col
                    .and_then(|i| record.get(i))
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty());

                let result = result_col
                    .and_then(|i| record.get(i))
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty());

                let result_type = type_col
                    .and_then(|i| record.get(i))
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty());

                let result_reason = reason_col
                    .and_then(|i| record.get(i))
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty());

                if let Some(result) = result {
                    // Normalize result format
                    let normalized_result = normalize_result(&result);

                    csv_rows.push(CsvResultRow {
                        board_number,
                        white_player,
                        black_player,
                        result: normalized_result,
                        result_type,
                        result_reason,
                        row_number,
                    });
                } else {
                    errors.push(CsvImportError {
                        row_number,
                        field: Some("result".to_string()),
                        message: "Result field is required and cannot be empty".to_string(),
                        row_data: record.iter().collect::<Vec<_>>().join(", "),
                    });
                }
            }
            Err(e) => {
                errors.push(CsvImportError {
                    row_number,
                    field: None,
                    message: format!("Failed to parse CSV row: {e}"),
                    row_data: "".to_string(),
                });
            }
        }
    }

    let total_rows = csv_rows.len();

    if total_rows == 0 && errors.is_empty() {
        return Ok(CsvImportResult {
            success: false,
            total_rows: 0,
            valid_rows: 0,
            processed_rows: 0,
            errors: vec![CsvImportError {
                row_number: 0,
                field: None,
                message: "CSV file contains no data rows".to_string(),
                row_data: "".to_string(),
            }],
            warnings,
        });
    }

    // If validate_only is true, return results without processing
    if data.validate_only {
        let valid_rows = csv_rows.len();
        return Ok(CsvImportResult {
            success: errors.is_empty(),
            total_rows,
            valid_rows,
            processed_rows: 0,
            errors,
            warnings,
        });
    }

    // Process the valid rows
    let mut processed_rows = 0;
    let mut update_requests = Vec::new();

    // Get tournament games to match against
    let tournament_games = db.get_games_by_tournament(data.tournament_id).await?;

    for csv_row in &csv_rows {
        match find_matching_game(&tournament_games, csv_row) {
            Some(game) => {
                update_requests.push(UpdateGameResult {
                    game_id: game.id,
                    result: csv_row.result.clone(),
                    result_type: csv_row.result_type.clone(),
                    result_reason: csv_row.result_reason.clone(),
                    arbiter_notes: Some(format!(
                        "Imported from CSV row {row}",
                        row = csv_row.row_number
                    )),
                    changed_by: data.changed_by.clone(),
                });
            }
            None => {
                let match_info = if let Some(board) = csv_row.board_number {
                    format!("board {board}")
                } else if csv_row.white_player.is_some() || csv_row.black_player.is_some() {
                    format!(
                        "players {} vs {}",
                        csv_row.white_player.as_deref().unwrap_or("?"),
                        csv_row.black_player.as_deref().unwrap_or("?")
                    )
                } else {
                    "game".to_string()
                };

                errors.push(CsvImportError {
                    row_number: csv_row.row_number,
                    field: None,
                    message: format!("No matching game found for {match_info}"),
                    row_data: format!("result: {result}", result = csv_row.result),
                });
            }
        }
    }

    // Batch update the results
    if !update_requests.is_empty() {
        let batch_request = BatchUpdateResults {
            tournament_id: data.tournament_id,
            updates: update_requests,
            validate_only: false,
        };

        match batch_update_results(state, batch_request).await {
            Ok(batch_result) => {
                if batch_result.overall_valid {
                    processed_rows = batch_result.results.len();
                } else {
                    // Add batch validation errors to our errors
                    for (index, validation) in batch_result.results {
                        if !validation.is_valid {
                            if let Some(csv_row) = csv_rows.get(index) {
                                for error in validation.errors {
                                    errors.push(CsvImportError {
                                        row_number: csv_row.row_number,
                                        field: None,
                                        message: error,
                                        row_data: format!(
                                            "result: {result}",
                                            result = csv_row.result
                                        ),
                                    });
                                }
                            }
                        }
                    }
                }
            }
            Err(e) => {
                errors.push(CsvImportError {
                    row_number: 0,
                    field: None,
                    message: format!("Batch update failed: {e}"),
                    row_data: "".to_string(),
                });
            }
        }
    }

    let success = errors.is_empty() && processed_rows > 0;
    let valid_rows = csv_rows.len();

    info!(
        "CSV import completed: {} total, {} valid, {} processed, {} errors",
        total_rows,
        valid_rows,
        processed_rows,
        errors.len()
    );

    Ok(CsvImportResult {
        success,
        total_rows,
        valid_rows,
        processed_rows,
        errors,
        warnings,
    })
}

// Helper functions for CSV processing
fn find_column_index(headers: &csv::StringRecord, possible_names: &[&str]) -> Option<usize> {
    for (index, header) in headers.iter().enumerate() {
        let header_lower = header.to_lowercase();
        for name in possible_names {
            if header_lower == name.to_lowercase() {
                return Some(index);
            }
        }
    }
    None
}

fn normalize_result(result: &str) -> String {
    let trimmed = result.trim();
    match trimmed {
        "1-0" | "1:0" | "1" | "white" | "w" => "1-0".to_string(),
        "0-1" | "0:1" | "0" | "black" | "b" => "0-1".to_string(),
        "1/2-1/2" | "0.5-0.5" | "0.5" | "draw" | "d" | "=" => "1/2-1/2".to_string(),
        "*" | "ongoing" | "unfinished" | "-" => "*".to_string(),
        _ => trimmed.to_string(), // Keep as-is for special results
    }
}

fn find_matching_game<'a>(
    games: &'a [crate::pawn::domain::model::Game],
    csv_row: &CsvResultRow,
) -> Option<&'a crate::pawn::domain::model::Game> {
    // First try to match by board number if available
    if let Some(board_number) = csv_row.board_number {
        // Board numbers are typically 1-based, but we need to match against the game order
        if let Some(game) = games.get((board_number - 1) as usize) {
            return Some(game);
        }
    }

    // If no board number or no match, try to match by player names
    if csv_row.white_player.is_some() || csv_row.black_player.is_some() {
        for _game in games {
            // This would require additional database lookup to get player names
            // For now, we'll rely on board number matching
            // TODO: Implement player name matching by fetching player details
        }
    }

    None
}
