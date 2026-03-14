use std::collections::HashMap;

use crate::competition::dto::{ApproveGameResult, CreateGame, CreateRound, UpdateGameResult};
use crate::competition::model::{
    BracketPosition, EnhancedGameResult, Game, GameResult, GameResultAudit, KnockoutBracket, Round,
};
use crate::participant::dto::{
    AssignPlayerToCategory, CreatePlayer, CreatePlayerCategory, UpdatePlayer,
};
use crate::participant::model::{Player, PlayerCategory, PlayerCategoryAssignment, PlayerResult};
use crate::settings::dto::{CreateUserPreference, SettingsCategorySummary, SettingsFilter};
use crate::settings::model::{
    ApplicationSetting, SettingsAuditLog, SettingsBackupHistory, SettingsTemplate, UserPreference,
};
use crate::standings::model::TournamentTiebreakConfig;
use crate::team::dto::{
    AddPlayerToTeam, CreateTeam, CreateTeamLineup, CreateTeamMatch, CreateTeamTournamentSettings,
    RemovePlayerFromTeam, TeamSearchFilters, UpdateTeam, UpdateTeamMatch,
    UpdateTeamTournamentSettings,
};
use crate::team::model::{Team, TeamLineup, TeamMatch, TeamMembership, TeamTournamentSettings};
use crate::tournament::dto::{
    CreateTournament, CreateTournamentSeedingSettings, UpdatePlayerSeeding, UpdateTimeControl,
    UpdateTournamentSeedingSettings, UpdateTournamentSettings,
};
use crate::tournament::model::{
    TimeControl, Tournament, TournamentDetails, TournamentSeedingSettings,
};

pub mod sqlite;

// ── Tournament ───────────────────────────────────────────────────────

