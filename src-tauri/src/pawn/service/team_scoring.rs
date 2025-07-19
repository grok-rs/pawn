#![allow(dead_code)]

use crate::pawn::{
    common::error::PawnError,
    db::Db,
    domain::model::{Game, Player, Team, TeamMatch},
};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{info, instrument};

/// Team scoring service that handles match points, board points, and tiebreaks
pub struct TeamScoringService<D> {
    db: Arc<D>,
}

/// Team scoring configuration
#[derive(Debug, Clone)]
pub struct TeamScoringConfig {
    pub scoring_system: TeamScoringSystem,
    pub match_points_win: f64,
    pub match_points_draw: f64,
    pub match_points_loss: f64,
    pub board_weight_system: BoardWeightSystem,
    pub tiebreak_criteria: Vec<TeamTiebreakCriterion>,
    pub olympic_scoring: bool,
    pub minimum_games_for_board_points: i32,
}

/// Different team scoring systems
#[derive(Debug, Clone)]
#[allow(clippy::enum_variant_names)]
pub enum TeamScoringSystem {
    MatchPoints,   // 2 points for match win, 1 for draw, 0 for loss
    BoardPoints,   // Sum of individual board points
    OlympicPoints, // Match points first, then board points as tiebreaker
    CustomPoints,  // Custom point allocation
}

/// Board weight systems for calculating team scores
#[derive(Debug, Clone)]
pub enum BoardWeightSystem {
    Equal,            // All boards have equal weight
    Descending,       // Board 1 has highest weight, descending
    Ascending,        // Board 1 has lowest weight, ascending
    Custom(Vec<f64>), // Custom weights for each board
}

/// Tiebreak criteria for team standings
#[derive(Debug, Clone)]
pub enum TeamTiebreakCriterion {
    MatchPoints,           // Total match points
    BoardPoints,           // Total board points
    DirectEncounter,       // Head-to-head results
    SonnebornBerger,       // Weighted opponent score
    AverageOpponentRating, // Average rating of opponents
    BoardCountTiebreak,    // Most wins on individual boards
    CaptainBoard,          // Result on captain's board (board 1)
    MatchWins,             // Number of match wins
    DrawCount,             // Number of draws (fewer is better)
}

/// Team match result for scoring
#[derive(Debug, Clone)]
pub struct TeamMatchResult {
    pub team_match: TeamMatch,
    pub board_results: Vec<BoardResult>,
    pub team_a_match_points: f64,
    pub team_b_match_points: f64,
    pub team_a_board_points: f64,
    pub team_b_board_points: f64,
}

/// Individual board result within a team match
#[derive(Debug, Clone)]
pub struct BoardResult {
    pub board_number: i32,
    pub white_player: Player,
    pub black_player: Player,
    pub result: GameResult,
    pub white_team_id: i32,
    pub black_team_id: i32,
}

/// Game result for individual boards
#[derive(Debug, Clone)]
pub enum GameResult {
    WhiteWin,
    BlackWin,
    Draw,
    WhiteForfeit,
    BlackForfeit,
    DoubleForfeit,
    NotPlayed,
}

/// Team score breakdown
#[derive(Debug, Clone)]
pub struct TeamScoreBreakdown {
    pub team: Team,
    pub match_points: f64,
    pub board_points: f64,
    pub total_score: f64,
    pub match_wins: i32,
    pub match_draws: i32,
    pub match_losses: i32,
    pub board_wins: i32,
    pub board_draws: i32,
    pub board_losses: i32,
    pub games_played: i32,
    pub opponents_faced: Vec<i32>,
    pub average_opponent_rating: f64,
    pub tiebreak_scores: HashMap<String, f64>,
}

/// Extended team standing with tiebreak scores
#[derive(Debug, Clone)]
pub struct ExtendedTeamStanding {
    pub team: Team,
    pub points: f64,
    pub match_points: f64,
    pub board_points: f64,
    pub games_played: i32,
    pub matches_won: i32,
    pub matches_drawn: i32,
    pub matches_lost: i32,
    pub players: Vec<Player>,
    pub tiebreak_scores: HashMap<String, f64>,
}

/// Team standings with tiebreaks
#[derive(Debug, Clone)]
pub struct TeamStandingsResult {
    pub standings: Vec<ExtendedTeamStanding>,
    pub tiebreak_explanations: HashMap<i32, String>,
    pub scoring_config: TeamScoringConfig,
}

impl<D: Db> TeamScoringService<D> {
    pub fn new(db: Arc<D>) -> Self {
        Self { db }
    }

