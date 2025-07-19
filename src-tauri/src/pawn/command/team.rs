use tauri::State;
use tracing::instrument;

use crate::pawn::{
    common::types::CommandResult,
    domain::{
        dto::{
            AddPlayerToTeam, CreateTeam, CreateTeamLineup, CreateTeamMatch,
            CreateTeamTournamentSettings, RemovePlayerFromTeam, TeamSearchFilters, UpdateTeam,
            UpdateTeamMatch, UpdateTeamTournamentSettings,
        },
        model::{
            Team, TeamLineup, TeamMatch, TeamMembership, TeamStanding, TeamTournamentSettings,
        },
    },
    service::{
        team::TeamStatistics,
        team_pairing::{
            BoardOrderPolicy, ColorAllocation, TeamPairingConfig, TeamPairingEngine,
            TeamPairingMethod,
        },
        team_scoring::{
            TeamScoringConfig, TeamScoringService, TeamScoringSystem, TeamTiebreakCriterion,
        },
    },
    state::PawnState,
};

// =====================================================
// Team CRUD Operations
// =====================================================

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn create_team(state: State<'_, PawnState>, data: CreateTeam) -> CommandResult<Team> {
    state.team_service.create_team(data).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_team_by_id(state: State<'_, PawnState>, team_id: i32) -> CommandResult<Team> {
    state.team_service.get_team_by_id(team_id).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_teams_by_tournament(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Vec<Team>> {
    state
        .team_service
        .get_teams_by_tournament(tournament_id)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn update_team(state: State<'_, PawnState>, data: UpdateTeam) -> CommandResult<Team> {
    state.team_service.update_team(data).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn delete_team(state: State<'_, PawnState>, team_id: i32) -> CommandResult<()> {
    state.team_service.delete_team(team_id).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn search_teams(
    state: State<'_, PawnState>,
    filters: TeamSearchFilters,
) -> CommandResult<Vec<Team>> {
    state.team_service.search_teams(filters).await
}

// =====================================================
// Team Membership Operations
// =====================================================

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn add_player_to_team(
    state: State<'_, PawnState>,
    data: AddPlayerToTeam,
) -> CommandResult<TeamMembership> {
    state.team_service.add_player_to_team(data).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn remove_player_from_team(
    state: State<'_, PawnState>,
    data: RemovePlayerFromTeam,
) -> CommandResult<()> {
    state.team_service.remove_player_from_team(data).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_team_memberships(
    state: State<'_, PawnState>,
    team_id: i32,
) -> CommandResult<Vec<TeamMembership>> {
    state.team_service.get_team_memberships(team_id).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_all_team_memberships(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Vec<TeamMembership>> {
    state
        .team_service
        .get_all_team_memberships(tournament_id)
        .await
}

// =====================================================
// Team Match Operations
// =====================================================

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn create_team_match(
    state: State<'_, PawnState>,
    data: CreateTeamMatch,
) -> CommandResult<TeamMatch> {
    state.team_service.create_team_match(data).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn update_team_match(
    state: State<'_, PawnState>,
    data: UpdateTeamMatch,
) -> CommandResult<TeamMatch> {
    state.team_service.update_team_match(data).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_team_match_by_id(
    state: State<'_, PawnState>,
    match_id: i32,
) -> CommandResult<TeamMatch> {
    state.team_service.get_team_match_by_id(match_id).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_team_matches(
    state: State<'_, PawnState>,
    tournament_id: i32,
    round_number: Option<i32>,
) -> CommandResult<Vec<TeamMatch>> {
    state
        .team_service
        .get_team_matches(tournament_id, round_number)
        .await
}

// =====================================================
// Team Lineup Operations
// =====================================================

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn create_team_lineup(
    state: State<'_, PawnState>,
    data: CreateTeamLineup,
) -> CommandResult<TeamLineup> {
    state.team_service.create_team_lineup(data).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_team_lineups(
    state: State<'_, PawnState>,
    team_id: i32,
    round_number: i32,
) -> CommandResult<Vec<TeamLineup>> {
    state
        .team_service
        .get_team_lineups(team_id, round_number)
        .await
}

// =====================================================
// Team Tournament Settings Operations
// =====================================================

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn create_team_tournament_settings(
    state: State<'_, PawnState>,
    data: CreateTeamTournamentSettings,
) -> CommandResult<TeamTournamentSettings> {
    state
        .team_service
        .create_team_tournament_settings(data)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn update_team_tournament_settings(
    state: State<'_, PawnState>,
    data: UpdateTeamTournamentSettings,
) -> CommandResult<TeamTournamentSettings> {
    state
        .team_service
        .update_team_tournament_settings(data)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_team_tournament_settings(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<TeamTournamentSettings> {
    state
        .team_service
        .get_team_tournament_settings(tournament_id)
        .await
}

// =====================================================
// Team Statistics and Analysis
// =====================================================

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_team_statistics(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<TeamStatistics> {
    state.team_service.get_team_statistics(tournament_id).await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn get_team_standings(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Vec<TeamStanding>> {
    state.team_service.get_team_standings(tournament_id).await
}

// =====================================================
// Team Validation Operations
// =====================================================

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn validate_team_lineup(
    state: State<'_, PawnState>,
    team_id: i32,
    round_number: i32,
) -> CommandResult<bool> {
    state
        .team_service
        .validate_team_lineup(team_id, round_number)
        .await
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn validate_team_board_order(
    state: State<'_, PawnState>,
    team_id: i32,
    round_number: i32,
) -> CommandResult<bool> {
    state
        .team_service
        .validate_team_board_order(team_id, round_number)
        .await
}

// =====================================================
// Enhanced Team Pairing Commands
// =====================================================

/// Team pairing configuration for commands
#[allow(dead_code)]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct TeamPairingConfigDto {
    pub pairing_method: String, // "swiss", "round_robin", "scheveningen", "knockout", "double_round_robin"
    pub color_allocation: String, // "alternating_boards", "alternating_rounds", "balanced_rotation", "fixed_boards"
    pub board_order_policy: String, // "rating_descending", "rating_ascending", "captain_choice", "flexible"
    pub allow_team_vs_team: bool,
    pub prevent_early_rematches: bool,
    pub max_score_difference: Option<f32>,
    pub prefer_balanced_matches: bool,
}

/// Team pairing result for commands
#[allow(dead_code)]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct TeamPairingResultDto {
    pub team_matches: Vec<TeamMatch>,
    pub individual_pairings: Vec<crate::pawn::domain::model::Pairing>,
    pub bye_team: Option<Team>,
    pub pairing_quality: PairingQualityDto,
}

/// Pairing quality metrics
#[allow(dead_code)]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct PairingQualityDto {
    pub color_balance_score: f32,
    pub rating_balance_score: f32,
    pub rematch_avoidance_score: f32,
    pub overall_quality: f32,
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn generate_team_pairings(
    state: State<'_, PawnState>,
    tournament_id: i32,
    round_number: i32,
    config: TeamPairingConfigDto,
) -> CommandResult<TeamPairingResultDto> {
    // Convert DTO to internal config
    let pairing_method = match config.pairing_method.as_str() {
        "swiss" => TeamPairingMethod::Swiss,
        "round_robin" => TeamPairingMethod::RoundRobin,
        "scheveningen" => TeamPairingMethod::Scheveningen,
        "knockout" => TeamPairingMethod::Knockout,
        "double_round_robin" => TeamPairingMethod::DoubleRoundRobin,
        _ => {
            return Err(crate::pawn::common::error::PawnError::InvalidInput(
                "Invalid pairing method".to_string(),
            ));
        }
    };

    let color_allocation = match config.color_allocation.as_str() {
        "alternating_boards" => ColorAllocation::AlternatingBoards,
        "alternating_rounds" => ColorAllocation::AlternatingRounds,
        "balanced_rotation" => ColorAllocation::BalancedRotation,
        "fixed_boards" => ColorAllocation::FixedBoards,
        _ => {
            return Err(crate::pawn::common::error::PawnError::InvalidInput(
                "Invalid color allocation".to_string(),
            ));
        }
    };

    let board_order_policy = match config.board_order_policy.as_str() {
        "rating_descending" => BoardOrderPolicy::RatingDescending,
        "rating_ascending" => BoardOrderPolicy::RatingAscending,
        "captain_choice" => BoardOrderPolicy::CaptainChoice,
        "flexible" => BoardOrderPolicy::Flexible,
        _ => {
            return Err(crate::pawn::common::error::PawnError::InvalidInput(
                "Invalid board order policy".to_string(),
            ));
        }
    };

    let internal_config = TeamPairingConfig {
        pairing_method,
        color_allocation,
        board_order_policy,
        allow_team_vs_team: config.allow_team_vs_team,
        prevent_early_rematches: config.prevent_early_rematches,
        max_score_difference: config.max_score_difference,
        prefer_balanced_matches: config.prefer_balanced_matches,
    };

    // Create team pairing engine
    let team_pairing_engine = TeamPairingEngine::new(state.team_service.get_db().clone());

    // Generate pairings
    let result = team_pairing_engine
        .generate_team_pairings(tournament_id, round_number, internal_config)
        .await?;

    // Convert result to DTO
    let dto_result = TeamPairingResultDto {
        team_matches: result.team_matches,
        individual_pairings: result.individual_pairings,
        bye_team: result.bye_team,
        pairing_quality: PairingQualityDto {
            color_balance_score: result.pairing_quality.color_balance_score,
            rating_balance_score: result.pairing_quality.rating_balance_score,
            rematch_avoidance_score: result.pairing_quality.rematch_avoidance_score,
            overall_quality: result.pairing_quality.overall_quality,
        },
    };

    Ok(dto_result)
}

#[instrument(ret, skip(_state))]
#[tauri::command]
#[specta::specta]
pub async fn get_team_pairing_config_default(
    _state: State<'_, PawnState>,
) -> CommandResult<TeamPairingConfigDto> {
    let default_config = TeamPairingConfigDto {
        pairing_method: "swiss".to_string(),
        color_allocation: "alternating_boards".to_string(),
        board_order_policy: "rating_descending".to_string(),
        allow_team_vs_team: true,
        prevent_early_rematches: true,
        max_score_difference: Some(1.0),
        prefer_balanced_matches: true,
    };

    Ok(default_config)
}

#[instrument(ret, skip(_state))]
#[tauri::command]
#[specta::specta]
pub async fn validate_team_pairing_config(
    _state: State<'_, PawnState>,
    config: TeamPairingConfigDto,
) -> CommandResult<bool> {
    // Validate pairing method
    match config.pairing_method.as_str() {
        "swiss" | "round_robin" | "scheveningen" | "knockout" | "double_round_robin" => {}
        _ => {
            return Err(crate::pawn::common::error::PawnError::InvalidInput(
                "Invalid pairing method".to_string(),
            ));
        }
    }

    // Validate color allocation
    match config.color_allocation.as_str() {
        "alternating_boards" | "alternating_rounds" | "balanced_rotation" | "fixed_boards" => {}
        _ => {
            return Err(crate::pawn::common::error::PawnError::InvalidInput(
                "Invalid color allocation".to_string(),
            ));
        }
    }

    // Validate board order policy
    match config.board_order_policy.as_str() {
        "rating_descending" | "rating_ascending" | "captain_choice" | "flexible" => {}
        _ => {
            return Err(crate::pawn::common::error::PawnError::InvalidInput(
                "Invalid board order policy".to_string(),
            ));
        }
    }

    // Validate score difference
    if let Some(diff) = config.max_score_difference {
        if !(0.0..=10.0).contains(&diff) {
            return Err(crate::pawn::common::error::PawnError::InvalidInput(
                "Max score difference must be between 0.0 and 10.0".to_string(),
            ));
        }
    }

    Ok(true)
}

// =====================================================
// Team Scoring Commands
// =====================================================

/// Team scoring configuration for commands
#[allow(dead_code)]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct TeamScoringConfigDto {
    pub scoring_system: String, // "match_points", "board_points", "olympic_points", "custom_points"
    pub match_points_win: f64,
    pub match_points_draw: f64,
    pub match_points_loss: f64,
    pub board_weight_system: String, // "equal", "descending", "ascending"
    pub tiebreak_criteria: Vec<String>, // ["match_points", "board_points", "direct_encounter", etc.]
    pub olympic_scoring: bool,
    pub minimum_games_for_board_points: i32,
}

/// Team standings result for commands
#[allow(dead_code)]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct TeamStandingsResultDto {
    pub standings: Vec<ExtendedTeamStandingDto>,
    pub tiebreak_explanations: std::collections::HashMap<i32, String>,
    pub scoring_config: TeamScoringConfigDto,
}

/// Extended team standing for commands
#[allow(dead_code)]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct ExtendedTeamStandingDto {
    pub team: Team,
    pub points: f64,
    pub match_points: f64,
    pub board_points: f64,
    pub games_played: i32,
    pub matches_won: i32,
    pub matches_drawn: i32,
    pub matches_lost: i32,
    pub players: Vec<crate::pawn::domain::model::Player>,
    pub tiebreak_scores: std::collections::HashMap<String, f64>,
}

#[instrument(ret, skip(state))]
#[tauri::command]
#[specta::specta]
pub async fn calculate_team_standings(
    state: State<'_, PawnState>,
    tournament_id: i32,
    config: TeamScoringConfigDto,
) -> CommandResult<TeamStandingsResultDto> {
    // Convert DTO to internal config
    let scoring_system = match config.scoring_system.as_str() {
        "match_points" => TeamScoringSystem::MatchPoints,
        "board_points" => TeamScoringSystem::BoardPoints,
        "olympic_points" => TeamScoringSystem::OlympicPoints,
        "custom_points" => TeamScoringSystem::CustomPoints,
        _ => {
            return Err(crate::pawn::common::error::PawnError::InvalidInput(
                "Invalid scoring system".to_string(),
            ));
        }
    };

    let board_weight_system = match config.board_weight_system.as_str() {
        "equal" => crate::pawn::service::team_scoring::BoardWeightSystem::Equal,
        "descending" => crate::pawn::service::team_scoring::BoardWeightSystem::Descending,
        "ascending" => crate::pawn::service::team_scoring::BoardWeightSystem::Ascending,
        _ => {
            return Err(crate::pawn::common::error::PawnError::InvalidInput(
                "Invalid board weight system".to_string(),
            ));
        }
    };

    let mut tiebreak_criteria = Vec::new();
    for criterion_str in &config.tiebreak_criteria {
        let criterion = match criterion_str.as_str() {
            "match_points" => TeamTiebreakCriterion::MatchPoints,
            "board_points" => TeamTiebreakCriterion::BoardPoints,
            "direct_encounter" => TeamTiebreakCriterion::DirectEncounter,
            "sonneborn_berger" => TeamTiebreakCriterion::SonnebornBerger,
            "average_opponent_rating" => TeamTiebreakCriterion::AverageOpponentRating,
            "board_count_tiebreak" => TeamTiebreakCriterion::BoardCountTiebreak,
            "captain_board" => TeamTiebreakCriterion::CaptainBoard,
            "match_wins" => TeamTiebreakCriterion::MatchWins,
            "draw_count" => TeamTiebreakCriterion::DrawCount,
            _ => {
                return Err(crate::pawn::common::error::PawnError::InvalidInput(
                    format!("Invalid tiebreak criterion: {criterion_str}"),
                ));
            }
        };
        tiebreak_criteria.push(criterion);
    }

    let internal_config = TeamScoringConfig {
        scoring_system,
        match_points_win: config.match_points_win,
        match_points_draw: config.match_points_draw,
        match_points_loss: config.match_points_loss,
        board_weight_system,
        tiebreak_criteria,
        olympic_scoring: config.olympic_scoring,
        minimum_games_for_board_points: config.minimum_games_for_board_points,
    };

    // Create team scoring service
    let team_scoring_service = TeamScoringService::new(state.team_service.get_db().clone());

    // Calculate standings
    let result = team_scoring_service
        .calculate_team_standings(tournament_id, internal_config)
        .await?;

    // Convert result to DTO
    let standings_dto: Vec<ExtendedTeamStandingDto> = result
        .standings
        .into_iter()
        .map(|standing| ExtendedTeamStandingDto {
            team: standing.team,
            points: standing.points,
            match_points: standing.match_points,
            board_points: standing.board_points,
            games_played: standing.games_played,
            matches_won: standing.matches_won,
            matches_drawn: standing.matches_drawn,
            matches_lost: standing.matches_lost,
            players: standing.players,
            tiebreak_scores: standing.tiebreak_scores,
        })
        .collect();

    let dto_result = TeamStandingsResultDto {
        standings: standings_dto,
        tiebreak_explanations: result.tiebreak_explanations,
        scoring_config: config,
    };

    Ok(dto_result)
}

#[instrument(ret, skip(_state))]
#[tauri::command]
#[specta::specta]
pub async fn get_team_scoring_config_default(
    _state: State<'_, PawnState>,
) -> CommandResult<TeamScoringConfigDto> {
    let default_config = TeamScoringConfigDto {
        scoring_system: "olympic_points".to_string(),
        match_points_win: 2.0,
        match_points_draw: 1.0,
        match_points_loss: 0.0,
        board_weight_system: "equal".to_string(),
        tiebreak_criteria: vec![
            "match_points".to_string(),
            "board_points".to_string(),
            "direct_encounter".to_string(),
            "sonneborn_berger".to_string(),
        ],
        olympic_scoring: true,
        minimum_games_for_board_points: 4,
    };

    Ok(default_config)
}

#[instrument(ret, skip(_state))]
#[tauri::command]
#[specta::specta]
pub async fn validate_team_scoring_config(
    _state: State<'_, PawnState>,
    config: TeamScoringConfigDto,
) -> CommandResult<bool> {
    // Validate scoring system
    match config.scoring_system.as_str() {
        "match_points" | "board_points" | "olympic_points" | "custom_points" => {}
        _ => {
            return Err(crate::pawn::common::error::PawnError::InvalidInput(
                "Invalid scoring system".to_string(),
            ));
        }
    }

    // Validate board weight system
    match config.board_weight_system.as_str() {
        "equal" | "descending" | "ascending" => {}
        _ => {
            return Err(crate::pawn::common::error::PawnError::InvalidInput(
                "Invalid board weight system".to_string(),
            ));
        }
    }

    // Validate tiebreak criteria
    for criterion in &config.tiebreak_criteria {
        match criterion.as_str() {
            "match_points"
            | "board_points"
            | "direct_encounter"
            | "sonneborn_berger"
            | "average_opponent_rating"
            | "board_count_tiebreak"
            | "captain_board"
            | "match_wins"
            | "draw_count" => {}
            _ => {
                return Err(crate::pawn::common::error::PawnError::InvalidInput(
                    format!("Invalid tiebreak criterion: {criterion}"),
                ));
            }
        }
    }

    // Validate point values
    if config.match_points_win < 0.0
        || config.match_points_draw < 0.0
        || config.match_points_loss < 0.0
    {
        return Err(crate::pawn::common::error::PawnError::InvalidInput(
            "Match points must be non-negative".to_string(),
        ));
    }

    if config.minimum_games_for_board_points < 0 {
        return Err(crate::pawn::common::error::PawnError::InvalidInput(
            "Minimum games for board points must be non-negative".to_string(),
        ));
    }

    Ok(true)
}

// =====================================================
// Tests
// =====================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pawn::db::sqlite::SqliteDb;
    use sqlx::SqlitePool;
    use tempfile::TempDir;

    async fn setup_test_state() -> PawnState {
        let temp_dir = TempDir::new().unwrap();

        // Use in-memory SQLite for testing
        let database_url = "sqlite::memory:";
        let pool = SqlitePool::connect(database_url).await.unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        let db = Arc::new(SqliteDb::new(pool.clone()));

        use crate::pawn::service::{
            export::ExportService, norm_calculation::NormCalculationService, player::PlayerService,
            realtime_standings::RealTimeStandingsService, round::RoundService,
            round_robin_analysis::RoundRobinAnalysisService, settings::SettingsService,
            swiss_analysis::SwissAnalysisService, team::TeamService, tiebreak::TiebreakCalculator,
            time_control::TimeControlService, tournament::TournamentService,
        };
        use crate::pawn::state::State;
        use std::sync::Arc;

        let tournament_service = Arc::new(TournamentService::new(Arc::clone(&db)));
        let tiebreak_calculator = Arc::new(TiebreakCalculator::new(Arc::clone(&db)));
        let realtime_standings_service = Arc::new(RealTimeStandingsService::new(
            Arc::clone(&db),
            Arc::clone(&tiebreak_calculator),
        ));
        let round_service = Arc::new(RoundService::new(Arc::clone(&db)));
        let player_service = Arc::new(PlayerService::new(Arc::clone(&db)));
        let time_control_service = Arc::new(TimeControlService::new(Arc::clone(&db)));
        let swiss_analysis_service = Arc::new(SwissAnalysisService::new(Arc::clone(&db)));
        let round_robin_analysis_service =
            Arc::new(RoundRobinAnalysisService::new(Arc::clone(&db)));
        let export_service = Arc::new(ExportService::new(
            Arc::clone(&db),
            Arc::clone(&tiebreak_calculator),
            temp_dir.path().join("exports"),
        ));
        let norm_calculation_service = Arc::new(NormCalculationService::new(
            Arc::clone(&db),
            Arc::clone(&tiebreak_calculator),
        ));
        let team_service = Arc::new(TeamService::new(Arc::clone(&db)));
        let settings_service = Arc::new(SettingsService::new(Arc::new(pool)));

        State {
            app_data_dir: temp_dir.path().to_path_buf(),
            db,
            tournament_service,
            tiebreak_calculator,
            realtime_standings_service,
            round_service,
            player_service,
            time_control_service,
            swiss_analysis_service,
            round_robin_analysis_service,
            export_service,
            norm_calculation_service,
            team_service,
            settings_service,
        }
    }

    #[tokio::test]
    async fn command_create_team_contract() {
        let state = setup_test_state().await;

        // Test the underlying service directly to validate the command contract
        let create_data = CreateTeam {
            tournament_id: 1,
            name: "Test Team".to_string(),
            captain: Some("Test Captain".to_string()),
            description: Some("Test Description".to_string()),
            color: Some("#FF0000".to_string()),
            club_affiliation: Some("Test Club".to_string()),
            contact_email: Some("test@example.com".to_string()),
            contact_phone: Some("123-456-7890".to_string()),
            max_board_count: 4,
        };

        // Note: This will fail because tournament doesn't exist, but tests the contract
        let result = state.team_service.create_team(create_data).await;
        assert!(result.is_err()); // Expected to fail due to missing tournament
    }

    #[tokio::test]
    async fn command_get_teams_by_tournament_contract() {
        let state = setup_test_state().await;

        // Test the underlying service directly to validate the command contract
        let result = state.team_service.get_teams_by_tournament(1).await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[tokio::test]
    async fn command_search_teams_contract() {
        let state = setup_test_state().await;

        let filters = TeamSearchFilters {
            tournament_id: 1,
            name: Some("Test".to_string()),
            status: Some("active".to_string()),
            captain: None,
            club_affiliation: None,
            min_members: None,
            max_members: None,
            has_captain: None,
            limit: Some(10),
            offset: Some(0),
        };

        let result = state.team_service.search_teams(filters).await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[tokio::test]
    async fn command_get_team_by_id_contract() {
        let state = setup_test_state().await;

        // Test the underlying service directly to validate the command contract
        let result = state.team_service.get_team_by_id(999).await;
        assert!(result.is_err()); // Expected to fail due to missing team
    }

    #[tokio::test]
    async fn command_get_team_memberships_contract() {
        let state = setup_test_state().await;

        // Test the underlying service directly to validate the command contract
        let result = state.team_service.get_team_memberships(1).await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[tokio::test]
    async fn command_get_team_matches_contract() {
        let state = setup_test_state().await;

        // Test the underlying service directly to validate the command contract
        let result = state.team_service.get_team_matches(1, None).await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[tokio::test]
    async fn command_get_team_lineups_contract() {
        let state = setup_test_state().await;

        // Test the underlying service directly to validate the command contract
        let result = state.team_service.get_team_lineups(1, 1).await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }
}
