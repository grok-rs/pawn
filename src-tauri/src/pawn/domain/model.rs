use serde::{Serialize, Deserialize};
use specta::Type as SpectaType;
use sqlx::{FromRow, prelude::Type};

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
    // Advanced tournament information
    pub status: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub description: Option<String>,
    pub website_url: Option<String>,
    pub contact_email: Option<String>,
    pub entry_fee: Option<f64>,
    pub currency: Option<String>,
    // Team tournament fields
    pub is_team_tournament: Option<bool>,
    pub team_size: Option<i32>,
    pub max_teams: Option<i32>,
}

#[derive(Debug, Serialize, serde::Deserialize, FromRow, SpectaType, Clone)]
pub struct Player {
    pub id: i32,
    pub tournament_id: i32,
    pub name: String,
    pub rating: Option<i32>,
    pub country_code: Option<String>,
    pub title: Option<String>,      // Chess titles: GM, IM, FM, etc.
    pub birth_date: Option<String>, // For age-based categories
    pub gender: Option<String>,     // M, F, O
    pub email: Option<String>,      // Contact information
    pub phone: Option<String>,      // Contact information
    pub club: Option<String>,       // Club/federation affiliation
    pub status: String,             // Registration status
    pub seed_number: Option<i32>,   // Manual seed assignment (1, 2, 3, etc.)
    pub pairing_number: Option<i32>, // Sequential pairing number for tournaments
    pub initial_rating: Option<i32>, // Rating at tournament start for seeding consistency
    pub created_at: String,
    pub updated_at: Option<String>,
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
    Planned,     // Round scheduled but not started
    Pairing,     // Actively generating pairings
    Published,   // Pairings complete and published
    InProgress,  // Games being played
    Finishing,   // Some games complete, waiting for others
    Completed,   // All results entered
    Verified,    // Results confirmed by arbiter
}

#[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
pub enum TournamentType {
    Swiss,
    RoundRobin,
    Knockout,
    Scheveningen,
    Arena,
}

#[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
pub enum PairingMethod {
    Manual,
    Swiss,
    RoundRobin,
    Knockout,
    Scheveningen,
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
    WhiteWins,     // 1-0
    BlackWins,     // 0-1
    Draw,          // 1/2-1/2
    Ongoing,       // *
    WhiteForfeit,  // 0-1 (White forfeits)
    BlackForfeit,  // 1-0 (Black forfeits)
    WhiteDefault,  // 0-1 (White defaults)
    BlackDefault,  // 1-0 (Black defaults)
    Adjourned,     // Game postponed
    Timeout,       // Time forfeit
    DoubleForfeit, // Both players forfeit (0-0)
    Cancelled,     // Game cancelled
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
            GameResultType::WhiteWins
            | GameResultType::BlackForfeit
            | GameResultType::BlackDefault => (1.0, 0.0),
            GameResultType::BlackWins
            | GameResultType::WhiteForfeit
            | GameResultType::WhiteDefault => (0.0, 1.0),
            GameResultType::Draw => (0.5, 0.5),
            GameResultType::DoubleForfeit | GameResultType::Cancelled => (0.0, 0.0),
            GameResultType::Ongoing | GameResultType::Adjourned | GameResultType::Timeout => {
                (0.0, 0.0)
            }
        }
    }

    pub fn is_decisive(&self) -> bool {
        !matches!(self, GameResultType::Ongoing | GameResultType::Adjourned)
    }

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

impl RoundStatus {
    pub fn from_str(s: &str) -> Self {
        match s {
            "planned" => RoundStatus::Planned,
            "pairing" => RoundStatus::Pairing,
            "published" => RoundStatus::Published,
            "in_progress" => RoundStatus::InProgress,
            "finishing" => RoundStatus::Finishing,
            "completed" => RoundStatus::Completed,
            "verified" => RoundStatus::Verified,
            // Backward compatibility
            "upcoming" => RoundStatus::Planned,
            _ => RoundStatus::Planned,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            RoundStatus::Planned => "planned",
            RoundStatus::Pairing => "pairing",
            RoundStatus::Published => "published",
            RoundStatus::InProgress => "in_progress",
            RoundStatus::Finishing => "finishing",
            RoundStatus::Completed => "completed",
            RoundStatus::Verified => "verified",
        }
    }

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
            (RoundStatus::Planned, RoundStatus::Published) => true,  // Skip pairing step
            (RoundStatus::Published, RoundStatus::Completed) => true, // Skip in_progress for quick entry
            (RoundStatus::InProgress, RoundStatus::Completed) => true, // All games finished quickly
            
