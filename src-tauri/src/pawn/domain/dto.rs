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
    pub title: Option<String>,
    pub birth_date: Option<String>,
    pub gender: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub club: Option<String>,
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

// Enhanced Player Management DTOs

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdatePlayer {
    pub player_id: i32,
    pub name: Option<String>,
    pub rating: Option<i32>,
    pub country_code: Option<String>,
    pub title: Option<String>,
    pub birth_date: Option<String>,
    pub gender: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub club: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateRatingHistory {
    pub player_id: i32,
    pub rating_type: String,    // fide, national, club, rapid, blitz
    pub rating: i32,
    pub is_provisional: bool,
    pub effective_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreatePlayerCategory {
    pub tournament_id: i32,
    pub name: String,
    pub description: Option<String>,
    pub min_rating: Option<i32>,
    pub max_rating: Option<i32>,
    pub min_age: Option<i32>,
    pub max_age: Option<i32>,
    pub gender_restriction: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct BulkImportPlayer {
    pub name: String,
    pub rating: Option<i32>,
    pub country_code: Option<String>,
    pub title: Option<String>,
    pub birth_date: Option<String>,
    pub gender: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub club: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct BulkImportRequest {
    pub tournament_id: i32,
    pub players: Vec<BulkImportPlayer>,
    pub validate_only: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PlayerSearchFilters {
    pub tournament_id: Option<i32>,
    pub name: Option<String>,
    pub rating_min: Option<i32>,
    pub rating_max: Option<i32>,
    pub country_code: Option<String>,
    pub title: Option<String>,
    pub gender: Option<String>,
    pub status: Option<String>,
    pub category_id: Option<i32>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PlayerImportValidation {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub player_data: BulkImportPlayer,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct BulkImportResult {
    pub success_count: i32,
    pub error_count: i32,
    pub validations: Vec<PlayerImportValidation>,
    pub imported_player_ids: Vec<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AssignPlayerToCategory {
    pub player_id: i32,
    pub category_id: i32,
}

