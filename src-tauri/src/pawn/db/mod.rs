use super::domain::{
    dto::{
        ApproveGameResult, AssignPlayerToCategory, CreateGame, CreatePlayer, CreatePlayerCategory,
        CreateRound, CreateTournament, UpdateGameResult, UpdatePlayer, UpdateTimeControl,
        UpdateTournamentSettings,
    },
    model::{
        BracketPosition, EnhancedGameResult, Game, GameResult, GameResultAudit, KnockoutBracket,
        Player, PlayerCategory, PlayerCategoryAssignment, PlayerResult, Round, TimeControl,
        Tournament, TournamentDetails,
    },
    tiebreak::TournamentTiebreakConfig,
};

pub mod sqlite;

pub trait Db: Send + Sync {
    // Tournament operations
    async fn get_tournaments(&self) -> Result<Vec<Tournament>, sqlx::Error>;
    async fn get_tournament(&self, id: i32) -> Result<Tournament, sqlx::Error>;
    async fn create_tournament(&self, data: CreateTournament) -> Result<Tournament, sqlx::Error>;
    async fn get_tournament_details(&self, id: i32) -> Result<TournamentDetails, sqlx::Error>;
    async fn delete_tournament(&self, id: i32) -> Result<(), sqlx::Error>;
    async fn update_tournament_status(&self, tournament_id: i32, status: &str) -> Result<Tournament, sqlx::Error>;

