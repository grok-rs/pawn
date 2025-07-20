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
            "Total prize distribution ({grand_total:.1}%) exceeds 100%"
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
            let json = serde_json::to_string_pretty(&summary).map_err(PawnError::SerdeError)?;
            Ok(json)
        }
        _ => Err(PawnError::InvalidInput(format!(
            "Unsupported format: {format}"
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pawn::domain::tiebreak::{DistributionMethod, NormRequirements, PrizeStructure};

    #[tokio::test]
    async fn command_get_norm_types_contract() {
        // Test the static command that returns norm types
        let result = get_norm_types().await;
        assert!(result.is_ok());
        let types = result.unwrap();
        assert!(!types.is_empty());
        // Use discriminant comparison since NormType doesn't implement PartialEq
        use std::mem::discriminant;
        assert!(
            types
                .iter()
                .any(|t| discriminant(t) == discriminant(&NormType::Grandmaster))
        );
        assert!(
            types
                .iter()
                .any(|t| discriminant(t) == discriminant(&NormType::InternationalMaster))
        );
        assert!(
            types
                .iter()
                .any(|t| discriminant(t) == discriminant(&NormType::FideMaster))
        );
    }

    #[tokio::test]
    async fn command_get_norm_requirements_contract() {
        // Test the static command that returns norm requirements
        let result = get_norm_requirements(NormType::Grandmaster).await;
        assert!(result.is_ok());
        let (rating, games, percentage) = result.unwrap();
        assert!(rating > 0);
        assert!(games > 0);
        assert!(percentage > 0.0 && percentage <= 100.0);
    }

    #[tokio::test]
    async fn command_get_prize_distribution_templates_contract() {
        // Test the static command that returns templates
        let result = get_prize_distribution_templates().await;
        assert!(result.is_ok());
        let templates = result.unwrap();
        assert!(!templates.is_empty());
        assert_eq!(templates.len(), 6); // Should have 6 templates

        assert!(templates.contains(&"Standard Swiss".to_string()));
        assert!(templates.contains(&"Round Robin".to_string()));
        assert!(templates.contains(&"Knockout".to_string()));
        assert!(templates.contains(&"Age Group Focus".to_string()));
        assert!(templates.contains(&"Rating Group Focus".to_string()));
        assert!(templates.contains(&"Custom".to_string()));
    }

    #[tokio::test]
    async fn command_norm_types_coverage() {
        // Test all norm types and their requirements
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

        for norm_type in norm_types {
            let result = get_norm_requirements(norm_type.clone()).await;
            assert!(result.is_ok());
            let (rating, games, percentage) = result.unwrap();
            assert!(rating > 0, "Rating should be positive for {norm_type:?}");
            assert!(games > 0, "Games should be positive for {norm_type:?}");
            assert!(
                percentage > 0.0,
                "Percentage should be positive for {norm_type:?}"
            );
            assert!(
                percentage <= 100.0,
                "Percentage should not exceed 100% for {norm_type:?}"
            );

            // Test display name
            let display_name = norm_type.display_name();
            assert!(
                !display_name.is_empty(),
                "Display name should not be empty for {norm_type:?}"
            );
        }
    }

    #[tokio::test]
    async fn command_validate_prize_distribution_contract() {
        // Test valid distribution
        let valid_request = PrizeDistributionRequest {
            tournament_id: 1,
            total_prize_fund: 10000.0,
            currency: "USD".to_string(),
            distribution_method: DistributionMethod::TiedPlayersShareEqually,
            prize_structure: PrizeStructure {
                first_place_percentage: 40.0,
                second_place_percentage: 25.0,
                third_place_percentage: 15.0,
                additional_places: vec![],
                age_group_prizes: vec![],
                rating_group_prizes: vec![],
            },
            special_prizes: vec![],
        };

        let result = validate_prize_distribution(valid_request).await;
        assert!(result.is_ok());
        let errors = result.unwrap();
        assert!(errors.is_empty()); // Should have no errors

        // Test invalid distribution (over 100%)
        let invalid_request = PrizeDistributionRequest {
            tournament_id: 1,
            total_prize_fund: 10000.0,
            currency: "USD".to_string(),
            distribution_method: DistributionMethod::TiedPlayersShareEqually,
            prize_structure: PrizeStructure {
                first_place_percentage: 50.0,
                second_place_percentage: 30.0,
                third_place_percentage: 25.0, // Total 105% - over 100%
                additional_places: vec![],
                age_group_prizes: vec![],
                rating_group_prizes: vec![],
            },
            special_prizes: vec![],
        };

        let result = validate_prize_distribution(invalid_request).await;
        assert!(result.is_ok());
        let errors = result.unwrap();
        assert!(!errors.is_empty()); // Should have errors
        assert!(errors.iter().any(|e| e.contains("exceeds 100%")));
    }

    #[tokio::test]
    async fn command_prize_distribution_validation_edge_cases() {
        // Test negative prize fund
        let negative_fund_request = PrizeDistributionRequest {
            tournament_id: 1,
            total_prize_fund: -1000.0,
            currency: "USD".to_string(),
            distribution_method: DistributionMethod::TiedPlayersShareEqually,
            prize_structure: PrizeStructure {
                first_place_percentage: 50.0,
                second_place_percentage: 30.0,
                third_place_percentage: 20.0,
                additional_places: vec![],
                age_group_prizes: vec![],
                rating_group_prizes: vec![],
            },
            special_prizes: vec![],
        };

        let result = validate_prize_distribution(negative_fund_request).await;
        assert!(result.is_ok());
        let errors = result.unwrap();
        assert!(errors.iter().any(|e| e.contains("must be positive")));

        // Test empty currency
        let empty_currency_request = PrizeDistributionRequest {
            tournament_id: 1,
            total_prize_fund: 1000.0,
            currency: "".to_string(),
            distribution_method: DistributionMethod::TiedPlayersShareEqually,
            prize_structure: PrizeStructure {
                first_place_percentage: 50.0,
                second_place_percentage: 30.0,
                third_place_percentage: 20.0,
                additional_places: vec![],
                age_group_prizes: vec![],
                rating_group_prizes: vec![],
            },
            special_prizes: vec![],
        };

        let result = validate_prize_distribution(empty_currency_request).await;
        assert!(result.is_ok());
        let errors = result.unwrap();
        assert!(
            errors
                .iter()
                .any(|e| e.contains("Currency must be specified"))
        );
    }

    #[tokio::test]
    async fn command_norm_dto_basic_coverage() {
        // Test basic DTO structures without complex dependencies
        use std::mem::discriminant;

        let norm_request = NormCalculationRequest {
            tournament_id: 1,
            player_id: 1,
            norm_type: NormType::Grandmaster,
            tournament_category: Some(2400),
            games_played: 9,
            points_scored: 6.5,
            performance_rating: Some(2520),
        };
        assert_eq!(norm_request.tournament_id, 1);
        assert_eq!(norm_request.player_id, 1);
        assert_eq!(
            discriminant(&norm_request.norm_type),
            discriminant(&NormType::Grandmaster)
        );
        assert_eq!(norm_request.games_played, 9);
        assert_eq!(norm_request.points_scored, 6.5);

        let norm_result = NormCalculationResult {
            norm_type: NormType::InternationalMaster,
            achieved: true,
            performance_rating: 2520,
            required_performance_rating: 2500,
            games_played: 9,
            minimum_games: 9,
            points_scored: 6.5,
            score_percentage: 72.2,
            minimum_score_percentage: 50.0,
            tournament_category: Some(2400),
            requirements_met: NormRequirements {
                performance_rating_met: true,
                minimum_games_met: true,
                minimum_score_met: true,
                tournament_category_adequate: true,
                opponent_diversity_met: true,
            },
            missing_requirements: vec![],
            additional_info: "All requirements met".to_string(),
        };
        assert_eq!(
            discriminant(&norm_result.norm_type),
            discriminant(&NormType::InternationalMaster)
        );
        assert!(norm_result.achieved);
        assert_eq!(norm_result.performance_rating, 2520);
        assert_eq!(norm_result.games_played, 9);
        assert_eq!(norm_result.points_scored, 6.5);
    }
}
