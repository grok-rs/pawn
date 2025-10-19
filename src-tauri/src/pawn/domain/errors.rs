use serde::{Deserialize, Serialize};
use specta::Type as SpectaType;
use std::fmt;
use thiserror::Error;

use super::types::*;

/// Domain-specific error types that provide better context and composability
/// than the generic PawnError. Each domain has its own error type that can
/// be converted to the global error type when needed.

// ===========================
// Core Domain Errors
// ===========================

/// Tournament-specific errors
#[derive(Debug, Clone, PartialEq, Eq, Error, Serialize, Deserialize, SpectaType)]
pub enum TournamentError {
    #[error("Tournament not found: {id}")]
    NotFound { id: TournamentId },

    #[error("Tournament {id} has insufficient players (found: {current}, required: {required})")]
    InsufficientPlayers {
        id: TournamentId,
        current: i32,
        required: i32,
    },

    #[error("Tournament {id} cannot transition from {current_status} to {target_status}")]
    InvalidStatusTransition {
        id: TournamentId,
        current_status: String,
        target_status: String,
    },

    #[error("Tournament {id} has already started")]
    AlreadyStarted { id: TournamentId },

    #[error("Tournament {id} is not yet finished (round {current_round} of {total_rounds})")]
    NotYetFinished {
        id: TournamentId,
        current_round: i32,
        total_rounds: i32,
    },

    #[error("Cannot modify finished tournament {id}")]
    CannotModifyFinished { id: TournamentId },

    #[error("Tournament {id} configuration is invalid: {reason}")]
    InvalidConfiguration { id: TournamentId, reason: String },

    #[error("Tournament {id} has reached maximum player capacity")]
    MaxPlayersReached { id: TournamentId },

    #[error("Tournament {id} template not found or invalid")]
    InvalidTemplate { id: TournamentId },
}

/// Player-specific errors
#[derive(Debug, Clone, PartialEq, Eq, Error, Serialize, Deserialize, SpectaType)]
pub enum PlayerError {
    #[error("Player not found: {id}")]
    NotFound { id: PlayerId },

    #[error("Player {id} not found in tournament {tournament_id}")]
    NotInTournament {
        id: PlayerId,
        tournament_id: TournamentId,
    },

    #[error("Player {id} is already registered in tournament {tournament_id}")]
    AlreadyRegistered {
        id: PlayerId,
        tournament_id: TournamentId,
    },

    #[error("Player {id} has invalid status: {status}")]
    InvalidStatus { id: PlayerId, status: String },

    #[error("Player {id} cannot be withdrawn: {reason}")]
    CannotWithdraw { id: PlayerId, reason: String },

    #[error("Player {id} rating {rating} is outside allowed range ({min_rating}-{max_rating})")]
    RatingOutOfRange {
        id: PlayerId,
        rating: Rating,
        min_rating: Rating,
        max_rating: Rating,
    },

    #[error("Player {id} does not meet category requirements: {category}")]
    CategoryRequirementsNotMet { id: PlayerId, category: String },

    #[error("Duplicate pairing number {pairing_number} for tournament {tournament_id}")]
    DuplicatePairingNumber {
        pairing_number: i32,
        tournament_id: TournamentId,
    },

    #[error("Player name '{name}' validation failed: {reason}")]
    InvalidName { name: String, reason: String },

    #[error("Player email '{email}' is invalid")]
    InvalidEmail { email: String },
}

/// Game-specific errors
#[derive(Debug, Clone, PartialEq, Eq, Error, Serialize, Deserialize, SpectaType)]
pub enum GameError {
    #[error("Game not found: {id}")]
    NotFound { id: GameId },

    #[error("Game {id} result validation failed: {reason}")]
    InvalidResult { id: GameId, reason: String },

    #[error("Game {id} cannot be modified: already finished")]
    AlreadyFinished { id: GameId },

    #[error("Game {id} requires arbiter approval for result type: {result_type}")]
    RequiresArbiterApproval { id: GameId, result_type: String },

    #[error("Game {id} has conflicting results: white={white_result}, black={black_result}")]
    ConflictingResults {
        id: GameId,
        white_result: String,
        black_result: String,
    },

