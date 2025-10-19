use async_trait::async_trait;
use sqlx::Error as SqlxError;

use super::super::domain::{
    dto::*,
    model::{
        BracketPosition, EnhancedGameResult, Game, GameResult as ModelGameResult, GameResultAudit,
        KnockoutBracket, Player, PlayerCategory, PlayerCategoryAssignment,
        PlayerResult as ModelPlayerResult, Round, Team, TeamLineup, TeamMatch, TeamMembership,
        TeamTournamentSettings, TimeControl, Tournament, TournamentDetails,
    },
    tiebreak::TournamentTiebreakConfig,
};

/// Focused database traits that separate concerns and provide better modularity.
/// Each trait represents a cohesive set of operations for a specific domain.

// ===========================
// Tournament Repository Trait
// ===========================

#[async_trait]
pub trait TournamentRepository: Send + Sync {
    /// Get all tournaments
    async fn get_tournaments(&self) -> Result<Vec<Tournament>, SqlxError>;

    /// Get tournament by ID
    async fn get_tournament(&self, id: i32) -> Result<Tournament, SqlxError>;

    /// Get tournament by ID (alternative method name for compatibility)
    async fn get_tournament_by_id(&self, id: i32) -> Result<Tournament, SqlxError>;

    /// Create a new tournament
    async fn create_tournament(&self, data: CreateTournament) -> Result<Tournament, SqlxError>;

    /// Update tournament status
    async fn update_tournament_status(
        &self,
        tournament_id: i32,
        status: &str,
    ) -> Result<Tournament, SqlxError>;

    /// Delete tournament
    async fn delete_tournament(&self, id: i32) -> Result<(), SqlxError>;

    /// Get comprehensive tournament details with players and games
    async fn get_tournament_details(&self, id: i32) -> Result<TournamentDetails, SqlxError>;

    /// Get tournament settings including tiebreak configuration
    async fn get_tournament_settings(
        &self,
        tournament_id: i32,
    ) -> Result<Option<TournamentTiebreakConfig>, SqlxError>;

    /// Update tournament settings
    async fn upsert_tournament_settings(
        &self,
        settings: &UpdateTournamentSettings,
    ) -> Result<(), SqlxError>;
}

// ===========================
// Player Repository Trait
// ===========================

#[async_trait]
pub trait PlayerRepository: Send + Sync {
    /// Get player by ID
    async fn get_player(&self, player_id: i32) -> Result<Player, SqlxError>;

    /// Get player by ID (alternative method name)
    async fn get_player_by_id(&self, player_id: i32) -> Result<Player, SqlxError>;

    /// Get all players in a tournament
    async fn get_players_by_tournament(&self, tournament_id: i32)
    -> Result<Vec<Player>, SqlxError>;

    /// Create a new player
    async fn create_player(&self, data: CreatePlayer) -> Result<Player, SqlxError>;

    /// Update player information
    async fn update_player(&self, data: UpdatePlayer) -> Result<Player, SqlxError>;

    /// Delete a player
    async fn delete_player(&self, player_id: i32) -> Result<(), SqlxError>;

    /// Get player results and statistics
    async fn get_player_results(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<ModelPlayerResult>, SqlxError>;
}

// ===========================
// Game Repository Trait
// ===========================

#[async_trait]
pub trait GameRepository: Send + Sync {
    /// Get game by ID
    async fn get_game(&self, game_id: i32) -> Result<Game, SqlxError>;

    /// Get all games in a tournament
    fn get_games_by_tournament(
        &self,
        tournament_id: i32,
    ) -> impl Future<Output = Result<Vec<Game>, SqlxError>> + Send;

    /// Get games for a specific round
    fn get_games_by_round(
        &self,
        tournament_id: i32,
        round_number: i32,
    ) -> impl Future<Output = Result<Vec<ModelGameResult>, SqlxError>> + Send;

    /// Create a new game
    async fn create_game(&self, data: CreateGame) -> Result<Game, SqlxError>;

    /// Update game result
    async fn update_game_result(&self, data: UpdateGameResult) -> Result<Game, SqlxError>;

    /// Get enhanced game result with audit trail
    async fn get_enhanced_game_result(&self, game_id: i32)
    -> Result<EnhancedGameResult, SqlxError>;

    /// Get game results for tournament
    fn get_game_results(
        &self,
        tournament_id: i32,
    ) -> impl Future<Output = Result<Vec<ModelGameResult>, SqlxError>> + Send;
}

// ===========================
// Game Audit Repository Trait
// ===========================

#[async_trait]
pub trait GameAuditRepository: Send + Sync {
    /// Get audit trail for a game
    fn get_game_audit_trail(
        &self,
        game_id: i32,
    ) -> impl Future<Output = Result<Vec<GameResultAudit>, SqlxError>> + Send;

    /// Approve a game result
    async fn approve_game_result(&self, data: ApproveGameResult) -> Result<(), SqlxError>;

