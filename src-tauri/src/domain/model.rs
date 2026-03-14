use crate::common::macros::str_enum;
use serde::{Deserialize, Serialize};
use specta::Type as SpectaType;
use sqlx::{FromRow, prelude::Type};

// ── Tournament ──────────────────────────────────────────────────────

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct Tournament {
    pub id: i32,
    pub name: String,
    pub location: String,
    pub date: String,
    pub time_type: String,
    pub tournament_type: Option<String>,
    pub player_count: i32,
    pub rounds_played: i32,
    pub total_rounds: i32,
    pub country_code: String,
    pub status: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub description: Option<String>,
    pub website_url: Option<String>,
    pub contact_email: Option<String>,
    pub entry_fee: Option<f64>,
    pub currency: Option<String>,
    pub is_team_tournament: Option<bool>,
    pub team_size: Option<i32>,
    pub max_teams: Option<i32>,
}

#[derive(Debug, Serialize, SpectaType, Clone)]
pub struct TournamentDetails {
    pub tournament: Tournament,
    pub players: Vec<PlayerResult>,
    pub games: Vec<GameResult>,
}

// ── Player ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct Player {
    pub id: i32,
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
    pub status: String,
    pub seed_number: Option<i32>,
    pub pairing_number: Option<i32>,
    pub initial_rating: Option<i32>,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, SpectaType, Clone)]
pub struct PlayerResult {
    pub player: Player,
    pub points: f32,
    pub games_played: i32,
    pub wins: i32,
    pub draws: i32,
    pub losses: i32,
}

str_enum! {
    #[allow(dead_code, clippy::upper_case_acronyms)]
    #[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
    pub enum ChessTitle {
        GM => "GM",
        IM => "IM",
        FM => "FM",
        CM => "CM",
        WGM => "WGM",
        WIM => "WIM",
        WFM => "WFM",
        WCM => "WCM",
        None => "",
    }
    default: None
}

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct RatingHistory {
    pub id: i32,
    pub player_id: i32,
    pub rating_type: String,
    pub rating: i32,
    pub is_provisional: bool,
    pub effective_date: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct PlayerCategory {
    pub id: i32,
    pub tournament_id: i32,
    pub name: String,
    pub description: Option<String>,
    pub min_rating: Option<i32>,
    pub max_rating: Option<i32>,
    pub min_age: Option<i32>,
    pub max_age: Option<i32>,
    pub gender_restriction: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct PlayerCategoryAssignment {
    pub id: i32,
    pub player_id: i32,
    pub category_id: i32,
    pub assigned_at: String,
}

// ── Game ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct Game {
    pub id: i32,
    pub tournament_id: i32,
    pub round_number: i32,
    pub white_player_id: i32,
    pub black_player_id: i32,
    pub result: String,
    pub result_type: Option<String>,
    pub result_reason: Option<String>,
    pub arbiter_notes: Option<String>,
    pub last_updated: Option<String>,
    pub approved_by: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, SpectaType, Clone)]
pub struct GameResult {
    pub game: Game,
    pub white_player: Player,
    pub black_player: Player,
}

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct GameResultAudit {
    pub id: i32,
    pub game_id: i32,
    pub old_result: Option<String>,
    pub new_result: String,
    pub old_result_type: Option<String>,
    pub new_result_type: Option<String>,
    pub reason: Option<String>,
    pub changed_by: Option<String>,
    pub changed_at: String,
    pub approved: bool,
    pub approved_by: Option<String>,
    pub approved_at: Option<String>,
}

#[derive(Debug, Serialize, SpectaType, Clone)]
pub struct EnhancedGameResult {
    pub game: Game,
    pub white_player: Player,
    pub black_player: Player,
    pub audit_trail: Vec<GameResultAudit>,
    pub requires_approval: bool,
}

str_enum! {
    #[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
    pub enum GameResultType {
        WhiteWins => "1-0",
        BlackWins => "0-1",
        Draw => "1/2-1/2",
        Ongoing => "*",
        WhiteForfeit => "0-1F" | "white_forfeit",
        BlackForfeit => "1-0F" | "black_forfeit",
        WhiteDefault => "0-1D" | "white_default",
        BlackDefault => "1-0D" | "black_default",
        Adjourned => "ADJ" | "adjourned",
        Timeout => "0-1T" | "1-0T" | "timeout",
        DoubleForfeit => "0-0" | "double_forfeit",
        Cancelled => "CANC" | "cancelled",
    }
    default: Ongoing
}