            // Backward transitions for corrections
            (RoundStatus::Published, RoundStatus::Pairing) => true,   // Re-generate pairings
            (RoundStatus::InProgress, RoundStatus::Published) => true, // Reopen before start
            (RoundStatus::Finishing, RoundStatus::InProgress) => true, // Reopen game
            (RoundStatus::Completed, RoundStatus::Finishing) => true,  // Reopen result
            (RoundStatus::Verified, RoundStatus::Completed) => true,   // Unverify for changes
            
            // Same status (no-op)
            (a, b) if a == b => true,
            
            _ => false,
        }
    }

    pub fn is_active(&self) -> bool {
        matches!(self, RoundStatus::InProgress | RoundStatus::Finishing)
    }

    pub fn is_final(&self) -> bool {
        matches!(self, RoundStatus::Completed | RoundStatus::Verified)
    }

    pub fn can_generate_pairings(&self) -> bool {
        matches!(self, RoundStatus::Planned | RoundStatus::Pairing)
    }

    pub fn can_start_games(&self) -> bool {
        matches!(self, RoundStatus::Published)
    }

    pub fn can_enter_results(&self) -> bool {
        matches!(self, RoundStatus::InProgress | RoundStatus::Finishing)
    }
}

impl TournamentType {
    pub fn from_str(s: &str) -> Self {
        match s {
            "swiss" => TournamentType::Swiss,
            "round_robin" => TournamentType::RoundRobin,
            "knockout" => TournamentType::Knockout,
            "scheveningen" => TournamentType::Scheveningen,
            "arena" => TournamentType::Arena,
            _ => TournamentType::Swiss,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            TournamentType::Swiss => "swiss",
            TournamentType::RoundRobin => "round_robin",
            TournamentType::Knockout => "knockout",
            TournamentType::Scheveningen => "scheveningen",
            TournamentType::Arena => "arena",
        }
    }

    pub fn get_default_pairing_method(&self) -> PairingMethod {
        match self {
            TournamentType::Swiss => PairingMethod::Swiss,
            TournamentType::RoundRobin => PairingMethod::RoundRobin,
            TournamentType::Knockout => PairingMethod::Knockout,
            TournamentType::Scheveningen => PairingMethod::Scheveningen,
            TournamentType::Arena => PairingMethod::Swiss,
        }
    }

    pub fn supports_byes(&self) -> bool {
        matches!(self, TournamentType::Swiss | TournamentType::Arena)
    }

    pub fn is_single_elimination(&self) -> bool {
        matches!(self, TournamentType::Knockout)
    }
}

impl PairingMethod {
    pub fn from_str(s: &str) -> Self {
        match s {
            "manual" => PairingMethod::Manual,
            "swiss" => PairingMethod::Swiss,
            "round_robin" => PairingMethod::RoundRobin,
            "knockout" => PairingMethod::Knockout,
            "scheveningen" => PairingMethod::Scheveningen,
            _ => PairingMethod::Manual,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            PairingMethod::Manual => "manual",
            PairingMethod::Swiss => "swiss",
            PairingMethod::RoundRobin => "round_robin",
            PairingMethod::Knockout => "knockout",
            PairingMethod::Scheveningen => "scheveningen",
        }
    }
}