    /// Calculate team standings for a tournament
    #[instrument(skip(self))]
    pub async fn calculate_team_standings(
        &self,
        tournament_id: i32,
        config: TeamScoringConfig,
    ) -> Result<TeamStandingsResult, PawnError> {
        info!(
            "Calculating team standings for tournament {}",
            tournament_id
        );

        // Get all teams, matches, and games for the tournament
        let teams = self.db.get_teams_by_tournament(tournament_id).await?;
        let team_matches = self.db.get_team_matches(tournament_id, None).await?;
        let all_games = self.db.get_games_by_tournament(tournament_id).await?;

        // Calculate scores for each team
        let mut team_scores = HashMap::new();
        for team in &teams {
            let score_breakdown = self
                .calculate_team_score_breakdown(team, &team_matches, &all_games, &config)
                .await?;
            team_scores.insert(team.id, score_breakdown);
        }

        // Create standings based on scoring system
        let mut standings = Vec::new();
        for score_breakdown in team_scores.values() {
            let standing = ExtendedTeamStanding {
                team: score_breakdown.team.clone(),
                points: score_breakdown.total_score,
                match_points: score_breakdown.match_points,
                board_points: score_breakdown.board_points,
                games_played: score_breakdown.games_played,
                matches_won: score_breakdown.match_wins,
                matches_drawn: score_breakdown.match_draws,
                matches_lost: score_breakdown.match_losses,
                players: Vec::new(), // Will be populated later if needed
                tiebreak_scores: score_breakdown.tiebreak_scores.clone(),
            };
            standings.push(standing);
        }

        // Apply tiebreaks and sort standings
        self.apply_tiebreaks(&mut standings, &team_scores, &config)?;

        // Generate tiebreak explanations
        let tiebreak_explanations = self.generate_tiebreak_explanations(&standings, &config);

        Ok(TeamStandingsResult {
            standings,
            tiebreak_explanations,
            scoring_config: config,
        })
    }

    /// Calculate detailed score breakdown for a team
    async fn calculate_team_score_breakdown(
        &self,
        team: &Team,
        team_matches: &[TeamMatch],
        all_games: &[Game],
        config: &TeamScoringConfig,
    ) -> Result<TeamScoreBreakdown, PawnError> {
        let mut match_points = 0.0;
        let mut board_points = 0.0;
        let mut match_wins = 0;
        let mut match_draws = 0;
        let mut match_losses = 0;
        let mut board_wins = 0;
        let mut board_draws = 0;
        let mut board_losses = 0;
        let mut games_played = 0;
        let mut opponents_faced = Vec::new();

        // Process each team match
        for team_match in team_matches {
            if team_match.team_a_id == team.id || team_match.team_b_id == team.id {
                let is_team_a = team_match.team_a_id == team.id;
                let opponent_id = if is_team_a {
                    team_match.team_b_id
                } else {
                    team_match.team_a_id
                };

                opponents_faced.push(opponent_id);

                // Calculate match result
                let (team_match_points, team_board_points, match_result) = self
                    .calculate_match_result(team_match, all_games, team.id, config)
                    .await?;

                match_points += team_match_points;
                board_points += team_board_points;

                // Update match statistics
                match match_result {
                    MatchResult::Win => match_wins += 1,
                    MatchResult::Draw => match_draws += 1,
                    MatchResult::Loss => match_losses += 1,
                }

                // Count individual board results
                let board_results = self
                    .get_board_results_for_match(team_match, all_games, team.id)
                    .await?;
                for board_result in &board_results {
                    games_played += 1;
                    match &board_result.result {
                        GameResult::WhiteWin => {
                            if board_result.white_team_id == team.id {
                                board_wins += 1;
                            } else {
                                board_losses += 1;
                            }
                        }
                        GameResult::BlackWin => {
                            if board_result.black_team_id == team.id {
                                board_wins += 1;
                            } else {
                                board_losses += 1;
                            }
                        }
                        GameResult::Draw => board_draws += 1,
                        GameResult::WhiteForfeit => {
                            if board_result.white_team_id == team.id {
                                board_losses += 1;
                            } else {
                                board_wins += 1;
                            }
                        }
                        GameResult::BlackForfeit => {
                            if board_result.black_team_id == team.id {
                                board_losses += 1;
                            } else {
                                board_wins += 1;
                            }
                        }
                        _ => {} // NotPlayed, DoubleForfeit don't count
                    }
                }
            }
        }

        // Calculate total score based on scoring system
        let total_score = match config.scoring_system {
            TeamScoringSystem::MatchPoints => match_points,
            TeamScoringSystem::BoardPoints => board_points,
            TeamScoringSystem::OlympicPoints => match_points, // Board points used as tiebreaker
            TeamScoringSystem::CustomPoints => match_points + (board_points * 0.1), // Example custom
        };

        // Calculate average opponent rating
        let average_opponent_rating = self
            .calculate_average_opponent_rating(&opponents_faced, team_matches)
            .await?;

        // Calculate tiebreak scores
        let tiebreak_scores = self
            .calculate_tiebreak_scores(
                team,
                team_matches,
                all_games,
                &config.tiebreak_criteria,
                &opponents_faced,
            )
            .await?;

        Ok(TeamScoreBreakdown {
            team: team.clone(),
            match_points,
            board_points,
            total_score,
            match_wins,
            match_draws,
            match_losses,
            board_wins,
            board_draws,
            board_losses,
            games_played,
            opponents_faced,
            average_opponent_rating,
            tiebreak_scores,
        })
    }

    /// Calculate the result of a specific team match
    async fn calculate_match_result(
        &self,
        team_match: &TeamMatch,
        all_games: &[Game],
        team_id: i32,
        config: &TeamScoringConfig,
    ) -> Result<(f64, f64, MatchResult), PawnError> {
        let board_results = self
            .get_board_results_for_match(team_match, all_games, team_id)
            .await?;

        let mut team_board_points = 0.0;
        let mut opponent_board_points = 0.0;

        // Calculate board points for each team
        for board_result in &board_results {
            let (white_points, black_points) = self.get_game_points(&board_result.result);

            if board_result.white_team_id == team_id {
                team_board_points += white_points;
                opponent_board_points += black_points;
            } else {
                team_board_points += black_points;
                opponent_board_points += white_points;
            }
        }

        // Determine match result
        let match_result = if team_board_points > opponent_board_points {
            MatchResult::Win
        } else if team_board_points < opponent_board_points {
            MatchResult::Loss
        } else {
            MatchResult::Draw
        };

        // Calculate match points
        let match_points = match match_result {
            MatchResult::Win => config.match_points_win,
            MatchResult::Draw => config.match_points_draw,
            MatchResult::Loss => config.match_points_loss,
        };

        Ok((match_points, team_board_points, match_result))
    }

