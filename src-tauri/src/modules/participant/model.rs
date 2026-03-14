use crate::common::macros::str_enum;
use serde::{Deserialize, Serialize};
use specta::Type as SpectaType;
use sqlx::{FromRow, prelude::Type};

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