// Enhanced Player Management Models

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct RatingHistory {
    pub id: i32,
    pub player_id: i32,
    pub rating_type: String, // fide, national, club, rapid, blitz
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

#[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
pub enum PlayerStatus {
    Active,
    LateEntry,
    Withdrawn,
    ByeRequested,
}

#[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
pub enum RatingType {
    Fide,
    National,
    Club,
    Rapid,
    Blitz,
}

#[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
pub enum ChessTitle {
    GM,  // Grandmaster
    IM,  // International Master
    FM,  // FIDE Master
    CM,  // Candidate Master
    WGM, // Woman Grandmaster
    WIM, // Woman International Master
    WFM, // Woman FIDE Master
    WCM, // Woman Candidate Master
    None,
}

impl PlayerStatus {
    pub fn from_str(s: &str) -> Self {
        match s {
            "active" => PlayerStatus::Active,
            "late_entry" => PlayerStatus::LateEntry,
            "withdrawn" => PlayerStatus::Withdrawn,
            "bye_requested" => PlayerStatus::ByeRequested,
            _ => PlayerStatus::Active,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            PlayerStatus::Active => "active",
            PlayerStatus::LateEntry => "late_entry",
            PlayerStatus::Withdrawn => "withdrawn",
            PlayerStatus::ByeRequested => "bye_requested",
        }
    }
}

impl RatingType {
    pub fn from_str(s: &str) -> Self {
        match s {
            "fide" => RatingType::Fide,
            "national" => RatingType::National,
            "club" => RatingType::Club,
            "rapid" => RatingType::Rapid,
            "blitz" => RatingType::Blitz,
            _ => RatingType::Fide,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            RatingType::Fide => "fide",
            RatingType::National => "national",
            RatingType::Club => "club",
            RatingType::Rapid => "rapid",
            RatingType::Blitz => "blitz",
        }
    }
}

impl ChessTitle {
    pub fn from_str(s: &str) -> Self {
        match s {
            "GM" => ChessTitle::GM,
            "IM" => ChessTitle::IM,
            "FM" => ChessTitle::FM,
            "CM" => ChessTitle::CM,
            "WGM" => ChessTitle::WGM,
            "WIM" => ChessTitle::WIM,
            "WFM" => ChessTitle::WFM,
            "WCM" => ChessTitle::WCM,
            _ => ChessTitle::None,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            ChessTitle::GM => "GM",
            ChessTitle::IM => "IM",
            ChessTitle::FM => "FM",
            ChessTitle::CM => "CM",
            ChessTitle::WGM => "WGM",
            ChessTitle::WIM => "WIM",
            ChessTitle::WFM => "WFM",
            ChessTitle::WCM => "WCM",
            ChessTitle::None => "",
        }
    }
}

// Seeding and Ranking Models

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct TournamentSeedingSettings {
    pub id: i32,
    pub tournament_id: i32,
    pub seeding_method: String, // rating, manual, random, category_based
    pub use_initial_rating: bool, // Use rating at tournament start
    pub randomize_unrated: bool, // Randomize placement of unrated players
    pub protect_top_seeds: i32, // Number of top seeds to protect from changes
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
pub enum SeedingMethod {
    Rating,       // Automatic seeding by rating (highest to lowest)
    Manual,       // Manual seed assignment by tournament director
    Random,       // Random seeding/pairing numbers
    CategoryBased, // Seeding within player categories
}

impl SeedingMethod {
    pub fn from_str(s: &str) -> Self {
        match s {
            "rating" => SeedingMethod::Rating,
            "manual" => SeedingMethod::Manual,
            "random" => SeedingMethod::Random,
            "category_based" => SeedingMethod::CategoryBased,
            _ => SeedingMethod::Rating,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            SeedingMethod::Rating => "rating",
            SeedingMethod::Manual => "manual",
            SeedingMethod::Random => "random",
            SeedingMethod::CategoryBased => "category_based",
        }
    }
}

// Time Control Models

#[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
pub enum TimeControlType {
    Classical,
    Rapid,
    Blitz,
    Bullet,
    Correspondence,
    Fischer,   // Time added per move
    Bronstein, // Delay before time starts running
    Custom,
}

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct TimeControl {
    pub id: i32,
    pub name: String,
    pub time_control_type: String,
    pub base_time_minutes: Option<i32>,    // Base time in minutes
    pub increment_seconds: Option<i32>,    // Increment/delay in seconds
    pub moves_per_session: Option<i32>,    // For classical time controls
    pub session_time_minutes: Option<i32>, // Time for each session
    pub total_sessions: Option<i32>,       // Number of sessions
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

impl TimeControlType {
    pub fn from_str(s: &str) -> Self {
        match s {
            "classical" => TimeControlType::Classical,
            "rapid" => TimeControlType::Rapid,
            "blitz" => TimeControlType::Blitz,
            "bullet" => TimeControlType::Bullet,
            "correspondence" => TimeControlType::Correspondence,
            "fischer" => TimeControlType::Fischer,
            "bronstein" => TimeControlType::Bronstein,
            "custom" => TimeControlType::Custom,
            _ => TimeControlType::Classical,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            TimeControlType::Classical => "classical",
            TimeControlType::Rapid => "rapid",
            TimeControlType::Blitz => "blitz",
            TimeControlType::Bullet => "bullet",
            TimeControlType::Correspondence => "correspondence",
            TimeControlType::Fischer => "fischer",
            TimeControlType::Bronstein => "bronstein",
            TimeControlType::Custom => "custom",
        }
    }

    pub fn get_default_time_minutes(&self) -> Option<i32> {
        match self {
            TimeControlType::Classical => Some(90),  // 90 minutes
            TimeControlType::Rapid => Some(15),      // 15 minutes
            TimeControlType::Blitz => Some(5),       // 5 minutes
            TimeControlType::Bullet => Some(1),      // 1 minute
            TimeControlType::Correspondence => None, // Days/weeks
            TimeControlType::Fischer => Some(15),    // 15 minutes base
            TimeControlType::Bronstein => Some(15),  // 15 minutes base
            TimeControlType::Custom => None,
        }
    }

    pub fn get_default_increment_seconds(&self) -> Option<i32> {
        match self {
            TimeControlType::Classical => Some(30), // 30 second increment
            TimeControlType::Rapid => Some(10),     // 10 second increment
            TimeControlType::Blitz => Some(3),      // 3 second increment
            TimeControlType::Bullet => Some(1),     // 1 second increment
            TimeControlType::Correspondence => None,
            TimeControlType::Fischer => Some(10), // 10 seconds per move
            TimeControlType::Bronstein => Some(10), // 10 second delay
            TimeControlType::Custom => None,
        }
    }

    pub fn is_real_time(&self) -> bool {
        !matches!(self, TimeControlType::Correspondence)
    }

    pub fn requires_increment(&self) -> bool {
        matches!(self, TimeControlType::Fischer | TimeControlType::Bronstein)
    }
}

// Knockout Tournament Models

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct KnockoutBracket {
    pub id: i32,
    pub tournament_id: i32,
    pub bracket_type: String, // "main", "consolation", "third_place"
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
    pub status: String, // "waiting", "ready", "bye", "eliminated"
    pub created_at: String,
}

#[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
pub enum BracketType {
    SingleElimination,
    DoubleElimination,
    ThirdPlacePlayoff,
}

#[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
pub enum BracketPositionStatus {
    Waiting,    // Waiting for opponent or previous match
    Ready,      // Ready to play
    Bye,        // Received a bye
    Eliminated, // Player eliminated
    Advanced,   // Player advanced to next round
}

impl BracketType {
    pub fn from_str(s: &str) -> Self {
        match s {
            "single_elimination" => BracketType::SingleElimination,
            "double_elimination" => BracketType::DoubleElimination,
            "third_place_playoff" => BracketType::ThirdPlacePlayoff,
            _ => BracketType::SingleElimination,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            BracketType::SingleElimination => "single_elimination",
            BracketType::DoubleElimination => "double_elimination",
            BracketType::ThirdPlacePlayoff => "third_place_playoff",
        }
    }
}

impl BracketPositionStatus {
    pub fn from_str(s: &str) -> Self {
        match s {
            "waiting" => BracketPositionStatus::Waiting,
            "ready" => BracketPositionStatus::Ready,
            "bye" => BracketPositionStatus::Bye,
            "eliminated" => BracketPositionStatus::Eliminated,
            "advanced" => BracketPositionStatus::Advanced,
            _ => BracketPositionStatus::Waiting,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            BracketPositionStatus::Waiting => "waiting",
            BracketPositionStatus::Ready => "ready",
            BracketPositionStatus::Bye => "bye",
            BracketPositionStatus::Eliminated => "eliminated",
            BracketPositionStatus::Advanced => "advanced",
        }
    }
}

// Scheveningen (Team-based) Tournament Models
#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct Team {
    pub id: i32,
    pub tournament_id: i32,
    pub name: String,
    pub captain: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>, // Team color for UI
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
    pub board_number: i32, // Board position within the team (1, 2, 3, etc.)
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
    pub match_points: f64, // Team match points (2 for win, 1 for draw, 0 for loss)
    pub board_points: f64, // Individual board points
    pub games_played: i32,
    pub matches_won: i32,
    pub matches_drawn: i32,
    pub matches_lost: i32,
    pub players: Vec<Player>,
}

#[derive(Debug, Serialize, SpectaType, Clone)]
pub struct SchevenigenenMatch {
    pub round_number: i32,
    pub team_a: Team,
    pub team_b: Team,
    pub board_pairings: Vec<BoardPairing>,
    pub status: String, // "scheduled", "in_progress", "completed"
}

#[derive(Debug, Serialize, SpectaType, Clone)]
pub struct BoardPairing {
    pub board_number: i32,
    pub white_player: Player,
    pub black_player: Player,
    pub white_team_id: i32,
    pub black_team_id: i32,
    pub result: Option<String>, // Game result
}

// Tournament Template System
#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct TournamentTemplate {
    pub id: i32,
    pub name: String,
    pub description: Option<String>,
    pub tournament_type: String, // swiss, roundrobin, knockout, etc.
    pub time_type: String,       // classical, rapid, blitz
    pub default_rounds: i32,
    pub time_control_template_id: Option<i32>,
    pub tiebreak_order: String, // JSON array of tiebreak types
    pub forfeit_time_minutes: i32,
    pub draw_offers_allowed: bool,
    pub mobile_phone_policy: String,
    pub late_entry_allowed: bool,
    pub is_public: bool,            // Whether template is available to all users
    pub created_by: Option<String>, // User who created the template
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, SpectaType, Clone)]
pub struct TournamentTemplateWithTimeControl {
    pub template: TournamentTemplate,
    pub time_control: Option<TimeControl>,
}

