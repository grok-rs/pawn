use serde::{Deserialize, Serialize};
use specta::Type as SpectaType;

// ── Tiebreak types ─────────────────────────────────────────────────

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
pub struct TiebreakBreakdown {
    pub tiebreak_type: TiebreakType,
    pub value: f64,
    pub display_value: String,
    pub explanation: String,
    pub calculation_details: Vec<TiebreakCalculationStep>,
    pub opponents_involved: Vec<OpponentContribution>,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct TiebreakCalculationStep {
    pub step_number: i32,
    pub description: String,
    pub calculation: String,
    pub intermediate_result: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct OpponentContribution {
    pub opponent_id: i32,
    pub opponent_name: String,
    pub opponent_rating: Option<i32>,
    pub contribution_value: f64,
    pub game_result: Option<String>,
    pub explanation: String,
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

// ── Standings ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, SpectaType)]
pub struct PlayerStanding {
    pub player: crate::participant::model::Player,
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

#[derive(Debug, Clone, Serialize, SpectaType)]
pub struct CrossTableEntry {
    pub player_id: i32,
    pub opponent_id: i32,
    pub result: Option<f64>,
    pub color: Option<String>,
    pub round: Option<i32>,
}

#[derive(Debug, Clone, Serialize, SpectaType)]
pub struct CrossTableRow {
    pub player: crate::participant::model::Player,
    pub results: Vec<CrossTableEntry>,
    pub total_points: f64,
    pub games_played: i32,
}

#[derive(Debug, Clone, Serialize, SpectaType)]
pub struct CrossTable {
    pub tournament_id: i32,
    pub players: Vec<crate::participant::model::Player>,
    pub rows: Vec<CrossTableRow>,
    pub last_updated: String,
}

#[derive(Debug, Clone, Serialize, SpectaType)]
pub struct StandingsUpdateEvent {
    pub tournament_id: i32,
    pub event_type: StandingsEventType,
    pub affected_players: Vec<i32>,
    pub timestamp: String,
    pub standings: Vec<PlayerStanding>,
}

#[derive(Debug, Clone, Serialize, SpectaType)]
pub enum StandingsEventType {
    GameResultUpdated,
    RoundCompleted,
    Manual,
}

#[derive(Debug, Clone, Serialize, SpectaType)]
pub struct RealTimeStandingsConfig {
    pub auto_update_enabled: bool,
    pub update_interval_seconds: u64,
    pub broadcast_to_clients: bool,
    pub cache_duration_seconds: u64,
}

impl Default for RealTimeStandingsConfig {
    fn default() -> Self {
        Self {
            auto_update_enabled: true,
            update_interval_seconds: 30,
            broadcast_to_clients: true,
            cache_duration_seconds: 300,
        }
    }
}

// ── Norm Calculation ──────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct NormCalculationRequest {
    pub tournament_id: i32,
    pub player_id: i32,
    pub norm_type: NormType,
    pub tournament_category: Option<i32>,
    pub games_played: i32,
    pub points_scored: f64,
    pub performance_rating: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub enum NormType {
    Grandmaster,
    InternationalMaster,
    FideMaster,
    CandidateMaster,
    WomanGrandmaster,
    WomanInternationalMaster,
    WomanFideMaster,
    WomanCandidateMaster,
}

impl NormType {
    pub fn display_name(&self) -> &'static str {
        match self {
            NormType::Grandmaster => "Grandmaster",
            NormType::InternationalMaster => "International Master",
            NormType::FideMaster => "FIDE Master",
            NormType::CandidateMaster => "Candidate Master",
            NormType::WomanGrandmaster => "Woman Grandmaster",
            NormType::WomanInternationalMaster => "Woman International Master",
            NormType::WomanFideMaster => "Woman FIDE Master",
            NormType::WomanCandidateMaster => "Woman Candidate Master",
        }
    }

    pub fn required_performance_rating(&self) -> i32 {
        match self {
            NormType::Grandmaster => 2600,
            NormType::InternationalMaster => 2450,
            NormType::FideMaster => 2300,
            NormType::CandidateMaster => 2200,
            NormType::WomanGrandmaster => 2400,
            NormType::WomanInternationalMaster => 2250,
            NormType::WomanFideMaster => 2100,
            NormType::WomanCandidateMaster => 2000,
        }
    }

    pub fn minimum_games(&self) -> i32 {
        match self {
            NormType::Grandmaster | NormType::InternationalMaster => 9,
            NormType::FideMaster | NormType::CandidateMaster => 7,
            NormType::WomanGrandmaster | NormType::WomanInternationalMaster => 9,
            NormType::WomanFideMaster | NormType::WomanCandidateMaster => 7,
        }
    }

    pub fn minimum_score_percentage(&self) -> f64 {
        match self {
            NormType::Grandmaster => 0.35,
            NormType::InternationalMaster => 0.35,
            NormType::FideMaster => 0.35,
            NormType::CandidateMaster => 0.35,
            NormType::WomanGrandmaster => 0.35,
            NormType::WomanInternationalMaster => 0.35,
            NormType::WomanFideMaster => 0.35,
            NormType::WomanCandidateMaster => 0.35,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct NormCalculationResult {
    pub norm_type: NormType,
    pub achieved: bool,
    pub performance_rating: i32,
    pub required_performance_rating: i32,
    pub games_played: i32,
    pub minimum_games: i32,
    pub points_scored: f64,
    pub score_percentage: f64,
    pub minimum_score_percentage: f64,
    pub tournament_category: Option<i32>,
    pub requirements_met: NormRequirements,
    pub missing_requirements: Vec<String>,
    pub additional_info: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct NormRequirements {
    pub performance_rating_met: bool,
    pub minimum_games_met: bool,
    pub minimum_score_met: bool,
    pub tournament_category_adequate: bool,
    pub opponent_diversity_met: bool,
}

// ── Prize Distribution ──────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct PrizeDistributionRequest {
    pub tournament_id: i32,
    pub prize_structure: PrizeStructure,
    pub currency: String,
    pub total_prize_fund: f64,
    pub distribution_method: DistributionMethod,
    pub special_prizes: Vec<SpecialPrize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct PrizeStructure {
    pub first_place_percentage: f64,
    pub second_place_percentage: f64,
    pub third_place_percentage: f64,
    pub additional_places: Vec<PrizePlace>,
    pub age_group_prizes: Vec<AgeGroupPrize>,
    pub rating_group_prizes: Vec<RatingGroupPrize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct PrizePlace {
    pub place: i32,
    pub percentage: f64,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct AgeGroupPrize {
    pub age_group: String,
    pub percentage: f64,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct RatingGroupPrize {
    pub rating_group: String,
    pub percentage: f64,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct SpecialPrize {
    pub prize_type: SpecialPrizeType,
    pub amount: f64,
    pub description: String,
    pub criteria: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub enum SpecialPrizeType {
    BestWoman,
    BestJunior,
    BestSenior,
    BestLocalPlayer,
    BestUnratedPlayer,
    BestUpset,
    MostImproved,
    FairPlay,
    BestGame,
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub enum DistributionMethod {
    TiedPlayersShareEqually,
    TiedPlayersGetFullPrize,
    TiedPlayersGetHighestPrize,
    TiedPlayersGetLowestPrize,
    TiebreakDeterminesWinner,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct PrizeDistributionResult {
    pub tournament_id: i32,
    pub prize_awards: Vec<PrizeAward>,
    pub total_distributed: f64,
    pub currency: String,
    pub distribution_summary: String,
    pub special_awards: Vec<SpecialAward>,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct PrizeAward {
    pub player: crate::participant::model::Player,
    pub rank: i32,
    pub points: f64,
    pub prize_amount: f64,
    pub prize_description: String,
    pub shared_with: Vec<i32>,
    pub prize_categories: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct SpecialAward {
    pub award_type: SpecialPrizeType,
    pub player: crate::participant::model::Player,
    pub amount: f64,
    pub description: String,
    pub justification: String,
}

impl Default for PrizeStructure {
    fn default() -> Self {
        Self {
            first_place_percentage: 40.0,
            second_place_percentage: 25.0,
            third_place_percentage: 15.0,
            additional_places: vec![
                PrizePlace {
                    place: 4,
                    percentage: 10.0,
                    description: "4th place".to_string(),
                },
                PrizePlace {
                    place: 5,
                    percentage: 5.0,
                    description: "5th place".to_string(),
                },
                PrizePlace {
                    place: 6,
                    percentage: 3.0,
                    description: "6th place".to_string(),
                },
                PrizePlace {
                    place: 7,
                    percentage: 2.0,
                    description: "7th place".to_string(),
                },
            ],
            age_group_prizes: vec![],
            rating_group_prizes: vec![],
        }
    }
}