    #[error("Game {id} pairing is invalid: {reason}")]
    InvalidPairing { id: GameId, reason: String },

    #[error("Cannot pair player {player_id} against themselves")]
    SelfPairing { player_id: PlayerId },

    #[error(
        "Cannot create game: players {white_id} and {black_id} already have a game in round {round}"
    )]
    DuplicateGame {
        white_id: PlayerId,
        black_id: PlayerId,
        round: RoundNumber,
    },
}

/// Round-specific errors
#[derive(Debug, Clone, PartialEq, Eq, Error, Serialize, Deserialize, SpectaType)]
pub enum RoundError {
    #[error("Round not found: {id}")]
    NotFound { id: RoundId },

    #[error("Round {round_number} in tournament {tournament_id} not found")]
    RoundNotFound {
        round_number: RoundNumber,
        tournament_id: TournamentId,
    },

    #[error("Round {id} cannot transition from {current_status} to {target_status}")]
    InvalidStatusTransition {
        id: RoundId,
        current_status: String,
        target_status: String,
    },

    #[error("Round {id} cannot generate pairings: {reason}")]
    CannotGeneratePairings { id: RoundId, reason: String },

    #[error("Round {id} pairings are incomplete or invalid")]
    InvalidPairings { id: RoundId },

    #[error("Round {id} has unfinished games")]
    UnfinishedGames { id: RoundId },

    #[error("Round {round_number} already exists in tournament {tournament_id}")]
    RoundAlreadyExists {
        round_number: RoundNumber,
        tournament_id: TournamentId,
    },

    #[error("Cannot create round {round_number}: previous round not completed")]
    PreviousRoundNotCompleted { round_number: RoundNumber },
}

/// Team-specific errors
#[derive(Debug, Clone, PartialEq, Eq, Error, Serialize, Deserialize, SpectaType)]
pub enum TeamError {
    #[error("Team not found: {id}")]
    NotFound { id: TeamId },

    #[error("Team {id} is full (capacity: {capacity})")]
    TeamFull { id: TeamId, capacity: i32 },

    #[error("Player {player_id} is already assigned to team {team_id}")]
    PlayerAlreadyAssigned {
        player_id: PlayerId,
        team_id: TeamId,
    },

    #[error("Team {id} lineup is invalid: {reason}")]
    InvalidLineup { id: TeamId, reason: String },

    #[error("Team {id} cannot be modified: tournament has started")]
    CannotModifyAfterStart { id: TeamId },

    #[error("Team name '{name}' validation failed: {reason}")]
    InvalidName { name: String, reason: String },

    #[error("Board {board_number} is already assigned in team {team_id}")]
    BoardAlreadyAssigned {
        board_number: BoardNumber,
        team_id: TeamId,
    },
}

/// Pairing-specific errors
#[derive(Debug, Clone, PartialEq, Eq, Error, Serialize, Deserialize, SpectaType)]
pub enum PairingError {
    #[error("No valid pairings found for round {round_number}")]
    NoValidPairings { round_number: RoundNumber },

    #[error("Pairing algorithm failed: {reason}")]
    AlgorithmFailed { reason: String },

    #[error("Color balance cannot be achieved: {reason}")]
    ColorBalanceIssue { reason: String },

    #[error("Player {player_id} bye assignment failed: {reason}")]
    ByeAssignmentFailed { player_id: PlayerId, reason: String },

    #[error("Swiss pairing constraints violated: {constraint}")]
    SwissConstraintViolation { constraint: String },

    #[error("Round robin scheduling conflict: {reason}")]
    RoundRobinConflict { reason: String },

    #[error("Knockout bracket is invalid: {reason}")]
    InvalidKnockoutBracket { reason: String },
}

// ===========================
// Infrastructure Errors
// ===========================

/// Database-specific errors with context
#[derive(Debug, Clone, PartialEq, Eq, Error, Serialize, Deserialize, SpectaType)]
pub enum DatabaseError {
    #[error("Connection failed: {reason}")]
    ConnectionFailed { reason: String },

    #[error("Transaction failed: {operation}")]
    TransactionFailed { operation: String },

    #[error("Query failed: {query} - {reason}")]
    QueryFailed { query: String, reason: String },