    /// Get board results for a specific team match
    async fn get_board_results_for_match(
        &self,
        team_match: &TeamMatch,
        all_games: &[Game],
        _team_id: i32,
    ) -> Result<Vec<BoardResult>, PawnError> {
        let mut board_results = Vec::new();

        // Find games for this match
        let match_games: Vec<&Game> = all_games
            .iter()
            .filter(|game| game.round_number == team_match.round_number)
            .collect();

        // Get team memberships to determine which players belong to which team
        let team_a_members = self.db.get_team_memberships(team_match.team_a_id).await?;
        let team_b_members = self.db.get_team_memberships(team_match.team_b_id).await?;

        for game in match_games {
            // Determine if this game involves players from both teams
            let white_in_team_a = team_a_members
                .iter()
                .any(|m| m.player_id == game.white_player_id);
            let white_in_team_b = team_b_members
                .iter()
                .any(|m| m.player_id == game.white_player_id);

            let black_in_team_a = team_a_members
                .iter()
                .any(|m| m.player_id == game.black_player_id);
            let black_in_team_b = team_b_members
                .iter()
                .any(|m| m.player_id == game.black_player_id);

            // Check if this is a team match game (one player from each team)
            if (white_in_team_a && black_in_team_b) || (white_in_team_b && black_in_team_a) {
                let white_team_id = if white_in_team_a {
                    team_match.team_a_id
                } else {
                    team_match.team_b_id
                };
                let black_team_id = if black_in_team_a {
                    team_match.team_a_id
                } else {
                    team_match.team_b_id
                };

                let game_result = self.convert_game_result(game);

                // Get actual player objects
                let white_player = self
                    .db
                    .get_player(game.white_player_id)
                    .await
                    .unwrap_or_else(|_| {
                        // Create dummy player if not found
                        Player {
                            id: game.white_player_id,
                            tournament_id: game.tournament_id,
                            name: format!("Player {}", game.white_player_id),
                            rating: None,
                            country_code: None,
                            title: None,
                            birth_date: None,
                            gender: None,
                            email: None,
                            phone: None,
                            club: None,
                            status: "active".to_string(),
                            seed_number: None,
                            pairing_number: None,
                            initial_rating: None,
                            created_at: chrono::Utc::now().to_rfc3339(),
                            updated_at: Some(chrono::Utc::now().to_rfc3339()),
                        }
                    });

                let black_player = self
                    .db
                    .get_player(game.black_player_id)
                    .await
                    .unwrap_or_else(|_| {
                        // Create dummy player if not found
                        Player {
                            id: game.black_player_id,
                            tournament_id: game.tournament_id,
                            name: format!("Player {}", game.black_player_id),
                            rating: None,
                            country_code: None,
                            title: None,
                            birth_date: None,
                            gender: None,
                            email: None,
                            phone: None,
                            club: None,
                            status: "active".to_string(),
                            seed_number: None,
                            pairing_number: None,
                            initial_rating: None,
                            created_at: chrono::Utc::now().to_rfc3339(),
                            updated_at: Some(chrono::Utc::now().to_rfc3339()),
                        }
                    });

                board_results.push(BoardResult {
                    board_number: 0, // Game doesn't have board_number in the current model
                    white_player,
                    black_player,
                    result: game_result,
                    white_team_id,
                    black_team_id,
                });
            }
        }

        // Sort by board number
        board_results.sort_by_key(|br| br.board_number);

        Ok(board_results)
    }

    /// Convert game result to team scoring format
    fn convert_game_result(&self, game: &Game) -> GameResult {
        match game.result.as_str() {
            "1-0" => GameResult::WhiteWin,
            "0-1" => GameResult::BlackWin,
            "1/2-1/2" => GameResult::Draw,
            "1-0 (forfeit)" => GameResult::BlackForfeit,
            "0-1 (forfeit)" => GameResult::WhiteForfeit,
            "0-0 (forfeit)" => GameResult::DoubleForfeit,
            "*" => GameResult::NotPlayed,
            "" => GameResult::NotPlayed,
            _ => GameResult::NotPlayed,
        }
    }

    /// Get points for a game result
    fn get_game_points(&self, result: &GameResult) -> (f64, f64) {
        match result {
            GameResult::WhiteWin => (1.0, 0.0),
            GameResult::BlackWin => (0.0, 1.0),
            GameResult::Draw => (0.5, 0.5),
            GameResult::WhiteForfeit => (0.0, 1.0),
            GameResult::BlackForfeit => (1.0, 0.0),
            GameResult::DoubleForfeit => (0.0, 0.0),
            GameResult::NotPlayed => (0.0, 0.0),
        }
    }

