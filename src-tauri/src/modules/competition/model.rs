use crate::common::error::ErrorCode;
use crate::common::macros::str_enum;
use crate::participant::model::Player;
use serde::{Deserialize, Serialize};
use specta::Type as SpectaType;
use sqlx::{FromRow, prelude::Type};

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

impl Game {
    /// Whether the game is still ongoing (result == "*").
    pub fn is_ongoing(&self) -> bool {
        self.result == "*"
    }

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

impl Round {
    /// Parse the status string into a typed RoundStatus enum.
    pub fn parsed_status(&self) -> RoundStatus {
        self.status.parse().unwrap_or(RoundStatus::Planned)
    }

    /// Validate whether the round can start (transition to InProgress).
    /// Requires that pairings/games exist.
    pub fn can_start(&self, games: &[GameResult]) -> Result<(), ErrorCode> {
        if games.is_empty() {
            let current_status = self.parsed_status();
            if current_status == RoundStatus::Published {
                return Err(ErrorCode::RoundPublishedNoGames);
            }
            return Err(ErrorCode::RoundNoPairings);
        }
        Ok(())
    }

    /// Validate whether the round can be completed.
    /// Requires that all games have results.
    pub fn can_complete(&self, games: &[GameResult]) -> Result<(), ErrorCode> {
        let incomplete_games = games.iter().filter(|g| g.game.is_ongoing()).count();
        if incomplete_games > 0 {
            return Err(ErrorCode::IncompleteGames {
                count: incomplete_games,
            });
        }
        Ok(())
    }
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
