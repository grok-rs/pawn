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

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
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

#[derive(Serialize, Debug, Type, SpectaType)]
pub enum TournamentStatus {
    NotStarted,
    InProgress,
    Finished,
}

#[derive(Serialize, Debug, Type, SpectaType)]
pub enum GameResultType {
    WhiteWins,  // 1-0
    BlackWins,  // 0-1
    Draw,       // 1/2-1/2
    Ongoing,    // *
}

impl GameResultType {
    pub fn from_str(s: &str) -> Self {
        match s {
            "1-0" => GameResultType::WhiteWins,
            "0-1" => GameResultType::BlackWins,
            "1/2-1/2" => GameResultType::Draw,
            "*" => GameResultType::Ongoing,
            _ => GameResultType::Ongoing,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            GameResultType::WhiteWins => "1-0",
            GameResultType::BlackWins => "0-1",
            GameResultType::Draw => "1/2-1/2",
            GameResultType::Ongoing => "*",
        }
    }
}