    // Player operations
    async fn get_players_by_tournament(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<Player>, sqlx::Error>;
    async fn create_player(&self, data: CreatePlayer) -> Result<Player, sqlx::Error>;
    async fn update_player(&self, data: UpdatePlayer) -> Result<Player, sqlx::Error>;
    async fn delete_player(&self, player_id: i32) -> Result<(), sqlx::Error>;

    // Game operations
    async fn get_games_by_tournament(&self, tournament_id: i32) -> Result<Vec<Game>, sqlx::Error>;
    async fn get_game(&self, game_id: i32) -> Result<Game, sqlx::Error>;
    async fn get_player(&self, player_id: i32) -> Result<Player, sqlx::Error>;
    async fn create_game(&self, data: CreateGame) -> Result<Game, sqlx::Error>;
    async fn update_game_result(&self, data: UpdateGameResult) -> Result<Game, sqlx::Error>;
    async fn get_enhanced_game_result(
        &self,
        game_id: i32,
    ) -> Result<EnhancedGameResult, sqlx::Error>;

    // Game result audit operations
    async fn get_game_audit_trail(&self, game_id: i32)
    -> Result<Vec<GameResultAudit>, sqlx::Error>;
    async fn approve_game_result(&self, data: ApproveGameResult) -> Result<(), sqlx::Error>;
    async fn get_pending_approvals(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<EnhancedGameResult>, sqlx::Error>;

    // Round operations extended
    async fn get_round_by_number(
        &self,
        tournament_id: i32,
        round_number: i32,
    ) -> Result<Round, sqlx::Error>;

    // Statistics
    async fn get_player_results(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<PlayerResult>, sqlx::Error>;
    async fn get_game_results(&self, tournament_id: i32) -> Result<Vec<GameResult>, sqlx::Error>;

    // Tournament settings
    async fn get_tournament_settings(
        &self,
        tournament_id: i32,
    ) -> Result<Option<TournamentTiebreakConfig>, sqlx::Error>;
    async fn upsert_tournament_settings(
        &self,
        settings: &UpdateTournamentSettings,
    ) -> Result<(), sqlx::Error>;

    // Round operations
    async fn get_rounds_by_tournament(&self, tournament_id: i32)
    -> Result<Vec<Round>, sqlx::Error>;
    async fn get_current_round(&self, tournament_id: i32) -> Result<Option<Round>, sqlx::Error>;
    async fn get_round(&self, round_id: i32) -> Result<Round, sqlx::Error>;
    async fn create_round(&self, data: CreateRound) -> Result<Round, sqlx::Error>;
    async fn update_round_status(&self, round_id: i32, status: &str) -> Result<Round, sqlx::Error>;
    async fn get_games_by_round(
        &self,
        tournament_id: i32,
        round_number: i32,
    ) -> Result<Vec<GameResult>, sqlx::Error>;

    // Player category operations
    async fn get_tournament_categories(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<PlayerCategory>, sqlx::Error>;
    async fn create_player_category(
        &self,
        data: CreatePlayerCategory,
    ) -> Result<PlayerCategory, sqlx::Error>;
    async fn delete_player_category(&self, category_id: i32) -> Result<(), sqlx::Error>;
    async fn assign_player_to_category(
        &self,
        data: AssignPlayerToCategory,
    ) -> Result<PlayerCategoryAssignment, sqlx::Error>;
    async fn get_player_category_assignments(
        &self,
        tournament_id: i32,
    ) -> Result<Vec<PlayerCategoryAssignment>, sqlx::Error>;

    // Knockout tournament operations
    async fn create_knockout_bracket(
        &self,
        bracket: KnockoutBracket,
    ) -> Result<KnockoutBracket, sqlx::Error>;
    async fn get_knockout_bracket(
        &self,
        tournament_id: i32,
    ) -> Result<Option<KnockoutBracket>, sqlx::Error>;
    async fn get_knockout_bracket_by_id(
        &self,
        bracket_id: i32,
    ) -> Result<Option<KnockoutBracket>, sqlx::Error>;
    async fn create_bracket_position(
        &self,
        position: BracketPosition,
    ) -> Result<BracketPosition, sqlx::Error>;
    async fn get_bracket_positions(
        &self,
        bracket_id: i32,
    ) -> Result<Vec<BracketPosition>, sqlx::Error>;
    async fn get_bracket_positions_by_round(
        &self,
        bracket_id: i32,
        round_number: i32,
    ) -> Result<Vec<BracketPosition>, sqlx::Error>;
    async fn update_bracket_position(
        &self,
        position_id: i32,
        player_id: Option<i32>,
        status: String,
    ) -> Result<(), sqlx::Error>;

    // Time control operations
    async fn get_time_controls(&self) -> Result<Vec<TimeControl>, sqlx::Error>;
    async fn get_time_control(&self, id: i32) -> Result<TimeControl, sqlx::Error>;
    async fn create_time_control(
        &self,
        time_control: TimeControl,
    ) -> Result<TimeControl, sqlx::Error>;
    async fn update_time_control(
        &self,
        data: UpdateTimeControl,
    ) -> Result<TimeControl, sqlx::Error>;
    async fn delete_time_control(&self, id: i32) -> Result<(), sqlx::Error>;
    async fn get_tournaments_using_time_control(
        &self,
        time_control_id: i32,
    ) -> Result<Vec<Tournament>, sqlx::Error>;
    async fn unset_default_time_controls(&self, time_control_type: &str)
    -> Result<(), sqlx::Error>;

    // Team management operations
    async fn create_team(&self, data: super::domain::dto::CreateTeam) -> Result<super::domain::model::Team, sqlx::Error>;
    async fn update_team(&self, data: super::domain::dto::UpdateTeam) -> Result<super::domain::model::Team, sqlx::Error>;
    async fn delete_team(&self, team_id: i32) -> Result<(), sqlx::Error>;
    async fn get_team_by_id(&self, team_id: i32) -> Result<super::domain::model::Team, sqlx::Error>;
    async fn get_teams_by_tournament(&self, tournament_id: i32) -> Result<Vec<super::domain::model::Team>, sqlx::Error>;
    async fn search_teams(&self, filters: super::domain::dto::TeamSearchFilters) -> Result<Vec<super::domain::model::Team>, sqlx::Error>;
    async fn get_tournament_by_id(&self, tournament_id: i32) -> Result<Tournament, sqlx::Error>;

    // Team membership operations
    async fn add_player_to_team(&self, data: super::domain::dto::AddPlayerToTeam) -> Result<super::domain::model::TeamMembership, sqlx::Error>;
    async fn remove_player_from_team(&self, data: super::domain::dto::RemovePlayerFromTeam) -> Result<(), sqlx::Error>;
    async fn get_team_memberships(&self, team_id: i32) -> Result<Vec<super::domain::model::TeamMembership>, sqlx::Error>;
    async fn get_all_team_memberships(&self, tournament_id: i32) -> Result<Vec<super::domain::model::TeamMembership>, sqlx::Error>;
    async fn get_player_by_id(&self, player_id: i32) -> Result<Player, sqlx::Error>;

    // Team match operations
    async fn create_team_match(&self, data: super::domain::dto::CreateTeamMatch) -> Result<super::domain::model::TeamMatch, sqlx::Error>;
    async fn update_team_match(&self, data: super::domain::dto::UpdateTeamMatch) -> Result<super::domain::model::TeamMatch, sqlx::Error>;
    async fn get_team_match_by_id(&self, match_id: i32) -> Result<super::domain::model::TeamMatch, sqlx::Error>;
    async fn get_team_matches(&self, tournament_id: i32, round_number: Option<i32>) -> Result<Vec<super::domain::model::TeamMatch>, sqlx::Error>;

    // Team lineup operations
    async fn create_team_lineup(&self, data: super::domain::dto::CreateTeamLineup) -> Result<super::domain::model::TeamLineup, sqlx::Error>;
    async fn get_team_lineups(&self, team_id: i32, round_number: i32) -> Result<Vec<super::domain::model::TeamLineup>, sqlx::Error>;

    // Team tournament settings operations
    async fn create_team_tournament_settings(&self, data: super::domain::dto::CreateTeamTournamentSettings) -> Result<super::domain::model::TeamTournamentSettings, sqlx::Error>;
    async fn update_team_tournament_settings(&self, data: super::domain::dto::UpdateTeamTournamentSettings) -> Result<super::domain::model::TeamTournamentSettings, sqlx::Error>;
    async fn get_team_tournament_settings(&self, tournament_id: i32) -> Result<super::domain::model::TeamTournamentSettings, sqlx::Error>;
}