    /// Calculate average opponent rating
    async fn calculate_average_opponent_rating(
        &self,
        opponent_ids: &[i32],
        _team_matches: &[TeamMatch],
    ) -> Result<f64, PawnError> {
        if opponent_ids.is_empty() {
            return Ok(0.0);
        }

        let mut total_rating = 0.0;
        let mut count = 0;

        for &opponent_id in opponent_ids {
            // Get opponent team members and calculate average rating
            let opponent_members = self.db.get_team_memberships(opponent_id).await?;
            let opponent_ratings: Vec<i32> = opponent_members
                .iter()
                .filter_map(|m| m.rating_at_assignment)
                .collect();

            if !opponent_ratings.is_empty() {
                let opponent_avg: f64 =
                    opponent_ratings.iter().sum::<i32>() as f64 / opponent_ratings.len() as f64;
                total_rating += opponent_avg;
                count += 1;
            }
        }

        if count > 0 {
            Ok(total_rating / count as f64)
        } else {
            Ok(0.0)
        }
    }

    /// Calculate tiebreak scores
    async fn calculate_tiebreak_scores(
        &self,
        team: &Team,
        team_matches: &[TeamMatch],
        all_games: &[Game],
        tiebreak_criteria: &[TeamTiebreakCriterion],
        opponent_ids: &[i32],
    ) -> Result<HashMap<String, f64>, PawnError> {
        let mut tiebreak_scores = HashMap::new();

        for criterion in tiebreak_criteria {
            let score = match criterion {
                TeamTiebreakCriterion::MatchPoints => {
                    // Already calculated in main scoring
                    0.0
                }
                TeamTiebreakCriterion::BoardPoints => {
                    // Already calculated in main scoring
                    0.0
                }
                TeamTiebreakCriterion::DirectEncounter => {
                    self.calculate_direct_encounter_score(team.id, team_matches, all_games)
                        .await?
                }
                TeamTiebreakCriterion::SonnebornBerger => {
                    self.calculate_sonneborn_berger_score(team.id, team_matches, opponent_ids)
                        .await?
                }
                TeamTiebreakCriterion::AverageOpponentRating => {
                    self.calculate_average_opponent_rating(opponent_ids, team_matches)
                        .await?
                }
                TeamTiebreakCriterion::BoardCountTiebreak => {
                    self.calculate_board_count_tiebreak(team.id, team_matches, all_games)
                        .await?
                }
                TeamTiebreakCriterion::CaptainBoard => {
                    self.calculate_captain_board_score(team.id, team_matches, all_games)
                        .await?
                }
                TeamTiebreakCriterion::MatchWins => {
                    self.calculate_match_wins(team.id, team_matches, all_games)
                        .await?
                }
                TeamTiebreakCriterion::DrawCount => {
                    self.calculate_draw_count(team.id, team_matches, all_games)
                        .await?
                }
            };

            tiebreak_scores.insert(format!("{criterion:?}"), score);
        }

        Ok(tiebreak_scores)
    }

    /// Calculate direct encounter score (head-to-head)
    async fn calculate_direct_encounter_score(
        &self,
        _team_id: i32,
        _team_matches: &[TeamMatch],
        _all_games: &[Game],
    ) -> Result<f64, PawnError> {
        // This would need to be implemented based on specific tied teams
        // For now, return 0.0 as placeholder
        Ok(0.0)
    }

    /// Calculate Sonneborn-Berger score for teams
    async fn calculate_sonneborn_berger_score(
        &self,
        _team_id: i32,
        _team_matches: &[TeamMatch],
        _opponent_ids: &[i32],
    ) -> Result<f64, PawnError> {
        // Sonneborn-Berger: sum of opponent scores weighted by game results
        // This is a simplified implementation
        Ok(0.0)
    }

    /// Calculate board count tiebreak
    async fn calculate_board_count_tiebreak(
        &self,
        team_id: i32,
        team_matches: &[TeamMatch],
        all_games: &[Game],
    ) -> Result<f64, PawnError> {
        // Count individual board wins
        let mut board_wins = 0.0;

        for team_match in team_matches {
            if team_match.team_a_id == team_id || team_match.team_b_id == team_id {
                let board_results = self
                    .get_board_results_for_match(team_match, all_games, team_id)
                    .await?;
                for board_result in &board_results {
                    match &board_result.result {
                        GameResult::WhiteWin => {
                            if board_result.white_team_id == team_id {
                                board_wins += 1.0;
                            }
                        }
                        GameResult::BlackWin => {
                            if board_result.black_team_id == team_id {
                                board_wins += 1.0;
                            }
                        }
                        _ => {}
                    }
                }
            }
        }

        Ok(board_wins)
    }

    /// Calculate captain board score (board 1 performance)
    async fn calculate_captain_board_score(
        &self,
        team_id: i32,
        team_matches: &[TeamMatch],
        all_games: &[Game],
    ) -> Result<f64, PawnError> {
        let mut captain_score = 0.0;

        for team_match in team_matches {
            if team_match.team_a_id == team_id || team_match.team_b_id == team_id {
                let board_results = self
                    .get_board_results_for_match(team_match, all_games, team_id)
                    .await?;

                // Find board 1 result
                for board_result in &board_results {
                    if board_result.board_number == 1 {
                        let (white_points, black_points) =
                            self.get_game_points(&board_result.result);
                        captain_score += if board_result.white_team_id == team_id {
                            white_points
                        } else {
                            black_points
                        };
                        break;
                    }
                }
            }
        }

        Ok(captain_score)
    }

