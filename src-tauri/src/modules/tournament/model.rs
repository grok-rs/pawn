use crate::common::error::ErrorCode;
use crate::common::macros::str_enum;
use crate::competition::model::{Game, Round};
use serde::Serialize;
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

impl Tournament {
    /// Validate that a tournament can be completed.
    /// Checks all rounds are completed and all games have results.
    pub fn can_complete(&self, rounds: &[Round], games: &[Game]) -> Result<(), ErrorCode> {
        let completed_rounds = rounds.iter().filter(|r| r.status == "completed").count();
        if completed_rounds < self.total_rounds as usize {
            return Err(ErrorCode::TournamentIncompleteRounds {
                incomplete: self.total_rounds as usize - completed_rounds,
                total: self.total_rounds as usize,
            });
        }

        let incomplete_games = games.iter().filter(|game| game.is_ongoing()).count();
        if incomplete_games > 0 {
            return Err(ErrorCode::TournamentIncompleteGames {
                count: incomplete_games,
            });
        }

        Ok(())
    }

}

#[derive(Debug, Serialize, SpectaType, Clone)]
pub struct TournamentDetails {
    pub tournament: Tournament,
    pub players: Vec<crate::participant::model::PlayerResult>,
    pub games: Vec<crate::competition::model::GameResult>,
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