    /// Get pending approvals for a tournament
    fn get_pending_approvals(
        &self,
        tournament_id: i32,
    ) -> impl Future<Output = Result<Vec<EnhancedGameResult>, SqlxError>> + Send;
}

// ===========================
// Round Repository Trait
// ===========================

#[async_trait]
pub trait RoundRepository: Send + Sync {
    /// Get round by ID
    async fn get_round(&self, round_id: i32) -> Result<Round, SqlxError>;

    /// Get round by tournament and round number
    async fn get_round_by_number(
        &self,
        tournament_id: i32,
        round_number: i32,
    ) -> Result<Round, SqlxError>;

    /// Get all rounds for a tournament
    fn get_rounds_by_tournament(
        &self,
        tournament_id: i32,
    ) -> impl Future<Output = Result<Vec<Round>, SqlxError>> + Send;

    /// Get current active round
    fn get_current_round(
        &self,
        tournament_id: i32,
    ) -> impl Future<Output = Result<Option<Round>, SqlxError>> + Send;

    /// Create a new round
    async fn create_round(&self, data: CreateRound) -> Result<Round, SqlxError>;

    /// Update round status
    async fn update_round_status(&self, round_id: i32, status: &str) -> Result<Round, SqlxError>;
}

// ===========================
// Player Category Repository Trait
// ===========================

#[async_trait]
pub trait PlayerCategoryRepository: Send + Sync {
    /// Get all categories for a tournament
    fn get_tournament_categories(
        &self,
        tournament_id: i32,
    ) -> impl Future<Output = Result<Vec<PlayerCategory>, SqlxError>> + Send;

    /// Create a new player category
    async fn create_player_category(
        &self,
        data: CreatePlayerCategory,
    ) -> Result<PlayerCategory, SqlxError>;

    /// Delete a player category
    async fn delete_player_category(&self, category_id: i32) -> Result<(), SqlxError>;

    /// Assign player to category
    async fn assign_player_to_category(
        &self,
        data: AssignPlayerToCategory,
    ) -> Result<PlayerCategoryAssignment, SqlxError>;

    /// Get category assignments for tournament
    fn get_player_category_assignments(
        &self,
        tournament_id: i32,
    ) -> impl Future<Output = Result<Vec<PlayerCategoryAssignment>, SqlxError>> + Send;
}

// ===========================
// Knockout Tournament Repository Trait
// ===========================

#[async_trait]
pub trait KnockoutRepository: Send + Sync {
    /// Create knockout bracket
    async fn create_knockout_bracket(
        &self,
        bracket: KnockoutBracket,
    ) -> Result<KnockoutBracket, SqlxError>;

    /// Get bracket by tournament
    fn get_knockout_bracket(
        &self,
        tournament_id: i32,
    ) -> impl Future<Output = Result<Option<KnockoutBracket>, SqlxError>> + Send;

    /// Get bracket by ID
    fn get_knockout_bracket_by_id(
        &self,
        bracket_id: i32,
    ) -> impl Future<Output = Result<Option<KnockoutBracket>, SqlxError>> + Send;

    /// Create bracket position
    async fn create_bracket_position(
        &self,
        position: BracketPosition,
    ) -> Result<BracketPosition, SqlxError>;

    /// Get all positions in bracket
    fn get_bracket_positions(
        &self,
        bracket_id: i32,
    ) -> impl Future<Output = Result<Vec<BracketPosition>, SqlxError>> + Send;

    /// Get positions by round
    fn get_bracket_positions_by_round(
        &self,
        bracket_id: i32,
        round_number: i32,
    ) -> impl Future<Output = Result<Vec<BracketPosition>, SqlxError>> + Send;

    /// Update bracket position
    async fn update_bracket_position(
        &self,
        position_id: i32,
        player_id: Option<i32>,
        status: String,
    ) -> Result<(), SqlxError>;
}

// ===========================
// Time Control Repository Trait
// ===========================

#[async_trait]
pub trait TimeControlRepository: Send + Sync {
    /// Get all time controls
    fn get_time_controls(&self)
    -> impl Future<Output = Result<Vec<TimeControl>, SqlxError>> + Send;

    /// Get time control by ID
    async fn get_time_control(&self, id: i32) -> Result<TimeControl, SqlxError>;

    /// Create time control
    async fn create_time_control(
        &self,
        time_control: TimeControl,
    ) -> Result<TimeControl, SqlxError>;

    /// Update time control
    async fn update_time_control(&self, data: UpdateTimeControl) -> Result<TimeControl, SqlxError>;

    /// Delete time control
    async fn delete_time_control(&self, id: i32) -> Result<(), SqlxError>;

    /// Get tournaments using this time control
    fn get_tournaments_using_time_control(
        &self,
        time_control_id: i32,
    ) -> impl Future<Output = Result<Vec<Tournament>, SqlxError>> + Send;