    #[error("Constraint violation: {constraint}")]
    ConstraintViolation { constraint: String },

    #[error("Migration failed: {version}")]
    MigrationFailed { version: String },

    #[error("Database corruption detected: {details}")]
    CorruptionDetected { details: String },

    #[error("Deadlock detected in operation: {operation}")]
    DeadlockDetected { operation: String },
}

/// Validation-specific errors
#[derive(Debug, Clone, PartialEq, Eq, Error, Serialize, Deserialize, SpectaType)]
pub enum ValidationError {
    #[error("Field '{field}' is required")]
    RequiredField { field: String },

    #[error("Field '{field}' has invalid value: {value}")]
    InvalidValue { field: String, value: String },

    #[error("Field '{field}' exceeds maximum length of {max_length}")]
    MaxLengthExceeded { field: String, max_length: usize },

    #[error("Field '{field}' is below minimum value of {min_value}")]
    BelowMinimum { field: String, min_value: String },

    #[error("Field '{field}' exceeds maximum value of {max_value}")]
    AboveMaximum { field: String, max_value: String },

    #[error("Field '{field}' format is invalid: {expected_format}")]
    InvalidFormat {
        field: String,
        expected_format: String,
    },

    #[error("Data consistency check failed: {check}")]
    ConsistencyCheckFailed { check: String },
}

/// Import/Export errors
#[derive(Debug, Clone, PartialEq, Eq, Error, Serialize, Deserialize, SpectaType)]
pub enum ImportExportError {
    #[error("File format not supported: {format}")]
    UnsupportedFormat { format: String },

    #[error("File parsing failed at line {line}: {reason}")]
    ParseError { line: usize, reason: String },

    #[error("Required column '{column}' not found")]
    MissingColumn { column: String },

    #[error("Export failed: {format} - {reason}")]
    ExportFailed { format: String, reason: String },

    #[error("File too large: {size} bytes (max: {max_size})")]
    FileTooLarge { size: usize, max_size: usize },

    #[error("Encoding error: {encoding}")]
    EncodingError { encoding: String },
}

// ===========================
// Composite Error Type
// ===========================

