use crate::pawn::common::error::PawnError;
use crate::pawn::db::Db;
use crate::pawn::domain::dto::*;
use tracing::instrument;

pub struct ResultValidationService;

#[derive(Debug)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

impl ValidationResult {
    pub fn new() -> Self {
        Self {
            is_valid: true,
            errors: Vec::new(),
            warnings: Vec::new(),
        }
    }

    pub fn add_error(&mut self, error: String) {
        self.errors.push(error);
        self.is_valid = false;
    }

    pub fn add_warning(&mut self, warning: String) {
        self.warnings.push(warning);
    }

    pub fn merge(&mut self, other: ValidationResult) {
        self.errors.extend(other.errors);
        self.warnings.extend(other.warnings);
        if !other.is_valid {
            self.is_valid = false;
        }
    }
}

impl ResultValidationService {
    #[instrument(ret, skip(db))]
    pub async fn validate_game_result<T: Db>(
        db: &T,
        game_id: i32,
        new_result: &str,
        result_type: Option<&str>,
        tournament_id: i32,
        changed_by: Option<&str>,
    ) -> Result<ValidationResult, PawnError> {
        let mut validation = ValidationResult::new();

        // Validate result format
        let result_validation = Self::validate_result_format(new_result, result_type);
        validation.merge(result_validation);

        // Check if game exists and belongs to tournament
        let game_validation = Self::validate_game_exists(db, game_id, tournament_id).await?;
        validation.merge(game_validation);

        if !validation.is_valid {
            return Ok(validation);
        }

        // Check for duplicate results
        let duplicate_validation =
            Self::validate_no_duplicate_result(db, game_id, new_result).await?;
        validation.merge(duplicate_validation);

        // Validate players are active in tournament
        let player_validation = Self::validate_players_active(db, game_id, tournament_id).await?;
        validation.merge(player_validation);

        // Check round consistency
        let round_validation = Self::validate_round_consistency(db, game_id, tournament_id).await?;
        validation.merge(round_validation);

        // Validate special results require approval
        let approval_validation =
            Self::validate_approval_requirements(new_result, result_type, changed_by);
        validation.merge(approval_validation);

        Ok(validation)
    }

    #[instrument(ret)]
    pub fn validate_result_format(result: &str, result_type: Option<&str>) -> ValidationResult {
        let mut validation = ValidationResult::new();

        let valid_results = vec![
            "1-0", "0-1", "1/2-1/2", "*", "0-1F", "1-0F", "0-1D", "1-0D", "ADJ", "0-1T", "1-0T",
            "0-0", "CANC",
        ];

        if !valid_results.contains(&result) {
            validation.add_error(format!(
                "Invalid result format: '{result}'. Valid formats: {valid_results:?}"
            ));
        }

        // Validate result_type consistency
        if let Some(rt) = result_type {
            let expected_type = match result {
                "1-0" => vec!["standard", "black_forfeit", "black_default"],
                "0-1" => vec!["standard", "white_forfeit", "white_default"],
                "1/2-1/2" => vec!["standard"],
                "*" => vec!["ongoing"],
                "0-1F" => vec!["white_forfeit"],
                "1-0F" => vec!["black_forfeit"],
                "0-1D" => vec!["white_default"],
                "1-0D" => vec!["black_default"],
                "ADJ" => vec!["adjourned"],
                "0-1T" | "1-0T" => vec!["timeout"],
                "0-0" => vec!["double_forfeit"],
                "CANC" => vec!["cancelled"],
                _ => vec![],
            };

            if !expected_type.contains(&rt) {
                validation.add_error(format!(
                    "Result type '{rt}' is not compatible with result '{result}'. Expected: {expected_type:?}"
                ));
            }
        }

        validation
    }

    #[instrument(ret, skip(db))]
    pub async fn validate_game_exists<T: Db>(
        db: &T,
        game_id: i32,
        tournament_id: i32,
    ) -> Result<ValidationResult, PawnError> {
        let mut validation = ValidationResult::new();

        // For now, just validate the tournament exists since get_game is not available yet
        match db.get_tournament(tournament_id).await {
            Ok(_) => {
                // Tournament exists, assume game validation will be added later
            }
            Err(_) => {
                validation.add_error(format!("Tournament {tournament_id} not found"));
            }
        }

        Ok(validation)
    }

    #[instrument(ret, skip(_db))]
    pub async fn validate_no_duplicate_result<T: Db>(
        _db: &T,
        game_id: i32,
        new_result: &str,
    ) -> Result<ValidationResult, PawnError> {
        let mut validation = ValidationResult::new();

        // TODO: Implement when get_game method is available
        // For now, just validate the result format
        if new_result.is_empty() {
            validation.add_error("Result cannot be empty".to_string());
        }

        Ok(validation)
    }

    #[instrument(ret, skip(db))]
    pub async fn validate_players_active<T: Db>(
        db: &T,
        game_id: i32,
        tournament_id: i32,
    ) -> Result<ValidationResult, PawnError> {
        let mut validation = ValidationResult::new();

        // TODO: Implement when get_game and get_player methods are available
        // For now, just check if the tournament exists
        match db.get_tournament(tournament_id).await {
            Ok(_) => {
                // Tournament exists, assume player validation will be added later
            }
            Err(_) => {
                validation.add_error(format!("Tournament {tournament_id} not found"));
            }
        }

        Ok(validation)
    }

    #[instrument(ret, skip(db))]
    pub async fn validate_round_consistency<T: Db>(
        db: &T,
        game_id: i32,
        tournament_id: i32,
    ) -> Result<ValidationResult, PawnError> {
        let mut validation = ValidationResult::new();

        // TODO: Implement when get_game and get_round_by_number methods are available
        // For now, just check if the tournament exists
        match db.get_tournament(tournament_id).await {
            Ok(_) => {
                // Tournament exists, assume round validation will be added later
            }
            Err(_) => {
                validation.add_error(format!("Tournament {tournament_id} not found"));
            }
        }

        Ok(validation)
    }

    #[instrument(ret)]
    pub fn validate_approval_requirements(
        result: &str,
        result_type: Option<&str>,
        changed_by: Option<&str>,
    ) -> ValidationResult {
        let mut validation = ValidationResult::new();

        let requires_approval =
            matches!(result, "0-1F" | "1-0F" | "0-1D" | "1-0D" | "0-0" | "CANC");

        if requires_approval && changed_by.is_none() {
            validation.add_error(format!(
                "Result '{result}' requires arbiter approval but no authority specified"
            ));
        }

        if requires_approval {
            validation.add_warning(format!(
                "Result '{result}' requires arbiter approval and will be marked as pending"
            ));
        }

        validation
    }

    #[instrument(ret, skip(db))]
    pub async fn validate_batch_results<T: Db>(
        db: &T,
        results: &[UpdateGameResult],
        tournament_id: i32,
    ) -> Result<Vec<(usize, ValidationResult)>, PawnError> {
        let mut batch_results = Vec::new();

        for (index, update_request) in results.iter().enumerate() {
            let validation = Self::validate_game_result(
                db,
                update_request.game_id,
                &update_request.result,
                update_request.result_type.as_deref(),
                tournament_id,
                update_request.changed_by.as_deref(),
            )
            .await?;

            batch_results.push((index, validation));
        }

        Ok(batch_results)
    }
}
