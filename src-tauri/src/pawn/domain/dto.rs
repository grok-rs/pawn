use serde::{Deserialize, Serialize};
use specta::Type;
use crate::pawn::domain::tiebreak::TiebreakType;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateTournament {
    pub name: String,
    pub location: String,
    pub date: String,
    pub time_type: String,
    pub tournament_type: Option<String>,
    pub player_count: i32,
    pub rounds_played: i32,
    pub total_rounds: i32,
    pub country_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreatePlayer {
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
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateGame {
    pub tournament_id: i32,
    pub round_number: i32,
    pub white_player_id: i32,
    pub black_player_id: i32,
    pub result: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateTournamentSettings {
    pub tournament_id: i32,
    pub tiebreak_order: Vec<TiebreakType>,
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

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateRound {
    pub tournament_id: i32,
    pub round_number: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateRoundStatus {
    pub round_id: i32,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct GeneratePairingsRequest {
    pub tournament_id: i32,
    pub round_number: i32,
    pub pairing_method: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateTournamentPairingMethod {
    pub tournament_id: i32,
    pub pairing_method: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateGameResult {
    pub game_id: i32,
    pub result: String,
    pub result_type: Option<String>,
    pub result_reason: Option<String>,
    pub arbiter_notes: Option<String>,
    pub changed_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ValidateGameResult {
    pub game_id: i32,
    pub result: String,
    pub result_type: Option<String>,
    pub tournament_id: i32,
    pub changed_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct BatchUpdateResults {
    pub tournament_id: i32,
    pub updates: Vec<UpdateGameResult>,
    pub validate_only: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ApproveGameResult {
    pub game_id: i32,
    pub approved_by: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct GameResultValidation {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct BatchValidationResult {
    pub overall_valid: bool,
    pub results: Vec<(usize, GameResultValidation)>,
}

// Enhanced Player Management DTOs

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdatePlayer {
    pub player_id: i32,
    pub name: Option<String>,
    pub rating: Option<i32>,
    pub country_code: Option<String>,
    pub title: Option<String>,
    pub birth_date: Option<String>,
    pub gender: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub club: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateRatingHistory {
    pub player_id: i32,
    pub rating_type: String,    // fide, national, club, rapid, blitz
    pub rating: i32,
    pub is_provisional: bool,
    pub effective_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreatePlayerCategory {
    pub tournament_id: i32,
    pub name: String,
    pub description: Option<String>,
    pub min_rating: Option<i32>,
    pub max_rating: Option<i32>,
    pub min_age: Option<i32>,
    pub max_age: Option<i32>,
    pub gender_restriction: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct BulkImportPlayer {
    pub name: String,
    pub rating: Option<i32>,
    pub country_code: Option<String>,
    pub title: Option<String>,
    pub birth_date: Option<String>,
    pub gender: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub club: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct BulkImportRequest {
    pub tournament_id: i32,
    pub players: Vec<BulkImportPlayer>,
    pub validate_only: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PlayerSearchFilters {
    pub tournament_id: Option<i32>,
    pub name: Option<String>,
    pub rating_min: Option<i32>,
    pub rating_max: Option<i32>,
    pub country_code: Option<String>,
    pub title: Option<String>,
    pub gender: Option<String>,
    pub status: Option<String>,
    pub category_id: Option<i32>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PlayerImportValidation {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub player_data: BulkImportPlayer,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct BulkImportResult {
    pub success_count: i32,
    pub error_count: i32,
    pub validations: Vec<PlayerImportValidation>,
    pub imported_player_ids: Vec<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AssignPlayerToCategory {
    pub player_id: i32,
    pub category_id: i32,
}

// Knockout Tournament DTOs

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateKnockoutBracket {
    pub tournament_id: i32,
    pub bracket_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateBracketPosition {
    pub bracket_id: i32,
    pub round_number: i32,
    pub position_number: i32,
    pub player_id: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AdvancePlayerRequest {
    pub bracket_id: i32,
    pub position_id: i32,
    pub player_id: i32,
    pub next_round: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct KnockoutRoundResult {
    pub bracket_id: i32,
    pub round_number: i32,
    pub winner_advances: Vec<(i32, i32)>, // (position_id, player_id)
}

// Time Control DTOs

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateTimeControl {
    pub name: String,
    pub time_control_type: String,
    pub base_time_minutes: Option<i32>,
    pub increment_seconds: Option<i32>,
    pub moves_per_session: Option<i32>,
    pub session_time_minutes: Option<i32>,
    pub total_sessions: Option<i32>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateTimeControl {
    pub id: i32,
    pub name: Option<String>,
    pub time_control_type: Option<String>,
    pub base_time_minutes: Option<i32>,
    pub increment_seconds: Option<i32>,
    pub moves_per_session: Option<i32>,
    pub session_time_minutes: Option<i32>,
    pub total_sessions: Option<i32>,
    pub description: Option<String>,
    pub is_default: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TimeControlFilter {
    pub time_control_type: Option<String>,
    pub is_default: Option<bool>,
    pub is_real_time: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TimeControlValidation {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub estimated_game_duration_minutes: Option<i32>,
}

// Enhanced Pairing System DTOs

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct EnhancedPairingRequest {
    pub tournament_id: i32,
    pub round_number: i32,
    pub pairing_method: String,
    pub use_accelerated_pairings: Option<bool>,
    pub avoid_team_conflicts: Option<bool>,
    pub manual_overrides: Option<ManualPairingOverrides>,
    pub optimization_config: Option<PairingOptimizationConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ManualPairingOverrides {
    pub forced_pairings: Vec<ForcedPairingDto>,
    pub forbidden_pairings: Vec<ForbiddenPairingDto>,
    pub color_constraints: Vec<ColorConstraintDto>,
    pub bye_assignments: Vec<i32>, // Player IDs to receive byes
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ForcedPairingDto {
    pub white_player_id: i32,
    pub black_player_id: Option<i32>, // None for bye
    pub board_number: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ForbiddenPairingDto {
    pub player1_id: i32,
    pub player2_id: i32,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ColorConstraintDto {
    pub player_id: i32,
    pub required_color: String, // "white" or "black"
    pub priority: String, // "low", "medium", "high", "critical"
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PairingOptimizationConfig {
    pub max_players_for_basic_algorithm: Option<usize>,
    pub use_parallel_processing: Option<bool>,
    pub batch_size_for_large_tournaments: Option<usize>,
    pub timeout_seconds: Option<u64>,
    pub cache_opponent_history: Option<bool>,
    pub use_heuristic_pruning: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct EnhancedPairingResult {
    pub pairings: Vec<crate::pawn::domain::model::Pairing>,
    pub validation_results: PairingValidationResults,
    pub performance_metrics: Option<PairingPerformanceMetrics>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PairingValidationResults {
    pub is_valid: bool,
    pub critical_errors: Vec<PairingErrorDto>,
    pub warnings: Vec<PairingWarningDto>,
    pub suggestions: Vec<PairingSuggestionDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PairingErrorDto {
    pub error_type: String,
    pub message: String,
    pub affected_players: Vec<i32>,
    pub severity: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PairingWarningDto {
    pub warning_type: String,
    pub message: String,
    pub affected_players: Vec<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PairingSuggestionDto {
    pub suggestion_type: String,
    pub message: String,
    pub alternative_pairing: Option<crate::pawn::domain::model::Pairing>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PairingPerformanceMetrics {
    pub total_duration_ms: u128,
    pub pairing_generation_ms: u128,
    pub validation_duration_ms: u128,
    pub players_processed: usize,
    pub pairings_generated: usize,
    pub cache_hits: usize,
    pub cache_misses: usize,
    pub algorithm_used: String,
}

// Swiss System Specific DTOs

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SwissPairingOptions {
    pub use_accelerated_pairings: bool,
    pub accelerated_rounds: i32,
    pub virtual_points_round1: f64,
    pub virtual_points_round2: f64,
    pub avoid_same_team: bool,
    pub color_preference_weight: f64,
    pub rating_difference_penalty: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SwissPairingAnalysis {
    pub score_groups: Vec<ScoreGroupDto>,
    pub float_statistics: FloatStatisticsDto,
    pub color_balance_analysis: ColorBalanceAnalysisDto,
    pub rating_distribution: RatingDistributionDto,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ScoreGroupDto {
    pub score: f64,
    pub player_count: usize,
    pub average_rating: f64,
    pub floats_up: usize,
    pub floats_down: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct FloatStatisticsDto {
    pub total_floats: usize,
    pub up_floats: usize,
    pub down_floats: usize,
    pub float_percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ColorBalanceAnalysisDto {
    pub players_with_color_imbalance: usize,
    pub average_color_balance: f64,
    pub players_needing_white: usize,
    pub players_needing_black: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RatingDistributionDto {
    pub average_rating_difference: f64,
    pub max_rating_difference: f64,
    pub min_rating_difference: f64,
    pub pairs_with_large_rating_gap: usize,
}

// Round-Robin System DTOs

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RoundRobinOptions {
    pub tournament_type: String, // "single", "double", "scheveningen"
    pub optimize_colors: bool,
    pub use_berger_tables: bool,
    pub team_size: Option<usize>, // For Scheveningen
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RoundRobinAnalysis {
    pub total_rounds_needed: i32,
    pub current_progress: f64, // Percentage complete
    pub berger_table_info: Option<BergerTableInfoDto>,
    pub color_distribution: Vec<PlayerColorStatsDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct BergerTableInfoDto {
    pub table_size: usize,
    pub rotation_pattern: String,
    pub bye_player_position: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PlayerColorStatsDto {
    pub player_id: i32,
    pub player_name: String,
    pub white_games: i32,
    pub black_games: i32,
    pub color_balance: i32,
}

// Team Management DTOs for Scheveningen tournaments
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateTeam {
    pub tournament_id: i32,
    pub name: String,
    pub captain: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateTeam {
    pub id: i32,
    pub name: Option<String>,
    pub captain: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
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
pub struct GenerateSchevenigenenPairings {
    pub tournament_id: i32,
    pub round_number: i32,
    pub team_a_id: i32,
    pub team_b_id: i32,
    pub alternate_colors: bool, // Whether to alternate colors by board number
}

// Tournament Template DTOs
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateTournamentTemplate {
    pub name: String,
    pub description: Option<String>,
    pub tournament_type: String,
    pub time_type: String,
    pub default_rounds: i32,
    pub time_control_template_id: Option<i32>,
    pub tiebreak_order: Vec<String>, // Will be serialized to JSON
    pub forfeit_time_minutes: i32,
    pub draw_offers_allowed: bool,
    pub mobile_phone_policy: String,
    pub late_entry_allowed: bool,
    pub is_public: bool,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpdateTournamentTemplate {
    pub id: i32,
    pub name: Option<String>,
    pub description: Option<String>,
    pub tournament_type: Option<String>,
    pub time_type: Option<String>,
    pub default_rounds: Option<i32>,
    pub time_control_template_id: Option<i32>,
    pub tiebreak_order: Option<Vec<String>>,
    pub forfeit_time_minutes: Option<i32>,
    pub draw_offers_allowed: Option<bool>,
    pub mobile_phone_policy: Option<String>,
    pub late_entry_allowed: Option<bool>,
    pub is_public: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TournamentTemplateFilter {
    pub tournament_type: Option<String>,
    pub time_type: Option<String>,
    pub is_public: Option<bool>,
    pub created_by: Option<String>,
}

