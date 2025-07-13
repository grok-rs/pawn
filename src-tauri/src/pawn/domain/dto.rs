use serde::{Deserialize, Serialize};
use specta::Type;
use crate::pawn::domain::tiebreak::TiebreakType;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateTournament {
    pub name: String,
    pub location: String,
    pub date: String,
    pub time_type: String,
    pub player_count: i32,
    pub rounds_played: i32,
    pub total_rounds: i32,
    pub country_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreatePlayer {
    pub tournament_id: i32,
    pub name: String,
    pub rating: Option<i32>,
    pub country_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateGame {
    pub tournament_id: i32,
    pub round_number: i32,
    pub white_player_id: i32,
    pub black_player_id: i32,
    pub result: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateTournamentSettings {
    pub tournament_id: i32,
    pub tiebreak_order: Vec<TiebreakType>,
    pub use_fide_defaults: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateRound {
    pub tournament_id: i32,
    pub round_number: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateRoundStatus {
    pub round_id: i32,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct GeneratePairingsRequest {
    pub tournament_id: i32,
    pub round_number: i32,
    pub pairing_method: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateTournamentPairingMethod {
    pub tournament_id: i32,
    pub pairing_method: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateGameResult {
    pub game_id: i32,
    pub result: String,
    pub result_type: Option<String>,
    pub result_reason: Option<String>,
    pub arbiter_notes: Option<String>,
    pub changed_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ValidateGameResult {
    pub game_id: i32,
    pub result: String,
    pub result_type: Option<String>,
    pub tournament_id: i32,
    pub changed_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct BatchUpdateResults {
    pub tournament_id: i32,
    pub updates: Vec<UpdateGameResult>,
    pub validate_only: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ApproveGameResult {
    pub game_id: i32,
    pub approved_by: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct GameResultValidation {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct BatchValidationResult {
    pub overall_valid: bool,
    pub results: Vec<(usize, GameResultValidation)>,
}

