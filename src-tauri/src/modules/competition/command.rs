use tauri::State;
use tracing::{info, instrument, warn};

use crate::{
    common::{error::PawnError, types::CommandResult},
    competition::dto::{
        ApproveGameResult, BatchUpdateResults, BatchValidationResult, CreateKnockoutBracket,
        CreateRound, CsvImportError, CsvImportResult, CsvResultImport, CsvResultRow,
        EnhancedPairingRequest, EnhancedPairingResult, GameResultValidation,
        GeneratePairingsRequest, PairingPerformanceMetrics, PairingValidationResults,
        RoundRobinAnalysis, RoundRobinOptions, SwissPairingAnalysis, SwissPairingOptions,
        UpdateGameResult, UpdateRoundStatus, UpdateTournamentPairingMethod, ValidateGameResult,
    },
    competition::knockout_domain::KnockoutService,
    competition::model::{
        BracketPosition, EnhancedGameResult, GameResult, GameResultAudit, KnockoutBracket, Pairing,
        Round, RoundDetails,
    },
    competition::service::validation::ResultValidationService,
    db::*,
    state::PawnState,
};

// =====================================================
// Round operations
// =====================================================

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
    let basic_request = GeneratePairingsRequest {
        tournament_id: request.tournament_id,
        round_number: request.round_number,
        pairing_method: request.pairing_method,
    };

    let pairings = state.round_service.generate_pairings(basic_request).await?;

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
    let _ = (state, tournament_id, pairings);

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
) -> CommandResult<Vec<PairingPerformanceMetrics>> {
    let _ = (state, player_counts);
    Ok(vec![])
}

