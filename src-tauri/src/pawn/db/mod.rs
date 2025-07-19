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
    fn get_tournaments(
        &self,
    ) -> impl std::future::Future<Output = Result<Vec<Tournament>, sqlx::Error>> + Send;
    fn get_tournament(
        &self,
        id: i32,
    ) -> impl std::future::Future<Output = Result<Tournament, sqlx::Error>> + Send;
    fn create_tournament(
        &self,
        data: CreateTournament,
    ) -> impl std::future::Future<Output = Result<Tournament, sqlx::Error>> + Send;
    fn get_tournament_details(
        &self,
        id: i32,
    ) -> impl std::future::Future<Output = Result<TournamentDetails, sqlx::Error>> + Send;
    fn delete_tournament(
        &self,
        id: i32,
    ) -> impl std::future::Future<Output = Result<(), sqlx::Error>> + Send;
    fn update_tournament_status(
        &self,
        tournament_id: i32,
        status: &str,
    ) -> impl std::future::Future<Output = Result<Tournament, sqlx::Error>> + Send;

    // Player operations
    fn get_players_by_tournament(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<Player>, sqlx::Error>> + Send;
    fn create_player(
        &self,
        data: CreatePlayer,
    ) -> impl std::future::Future<Output = Result<Player, sqlx::Error>> + Send;
    fn update_player(
        &self,
        data: UpdatePlayer,
    ) -> impl std::future::Future<Output = Result<Player, sqlx::Error>> + Send;
    fn delete_player(
        &self,
        player_id: i32,
    ) -> impl std::future::Future<Output = Result<(), sqlx::Error>> + Send;

    // Game operations
    fn get_games_by_tournament(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<Game>, sqlx::Error>> + Send;
    fn get_game(
        &self,
        game_id: i32,
    ) -> impl std::future::Future<Output = Result<Game, sqlx::Error>> + Send;
    fn get_player(
        &self,
        player_id: i32,
    ) -> impl std::future::Future<Output = Result<Player, sqlx::Error>> + Send;
    fn create_game(
        &self,
        data: CreateGame,
    ) -> impl std::future::Future<Output = Result<Game, sqlx::Error>> + Send;
    fn update_game_result(
        &self,
        data: UpdateGameResult,
    ) -> impl std::future::Future<Output = Result<Game, sqlx::Error>> + Send;
    fn get_enhanced_game_result(
        &self,
        game_id: i32,
    ) -> impl std::future::Future<Output = Result<EnhancedGameResult, sqlx::Error>> + Send;

    // Game result audit operations
    fn get_game_audit_trail(
        &self,
        game_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<GameResultAudit>, sqlx::Error>> + Send;
    fn approve_game_result(
        &self,
        data: ApproveGameResult,
    ) -> impl std::future::Future<Output = Result<(), sqlx::Error>> + Send;
    fn get_pending_approvals(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<EnhancedGameResult>, sqlx::Error>> + Send;

    // Round operations extended
    #[allow(dead_code)]
    fn get_round_by_number(
        &self,
        tournament_id: i32,
        round_number: i32,
    ) -> impl std::future::Future<Output = Result<Round, sqlx::Error>> + Send;

    // Statistics
    fn get_player_results(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<PlayerResult>, sqlx::Error>> + Send;
    fn get_game_results(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<GameResult>, sqlx::Error>> + Send;

    // Tournament settings
    fn get_tournament_settings(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Option<TournamentTiebreakConfig>, sqlx::Error>> + Send;
    fn upsert_tournament_settings(
        &self,
        settings: &UpdateTournamentSettings,
    ) -> impl std::future::Future<Output = Result<(), sqlx::Error>> + Send;

    // Round operations
    fn get_rounds_by_tournament(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<Round>, sqlx::Error>> + Send;
    fn get_current_round(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Option<Round>, sqlx::Error>> + Send;
    fn get_round(
        &self,
        round_id: i32,
    ) -> impl std::future::Future<Output = Result<Round, sqlx::Error>> + Send;
    fn create_round(
        &self,
        data: CreateRound,
    ) -> impl std::future::Future<Output = Result<Round, sqlx::Error>> + Send;
    fn update_round_status(
        &self,
        round_id: i32,
        status: &str,
    ) -> impl std::future::Future<Output = Result<Round, sqlx::Error>> + Send;
    fn get_games_by_round(
        &self,
        tournament_id: i32,
        round_number: i32,
    ) -> impl std::future::Future<Output = Result<Vec<GameResult>, sqlx::Error>> + Send;

    // Player category operations
    fn get_tournament_categories(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<PlayerCategory>, sqlx::Error>> + Send;
    fn create_player_category(
        &self,
        data: CreatePlayerCategory,
    ) -> impl std::future::Future<Output = Result<PlayerCategory, sqlx::Error>> + Send;
    fn delete_player_category(
        &self,
        category_id: i32,
    ) -> impl std::future::Future<Output = Result<(), sqlx::Error>> + Send;
    fn assign_player_to_category(
        &self,
        data: AssignPlayerToCategory,
    ) -> impl std::future::Future<Output = Result<PlayerCategoryAssignment, sqlx::Error>> + Send;
    fn get_player_category_assignments(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<PlayerCategoryAssignment>, sqlx::Error>> + Send;

    // Knockout tournament operations
    fn create_knockout_bracket(
        &self,
        bracket: KnockoutBracket,
    ) -> impl std::future::Future<Output = Result<KnockoutBracket, sqlx::Error>> + Send;
    fn get_knockout_bracket(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Option<KnockoutBracket>, sqlx::Error>> + Send;
    fn get_knockout_bracket_by_id(
        &self,
        bracket_id: i32,
    ) -> impl std::future::Future<Output = Result<Option<KnockoutBracket>, sqlx::Error>> + Send;
    fn create_bracket_position(
        &self,
        position: BracketPosition,
    ) -> impl std::future::Future<Output = Result<BracketPosition, sqlx::Error>> + Send;
    fn get_bracket_positions(
        &self,
        bracket_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<BracketPosition>, sqlx::Error>> + Send;
    fn get_bracket_positions_by_round(
        &self,
        bracket_id: i32,
        round_number: i32,
    ) -> impl std::future::Future<Output = Result<Vec<BracketPosition>, sqlx::Error>> + Send;
    #[allow(dead_code)]
    fn update_bracket_position(
        &self,
        position_id: i32,
        player_id: Option<i32>,
        status: String,
    ) -> impl std::future::Future<Output = Result<(), sqlx::Error>> + Send;

    // Time control operations
    fn get_time_controls(
        &self,
    ) -> impl std::future::Future<Output = Result<Vec<TimeControl>, sqlx::Error>> + Send;
    fn get_time_control(
        &self,
        id: i32,
    ) -> impl std::future::Future<Output = Result<TimeControl, sqlx::Error>> + Send;
    fn create_time_control(
        &self,
        time_control: TimeControl,
    ) -> impl std::future::Future<Output = Result<TimeControl, sqlx::Error>> + Send;
    fn update_time_control(
        &self,
        data: UpdateTimeControl,
    ) -> impl std::future::Future<Output = Result<TimeControl, sqlx::Error>> + Send;
    fn delete_time_control(
        &self,
        id: i32,
    ) -> impl std::future::Future<Output = Result<(), sqlx::Error>> + Send;
    fn get_tournaments_using_time_control(
        &self,
        time_control_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<Tournament>, sqlx::Error>> + Send;
    #[allow(dead_code)]
    fn unset_default_time_controls(
        &self,
        time_control_type: &str,
    ) -> impl std::future::Future<Output = Result<(), sqlx::Error>> + Send;

    // Team management operations
    fn create_team(
        &self,
        data: super::domain::dto::CreateTeam,
    ) -> impl std::future::Future<Output = Result<super::domain::model::Team, sqlx::Error>> + Send;
    fn update_team(
        &self,
        data: super::domain::dto::UpdateTeam,
    ) -> impl std::future::Future<Output = Result<super::domain::model::Team, sqlx::Error>> + Send;
    fn delete_team(
        &self,
        team_id: i32,
    ) -> impl std::future::Future<Output = Result<(), sqlx::Error>> + Send;
    fn get_team_by_id(
        &self,
        team_id: i32,
    ) -> impl std::future::Future<Output = Result<super::domain::model::Team, sqlx::Error>> + Send;
    fn get_teams_by_tournament(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<super::domain::model::Team>, sqlx::Error>> + Send;
    fn search_teams(
        &self,
        filters: super::domain::dto::TeamSearchFilters,
    ) -> impl std::future::Future<Output = Result<Vec<super::domain::model::Team>, sqlx::Error>> + Send;
    fn get_tournament_by_id(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Tournament, sqlx::Error>> + Send;

    // Team membership operations
    fn add_player_to_team(
        &self,
        data: super::domain::dto::AddPlayerToTeam,
    ) -> impl std::future::Future<Output = Result<super::domain::model::TeamMembership, sqlx::Error>>
    + Send;
    fn remove_player_from_team(
        &self,
        data: super::domain::dto::RemovePlayerFromTeam,
    ) -> impl std::future::Future<Output = Result<(), sqlx::Error>> + Send;
    fn get_team_memberships(
        &self,
        team_id: i32,
    ) -> impl std::future::Future<
        Output = Result<Vec<super::domain::model::TeamMembership>, sqlx::Error>,
    > + Send;
    fn get_all_team_memberships(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<
        Output = Result<Vec<super::domain::model::TeamMembership>, sqlx::Error>,
    > + Send;
    fn get_player_by_id(
        &self,
        player_id: i32,
    ) -> impl std::future::Future<Output = Result<Player, sqlx::Error>> + Send;

    // Team match operations
    fn create_team_match(
        &self,
        data: super::domain::dto::CreateTeamMatch,
    ) -> impl std::future::Future<Output = Result<super::domain::model::TeamMatch, sqlx::Error>> + Send;
    fn update_team_match(
        &self,
        data: super::domain::dto::UpdateTeamMatch,
    ) -> impl std::future::Future<Output = Result<super::domain::model::TeamMatch, sqlx::Error>> + Send;
    fn get_team_match_by_id(
        &self,
        match_id: i32,
    ) -> impl std::future::Future<Output = Result<super::domain::model::TeamMatch, sqlx::Error>> + Send;
    fn get_team_matches(
        &self,
        tournament_id: i32,
        round_number: Option<i32>,
    ) -> impl std::future::Future<Output = Result<Vec<super::domain::model::TeamMatch>, sqlx::Error>>
    + Send;

    // Team lineup operations
    fn create_team_lineup(
        &self,
        data: super::domain::dto::CreateTeamLineup,
    ) -> impl std::future::Future<Output = Result<super::domain::model::TeamLineup, sqlx::Error>> + Send;
    fn get_team_lineups(
        &self,
        team_id: i32,
        round_number: i32,
    ) -> impl std::future::Future<
        Output = Result<Vec<super::domain::model::TeamLineup>, sqlx::Error>,
    > + Send;

    // Team tournament settings operations
    fn create_team_tournament_settings(
        &self,
        data: super::domain::dto::CreateTeamTournamentSettings,
    ) -> impl std::future::Future<
        Output = Result<super::domain::model::TeamTournamentSettings, sqlx::Error>,
    > + Send;
    fn update_team_tournament_settings(
        &self,
        data: super::domain::dto::UpdateTeamTournamentSettings,
    ) -> impl std::future::Future<
        Output = Result<super::domain::model::TeamTournamentSettings, sqlx::Error>,
    > + Send;
    fn get_team_tournament_settings(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<
        Output = Result<super::domain::model::TeamTournamentSettings, sqlx::Error>,
    > + Send;
}