impl GameResultType {
    pub fn requires_arbiter_approval(&self) -> bool {
        matches!(
            self,
            GameResultType::WhiteForfeit
                | GameResultType::BlackForfeit
                | GameResultType::WhiteDefault
                | GameResultType::BlackDefault
                | GameResultType::DoubleForfeit
                | GameResultType::Cancelled
        )
    }
}

// ── Round ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct Round {
    pub id: i32,
    pub tournament_id: i32,
    pub round_number: i32,
    pub status: String,
    pub created_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Serialize, SpectaType, Clone)]
pub struct RoundDetails {
    pub round: Round,
    pub games: Vec<GameResult>,
    pub status: RoundStatus,
}

#[derive(Debug, Serialize, Deserialize, SpectaType, Clone)]
pub struct Pairing {
    pub white_player: Player,
    pub black_player: Option<Player>,
    pub board_number: i32,
}

str_enum! {
    #[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
    pub enum RoundStatus {
        Planned => "planned" | "upcoming",
        Pairing => "pairing",
        Published => "published",
        InProgress => "in_progress",
        Finishing => "finishing",
        Completed => "completed",
        Verified => "verified",
    }
    default: Planned
}

impl RoundStatus {
    pub fn can_transition_to(&self, new_status: &RoundStatus) -> bool {
        match (self, new_status) {
            // Forward transitions
            (RoundStatus::Planned, RoundStatus::Pairing) => true,
            (RoundStatus::Pairing, RoundStatus::Published) => true,
            (RoundStatus::Published, RoundStatus::InProgress) => true,
            (RoundStatus::InProgress, RoundStatus::Finishing) => true,
            (RoundStatus::Finishing, RoundStatus::Completed) => true,
            (RoundStatus::Completed, RoundStatus::Verified) => true,
            // Direct transitions for simpler workflows
            (RoundStatus::Planned, RoundStatus::Published) => true,
            (RoundStatus::Published, RoundStatus::Completed) => true,
            (RoundStatus::InProgress, RoundStatus::Completed) => true,
            // Backward transitions for corrections
            (RoundStatus::Published, RoundStatus::Pairing) => true,
            (RoundStatus::InProgress, RoundStatus::Published) => true,
            (RoundStatus::Finishing, RoundStatus::InProgress) => true,
            (RoundStatus::Completed, RoundStatus::Finishing) => true,
            (RoundStatus::Verified, RoundStatus::Completed) => true,
            // Same status (no-op)
            (a, b) if a == b => true,
            _ => false,
        }
    }

}

str_enum! {
    #[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
    pub enum PairingMethod {
        Manual => "manual",
        Swiss => "swiss",
        RoundRobin => "round_robin",
        Knockout => "knockout",
        Scheveningen => "scheveningen",
    }
    default: Manual
}

// ── Seeding ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct TournamentSeedingSettings {
    pub id: i32,
    pub tournament_id: i32,
    pub seeding_method: String,
    pub use_initial_rating: bool,
    pub randomize_unrated: bool,
    pub protect_top_seeds: i32,
    pub created_at: String,
    pub updated_at: Option<String>,
}

str_enum! {
    #[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
    pub enum SeedingMethod {
        Rating => "rating",
        Manual => "manual",
        Random => "random",
        CategoryBased => "category_based",
    }
    default: Rating
}

// ── Time Control ────────────────────────────────────────────────────

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct TimeControl {
    pub id: i32,
    pub name: String,
    pub time_control_type: String,
    pub base_time_minutes: Option<i32>,
    pub increment_seconds: Option<i32>,
    pub moves_per_session: Option<i32>,
    pub session_time_minutes: Option<i32>,
    pub total_sessions: Option<i32>,
    pub is_default: bool,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, SpectaType, Clone)]
pub struct TimeControlTemplate {
    pub id: i32,
    pub name: String,
    pub time_control_type: String,
    pub base_time_minutes: Option<i32>,
    pub increment_seconds: Option<i32>,
    pub moves_per_session: Option<i32>,
    pub session_time_minutes: Option<i32>,
    pub total_sessions: Option<i32>,
    pub description: Option<String>,
}

str_enum! {
    #[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
    pub enum TimeControlType {
        Classical => "classical",
        Rapid => "rapid",
        Blitz => "blitz",
        Bullet => "bullet",
        Correspondence => "correspondence",
        Fischer => "fischer",
        Bronstein => "bronstein",
        Custom => "custom",
    }
    default: Classical
}

impl TimeControlType {
    pub fn is_real_time(&self) -> bool {
        !matches!(self, TimeControlType::Correspondence)
    }
}