// =====================================================
// Game result operations
// =====================================================

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn update_game_result(
    state: State<'_, PawnState>,
    data: UpdateGameResult,
) -> Result<crate::competition::model::Game, PawnError> {
    info!("Updating game result: {:?}", data);

    let db = &*state.db;

    let validation = ResultValidationService::validate_game_result(
        db,
        data.game_id,
        &data.result,
        data.result_type.as_deref(),
        0,
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

    let updated_game = db.update_game_result(data).await?;

    info!(
        "Successfully updated game {} result to {}",
        updated_game.id, updated_game.result
    );

    let affected_players = vec![updated_game.white_player_id, updated_game.black_player_id];
    if let Err(e) = state
        .realtime_standings_service
        .handle_game_result_update(updated_game.tournament_id, affected_players)
        .await
    {
        warn!("Failed to update real-time standings: {}", e);
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

    if data.validate_only {
        return Ok(BatchValidationResult {
            overall_valid,
            results,
        });
    }

    if !overall_valid {
        warn!("Batch validation failed, aborting updates");
        return Ok(BatchValidationResult {
            overall_valid,
            results,
        });
    }

    let _update_results: Vec<String> = Vec::new();
    for update_request in data.updates {
        match db.update_game_result(update_request.clone()).await {
            Ok(_) => {
                info!("Successfully updated game {}", update_request.game_id);
            }
            Err(e) => {
                warn!("Failed to update game {}: {}", update_request.game_id, e);
                if let Some(_result_index) = results.iter_mut().find(|(_, _)| true) {
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

    let mut csv_reader = csv::Reader::from_reader(data.csv_content.as_bytes());
    let mut csv_rows = Vec::new();
    let mut errors = Vec::new();
    let warnings = Vec::new();

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

    for (row_index, record) in csv_reader.records().enumerate() {
        let row_number = row_index + 2;

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

    let mut processed_rows = 0;
    let mut update_requests = Vec::new();

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

    if !update_requests.is_empty() {
        let batch_request = crate::competition::dto::BatchUpdateResults {
            tournament_id: data.tournament_id,
            updates: update_requests,
            validate_only: false,
        };

        match batch_update_results(state, batch_request).await {
            Ok(batch_result) => {
                if batch_result.overall_valid {
                    processed_rows = batch_result.results.len();
                } else {
                    for (index, validation) in batch_result.results {
                        if !validation.is_valid
                            && let Some(csv_row) = csv_rows.get(index)
                        {
                            for error in validation.errors {
                                errors.push(CsvImportError {
                                    row_number: csv_row.row_number,
                                    field: None,
                                    message: error,
                                    row_data: format!("result: {result}", result = csv_row.result),
                                });
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
        _ => trimmed.to_string(),
    }
}

fn find_matching_game<'a>(
    games: &'a [crate::competition::model::Game],
    csv_row: &CsvResultRow,
) -> Option<&'a crate::competition::model::Game> {
    if let Some(board_number) = csv_row.board_number {
        if let Some(game) = games.get((board_number - 1) as usize) {
            return Some(game);
        }
    }

    if csv_row.white_player.is_some() || csv_row.black_player.is_some() {
        for _game in games {
            // TODO: Implement player name matching
        }
    }

    None
}

// =====================================================
// Knockout operations
// =====================================================

#[tauri::command]
#[specta::specta]
pub async fn create_knockout_bracket(
    state: State<'_, PawnState>,
    data: CreateKnockoutBracket,
) -> CommandResult<KnockoutBracket> {
    let db = &*state.db;

    let bracket = KnockoutBracket {
        id: 0,
        tournament_id: data.tournament_id,
        bracket_type: data.bracket_type,
        total_rounds: 0,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    let created_bracket = db.create_knockout_bracket(bracket).await?;
    Ok(created_bracket)
}

#[tauri::command]
#[specta::specta]
pub async fn get_knockout_bracket(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Option<KnockoutBracket>> {
    let db = &*state.db;
    let bracket = db.get_knockout_bracket(tournament_id).await?;
    Ok(bracket)
}

#[tauri::command]
#[specta::specta]
pub async fn initialize_knockout_tournament(
    state: State<'_, PawnState>,
    tournament_id: i32,
    bracket_type: String,
) -> CommandResult<KnockoutBracket> {
    let db = &*state.db;

    let players = db.get_players_by_tournament(tournament_id).await?;
    if players.len() < 2 {
        return Err(PawnError::InvalidInput(
            "At least 2 players required for knockout tournament".to_string(),
        ));
    }

    let total_rounds = KnockoutService::calculate_rounds(players.len() as i32);

    let bracket = KnockoutBracket {
        id: 0,
        tournament_id,
        bracket_type: bracket_type.clone(),
        total_rounds,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    let created_bracket = db.create_knockout_bracket(bracket).await?;

    let first_round_positions =
        KnockoutService::generate_first_round_positions(created_bracket.id, players);

    for position in first_round_positions {
        db.create_bracket_position(position).await?;
    }

    Ok(created_bracket)
}

#[tauri::command]
#[specta::specta]
pub async fn get_bracket_positions(
    state: State<'_, PawnState>,
    bracket_id: i32,
) -> CommandResult<Vec<BracketPosition>> {
    let db = &*state.db;
    let positions = db.get_bracket_positions(bracket_id).await?;
    Ok(positions)
}

#[tauri::command]
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

#[tauri::command]
#[specta::specta]
pub async fn generate_knockout_pairings(
    state: State<'_, PawnState>,
    bracket_id: i32,
    round_number: i32,
) -> CommandResult<Vec<Pairing>> {
    let db = &*state.db;

    let positions = db
        .get_bracket_positions_by_round(bracket_id, round_number)
        .await?;

    let pairings = KnockoutService::generate_round_pairings(bracket_id, round_number, &positions);

    Ok(pairings)
}

#[tauri::command]
#[specta::specta]
pub async fn advance_knockout_winners(
    state: State<'_, PawnState>,
    bracket_id: i32,
    round_number: i32,
    winner_results: Vec<(i32, i32)>,
) -> CommandResult<Vec<BracketPosition>> {
    let db = &*state.db;

    let next_round_positions =
        KnockoutService::advance_winners(bracket_id, round_number, &winner_results);

    let mut created_positions = Vec::new();
    for position in next_round_positions {
        let created = db.create_bracket_position(position).await?;
        created_positions.push(created);
    }

    Ok(created_positions)
}

#[tauri::command]
#[specta::specta]
pub async fn get_knockout_tournament_winner(
    state: State<'_, PawnState>,
    bracket_id: i32,
) -> CommandResult<Option<i32>> {
    let db = &*state.db;

    let bracket = db.get_knockout_bracket_by_id(bracket_id).await?;
    if bracket.is_none() {
        return Ok(None);
    }

    let bracket = bracket.unwrap();
    let positions = db.get_bracket_positions(bracket_id).await?;

    let winner_id = KnockoutService::get_tournament_winner(&positions, bracket.total_rounds);
    Ok(winner_id)
}

#[tauri::command]
#[specta::specta]
pub async fn is_knockout_tournament_complete(
    state: State<'_, PawnState>,
    bracket_id: i32,
) -> CommandResult<bool> {
    let db = &*state.db;

    let bracket = db.get_knockout_bracket_by_id(bracket_id).await?;
    if bracket.is_none() {
        return Ok(false);
    }

    let bracket = bracket.unwrap();
    let positions = db.get_bracket_positions(bracket_id).await?;

    let is_complete = KnockoutService::is_tournament_complete(&positions, bracket.total_rounds);
    Ok(is_complete)
}

#[tauri::command]
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