    /// Unset default time controls of a type
    async fn unset_default_time_controls(&self, time_control_type: &str) -> Result<(), SqlxError>;
}

// ===========================
// Team Repository Trait
// ===========================

#[async_trait]
pub trait TeamRepository: Send + Sync {
    /// Create a new team
    async fn create_team(&self, data: CreateTeam) -> Result<Team, SqlxError>;

    /// Update team information
    async fn update_team(&self, data: UpdateTeam) -> Result<Team, SqlxError>;

    /// Delete a team
    async fn delete_team(&self, team_id: i32) -> Result<(), SqlxError>;

    /// Get team by ID
    async fn get_team_by_id(&self, team_id: i32) -> Result<Team, SqlxError>;

    /// Get all teams in a tournament
    fn get_teams_by_tournament(
        &self,
        tournament_id: i32,
    ) -> impl Future<Output = Result<Vec<Team>, SqlxError>> + Send;

    /// Search teams with filters
    fn search_teams(
        &self,
        filters: TeamSearchFilters,
    ) -> impl Future<Output = Result<Vec<Team>, SqlxError>> + Send;
}

// ===========================
// Team Membership Repository Trait
// ===========================

#[async_trait]
pub trait TeamMembershipRepository: Send + Sync {
    /// Add player to team
    async fn add_player_to_team(&self, data: AddPlayerToTeam) -> Result<TeamMembership, SqlxError>;

    /// Remove player from team
    async fn remove_player_from_team(&self, data: RemovePlayerFromTeam) -> Result<(), SqlxError>;

    /// Get team memberships for a team
    fn get_team_memberships(
        &self,
        team_id: i32,
    ) -> impl Future<Output = Result<Vec<TeamMembership>, SqlxError>> + Send;

    /// Get all team memberships in tournament
    fn get_all_team_memberships(
        &self,
        tournament_id: i32,
    ) -> impl Future<Output = Result<Vec<TeamMembership>, SqlxError>> + Send;
}

// ===========================
// Team Match Repository Trait
// ===========================

#[async_trait]
pub trait TeamMatchRepository: Send + Sync {
    /// Create team match
    async fn create_team_match(&self, data: CreateTeamMatch) -> Result<TeamMatch, SqlxError>;

    /// Update team match
    async fn update_team_match(&self, data: UpdateTeamMatch) -> Result<TeamMatch, SqlxError>;

    /// Get team match by ID
    async fn get_team_match_by_id(&self, match_id: i32) -> Result<TeamMatch, SqlxError>;

    /// Get team matches for tournament/round
    fn get_team_matches(
        &self,
        tournament_id: i32,
        round_number: Option<i32>,
    ) -> impl Future<Output = Result<Vec<TeamMatch>, SqlxError>> + Send;
}

// ===========================
// Team Lineup Repository Trait
// ===========================

#[async_trait]
pub trait TeamLineupRepository: Send + Sync {
    /// Create team lineup
    async fn create_team_lineup(&self, data: CreateTeamLineup) -> Result<TeamLineup, SqlxError>;

    /// Get team lineups for round
    fn get_team_lineups(
        &self,
        team_id: i32,
        round_number: i32,
    ) -> impl Future<Output = Result<Vec<TeamLineup>, SqlxError>> + Send;
}

// ===========================
// Team Tournament Settings Repository Trait
// ===========================

#[async_trait]
pub trait TeamTournamentSettingsRepository: Send + Sync {
    /// Create team tournament settings
    async fn create_team_tournament_settings(
        &self,
        data: CreateTeamTournamentSettings,
    ) -> Result<TeamTournamentSettings, SqlxError>;

    /// Update team tournament settings
    async fn update_team_tournament_settings(
        &self,
        data: UpdateTeamTournamentSettings,
    ) -> Result<TeamTournamentSettings, SqlxError>;

    /// Get team tournament settings
    async fn get_team_tournament_settings(
        &self,
        tournament_id: i32,
    ) -> Result<TeamTournamentSettings, SqlxError>;
}

// ===========================
// Convenience Aggregate Trait
// ===========================

/// Convenience trait that combines all repositories for easy use in commands
/// This allows commands to accept a single trait bound instead of multiple
pub trait AllRepositories:
    TournamentRepository
    + PlayerRepository
    + GameRepository
    + GameAuditRepository
    + RoundRepository
    + PlayerCategoryRepository
    + KnockoutRepository
    + TimeControlRepository
    + TeamRepository
    + TeamMembershipRepository
    + TeamMatchRepository
    + TeamLineupRepository
    + TeamTournamentSettingsRepository
    + Send
    + Sync
{
}

// Blanket implementation for any type that implements all the individual traits
impl<T> AllRepositories for T where
    T: TournamentRepository
        + PlayerRepository
        + GameRepository
        + GameAuditRepository
        + RoundRepository
        + PlayerCategoryRepository
        + KnockoutRepository
        + TimeControlRepository
        + TeamRepository
        + TeamMembershipRepository
        + TeamMatchRepository
        + TeamLineupRepository
        + TeamTournamentSettingsRepository
        + Send
        + Sync
{
}