// Extended Team Tournament Models for comprehensive team management

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct TeamMatch {
    pub id: i32,
    pub tournament_id: i32,
    pub round_number: i32,
    pub team_a_id: i32,
    pub team_b_id: i32,
    pub venue: Option<String>,
    pub scheduled_time: Option<String>,
    pub status: String, // "scheduled", "in_progress", "completed", "postponed", "cancelled"
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
    pub match_scoring_system: String, // "match_points", "board_points", "olympic_points", "custom"
    pub match_points_win: i32,
    pub match_points_draw: i32,
    pub match_points_loss: i32,
    pub board_weight_system: String, // "equal", "progressive", "custom"
    pub require_board_order: bool,
    pub allow_late_entries: bool,
    pub team_pairing_method: String, // "swiss", "round_robin", "knockout", "scheveningen"
    pub color_allocation: String, // "balanced", "alternating", "random"
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, FromRow, SpectaType, Clone)]
pub struct TeamBoardRules {
    pub id: i32,
    pub tournament_id: i32,
    pub rule_type: String, // "strict_rating", "flexible_rating", "fixed_assignment", "captain_choice"
    pub rating_tolerance: i32,
    pub allow_substitutions: bool,
    pub substitution_deadline_minutes: i32,
    pub max_substitutions_per_round: i32,
    pub require_captain_approval: bool,
    pub board_order_validation: bool,
    pub created_at: String,
}

