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
