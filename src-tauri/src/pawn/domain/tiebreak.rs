use serde::{Deserialize, Serialize};
use specta::Type as SpectaType;

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TiebreakType {
    // Buchholz variants
    BuchholzFull,
    BuchholzCut1,
    BuchholzCut2,
    BuchholzMedian,

    // Sonneborn-Berger
    SonnebornBerger,

    // Progressive scores
    ProgressiveScore,
    CumulativeScore,

    // Direct encounter
    DirectEncounter,

    // Performance based
    AverageRatingOfOpponents,
    TournamentPerformanceRating,

    // Game based
    NumberOfWins,
    NumberOfGamesWithBlack,
    NumberOfWinsWithBlack,

    // Advanced
    KoyaSystem,
    ArocCut1,
    ArocCut2,

    // Team specific
    MatchPoints,
    GamePoints,
    BoardPoints,
}

impl TiebreakType {
    pub fn display_name(&self) -> &'static str {
        match self {
            TiebreakType::BuchholzFull => "Buchholz",
            TiebreakType::BuchholzCut1 => "Buchholz Cut-1",
            TiebreakType::BuchholzCut2 => "Buchholz Cut-2",
            TiebreakType::BuchholzMedian => "Median Buchholz",
            TiebreakType::SonnebornBerger => "Sonneborn-Berger",
            TiebreakType::ProgressiveScore => "Progressive Score",
            TiebreakType::CumulativeScore => "Cumulative Score",
            TiebreakType::DirectEncounter => "Direct Encounter",
            TiebreakType::AverageRatingOfOpponents => "Average Rating of Opponents (ARO)",
            TiebreakType::TournamentPerformanceRating => "Tournament Performance Rating (TPR)",
            TiebreakType::NumberOfWins => "Number of Wins",
            TiebreakType::NumberOfGamesWithBlack => "Games with Black",
            TiebreakType::NumberOfWinsWithBlack => "Wins with Black",
            TiebreakType::KoyaSystem => "Koya System",
            TiebreakType::ArocCut1 => "AROC Cut-1",
            TiebreakType::ArocCut2 => "AROC Cut-2",
            TiebreakType::MatchPoints => "Match Points",
            TiebreakType::GamePoints => "Game Points",
            TiebreakType::BoardPoints => "Board Points",
        }
    }

    pub fn short_name(&self) -> &'static str {
        match self {
            TiebreakType::BuchholzFull => "Buch",
            TiebreakType::BuchholzCut1 => "Buch-1",
            TiebreakType::BuchholzCut2 => "Buch-2",
            TiebreakType::BuchholzMedian => "Med-Buch",
            TiebreakType::SonnebornBerger => "S-B",
            TiebreakType::ProgressiveScore => "Prog",
            TiebreakType::CumulativeScore => "Cumul",
            TiebreakType::DirectEncounter => "DE",
            TiebreakType::AverageRatingOfOpponents => "ARO",
            TiebreakType::TournamentPerformanceRating => "TPR",
            TiebreakType::NumberOfWins => "Wins",
            TiebreakType::NumberOfGamesWithBlack => "Black",
            TiebreakType::NumberOfWinsWithBlack => "W-Black",
            TiebreakType::KoyaSystem => "Koya",
            TiebreakType::ArocCut1 => "AROC-1",
            TiebreakType::ArocCut2 => "AROC-2",
            TiebreakType::MatchPoints => "MP",
            TiebreakType::GamePoints => "GP",
            TiebreakType::BoardPoints => "BP",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct TiebreakScore {
    pub tiebreak_type: TiebreakType,
    pub value: f64,
    pub display_value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct TournamentTiebreakConfig {
    pub tournament_id: i32,
    pub tiebreaks: Vec<TiebreakType>,
    pub use_fide_defaults: bool,
    // Advanced tournament settings
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

impl Default for TournamentTiebreakConfig {
    fn default() -> Self {
        Self {
            tournament_id: 0,
            tiebreaks: vec![
                TiebreakType::BuchholzFull,
                TiebreakType::BuchholzCut1,
                TiebreakType::NumberOfWins,
                TiebreakType::DirectEncounter,
            ],
            use_fide_defaults: true,
            forfeit_time_minutes: Some(30),
            draw_offers_allowed: Some(true),
            mobile_phone_policy: Some("prohibited".to_string()),
            default_color_allocation: Some("automatic".to_string()),
            late_entry_allowed: Some(true),
            bye_assignment_rule: Some("lowest_rated".to_string()),
            arbiter_notes: None,
            tournament_category: None,
            organizer_name: None,
            organizer_email: None,
            prize_structure: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, SpectaType)]
pub struct PlayerStanding {
    pub player: crate::pawn::domain::model::Player,
    pub rank: i32,
    pub points: f64,
    pub games_played: i32,
    pub wins: i32,
    pub draws: i32,
    pub losses: i32,
    pub tiebreak_scores: Vec<TiebreakScore>,
    pub performance_rating: Option<i32>,
    pub rating_change: Option<i32>,
}

#[derive(Debug, Clone, Serialize, SpectaType)]
pub struct StandingsCalculationResult {
    pub standings: Vec<PlayerStanding>,
    pub last_updated: String,
    pub tiebreak_config: TournamentTiebreakConfig,
}