// Application Settings Models

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct ApplicationSetting {
    pub id: i32,
    pub category: String,
    pub setting_key: String,
    pub setting_value: Option<String>,
    pub setting_type: String, // "string", "integer", "float", "boolean", "json", "array"
    pub default_value: Option<String>,
    pub description: Option<String>,
    pub validation_schema: Option<String>,
    pub requires_restart: bool,
    pub is_user_configurable: bool,
    pub display_order: i32,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct UserPreference {
    pub id: i32,
    pub user_id: String,
    pub category: String,
    pub setting_key: String,
    pub setting_value: Option<String>,
    pub is_custom: bool,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct SettingsTemplate {
    pub id: i32,
    pub template_name: String,
    pub template_description: Option<String>,
    pub template_category: String,
    pub template_data: String, // JSON data
    pub is_system_template: bool,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct SettingsBackupHistory {
    pub id: i32,
    pub backup_name: String,
    pub backup_type: String, // "manual", "automatic", "migration", "template"
    pub backup_data: String, // JSON snapshot
    pub backup_size: Option<i32>,
    pub user_id: String,
    pub created_at: String,
    pub restored_at: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct SettingsAuditLog {
    pub id: i32,
    pub user_id: String,
    pub category: String,
    pub setting_key: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub change_type: String, // "create", "update", "delete", "reset", "import", "restore"
    pub change_source: String, // "ui", "api", "migration", "template", "backup_restore", "system"
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: String,
}

#[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
pub enum SettingType {
    String,
    Integer,
    Float,
    Boolean,
    Json,
    Array,
}

#[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
pub enum SettingCategory {
    General,
    Display,
    Tournament,
    Performance,
    Privacy,
    Security,
    Data,
}

#[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
pub enum BackupType {
    Manual,
    Automatic,
    Migration,
    Template,
}

#[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
pub enum ChangeType {
    Create,
    Update,
    Delete,
    Reset,
    Import,
    Restore,
}

#[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
pub enum ChangeSource {
    UI,
    API,
    Migration,
    Template,
    BackupRestore,
    System,
}

impl SettingType {
    pub fn from_str(s: &str) -> Self {
        match s {
            "string" => SettingType::String,
            "integer" => SettingType::Integer,
            "float" => SettingType::Float,
            "boolean" => SettingType::Boolean,
            "json" => SettingType::Json,
            "array" => SettingType::Array,
            _ => SettingType::String,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            SettingType::String => "string",
            SettingType::Integer => "integer",
            SettingType::Float => "float",
            SettingType::Boolean => "boolean",
            SettingType::Json => "json",
            SettingType::Array => "array",
        }
    }
}

impl SettingCategory {
    pub fn from_str(s: &str) -> Self {
        match s {
            "general" => SettingCategory::General,
            "display" => SettingCategory::Display,
            "tournament" => SettingCategory::Tournament,
            "performance" => SettingCategory::Performance,
            "privacy" => SettingCategory::Privacy,
            "security" => SettingCategory::Security,
            "data" => SettingCategory::Data,
            _ => SettingCategory::General,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            SettingCategory::General => "general",
            SettingCategory::Display => "display",
            SettingCategory::Tournament => "tournament",
            SettingCategory::Performance => "performance",
            SettingCategory::Privacy => "privacy",
            SettingCategory::Security => "security",
            SettingCategory::Data => "data",
        }
    }
}

impl BackupType {
    pub fn from_str(s: &str) -> Self {
        match s {
            "manual" => BackupType::Manual,
            "automatic" => BackupType::Automatic,
            "migration" => BackupType::Migration,
            "template" => BackupType::Template,
            _ => BackupType::Manual,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            BackupType::Manual => "manual",
            BackupType::Automatic => "automatic",
            BackupType::Migration => "migration",
            BackupType::Template => "template",
        }
    }
}

impl ChangeType {
    pub fn from_str(s: &str) -> Self {
        match s {
            "create" => ChangeType::Create,
            "update" => ChangeType::Update,
            "delete" => ChangeType::Delete,
            "reset" => ChangeType::Reset,
            "import" => ChangeType::Import,
            "restore" => ChangeType::Restore,
            _ => ChangeType::Update,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            ChangeType::Create => "create",
            ChangeType::Update => "update",
            ChangeType::Delete => "delete",
            ChangeType::Reset => "reset",
            ChangeType::Import => "import",
            ChangeType::Restore => "restore",
        }
    }
}

impl ChangeSource {
    pub fn from_str(s: &str) -> Self {
        match s {
            "ui" => ChangeSource::UI,
            "api" => ChangeSource::API,
            "migration" => ChangeSource::Migration,
            "template" => ChangeSource::Template,
            "backup_restore" => ChangeSource::BackupRestore,
            "system" => ChangeSource::System,
            _ => ChangeSource::UI,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            ChangeSource::UI => "ui",
            ChangeSource::API => "api",
            ChangeSource::Migration => "migration",
            ChangeSource::Template => "template",
            ChangeSource::BackupRestore => "backup_restore",
            ChangeSource::System => "system",
        }
    }
}
