use serde::{Deserialize, Serialize};
use specta::Type as SpectaType;

#[allow(dead_code)]
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

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct TiebreakScore {
    pub tiebreak_type: TiebreakType,
    pub value: f64,
    pub display_value: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct TiebreakBreakdown {
    pub tiebreak_type: TiebreakType,
    pub value: f64,
    pub display_value: String,
    pub explanation: String,
    pub calculation_details: Vec<TiebreakCalculationStep>,
    pub opponents_involved: Vec<OpponentContribution>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct TiebreakCalculationStep {
    pub step_number: i32,
    pub description: String,
    pub calculation: String,
    pub intermediate_result: f64,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct OpponentContribution {
    pub opponent_id: i32,
    pub opponent_name: String,
    pub opponent_rating: Option<i32>,
    pub contribution_value: f64,
    pub game_result: Option<String>, // "1-0", "0-1", "1/2-1/2"
    pub explanation: String,
}

#[allow(dead_code)]
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

#[allow(dead_code)]
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

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, SpectaType)]
pub struct StandingsCalculationResult {
    pub standings: Vec<PlayerStanding>,
    pub last_updated: String,
    pub tiebreak_config: TournamentTiebreakConfig,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, SpectaType)]
pub struct CrossTableEntry {
    pub player_id: i32,
    pub opponent_id: i32,
    pub result: Option<f64>, // None for no game, 0.0 for loss, 0.5 for draw, 1.0 for win
    pub color: Option<String>, // "white" or "black"
    pub round: Option<i32>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, SpectaType)]
pub struct CrossTableRow {
    pub player: crate::pawn::domain::model::Player,
    pub results: Vec<CrossTableEntry>,
    pub total_points: f64,
    pub games_played: i32,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, SpectaType)]
pub struct CrossTable {
    pub tournament_id: i32,
    pub players: Vec<crate::pawn::domain::model::Player>,
    pub rows: Vec<CrossTableRow>,
    pub last_updated: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, SpectaType)]
pub struct StandingsUpdateEvent {
    pub tournament_id: i32,
    pub event_type: StandingsEventType,
    pub affected_players: Vec<i32>,
    pub timestamp: String,
    pub standings: Vec<PlayerStanding>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, SpectaType)]
pub enum StandingsEventType {
    GameResultUpdated,
    PlayerAdded,
    PlayerRemoved,
    PlayerStatusChanged,
    RoundCompleted,
    TournamentStarted,
    Manual, // Manual recalculation requested
}

