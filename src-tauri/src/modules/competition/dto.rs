use serde::{Deserialize, Serialize};
use specta::Type;

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
pub struct CreateGame {
    pub tournament_id: i32,
    pub round_number: i32,
    pub white_player_id: i32,
    pub black_player_id: i32,
    pub result: String,
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

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CsvResultImport {
    pub tournament_id: i32,
    pub csv_content: String,
    pub validate_only: bool,
    pub changed_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CsvResultRow {
    pub board_number: Option<i32>,
    pub white_player: Option<String>,
    pub black_player: Option<String>,
    pub result: String,
    pub result_type: Option<String>,
    pub result_reason: Option<String>,
    pub row_number: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CsvImportResult {
    pub success: bool,
    pub total_rows: usize,
    pub valid_rows: usize,
    pub processed_rows: usize,
    pub errors: Vec<CsvImportError>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CsvImportError {
    pub row_number: usize,
    pub field: Option<String>,
    pub message: String,
    pub row_data: String,
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
    pub bye_assignments: Vec<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ForcedPairingDto {
    pub white_player_id: i32,
    pub black_player_id: Option<i32>,
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
    pub required_color: String,
    pub priority: String,
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
    pub pairings: Vec<crate::competition::model::Pairing>,
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
    pub alternative_pairing: Option<crate::competition::model::Pairing>,
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
    pub tournament_type: String,
    pub optimize_colors: bool,
    pub use_berger_tables: bool,
    pub team_size: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RoundRobinAnalysis {
    pub total_rounds_needed: i32,
    pub current_progress: f64,
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

// Knockout Tournament DTOs

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateKnockoutBracket {
    pub tournament_id: i32,
    pub bracket_type: String,
}