    /// Calculate match wins
    async fn calculate_match_wins(
        &self,
        team_id: i32,
        team_matches: &[TeamMatch],
        _all_games: &[Game],
    ) -> Result<f64, PawnError> {
        let mut match_wins = 0.0;

        for team_match in team_matches {
            if team_match.team_a_id == team_id || team_match.team_b_id == team_id {
                let is_team_a = team_match.team_a_id == team_id;
                let team_match_points = if is_team_a {
                    team_match.team_a_match_points
                } else {
                    team_match.team_b_match_points
                };
                let opponent_match_points = if is_team_a {
                    team_match.team_b_match_points
                } else {
                    team_match.team_a_match_points
                };

                if team_match_points > opponent_match_points {
                    match_wins += 1.0;
                }
            }
        }

        Ok(match_wins)
    }

    /// Calculate draw count (fewer is better)
    async fn calculate_draw_count(
        &self,
        team_id: i32,
        team_matches: &[TeamMatch],
        _all_games: &[Game],
    ) -> Result<f64, PawnError> {
        let mut draw_count = 0.0;

        for team_match in team_matches {
            if team_match.team_a_id == team_id || team_match.team_b_id == team_id {
                let is_team_a = team_match.team_a_id == team_id;
                let team_match_points = if is_team_a {
                    team_match.team_a_match_points
                } else {
                    team_match.team_b_match_points
                };
                let opponent_match_points = if is_team_a {
                    team_match.team_b_match_points
                } else {
                    team_match.team_a_match_points
                };

                if (team_match_points - opponent_match_points).abs() < 0.001 {
                    draw_count += 1.0;
                }
            }
        }

        Ok(draw_count)
    }

    /// Apply tiebreaks to sort standings
    fn apply_tiebreaks(
        &self,
        standings: &mut [ExtendedTeamStanding],
        team_scores: &HashMap<i32, TeamScoreBreakdown>,
        config: &TeamScoringConfig,
    ) -> Result<(), PawnError> {
        standings.sort_by(|a, b| {
            // Primary sort: total score (descending)
            b.points
                .partial_cmp(&a.points)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| {
                    // Apply tiebreak criteria in order
                    for criterion in &config.tiebreak_criteria {
                        let a_score = self.get_tiebreak_score(a, criterion, team_scores);
                        let b_score = self.get_tiebreak_score(b, criterion, team_scores);

                        let cmp = match criterion {
                            TeamTiebreakCriterion::DrawCount => {
                                // Fewer draws is better
                                a_score
                                    .partial_cmp(&b_score)
                                    .unwrap_or(std::cmp::Ordering::Equal)
                            }
                            _ => {
                                // Higher score is better
                                b_score
                                    .partial_cmp(&a_score)
                                    .unwrap_or(std::cmp::Ordering::Equal)
                            }
                        };

                        if cmp != std::cmp::Ordering::Equal {
                            return cmp;
                        }
                    }
                    std::cmp::Ordering::Equal
                })
        });

        Ok(())
    }

    /// Get tiebreak score for a team
    fn get_tiebreak_score(
        &self,
        standing: &ExtendedTeamStanding,
        criterion: &TeamTiebreakCriterion,
        _team_scores: &HashMap<i32, TeamScoreBreakdown>,
    ) -> f64 {
        match criterion {
            TeamTiebreakCriterion::MatchPoints => standing.match_points,
            TeamTiebreakCriterion::BoardPoints => standing.board_points,
            _ => {
                // Get from tiebreak_scores HashMap
                let criterion_key = format!("{criterion:?}");
                standing
                    .tiebreak_scores
                    .get(&criterion_key)
                    .cloned()
                    .unwrap_or(0.0)
            }
        }
    }

    /// Generate explanations for tiebreaks
    fn generate_tiebreak_explanations(
        &self,
        standings: &[ExtendedTeamStanding],
        config: &TeamScoringConfig,
    ) -> HashMap<i32, String> {
        let mut explanations = HashMap::new();

        // Find teams with tied scores
        let mut tied_groups = Vec::new();
        let mut current_group = Vec::new();
        let mut current_score: Option<f64> = None;

        for (i, standing) in standings.iter().enumerate() {
            if current_score.is_none() || (current_score.unwrap() - standing.points).abs() < 0.001 {
                current_group.push((i, standing));
                current_score = Some(standing.points);
            } else {
                if current_group.len() > 1 {
                    tied_groups.push(current_group);
                }
                current_group = vec![(i, standing)];
                current_score = Some(standing.points);
            }
        }

        if current_group.len() > 1 {
            tied_groups.push(current_group);
        }

        // Generate explanations for tied teams
        for group in tied_groups {
            let mut explanation = String::new();
            explanation.push_str(&format!("Tied on {} points. ", group[0].1.points));

            for criterion in &config.tiebreak_criteria {
                explanation.push_str(&format!("Tiebreak: {criterion:?}. "));
            }

            for (_, standing) in group {
                explanations.insert(standing.team.id, explanation.clone());
            }
        }

        explanations
    }

    /// Update team match results
    #[instrument(skip(self))]
    pub async fn update_team_match_result(
        &self,
        team_match_id: i32,
        board_results: Vec<BoardResult>,
        config: &TeamScoringConfig,
    ) -> Result<TeamMatchResult, PawnError> {
        info!("Updating team match result for match {}", team_match_id);

        // Get the team match
        let team_match = self.db.get_team_match_by_id(team_match_id).await?;

        // Calculate match points based on board results
        let mut team_a_board_points = 0.0;
        let mut team_b_board_points = 0.0;

        for board_result in &board_results {
            let (white_points, black_points) = self.get_game_points(&board_result.result);

            if board_result.white_team_id == team_match.team_a_id {
                team_a_board_points += white_points;
                team_b_board_points += black_points;
            } else {
                team_a_board_points += black_points;
                team_b_board_points += white_points;
            }
        }

        // Determine match result
        let (team_a_match_points, team_b_match_points) =
            if team_a_board_points > team_b_board_points {
                (config.match_points_win, config.match_points_loss)
            } else if team_a_board_points < team_b_board_points {
                (config.match_points_loss, config.match_points_win)
            } else {
                (config.match_points_draw, config.match_points_draw)
            };

        // TODO: Update the team match in the database
        // This would require adding an update method to the database trait

        Ok(TeamMatchResult {
            team_match,
            board_results,
            team_a_match_points,
            team_b_match_points,
            team_a_board_points,
            team_b_board_points,
        })
    }
}