/// Main domain error type that composes all specific error types
#[derive(Debug, Clone, Error, Serialize, Deserialize, SpectaType)]
pub enum DomainError {
    #[error(transparent)]
    Tournament(#[from] TournamentError),

    #[error(transparent)]
    Player(#[from] PlayerError),

    #[error(transparent)]
    Game(#[from] GameError),

    #[error(transparent)]
    Round(#[from] RoundError),

    #[error(transparent)]
    Team(#[from] TeamError),

    #[error(transparent)]
    Pairing(#[from] PairingError),

    #[error(transparent)]
    Database(#[from] DatabaseError),

    #[error(transparent)]
    Validation(#[from] ValidationError),

    #[error(transparent)]
    ImportExport(#[from] ImportExportError),

    #[error("Business rule violation: {rule}")]
    BusinessRuleViolation { rule: String },

    #[error("Operation not permitted: {operation}")]
    OperationNotPermitted { operation: String },

    #[error("Concurrency conflict: {resource}")]
    ConcurrencyConflict { resource: String },
}

// ===========================
// Error Context and Recovery
// ===========================

/// Error context provides additional information for debugging and recovery
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct ErrorContext {
    pub operation: String,
    pub timestamp: String,
    pub user_action: Option<String>,
    pub recovery_suggestions: Vec<String>,
    pub correlation_id: Option<String>,
}

impl ErrorContext {
    pub fn new(operation: &str) -> Self {
        Self {
            operation: operation.to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            user_action: None,
            recovery_suggestions: Vec::new(),
            correlation_id: None,
        }
    }

    pub fn with_user_action(mut self, action: &str) -> Self {
        self.user_action = Some(action.to_string());
        self
    }

    pub fn with_recovery_suggestion(mut self, suggestion: &str) -> Self {
        self.recovery_suggestions.push(suggestion.to_string());
        self
    }

    pub fn with_correlation_id(mut self, id: &str) -> Self {
        self.correlation_id = Some(id.to_string());
        self
    }
}

/// Rich error that includes context and recovery information
#[derive(Debug, Clone, Serialize, Deserialize, SpectaType)]
pub struct RichError {
    pub error: DomainError,
    pub context: ErrorContext,
}

impl RichError {
    pub fn new(error: DomainError, context: ErrorContext) -> Self {
        Self { error, context }
    }

    pub fn from_domain_error(error: DomainError, operation: &str) -> Self {
        Self {
            error,
            context: ErrorContext::new(operation),
        }
    }
}

impl fmt::Display for RichError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} (operation: {})", self.error, self.context.operation)
    }
}

impl std::error::Error for RichError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        Some(&self.error)
    }
}

// ===========================
// Result Type Aliases
// ===========================

/// Domain-specific result type
pub type DomainResult<T> = Result<T, DomainError>;

/// Rich result type with context
pub type RichResult<T> = Result<T, RichError>;

/// Specific result types for different domains
pub type TournamentResult<T> = Result<T, TournamentError>;
pub type PlayerResult<T> = Result<T, PlayerError>;
pub type GameResult<T> = Result<T, GameError>;
pub type RoundResult<T> = Result<T, RoundError>;
pub type TeamResult<T> = Result<T, TeamError>;
pub type PairingResult<T> = Result<T, PairingError>;

// ===========================
// Error Conversion Helpers
// ===========================

/// Convert domain errors to the legacy PawnError for compatibility
impl From<DomainError> for crate::pawn::common::error::PawnError {
    fn from(error: DomainError) -> Self {
        match error {
            DomainError::Tournament(e) => Self::BusinessLogic(e.to_string()),
            DomainError::Player(e) => Self::ValidationError(e.to_string()),
            DomainError::Game(e) => Self::ValidationError(e.to_string()),
            DomainError::Round(e) => Self::BusinessLogic(e.to_string()),
            DomainError::Team(e) => Self::BusinessLogic(e.to_string()),
            DomainError::Pairing(e) => Self::BusinessLogic(e.to_string()),
            DomainError::Database(e) => Self::BusinessLogic(e.to_string()),
            DomainError::Validation(e) => Self::ValidationError(e.to_string()),
            DomainError::ImportExport(e) => Self::BusinessLogic(e.to_string()),
            DomainError::BusinessRuleViolation { rule } => Self::BusinessLogic(rule),
            DomainError::OperationNotPermitted { operation } => Self::BusinessLogic(operation),
            DomainError::ConcurrencyConflict { resource } => Self::BusinessLogic(resource),
        }
    }
}

/// Convert SQLx errors to domain errors
impl From<sqlx::Error> for DatabaseError {
    fn from(error: sqlx::Error) -> Self {
        match error {
            sqlx::Error::RowNotFound => DatabaseError::QueryFailed {
                query: "row lookup".to_string(),
                reason: "No rows found".to_string(),
            },
            sqlx::Error::Database(db_err) => {
                if let Some(constraint) = db_err.constraint() {
                    DatabaseError::ConstraintViolation {
                        constraint: constraint.to_string(),
                    }
                } else {
                    DatabaseError::QueryFailed {
                        query: "database operation".to_string(),
                        reason: db_err.to_string(),
                    }
                }
            }
            _ => DatabaseError::QueryFailed {
                query: "unknown".to_string(),
                reason: error.to_string(),
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tournament_error_creation() {
        let error = TournamentError::NotFound {
            id: TournamentId::new(1),
        };
        assert_eq!(error.to_string(), "Tournament not found: 1");
    }

    #[test]
    fn test_error_context() {
        let context = ErrorContext::new("create_tournament")
            .with_user_action("User clicked Create Tournament")
            .with_recovery_suggestion("Check tournament name and try again");

        assert_eq!(context.operation, "create_tournament");
        assert_eq!(context.recovery_suggestions.len(), 1);
    }

    #[test]
    fn test_domain_error_conversion() {
        let tournament_error = TournamentError::NotFound {
            id: TournamentId::new(1),
        };
        let domain_error = DomainError::Tournament(tournament_error);
        let pawn_error: crate::pawn::common::error::PawnError = domain_error.into();

        match pawn_error {
            crate::pawn::common::error::PawnError::BusinessLogic(_) => (),
            _ => panic!("Expected BusinessLogic error"),
        }
    }
}