#[allow(dead_code)]
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
            cache_duration_seconds: 300, // 5 minutes
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct ExportRequest {
    pub tournament_id: i32,
    pub export_type: ExportType,
    pub format: ExportFormat,
    pub include_tiebreaks: bool,
    pub include_cross_table: bool,
    pub include_game_results: bool,
    pub include_player_details: bool,
    pub custom_filename: Option<String>,
    pub template_options: Option<ExportTemplateOptions>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub enum ExportType {
    Standings,
    CrossTable,
    GameResults,
    PlayerList,
    TournamentSummary,
    Complete, // All data
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub enum ExportFormat {
    Csv,
    Pdf,
    Html,
    Json,
    Xlsx,
    Txt,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct ExportTemplateOptions {
    pub include_header: bool,
    pub include_footer: bool,
    pub show_logos: bool,
    pub paper_size: PaperSize,
    pub orientation: PageOrientation,
    pub font_size: FontSize,
    pub color_scheme: ColorScheme,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub enum PaperSize {
    A4,
    A5,
    Letter,
    Legal,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub enum PageOrientation {
    Portrait,
    Landscape,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub enum FontSize {
    Small,
    Medium,
    Large,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub enum ColorScheme {
    Default,
    Professional,
    Minimal,
    Classic,
}

impl Default for ExportTemplateOptions {
    fn default() -> Self {
        Self {
            include_header: true,
            include_footer: true,
            show_logos: true,
            paper_size: PaperSize::A4,
            orientation: PageOrientation::Portrait,
            font_size: FontSize::Medium,
            color_scheme: ColorScheme::Professional,
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct NormCalculationRequest {
    pub tournament_id: i32,
    pub player_id: i32,
    pub norm_type: NormType,
    pub tournament_category: Option<i32>, // Average rating of participants
    pub games_played: i32,
    pub points_scored: f64,
    pub performance_rating: Option<i32>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub enum NormType {
    Grandmaster,              // GM norm
    InternationalMaster,      // IM norm
    FideMaster,               // FM norm
    CandidateMaster,          // CM norm
    WomanGrandmaster,         // WGM norm
    WomanInternationalMaster, // WIM norm
    WomanFideMaster,          // WFM norm
    WomanCandidateMaster,     // WCM norm
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

    #[allow(dead_code)]
    pub fn short_name(&self) -> &'static str {
        match self {
            NormType::Grandmaster => "GM",
            NormType::InternationalMaster => "IM",
            NormType::FideMaster => "FM",
            NormType::CandidateMaster => "CM",
            NormType::WomanGrandmaster => "WGM",
            NormType::WomanInternationalMaster => "WIM",
            NormType::WomanFideMaster => "WFM",
            NormType::WomanCandidateMaster => "WCM",
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
            NormType::Grandmaster => 0.35, // 35%
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

#[allow(dead_code)]
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

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct NormRequirements {
    pub performance_rating_met: bool,
    pub minimum_games_met: bool,
    pub minimum_score_met: bool,
    pub tournament_category_adequate: bool,
    pub opponent_diversity_met: bool, // Need opponents from different federations
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct PrizeDistributionRequest {
    pub tournament_id: i32,
    pub prize_structure: PrizeStructure,
    pub currency: String,
    pub total_prize_fund: f64,
    pub distribution_method: DistributionMethod,
    pub special_prizes: Vec<SpecialPrize>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct PrizeStructure {
    pub first_place_percentage: f64,
    pub second_place_percentage: f64,
    pub third_place_percentage: f64,
    pub additional_places: Vec<PrizePlace>,
    pub age_group_prizes: Vec<AgeGroupPrize>,
    pub rating_group_prizes: Vec<RatingGroupPrize>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct PrizePlace {
    pub place: i32,
    pub percentage: f64,
    pub description: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct AgeGroupPrize {
    pub age_group: String, // "U18", "U16", "U14", "U12", "U10", "U8", "50+", "65+"
    pub percentage: f64,
    pub description: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct RatingGroupPrize {
    pub rating_group: String, // "U2200", "U2000", "U1800", "U1600", "U1400", "U1200", "Unrated"
    pub percentage: f64,
    pub description: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct SpecialPrize {
    pub prize_type: SpecialPrizeType,
    pub amount: f64,
    pub description: String,
    pub criteria: String,
}

#[allow(dead_code)]
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

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub enum DistributionMethod {
    TiedPlayersShareEqually,
    TiedPlayersGetFullPrize,
    TiedPlayersGetHighestPrize,
    TiedPlayersGetLowestPrize,
    TiebreakDeterminesWinner,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct PrizeDistributionResult {
    pub tournament_id: i32,
    pub prize_awards: Vec<PrizeAward>,
    pub total_distributed: f64,
    pub currency: String,
    pub distribution_summary: String,
    pub special_awards: Vec<SpecialAward>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct PrizeAward {
    pub player: crate::pawn::domain::model::Player,
    pub rank: i32,
    pub points: f64,
    pub prize_amount: f64,
    pub prize_description: String,
    pub shared_with: Vec<i32>,         // Player IDs if prize is shared
    pub prize_categories: Vec<String>, // "Overall", "U18", "U2000", etc.
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct SpecialAward {
    pub award_type: SpecialPrizeType,
    pub player: crate::pawn::domain::model::Player,
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

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct ExportResult {
    pub success: bool,
    pub file_path: Option<String>,
    pub file_name: String,
    pub file_size: u64,
    pub export_time_ms: u64,
    pub error_message: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tiebreak_type_display_names() {
        assert_eq!(TiebreakType::BuchholzFull.display_name(), "Buchholz");
        assert_eq!(
            TiebreakType::SonnebornBerger.display_name(),
            "Sonneborn-Berger"
        );
        assert_eq!(
            TiebreakType::DirectEncounter.display_name(),
            "Direct Encounter"
        );
        assert_eq!(TiebreakType::NumberOfWins.display_name(), "Number of Wins");
    }

    #[test]
    fn test_default_tournament_tiebreak_config() {
        let config = TournamentTiebreakConfig::default();
        assert_eq!(config.tournament_id, 0);
        assert!(config.use_fide_defaults);
        assert!(!config.tiebreaks.is_empty());
        assert_eq!(config.tiebreaks[0], TiebreakType::BuchholzFull);
        assert_eq!(config.forfeit_time_minutes, Some(30));
    }

    #[test]
    fn test_tiebreak_score_creation() {
        let score = TiebreakScore {
            tiebreak_type: TiebreakType::SonnebornBerger,
            value: 42.5,
            display_value: "42.5".to_string(),
        };

        assert_eq!(score.tiebreak_type, TiebreakType::SonnebornBerger);
        assert_eq!(score.value, 42.5);
        assert_eq!(score.display_value, "42.5");
    }

    #[test]
    fn test_enum_variants_exist() {
        // Simple test to ensure key enum variants exist
        let _buchholz = TiebreakType::BuchholzFull;
        let _sonneborn = TiebreakType::SonnebornBerger;
        let _direct = TiebreakType::DirectEncounter;
        let _wins = TiebreakType::NumberOfWins;

        // This test passes if all variants compile without error
    }
}
