use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateTeam {
    pub tournament_id: i32,
    pub name: String,
    pub captain: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
    pub club_affiliation: Option<String>,
    pub contact_email: Option<String>,
    pub contact_phone: Option<String>,
    pub max_board_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateTeam {
    pub id: i32,
    pub name: Option<String>,
    pub captain: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
    pub club_affiliation: Option<String>,
    pub contact_email: Option<String>,
    pub contact_phone: Option<String>,
    pub max_board_count: Option<i32>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AddPlayerToTeam {
    pub team_id: i32,
    pub player_id: i32,
    pub board_number: i32,
    pub is_captain: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RemovePlayerFromTeam {
    pub team_id: i32,
    pub player_id: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateTeamMatch {
    pub tournament_id: i32,
    pub round_number: i32,
    pub team_a_id: i32,
    pub team_b_id: i32,
    pub venue: Option<String>,
    pub scheduled_time: Option<String>,
    pub arbiter_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateTeamMatch {
    pub id: i32,
    pub status: Option<String>,
    pub venue: Option<String>,
    pub scheduled_time: Option<String>,
    pub team_a_match_points: Option<f64>,
    pub team_b_match_points: Option<f64>,
    pub team_a_board_points: Option<f64>,
    pub team_b_board_points: Option<f64>,
    pub arbiter_name: Option<String>,
    pub arbiter_notes: Option<String>,
    pub result_approved: Option<bool>,
    pub approved_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateTeamLineup {
    pub team_id: i32,
    pub round_number: i32,
    pub board_number: i32,
    pub player_id: i32,
    pub is_substitute: bool,
    pub substituted_player_id: Option<i32>,
    pub submission_deadline: Option<String>,
    pub submitted_by: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateTeamTournamentSettings {
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
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateTeamTournamentSettings {
    pub tournament_id: i32,
    pub team_size: Option<i32>,
    pub max_teams: Option<i32>,
    pub match_scoring_system: Option<String>,
    pub match_points_win: Option<i32>,
    pub match_points_draw: Option<i32>,
    pub match_points_loss: Option<i32>,
    pub board_weight_system: Option<String>,
    pub require_board_order: Option<bool>,
    pub allow_late_entries: Option<bool>,
    pub team_pairing_method: Option<String>,
    pub color_allocation: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TeamSearchFilters {
    pub tournament_id: i32,
    pub name: Option<String>,
    pub status: Option<String>,
    pub captain: Option<String>,
    pub club_affiliation: Option<String>,
    pub min_members: Option<i32>,
    pub max_members: Option<i32>,
    pub has_captain: Option<bool>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}