pub trait TournamentDb: Send + Sync {
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
    fn get_tournament_settings(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Option<TournamentTiebreakConfig>, sqlx::Error>> + Send;
    fn upsert_tournament_settings(
        &self,
        settings: &UpdateTournamentSettings,
    ) -> impl std::future::Future<Output = Result<(), sqlx::Error>> + Send;
}

// ── Player ───────────────────────────────────────────────────────────

pub trait PlayerDb: Send + Sync {
    fn get_player(
        &self,
        player_id: i32,
    ) -> impl std::future::Future<Output = Result<Player, sqlx::Error>> + Send;
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
}

// ── Game ─────────────────────────────────────────────────────────────

pub trait GameDb: Send + Sync {
    fn get_game(
        &self,
        game_id: i32,
    ) -> impl std::future::Future<Output = Result<Game, sqlx::Error>> + Send;
    fn get_games_by_tournament(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<Game>, sqlx::Error>> + Send;
    fn get_games_by_round(
        &self,
        tournament_id: i32,
        round_number: i32,
    ) -> impl std::future::Future<Output = Result<Vec<GameResult>, sqlx::Error>> + Send;
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
    fn get_player_results(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<PlayerResult>, sqlx::Error>> + Send;
    fn get_game_results(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<GameResult>, sqlx::Error>> + Send;
}

// ── Round ────────────────────────────────────────────────────────────

pub trait RoundDb: Send + Sync {
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
}

// ── TimeControl ──────────────────────────────────────────────────────

pub trait TimeControlDb: Send + Sync {
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
}

// ── Knockout ─────────────────────────────────────────────────────────

pub trait KnockoutDb: Send + Sync {
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
}

// ── Team ─────────────────────────────────────────────────────────────

pub trait TeamDb: Send + Sync {
    fn create_team(
        &self,
        data: CreateTeam,
    ) -> impl std::future::Future<Output = Result<Team, sqlx::Error>> + Send;
    fn update_team(
        &self,
        data: UpdateTeam,
    ) -> impl std::future::Future<Output = Result<Team, sqlx::Error>> + Send;
    fn delete_team(
        &self,
        team_id: i32,
    ) -> impl std::future::Future<Output = Result<(), sqlx::Error>> + Send;
    fn get_team_by_id(
        &self,
        team_id: i32,
    ) -> impl std::future::Future<Output = Result<Team, sqlx::Error>> + Send;
    fn get_teams_by_tournament(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<Team>, sqlx::Error>> + Send;
    fn search_teams(
        &self,
        filters: TeamSearchFilters,
    ) -> impl std::future::Future<Output = Result<Vec<Team>, sqlx::Error>> + Send;
    fn add_player_to_team(
        &self,
        data: AddPlayerToTeam,
    ) -> impl std::future::Future<Output = Result<TeamMembership, sqlx::Error>> + Send;
    fn remove_player_from_team(
        &self,
        data: RemovePlayerFromTeam,
    ) -> impl std::future::Future<Output = Result<(), sqlx::Error>> + Send;
    fn get_team_memberships(
        &self,
        team_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<TeamMembership>, sqlx::Error>> + Send;
    fn get_all_team_memberships(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<TeamMembership>, sqlx::Error>> + Send;
    fn create_team_match(
        &self,
        data: CreateTeamMatch,
    ) -> impl std::future::Future<Output = Result<TeamMatch, sqlx::Error>> + Send;
    fn update_team_match(
        &self,
        data: UpdateTeamMatch,
    ) -> impl std::future::Future<Output = Result<TeamMatch, sqlx::Error>> + Send;
    fn get_team_match_by_id(
        &self,
        match_id: i32,
    ) -> impl std::future::Future<Output = Result<TeamMatch, sqlx::Error>> + Send;
    fn get_team_matches(
        &self,
        tournament_id: i32,
        round_number: Option<i32>,
    ) -> impl std::future::Future<Output = Result<Vec<TeamMatch>, sqlx::Error>> + Send;
    fn create_team_lineup(
        &self,
        data: CreateTeamLineup,
    ) -> impl std::future::Future<Output = Result<TeamLineup, sqlx::Error>> + Send;
    fn get_team_lineups(
        &self,
        team_id: i32,
        round_number: i32,
    ) -> impl std::future::Future<Output = Result<Vec<TeamLineup>, sqlx::Error>> + Send;
    fn create_team_tournament_settings(
        &self,
        data: CreateTeamTournamentSettings,
    ) -> impl std::future::Future<Output = Result<TeamTournamentSettings, sqlx::Error>> + Send;
    fn update_team_tournament_settings(
        &self,
        data: UpdateTeamTournamentSettings,
    ) -> impl std::future::Future<Output = Result<TeamTournamentSettings, sqlx::Error>> + Send;
    fn get_team_tournament_settings(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<TeamTournamentSettings, sqlx::Error>> + Send;
}

// ── Seeding ──────────────────────────────────────────────────────────

pub trait SeedingDb: Send + Sync {
    fn create_seeding_settings(
        &self,
        settings: CreateTournamentSeedingSettings,
    ) -> impl std::future::Future<Output = Result<TournamentSeedingSettings, sqlx::Error>> + Send;
    fn get_seeding_settings(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Option<TournamentSeedingSettings>, sqlx::Error>> + Send;
    fn update_seeding_settings(
        &self,
        settings: UpdateTournamentSeedingSettings,
    ) -> impl std::future::Future<Output = Result<TournamentSeedingSettings, sqlx::Error>> + Send;
    fn get_active_tournament_players(
        &self,
        tournament_id: i32,
    ) -> impl std::future::Future<Output = Result<Vec<Player>, sqlx::Error>> + Send;
    fn batch_update_player_seeding(
        &self,
        updates: Vec<UpdatePlayerSeeding>,
    ) -> impl std::future::Future<Output = Result<Vec<Player>, sqlx::Error>> + Send;
}

// ── Settings ─────────────────────────────────────────────────────────

pub trait SettingsDb: Send + Sync {
    // Application Settings
    fn get_application_settings(
        &self,
        filter: Option<SettingsFilter>,
    ) -> impl std::future::Future<Output = Result<Vec<ApplicationSetting>, sqlx::Error>> + Send;
    fn get_application_setting(
        &self,
        category: &str,
        setting_key: &str,
    ) -> impl std::future::Future<Output = Result<Option<ApplicationSetting>, sqlx::Error>> + Send;
    // User Preferences
    fn get_user_preference(
        &self,
        user_id: &str,
        category: &str,
        setting_key: &str,
    ) -> impl std::future::Future<Output = Result<Option<UserPreference>, sqlx::Error>> + Send;
    fn create_user_preference(
        &self,
        data: CreateUserPreference,
    ) -> impl std::future::Future<Output = Result<UserPreference, sqlx::Error>> + Send;
    fn delete_user_preference(
        &self,
        id: i32,
    ) -> impl std::future::Future<Output = Result<(), sqlx::Error>> + Send;

    // Effective Settings (user prefs override app settings)
    fn get_effective_settings(
        &self,
        user_id: &str,
        category: Option<&str>,
    ) -> impl std::future::Future<Output = Result<HashMap<String, String>, sqlx::Error>> + Send;
    fn get_effective_setting(
        &self,
        user_id: &str,
        category: &str,
        setting_key: &str,
    ) -> impl std::future::Future<Output = Result<Option<String>, sqlx::Error>> + Send;

    // Settings Templates
    fn get_settings_templates(
        &self,
        category: Option<&str>,
    ) -> impl std::future::Future<Output = Result<Vec<SettingsTemplate>, sqlx::Error>> + Send;
    fn get_settings_template(
        &self,
        id: i32,
    ) -> impl std::future::Future<Output = Result<Option<SettingsTemplate>, sqlx::Error>> + Send;
    // Settings Backup
    fn insert_settings_backup(
        &self,
        backup_name: &str,
        backup_type: &str,
        backup_data: &str,
        backup_size: i32,
        user_id: &str,
    ) -> impl std::future::Future<Output = Result<SettingsBackupHistory, sqlx::Error>> + Send;
    fn get_settings_backups(
        &self,
        user_id: &str,
    ) -> impl std::future::Future<Output = Result<Vec<SettingsBackupHistory>, sqlx::Error>> + Send;
    fn get_settings_backup_by_id(
        &self,
        id: i32,
    ) -> impl std::future::Future<Output = Result<SettingsBackupHistory, sqlx::Error>> + Send;
    fn mark_backup_restored(
        &self,
        id: i32,
    ) -> impl std::future::Future<Output = Result<(), sqlx::Error>> + Send;

    // Overview & Audit
    fn get_settings_category_summaries(
        &self,
        user_id: &str,
    ) -> impl std::future::Future<Output = Result<Vec<SettingsCategorySummary>, sqlx::Error>> + Send;
    fn get_settings_audit_log(
        &self,
        user_id: &str,
        limit: i32,
    ) -> impl std::future::Future<Output = Result<Vec<SettingsAuditLog>, sqlx::Error>> + Send;

    // Reset & Restart
    fn delete_user_preferences_filtered(
        &self,
        user_id: &str,
        category: Option<&str>,
        setting_key: Option<&str>,
    ) -> impl std::future::Future<Output = Result<u64, sqlx::Error>> + Send;
    fn get_settings_requiring_restart(
        &self,
        user_id: &str,
    ) -> impl std::future::Future<Output = Result<Vec<String>, sqlx::Error>> + Send;
}

// ── Composite trait (backward compat) ────────────────────────────────

pub trait Db:
    TournamentDb
    + PlayerDb
    + GameDb
    + RoundDb
    + TimeControlDb
    + KnockoutDb
    + TeamDb
    + SeedingDb
    + SettingsDb
{
}
impl<
    T: TournamentDb
        + PlayerDb
        + GameDb
        + RoundDb
        + TimeControlDb
        + KnockoutDb
        + TeamDb
        + SeedingDb
        + SettingsDb,
> Db for T
{
}