// ── Knockout ────────────────────────────────────────────────────────

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct KnockoutBracket {
    pub id: i32,
    pub tournament_id: i32,
    pub bracket_type: String,
    pub total_rounds: i32,
    pub created_at: String,
}

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct BracketPosition {
    pub id: i32,
    pub bracket_id: i32,
    pub round_number: i32,
    pub position_number: i32,
    pub player_id: Option<i32>,
    pub advanced_from_position: Option<i32>,
    pub status: String,
    pub created_at: String,
}

str_enum! {
    #[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
    pub enum BracketPositionStatus {
        Waiting => "waiting",
        Ready => "ready",
        Bye => "bye",
        Eliminated => "eliminated",
        Advanced => "advanced",
    }
    default: Waiting
}

// ── Team ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct Team {
    pub id: i32,
    pub tournament_id: i32,
    pub name: String,
    pub captain: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
    pub club_affiliation: Option<String>,
    pub contact_email: Option<String>,
    pub contact_phone: Option<String>,
    pub max_board_count: i32,
    pub status: String,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct TeamMembership {
    pub id: i32,
    pub team_id: i32,
    pub player_id: i32,
    pub board_number: i32,
    pub is_captain: bool,
    pub is_reserve: bool,
    pub rating_at_assignment: Option<i32>,
    pub status: String,
    pub assigned_at: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, SpectaType, Clone)]
pub struct TeamStanding {
    pub team: Team,
    pub points: f64,
    pub match_points: f64,
    pub board_points: f64,
    pub games_played: i32,
    pub matches_won: i32,
    pub matches_drawn: i32,
    pub matches_lost: i32,
    pub players: Vec<Player>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct TeamMatch {
    pub id: i32,
    pub tournament_id: i32,
    pub round_number: i32,
    pub team_a_id: i32,
    pub team_b_id: i32,
    pub venue: Option<String>,
    pub scheduled_time: Option<String>,
    pub status: String,
    pub team_a_match_points: f64,
    pub team_b_match_points: f64,
    pub team_a_board_points: f64,
    pub team_b_board_points: f64,
    pub arbiter_name: Option<String>,
    pub arbiter_notes: Option<String>,
    pub result_approved: bool,
    pub approved_by: Option<String>,
    pub approved_at: Option<String>,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct TeamLineup {
    pub id: i32,
    pub team_id: i32,
    pub round_number: i32,
    pub board_number: i32,
    pub player_id: i32,
    pub is_substitute: bool,
    pub substituted_player_id: Option<i32>,
    pub submission_deadline: Option<String>,
    pub submitted_at: String,
    pub submitted_by: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct TeamTournamentSettings {
    pub id: i32,
    pub tournament_id: i32,
    pub team_size: i32,
    pub max_teams: Option<i32>,
    pub match_scoring_system: String,
    pub match_points_win: i32,
    pub match_points_draw: i32,
    pub match_points_loss: i32,
    pub board_weight_system: String,
    pub require_board_order: bool,
    pub allow_late_entries: bool,
    pub team_pairing_method: String,
    pub color_allocation: String,
    pub created_at: String,
    pub updated_at: Option<String>,
}

// ── Application Settings ────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct ApplicationSetting {
    pub id: i32,
    pub category: String,
    pub setting_key: String,
    pub setting_value: Option<String>,
    pub setting_type: String,
    pub default_value: Option<String>,
    pub description: Option<String>,
    pub validation_schema: Option<String>,
    pub requires_restart: bool,
    pub is_user_configurable: bool,
    pub display_order: i32,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct UserPreference {
    pub id: i32,
    pub user_id: String,
    pub category: String,
    pub setting_key: String,
    pub setting_value: Option<String>,
    pub is_custom: bool,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct SettingsTemplate {
    pub id: i32,
    pub template_name: String,
    pub template_description: Option<String>,
    pub template_category: String,
    pub template_data: String,
    pub is_system_template: bool,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct SettingsBackupHistory {
    pub id: i32,
    pub backup_name: String,
    pub backup_type: String,
    pub backup_data: String,
    pub backup_size: Option<i32>,
    pub user_id: String,
    pub created_at: String,
    pub restored_at: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct SettingsAuditLog {
    pub id: i32,
    pub user_id: String,
    pub category: String,
    pub setting_key: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub change_type: String,
    pub change_source: String,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: String,
}

str_enum! {
    #[allow(dead_code, clippy::upper_case_acronyms)]
    #[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
    pub enum ChangeSource {
        UI => "ui",
        API => "api",
        Migration => "migration",
        Template => "template",
        BackupRestore => "backup_restore",
        System => "system",
    }
    default: UI
}
