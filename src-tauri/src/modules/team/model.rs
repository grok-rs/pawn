use crate::participant::model::Player;
use serde::{Deserialize, Serialize};
use specta::Type as SpectaType;
use sqlx::FromRow;

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