/// Match result enum
#[derive(Debug, Clone)]
pub enum MatchResult {
    Win,
    Draw,
    Loss,
}

impl Default for TeamScoringConfig {
    fn default() -> Self {
        Self {
            scoring_system: TeamScoringSystem::OlympicPoints,
            match_points_win: 2.0,
            match_points_draw: 1.0,
            match_points_loss: 0.0,
            board_weight_system: BoardWeightSystem::Equal,
            tiebreak_criteria: vec![
                TeamTiebreakCriterion::MatchPoints,
                TeamTiebreakCriterion::BoardPoints,
                TeamTiebreakCriterion::DirectEncounter,
                TeamTiebreakCriterion::SonnebornBerger,
            ],
            olympic_scoring: true,
            minimum_games_for_board_points: 4,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Unit tests focused on data structures, enums, and utility functions

    #[test]
    fn test_team_scoring_config_creation() {
        let config = TeamScoringConfig {
            scoring_system: TeamScoringSystem::MatchPoints,
            match_points_win: 3.0,
            match_points_draw: 1.0,
            match_points_loss: 0.0,
            board_weight_system: BoardWeightSystem::Descending,
            tiebreak_criteria: vec![TeamTiebreakCriterion::BoardPoints],
            olympic_scoring: false,
            minimum_games_for_board_points: 6,
        };

        assert!(matches!(
            config.scoring_system,
            TeamScoringSystem::MatchPoints
        ));
        assert_eq!(config.match_points_win, 3.0);
        assert_eq!(config.match_points_draw, 1.0);
        assert_eq!(config.match_points_loss, 0.0);
        assert!(matches!(
            config.board_weight_system,
            BoardWeightSystem::Descending
        ));
        assert_eq!(config.tiebreak_criteria.len(), 1);
        assert!(!config.olympic_scoring);
        assert_eq!(config.minimum_games_for_board_points, 6);
    }

    #[test]
    fn test_default_team_scoring_config() {
        let config = TeamScoringConfig::default();

        assert!(matches!(
            config.scoring_system,
            TeamScoringSystem::OlympicPoints
        ));
        assert_eq!(config.match_points_win, 2.0);
        assert_eq!(config.match_points_draw, 1.0);
        assert_eq!(config.match_points_loss, 0.0);
        assert!(matches!(
            config.board_weight_system,
            BoardWeightSystem::Equal
        ));
        assert_eq!(config.tiebreak_criteria.len(), 4);
        assert!(config.olympic_scoring);
        assert_eq!(config.minimum_games_for_board_points, 4);
    }

    #[test]
    fn test_team_scoring_systems() {
        let systems = vec![
            TeamScoringSystem::MatchPoints,
            TeamScoringSystem::BoardPoints,
            TeamScoringSystem::OlympicPoints,
            TeamScoringSystem::CustomPoints,
        ];

        assert_eq!(systems.len(), 4);

        // Test that we can clone and debug print them
        for system in systems {
            let cloned = system.clone();
            let debug_str = format!("{cloned:?}");
            assert!(!debug_str.is_empty());
        }
    }

    #[test]
    fn test_board_weight_systems() {
        let systems = vec![
            BoardWeightSystem::Equal,
            BoardWeightSystem::Descending,
            BoardWeightSystem::Ascending,
            BoardWeightSystem::Custom(vec![1.0, 0.9, 0.8, 0.7]),
        ];

        assert_eq!(systems.len(), 4);

        // Test that we can clone and debug print them
        for system in systems {
            let cloned = system.clone();
            let debug_str = format!("{cloned:?}");
            assert!(!debug_str.is_empty());
        }
    }

    #[test]
    fn test_custom_board_weights() {
        let custom_weights = vec![1.0, 0.9, 0.8, 0.7];
        let board_system = BoardWeightSystem::Custom(custom_weights.clone());

        if let BoardWeightSystem::Custom(weights) = board_system {
            assert_eq!(weights.len(), 4);
            assert_eq!(weights[0], 1.0);
            assert_eq!(weights[1], 0.9);
            assert_eq!(weights[2], 0.8);
            assert_eq!(weights[3], 0.7);
        } else {
            panic!("Expected Custom variant");
        }
    }

    #[test]
    fn test_team_tiebreak_criteria() {
        let criteria = vec![
            TeamTiebreakCriterion::MatchPoints,
            TeamTiebreakCriterion::BoardPoints,
            TeamTiebreakCriterion::DirectEncounter,
            TeamTiebreakCriterion::SonnebornBerger,
            TeamTiebreakCriterion::AverageOpponentRating,
            TeamTiebreakCriterion::BoardCountTiebreak,
            TeamTiebreakCriterion::CaptainBoard,
            TeamTiebreakCriterion::MatchWins,
            TeamTiebreakCriterion::DrawCount,
        ];

        assert_eq!(criteria.len(), 9);

        // Test that we can clone and debug print them
        for criterion in criteria {
            let cloned = criterion.clone();
            let debug_str = format!("{cloned:?}");
            assert!(!debug_str.is_empty());
        }
    }

    #[test]
    fn test_game_result_variants() {
        let results = vec![
            GameResult::WhiteWin,
            GameResult::BlackWin,
            GameResult::Draw,
            GameResult::WhiteForfeit,
            GameResult::BlackForfeit,
            GameResult::DoubleForfeit,
            GameResult::NotPlayed,
        ];

        assert_eq!(results.len(), 7);

        // Test that we can clone and debug print them
        for result in results {
            let cloned = result.clone();
            let debug_str = format!("{cloned:?}");
            assert!(!debug_str.is_empty());
        }
    }

    #[test]
    fn test_match_result_variants() {
        let results = vec![MatchResult::Win, MatchResult::Draw, MatchResult::Loss];

        assert_eq!(results.len(), 3);

        // Test that we can clone and debug print them
        for result in results {
            let cloned = result.clone();
            let debug_str = format!("{cloned:?}");
            assert!(!debug_str.is_empty());
        }
    }

    #[test]
    fn test_config_with_different_scoring_systems() {
        let configs = vec![
            (TeamScoringSystem::MatchPoints, "Match points only"),
            (TeamScoringSystem::BoardPoints, "Board points only"),
            (TeamScoringSystem::OlympicPoints, "Olympic scoring"),
            (TeamScoringSystem::CustomPoints, "Custom scoring"),
        ];

        for (system, description) in configs {
            let config = TeamScoringConfig {
                scoring_system: system,
                ..Default::default()
            };

            // Test that config can be created with each system
            assert!(!description.is_empty());
            let debug_str = format!("{config:?}");
            assert!(debug_str.contains(&format!("{:?}", config.scoring_system)));
        }
    }

    #[test]
    fn test_config_match_points_values() {
        let config = TeamScoringConfig {
            match_points_win: 3.0,
            match_points_draw: 1.0,
            match_points_loss: 0.0,
            ..Default::default()
        };

        assert_eq!(config.match_points_win, 3.0);
        assert_eq!(config.match_points_draw, 1.0);
        assert_eq!(config.match_points_loss, 0.0);
    }

    #[test]
    fn test_config_with_multiple_tiebreak_criteria() {
        let config = TeamScoringConfig {
            tiebreak_criteria: vec![
                TeamTiebreakCriterion::MatchPoints,
                TeamTiebreakCriterion::BoardPoints,
                TeamTiebreakCriterion::DirectEncounter,
                TeamTiebreakCriterion::SonnebornBerger,
                TeamTiebreakCriterion::AverageOpponentRating,
            ],
            ..Default::default()
        };

        assert_eq!(config.tiebreak_criteria.len(), 5);
        assert!(matches!(
            config.tiebreak_criteria[0],
            TeamTiebreakCriterion::MatchPoints
        ));
        assert!(matches!(
            config.tiebreak_criteria[1],
            TeamTiebreakCriterion::BoardPoints
        ));
        assert!(matches!(
            config.tiebreak_criteria[2],
            TeamTiebreakCriterion::DirectEncounter
        ));
        assert!(matches!(
            config.tiebreak_criteria[3],
            TeamTiebreakCriterion::SonnebornBerger
        ));
        assert!(matches!(
            config.tiebreak_criteria[4],
            TeamTiebreakCriterion::AverageOpponentRating
        ));
    }

    #[test]
    fn test_config_boolean_flags() {
        let config_olympic = TeamScoringConfig {
            olympic_scoring: true,
            ..Default::default()
        };

        let config_standard = TeamScoringConfig {
            olympic_scoring: false,
            ..Default::default()
        };

        assert!(config_olympic.olympic_scoring);
        assert!(!config_standard.olympic_scoring);
    }

    #[test]
    fn test_minimum_games_configuration() {
        let config_low = TeamScoringConfig {
            minimum_games_for_board_points: 2,
            ..Default::default()
        };

        let config_high = TeamScoringConfig {
            minimum_games_for_board_points: 8,
            ..Default::default()
        };

        assert_eq!(config_low.minimum_games_for_board_points, 2);
        assert_eq!(config_high.minimum_games_for_board_points, 8);
    }

    #[test]
    fn test_board_weight_system_variations() {
        let equal = BoardWeightSystem::Equal;
        let descending = BoardWeightSystem::Descending;
        let ascending = BoardWeightSystem::Ascending;
        let custom = BoardWeightSystem::Custom(vec![1.0, 0.8, 0.6]);

        // Test that each system is distinct
        assert!(format!("{equal:?}") != format!("{descending:?}"));
        assert!(format!("{ascending:?}") != format!("{custom:?}"));
        assert!(format!("{equal:?}") != format!("{ascending:?}"));
    }

    #[test]
    fn test_tiebreak_criterion_variations() {
        let match_points = TeamTiebreakCriterion::MatchPoints;
        let board_points = TeamTiebreakCriterion::BoardPoints;
        let direct_encounter = TeamTiebreakCriterion::DirectEncounter;
        let sonneborn_berger = TeamTiebreakCriterion::SonnebornBerger;

        // Test that each criterion is distinct
        assert!(format!("{match_points:?}") != format!("{board_points:?}"));
        assert!(format!("{direct_encounter:?}") != format!("{sonneborn_berger:?}"));
        assert!(format!("{match_points:?}") != format!("{direct_encounter:?}"));
    }

    #[test]
    fn test_scoring_system_variations() {
        let match_points = TeamScoringSystem::MatchPoints;
        let board_points = TeamScoringSystem::BoardPoints;
        let olympic = TeamScoringSystem::OlympicPoints;
        let custom = TeamScoringSystem::CustomPoints;

        // Test that each system is distinct
        assert!(format!("{match_points:?}") != format!("{board_points:?}"));
        assert!(format!("{olympic:?}") != format!("{custom:?}"));
        assert!(format!("{match_points:?}") != format!("{olympic:?}"));
    }

    #[test]
    fn test_game_result_point_values() {
        // Test that we can differentiate between game results
        let white_win = GameResult::WhiteWin;
        let black_win = GameResult::BlackWin;
        let draw = GameResult::Draw;
        let not_played = GameResult::NotPlayed;

        // Each result should be distinct
        assert!(format!("{white_win:?}") != format!("{black_win:?}"));
        assert!(format!("{draw:?}") != format!("{not_played:?}"));
        assert!(format!("{white_win:?}") != format!("{draw:?}"));
    }

    #[test]
    fn test_forfeit_game_results() {
        let white_forfeit = GameResult::WhiteForfeit;
        let black_forfeit = GameResult::BlackForfeit;
        let double_forfeit = GameResult::DoubleForfeit;

        // Test forfeit variants are distinct
        assert!(format!("{white_forfeit:?}") != format!("{black_forfeit:?}"));
        assert!(format!("{black_forfeit:?}") != format!("{double_forfeit:?}"));
        assert!(format!("{white_forfeit:?}") != format!("{double_forfeit:?}"));
    }

    #[test]
    fn test_empty_tiebreak_criteria() {
        let config = TeamScoringConfig {
            tiebreak_criteria: vec![],
            ..Default::default()
        };

        assert!(config.tiebreak_criteria.is_empty());
    }

    #[test]
    fn test_custom_weights_empty() {
        let empty_weights = BoardWeightSystem::Custom(vec![]);

        if let BoardWeightSystem::Custom(weights) = empty_weights {
            assert!(weights.is_empty());
        } else {
            panic!("Expected Custom variant");
        }
    }

    #[test]
    fn test_config_extreme_values() {
        let config = TeamScoringConfig {
            match_points_win: 100.0,
            match_points_draw: 50.0,
            match_points_loss: -10.0,
            minimum_games_for_board_points: 0,
            ..Default::default()
        };

        assert_eq!(config.match_points_win, 100.0);
        assert_eq!(config.match_points_draw, 50.0);
        assert_eq!(config.match_points_loss, -10.0);
        assert_eq!(config.minimum_games_for_board_points, 0);
    }

    #[test]
    fn test_all_tiebreak_criteria_included() {
        let all_criteria = vec![
            TeamTiebreakCriterion::MatchPoints,
            TeamTiebreakCriterion::BoardPoints,
            TeamTiebreakCriterion::DirectEncounter,
            TeamTiebreakCriterion::SonnebornBerger,
            TeamTiebreakCriterion::AverageOpponentRating,
            TeamTiebreakCriterion::BoardCountTiebreak,
            TeamTiebreakCriterion::CaptainBoard,
            TeamTiebreakCriterion::MatchWins,
            TeamTiebreakCriterion::DrawCount,
        ];

        let config = TeamScoringConfig {
            tiebreak_criteria: all_criteria,
            ..Default::default()
        };

        // Should include all 9 tiebreak criteria
        assert_eq!(config.tiebreak_criteria.len(), 9);
    }

    #[test]
    fn test_match_result_completeness() {
        // Test that all match results are covered
        let results = [MatchResult::Win, MatchResult::Draw, MatchResult::Loss];

        // Should cover all possible match outcomes
        assert_eq!(results.len(), 3);

        // Test they are all different
        let result_strings: Vec<String> = results.iter().map(|r| format!("{r:?}")).collect();
        let unique_strings: std::collections::HashSet<String> =
            result_strings.into_iter().collect();
        assert_eq!(unique_strings.len(), 3);
    }

    #[test]
    fn test_game_result_completeness() {
        // Test that all game results are covered
        let results = [
            GameResult::WhiteWin,
            GameResult::BlackWin,
            GameResult::Draw,
            GameResult::WhiteForfeit,
            GameResult::BlackForfeit,
            GameResult::DoubleForfeit,
            GameResult::NotPlayed,
        ];

        // Should cover all possible game outcomes
        assert_eq!(results.len(), 7);

        // Test they are all different
        let result_strings: Vec<String> = results.iter().map(|r| format!("{r:?}")).collect();
        let unique_strings: std::collections::HashSet<String> =
            result_strings.into_iter().collect();
        assert_eq!(unique_strings.len(), 7);
    }
}
