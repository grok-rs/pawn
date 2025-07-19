use tauri::State;
use tracing::{info, instrument};

use crate::pawn::{
    common::error::PawnError,
    domain::tiebreak::{
        NormCalculationRequest, NormCalculationResult, NormType, PrizeDistributionRequest,
        PrizeDistributionResult,
    },
    state::PawnState,
};

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn calculate_norm(
    state: State<'_, PawnState>,
    request: NormCalculationRequest,
) -> Result<NormCalculationResult, PawnError> {
    info!("Calculating norm: {:?}", request);

    state.norm_calculation_service.calculate_norm(request).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn calculate_available_norms(
    state: State<'_, PawnState>,
    tournament_id: i32,
    player_id: i32,
) -> Result<Vec<NormCalculationResult>, PawnError> {
    info!(
        "Calculating available norms for player {} in tournament {}",
        player_id, tournament_id
    );

    state
        .norm_calculation_service
        .calculate_available_norms(tournament_id, player_id)
        .await
}

#[instrument(ret)]
#[tauri::command]
#[specta::specta]
pub async fn get_norm_types() -> Result<Vec<NormType>, PawnError> {
    info!("Getting available norm types");

    let norm_types = vec![
        NormType::Grandmaster,
        NormType::InternationalMaster,
        NormType::FideMaster,
        NormType::CandidateMaster,
        NormType::WomanGrandmaster,
        NormType::WomanInternationalMaster,
        NormType::WomanFideMaster,
        NormType::WomanCandidateMaster,
    ];

    Ok(norm_types)
}

#[instrument(ret)]
#[tauri::command]
#[specta::specta]
pub async fn get_norm_requirements(norm_type: NormType) -> Result<(i32, i32, f64), PawnError> {
    info!("Getting requirements for norm type: {:?}", norm_type);

    Ok((
        norm_type.required_performance_rating(),
        norm_type.minimum_games(),
        norm_type.minimum_score_percentage(),
    ))
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn calculate_prize_distribution(
    state: State<'_, PawnState>,
    request: PrizeDistributionRequest,
) -> Result<PrizeDistributionResult, PawnError> {
    info!("Calculating prize distribution: {:?}", request);

    state
        .norm_calculation_service
        .calculate_prize_distribution(request)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_tournament_norms_summary(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> Result<Vec<(i32, String, Vec<NormCalculationResult>)>, PawnError> {
    info!(
        "Getting tournament norms summary for tournament {}",
        tournament_id
    );

    state
        .norm_calculation_service
        .get_tournament_norms_summary(tournament_id)
        .await
}

#[instrument(ret)]
#[tauri::command]
#[specta::specta]
pub async fn get_prize_distribution_templates() -> Result<Vec<String>, PawnError> {
    info!("Getting prize distribution templates");

    let templates = vec![
        "Standard Swiss".to_string(),
        "Round Robin".to_string(),
        "Knockout".to_string(),
        "Age Group Focus".to_string(),
        "Rating Group Focus".to_string(),
        "Custom".to_string(),
    ];

    Ok(templates)
}

#[instrument(ret)]
#[tauri::command]
#[specta::specta]
pub async fn validate_prize_distribution(
    request: PrizeDistributionRequest,
) -> Result<Vec<String>, PawnError> {
    info!("Validating prize distribution request");

    let mut errors = Vec::new();

    // Validate total percentages
    let total_main_percentage = request.prize_structure.first_place_percentage
        + request.prize_structure.second_place_percentage
        + request.prize_structure.third_place_percentage
        + request
            .prize_structure
            .additional_places
            .iter()
            .map(|p| p.percentage)
            .sum::<f64>();

    let total_age_percentage = request
        .prize_structure
        .age_group_prizes
        .iter()
        .map(|p| p.percentage)
        .sum::<f64>();

    let total_rating_percentage = request
        .prize_structure
        .rating_group_prizes
        .iter()
        .map(|p| p.percentage)
        .sum::<f64>();

    let total_special_percentage = request
        .special_prizes
        .iter()
        .map(|p| p.amount / request.total_prize_fund * 100.0)
        .sum::<f64>();

    let grand_total = total_main_percentage
        + total_age_percentage
        + total_rating_percentage
        + total_special_percentage;

    if grand_total > 100.0 {
        errors.push(format!(
            "Total prize distribution ({:.1}%) exceeds 100%",
            grand_total
        ));
    }

    // Validate prize fund
    if request.total_prize_fund <= 0.0 {
        errors.push("Total prize fund must be positive".to_string());
    }

    // Validate currency
    if request.currency.is_empty() {
        errors.push("Currency must be specified".to_string());
    }

    // Validate percentages are positive
    if request.prize_structure.first_place_percentage < 0.0
        || request.prize_structure.second_place_percentage < 0.0
        || request.prize_structure.third_place_percentage < 0.0
    {
        errors.push("Prize percentages must be non-negative".to_string());
    }

    // Validate additional places
    for place in &request.prize_structure.additional_places {
        if place.percentage < 0.0 {
            errors.push(format!(
                "Prize percentage for place {} must be non-negative",
                place.place
            ));
        }
        if place.place < 1 {
            errors.push(format!("Prize place {} must be positive", place.place));
        }
    }

    Ok(errors)
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn export_norms_report(
    state: State<'_, PawnState>,
    tournament_id: i32,
    format: String,
) -> Result<String, PawnError> {
    info!(
        "Exporting norms report for tournament {} in format {}",
        tournament_id, format
    );

    let summary = state
        .norm_calculation_service
        .get_tournament_norms_summary(tournament_id)
        .await?;

    match format.as_str() {
        "csv" => {
            let mut csv = String::new();
            csv.push_str("Player ID,Player Name,Norm Type,Achieved,Performance Rating,Required Rating,Games Played,Points Scored\n");

            for (player_id, player_name, norms) in summary {
                for norm in norms {
                    csv.push_str(&format!(
                        "{},{},{},{},{},{},{},{:.1}\n",
                        player_id,
                        player_name,
                        norm.norm_type.display_name(),
                        norm.achieved,
                        norm.performance_rating,
                        norm.required_performance_rating,
                        norm.games_played,
                        norm.points_scored
                    ));
                }
            }

            Ok(csv)
        }
        "json" => {
            let json =
                serde_json::to_string_pretty(&summary).map_err(|e| PawnError::SerdeError(e))?;
            Ok(json)
        }
        _ => Err(PawnError::InvalidInput(format!(
            "Unsupported format: {}",
            format
        ))),
    }
}
