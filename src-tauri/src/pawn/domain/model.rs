use serde::Serialize;
use specta::Type as SpectaType;
use sqlx::{FromRow, prelude::Type};

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct Tournament {
    pub id: i32,
    pub name: String,
    pub location: String,
    pub date: String,
    pub time_type: String,
    pub player_count: i32,
    pub rounds_played: i32,
    pub total_rounds: i32,
    pub country_code: String,
}

#[derive(Debug, Serialize, serde::Deserialize, FromRow, SpectaType, Clone)]
pub struct Player {
    pub id: i32,
    pub tournament_id: i32,
    pub name: String,
    pub rating: Option<i32>,
    pub country_code: Option<String>,
    pub created_at: String,
}

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
pub struct PlayerResult {
    pub player: Player,
    pub points: f32,
    pub games_played: i32,
    pub wins: i32,
    pub draws: i32,
    pub losses: i32,
}

#[derive(Debug, Serialize, SpectaType, Clone)]
pub struct GameResult {
    pub game: Game,
    pub white_player: Player,
    pub black_player: Player,
}

#[derive(Debug, Serialize, SpectaType, Clone)]
pub struct TournamentDetails {
    pub tournament: Tournament,
    pub players: Vec<PlayerResult>,
    pub games: Vec<GameResult>,
}

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

#[derive(Debug, Serialize, serde::Deserialize, SpectaType, Clone)]
pub struct Pairing {
    pub white_player: Player,
    pub black_player: Option<Player>, // None for bye
    pub board_number: i32,
}

#[derive(Serialize, Debug, Type, SpectaType)]
pub enum TournamentStatus {
    NotStarted,
    InProgress,
    Finished,
}

#[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
pub enum RoundStatus {
    Upcoming,
    InProgress,
    Completed,
}

#[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
pub enum PairingMethod {
    Manual,
    Swiss,
    RoundRobin,
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


#[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
pub enum GameResultType {
    WhiteWins,      // 1-0
    BlackWins,      // 0-1
    Draw,           // 1/2-1/2
    Ongoing,        // *
    WhiteForfeit,   // 0-1 (White forfeits)
    BlackForfeit,   // 1-0 (Black forfeits)
    WhiteDefault,   // 0-1 (White defaults)
    BlackDefault,   // 1-0 (Black defaults)
    Adjourned,      // Game postponed
    Timeout,        // Time forfeit
    DoubleForfeit,  // Both players forfeit (0-0)
    Cancelled,      // Game cancelled
}

impl GameResultType {
    pub fn from_str(s: &str) -> Self {
        match s {
            "1-0" => GameResultType::WhiteWins,
            "0-1" => GameResultType::BlackWins,
            "1/2-1/2" => GameResultType::Draw,
            "*" => GameResultType::Ongoing,
            "0-1F" | "white_forfeit" => GameResultType::WhiteForfeit,
            "1-0F" | "black_forfeit" => GameResultType::BlackForfeit,
            "0-1D" | "white_default" => GameResultType::WhiteDefault,
            "1-0D" | "black_default" => GameResultType::BlackDefault,
            "ADJ" | "adjourned" => GameResultType::Adjourned,
            "0-1T" | "1-0T" | "timeout" => GameResultType::Timeout,
            "0-0" | "double_forfeit" => GameResultType::DoubleForfeit,
            "CANC" | "cancelled" => GameResultType::Cancelled,
            _ => GameResultType::Ongoing,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            GameResultType::WhiteWins => "1-0",
            GameResultType::BlackWins => "0-1",
            GameResultType::Draw => "1/2-1/2",
            GameResultType::Ongoing => "*",
            GameResultType::WhiteForfeit => "0-1F",
            GameResultType::BlackForfeit => "1-0F",
            GameResultType::WhiteDefault => "0-1D",
            GameResultType::BlackDefault => "1-0D",
            GameResultType::Adjourned => "ADJ",
            GameResultType::Timeout => "0-1T",
            GameResultType::DoubleForfeit => "0-0",
            GameResultType::Cancelled => "CANC",
        }
    }

    pub fn get_points(&self) -> (f32, f32) {
        match self {
            GameResultType::WhiteWins | GameResultType::BlackForfeit | GameResultType::BlackDefault => (1.0, 0.0),
            GameResultType::BlackWins | GameResultType::WhiteForfeit | GameResultType::WhiteDefault => (0.0, 1.0),
            GameResultType::Draw => (0.5, 0.5),
            GameResultType::DoubleForfeit | GameResultType::Cancelled => (0.0, 0.0),
            GameResultType::Ongoing | GameResultType::Adjourned | GameResultType::Timeout => (0.0, 0.0),
        }
    }

    pub fn is_decisive(&self) -> bool {
        !matches!(self, GameResultType::Ongoing | GameResultType::Adjourned)
    }

    pub fn requires_arbiter_approval(&self) -> bool {
        matches!(self, 
            GameResultType::WhiteForfeit | GameResultType::BlackForfeit |
            GameResultType::WhiteDefault | GameResultType::BlackDefault |
            GameResultType::DoubleForfeit | GameResultType::Cancelled
        )
    }
}

impl RoundStatus {
    pub fn from_str(s: &str) -> Self {
        match s {
            "upcoming" => RoundStatus::Upcoming,
            "in_progress" => RoundStatus::InProgress,
            "completed" => RoundStatus::Completed,
            _ => RoundStatus::Upcoming,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            RoundStatus::Upcoming => "upcoming",
            RoundStatus::InProgress => "in_progress",
            RoundStatus::Completed => "completed",
        }
    }
}

impl PairingMethod {
    pub fn from_str(s: &str) -> Self {
        match s {
            "manual" => PairingMethod::Manual,
            "swiss" => PairingMethod::Swiss,
            "round_robin" => PairingMethod::RoundRobin,
            _ => PairingMethod::Manual,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            PairingMethod::Manual => "manual",
            PairingMethod::Swiss => "swiss",
            PairingMethod::RoundRobin => "round_robin",
        }
    }
}
