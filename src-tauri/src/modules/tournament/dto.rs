use crate::standings::model::TiebreakType;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateTournament {
    pub name: String,
    pub location: String,
    pub date: String,
    pub time_type: String,
    pub tournament_type: Option<String>,
    pub player_count: i32,
    pub rounds_played: i32,
    pub total_rounds: i32,
    pub country_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateTournamentSettings {
    pub tournament_id: i32,
    pub tiebreak_order: Vec<TiebreakType>,
    pub use_fide_defaults: bool,
    pub forfeit_time_minutes: Option<i32>,
    pub draw_offers_allowed: Option<bool>,
    pub mobile_phone_policy: Option<String>,
    pub default_color_allocation: Option<String>,
    pub late_entry_allowed: Option<bool>,
    pub bye_assignment_rule: Option<String>,
    pub arbiter_notes: Option<String>,
    pub tournament_category: Option<String>,
    pub organizer_name: Option<String>,
    pub organizer_email: Option<String>,
    pub prize_structure: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateTournamentStatus {
    pub tournament_id: i32,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateTournament {
    pub id: i32,
    pub name: Option<String>,
    pub location: Option<String>,
    pub date: Option<String>,
    pub total_rounds: Option<i32>,
    pub description: Option<String>,
    pub website_url: Option<String>,
    pub contact_email: Option<String>,
    pub entry_fee: Option<f64>,
    pub currency: Option<String>,
}

// Seeding DTOs

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateTournamentSeedingSettings {
    pub tournament_id: i32,
    pub seeding_method: String,
    pub use_initial_rating: bool,
    pub randomize_unrated: bool,
    pub protect_top_seeds: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateTournamentSeedingSettings {
    pub id: i32,
    pub seeding_method: Option<String>,
    pub use_initial_rating: Option<bool>,
    pub randomize_unrated: Option<bool>,
    pub protect_top_seeds: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct GenerateSeedingRequest {
    pub tournament_id: i32,
    pub seeding_method: String,
    pub preserve_manual_seeds: bool,
    pub category_id: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdatePlayerSeeding {
    pub player_id: i32,
    pub seed_number: Option<i32>,
    pub pairing_number: Option<i32>,
    pub initial_rating: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct BatchUpdatePlayerSeeding {
    pub tournament_id: i32,
    pub seeding_updates: Vec<UpdatePlayerSeeding>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SeedingPreview {
    pub player_id: i32,
    pub player_name: String,
    pub current_seed: Option<i32>,
    pub proposed_seed: i32,
    pub rating: Option<i32>,
    pub title: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct GeneratePairingNumbersRequest {
    pub tournament_id: i32,
    pub method: String,
    pub start_number: i32,
    pub preserve_existing: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SeedingAnalysis {
    pub total_players: i32,
    pub rated_players: i32,
    pub unrated_players: i32,
    pub manual_seeds: i32,
    pub rating_range: Option<(i32, i32)>,
    pub average_rating: Option<f64>,
    pub seeding_conflicts: Vec<SeedingConflict>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SeedingConflict {
    pub player_id: i32,
    pub player_name: String,
    pub conflict_type: String,
    pub description: String,
    pub suggested_action: String,
}

// Time Control DTOs

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateTimeControl {
    pub name: String,
    pub time_control_type: String,
    pub base_time_minutes: Option<i32>,
    pub increment_seconds: Option<i32>,
    pub moves_per_session: Option<i32>,
    pub session_time_minutes: Option<i32>,
    pub total_sessions: Option<i32>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateTimeControl {
    pub id: i32,
    pub name: Option<String>,
    pub time_control_type: Option<String>,
    pub base_time_minutes: Option<i32>,
    pub increment_seconds: Option<i32>,
    pub moves_per_session: Option<i32>,
    pub session_time_minutes: Option<i32>,
    pub total_sessions: Option<i32>,
    pub description: Option<String>,
    pub is_default: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TimeControlFilter {
    pub time_control_type: Option<String>,
    pub is_default: Option<bool>,
    pub is_real_time: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TimeControlValidation {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub estimated_game_duration_minutes: Option<i32>,
}
