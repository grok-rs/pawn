use std::collections::HashMap;
use std::sync::Arc;
use tracing::instrument;

/// Format tiebreak value: use 1 decimal for half-point values, no decimals for integers
fn format_tiebreak_value(value: f64) -> String {
    if (value - value.round()).abs() < f64::EPSILON {
        // Integer value (e.g., 26.0 -> "26")
        format!("{}", value as i64)
    } else {
        // Has meaningful decimals — show up to 2, trim trailing zeros
        let s = format!("{value:.2}");
        s.trim_end_matches('0').to_string()
    }
}

use crate::{
    common::error::PawnError,
    competition::model::Game,
    db::*,
    participant::model::{Player, PlayerResult},
    standings::model::{
        CrossTable, CrossTableEntry, CrossTableRow, OpponentContribution, PlayerStanding,
        StandingsCalculationResult, TiebreakBreakdown, TiebreakCalculationStep, TiebreakScore,
        TiebreakType, TournamentTiebreakConfig,
    },
};

pub struct TiebreakCalculator<D> {
    db: Arc<D>,
}

impl<D: Db> TiebreakCalculator<D> {
    pub fn new(db: Arc<D>) -> Self {
        Self { db }
    }

    #[instrument(ret, skip(self))]
    pub async fn calculate_standings(
        &self,
        tournament_id: i32,
        config: &TournamentTiebreakConfig,
    ) -> Result<StandingsCalculationResult, PawnError> {
        // Get all players and games
        let players = self
            .db
            .get_players_by_tournament(tournament_id)
            .await
            .map_err(PawnError::Database)?;
        let games = self
            .db
            .get_games_by_tournament(tournament_id)
            .await
            .map_err(PawnError::Database)?;

        // Calculate base scores
        let player_results = self.calculate_player_results(&players, &games)?;

        // Calculate tiebreak scores for each player
        let mut standings: Vec<PlayerStanding> = Vec::new();

        for (player_id, result) in player_results.iter() {
            // Find the actual player object
            let player = players
                .iter()
                .find(|p| p.id == *player_id)
                .ok_or_else(|| PawnError::NotFound("Player not found".into()))?;

            let mut tiebreak_scores = Vec::new();

            for tiebreak_type in &config.tiebreaks {
                let score = self.calculate_tiebreak_score(
                    player,
                    result,
                    tiebreak_type,
                    &players,
                    &games,
                    &player_results,
                )?;
                tiebreak_scores.push(score);
            }

            let performance_rating = self.calculate_performance_rating(player, &games, &players)?;
            let rating_change = self.calculate_rating_change(player, &games, &players)?;

            standings.push(PlayerStanding {
                player: player.clone(),
                rank: 0, // Will be set after sorting
                points: result.points as f64,
                games_played: result.games_played,
                wins: result.wins,
                draws: result.draws,
                losses: result.losses,
                tiebreak_scores,
                performance_rating,
                rating_change,
            });
        }

        // Sort standings according to points and tiebreaks
        self.sort_standings(&mut standings);

        // Assign ranks
        self.assign_ranks(&mut standings);

        Ok(StandingsCalculationResult {
            standings,
            last_updated: chrono::Utc::now().to_rfc3339(),
            tiebreak_config: config.clone(),
        })
    }

    fn calculate_player_results(
        &self,
        players: &[Player],
        games: &[Game],
    ) -> Result<HashMap<i32, PlayerResult>, PawnError> {
        let mut results = HashMap::new();

        // Initialize results for all players
        for player in players {
            results.insert(
                player.id,
                PlayerResult {
                    player: player.clone(),
                    points: 0.0,
                    games_played: 0,
                    wins: 0,
                    draws: 0,
                    losses: 0,
                },
            );
        }

        // Process each game
        for game in games {
            if game.result == "*" {
                continue; // Skip ongoing games
            }

            // Update white player's result
            if let Some(white_result) = results.get_mut(&game.white_player_id) {
                white_result.games_played += 1;
                match game.result.as_str() {
                    "1-0" => {
                        white_result.points += 1.0;
                        white_result.wins += 1;
                    }
                    "0-1" => {
                        white_result.losses += 1;
                    }
                    "1/2-1/2" => {
                        white_result.points += 0.5;
                        white_result.draws += 1;
                    }
                    _ => {}
                }
            }

            // Update black player's result
            if let Some(black_result) = results.get_mut(&game.black_player_id) {
                black_result.games_played += 1;
                match game.result.as_str() {
                    "1-0" => {
                        black_result.losses += 1;
                    }
                    "0-1" => {
                        black_result.points += 1.0;
                        black_result.wins += 1;
                    }
                    "1/2-1/2" => {
                        black_result.points += 0.5;
                        black_result.draws += 1;
                    }
                    _ => {}
                }
            }
        }

        Ok(results)
    }

    fn calculate_tiebreak_score(
        &self,
        player: &Player,
        player_result: &PlayerResult,
        tiebreak_type: &TiebreakType,
        all_players: &[Player],
        all_games: &[Game],
        all_results: &HashMap<i32, PlayerResult>,
    ) -> Result<TiebreakScore, PawnError> {
        let value = match tiebreak_type {
            TiebreakType::BuchholzFull => {
                self.calculate_buchholz_full(player, all_games, all_results)?
            }
            TiebreakType::BuchholzCut1 => {
                self.calculate_buchholz_cut1(player, all_games, all_results)?
            }
            TiebreakType::BuchholzCut2 => {
                self.calculate_buchholz_cut2(player, all_games, all_results)?
            }
            TiebreakType::SonnebornBerger => {
                self.calculate_sonneborn_berger(player, all_games, all_results)?
            }
            TiebreakType::NumberOfWins => player_result.wins as f64,
            TiebreakType::ProgressiveScore => {
                self.calculate_progressive_score(player, all_games)?
            }
            TiebreakType::DirectEncounter => {
                self.calculate_direct_encounter(player, all_games, all_results)?
            }
            TiebreakType::AverageRatingOfOpponents => {
                self.calculate_aro(player, all_games, all_players)?
            }
            TiebreakType::NumberOfGamesWithBlack => {
                self.count_games_with_black(player, all_games)? as f64
            }
            TiebreakType::NumberOfWinsWithBlack => {
                self.count_wins_with_black(player, all_games)? as f64
            }
            TiebreakType::BuchholzMedian => {
                self.calculate_buchholz_median(player, all_games, all_results)?
            }
            TiebreakType::CumulativeScore => self.calculate_cumulative_score(player, all_games)?,
            TiebreakType::TournamentPerformanceRating => {
                self.calculate_tournament_performance_rating(player, all_games, all_players)? as f64
            }
            TiebreakType::KoyaSystem => {
                self.calculate_koya_system(player, all_games, all_results)?
            }
            TiebreakType::ArocCut1 => self.calculate_aroc_cut1(player, all_games, all_players)?,
            TiebreakType::ArocCut2 => self.calculate_aroc_cut2(player, all_games, all_players)?,
            TiebreakType::MatchPoints => self.calculate_match_points(player, all_games)?,
            TiebreakType::GamePoints => self.calculate_game_points(player, all_games)?,
            TiebreakType::BoardPoints => self.calculate_board_points(player, all_games)?,
            // All other types are handled above, no need for a catch-all pattern
        };

        Ok(TiebreakScore {
            tiebreak_type: tiebreak_type.clone(),
            value,
            display_value: format_tiebreak_value(value),
        })
    }

    fn calculate_buchholz_full(
        &self,
        player: &Player,
        games: &[Game],
        results: &HashMap<i32, PlayerResult>,
    ) -> Result<f64, PawnError> {
        let opponent_ids = self.get_opponent_ids(player, games);
        let mut buchholz = 0.0;

        for opponent_id in opponent_ids {
            if let Some(opponent_result) = results.get(&opponent_id) {
                buchholz += opponent_result.points as f64;
            }
        }

        Ok(buchholz)
    }

    fn calculate_buchholz_cut1(
        &self,
        player: &Player,
        games: &[Game],
        results: &HashMap<i32, PlayerResult>,
    ) -> Result<f64, PawnError> {
        let opponent_ids = self.get_opponent_ids(player, games);
        let mut scores: Vec<f64> = opponent_ids
            .iter()
            .filter_map(|id| results.get(id).map(|r| r.points as f64))
            .collect();

        if scores.is_empty() {
            return Ok(0.0);
        }

        scores.sort_by(|a, b| a.partial_cmp(b).unwrap());
        scores.remove(0); // Remove lowest

        Ok(scores.iter().sum())
    }

    fn calculate_buchholz_cut2(
        &self,
        player: &Player,
        games: &[Game],
        results: &HashMap<i32, PlayerResult>,
    ) -> Result<f64, PawnError> {
        let opponent_ids = self.get_opponent_ids(player, games);
        let mut scores: Vec<f64> = opponent_ids
            .iter()
            .filter_map(|id| results.get(id).map(|r| r.points as f64))
            .collect();

        if scores.len() < 3 {
            return Ok(scores.iter().sum());
        }

        scores.sort_by(|a, b| a.partial_cmp(b).unwrap());
        scores.remove(0); // Remove lowest
        scores.pop(); // Remove highest

        Ok(scores.iter().sum())
    }

    fn calculate_sonneborn_berger(
        &self,
        player: &Player,
        games: &[Game],
        results: &HashMap<i32, PlayerResult>,
    ) -> Result<f64, PawnError> {
        let mut sb_score = 0.0;

        for game in games {
            if game.result == "*" {
                continue;
            }

            let (_is_white, opponent_id, game_points) = if game.white_player_id == player.id {
                (
                    true,
                    game.black_player_id,
                    match game.result.as_str() {
                        "1-0" => 1.0,
                        "1/2-1/2" => 0.5,
                        _ => 0.0,
                    },
                )
            } else if game.black_player_id == player.id {
                (
                    false,
                    game.white_player_id,
                    match game.result.as_str() {
                        "0-1" => 1.0,
                        "1/2-1/2" => 0.5,
                        _ => 0.0,
                    },
                )
            } else {
                continue;
            };

            if let Some(opponent_result) = results.get(&opponent_id) {
                sb_score += game_points * opponent_result.points as f64;
            }
        }

        Ok(sb_score)
    }

    fn calculate_progressive_score(
        &self,
        player: &Player,
        games: &[Game],
    ) -> Result<f64, PawnError> {
        let mut round_games: Vec<&Game> = games
            .iter()
            .filter(|g| g.white_player_id == player.id || g.black_player_id == player.id)
            .collect();

        round_games.sort_by_key(|g| g.round_number);

        let mut progressive = 0.0;
        let mut cumulative = 0.0;

        for game in round_games {
            if game.result == "*" {
                continue;
            }

            let points = if game.white_player_id == player.id {
                match game.result.as_str() {
                    "1-0" => 1.0,
                    "1/2-1/2" => 0.5,
                    _ => 0.0,
                }
            } else {
                match game.result.as_str() {
                    "0-1" => 1.0,
                    "1/2-1/2" => 0.5,
                    _ => 0.0,
                }
            };

            cumulative += points;
            progressive += cumulative;
        }

        Ok(progressive)
    }

    fn calculate_direct_encounter(
        &self,
        player: &Player,
        games: &[Game],
        results: &HashMap<i32, PlayerResult>,
    ) -> Result<f64, PawnError> {
        // Get the player's result to find tied players
        let player_result = results.get(&player.id).unwrap();
        let player_points = player_result.points as f64;

        // Find all players tied on the same points
        let tied_players: Vec<i32> = results
            .iter()
            .filter(|(_, result)| result.points as f64 == player_points)
            .map(|(id, _)| *id)
            .collect();

        if tied_players.len() <= 1 {
            return Ok(0.0); // No one tied, direct encounter doesn't apply
        }

        // Calculate score in games against tied players only
        let mut direct_score = 0.0;
        let mut _games_against_tied = 0;

        for game in games {
            if game.result == "*" {
                continue;
            }

            let (opponent_id, game_score) = if game.white_player_id == player.id {
                (
                    game.black_player_id,
                    match game.result.as_str() {
                        "1-0" => 1.0,
                        "1/2-1/2" => 0.5,
                        _ => 0.0,
                    },
                )
            } else if game.black_player_id == player.id {
                (
                    game.white_player_id,
                    match game.result.as_str() {
                        "0-1" => 1.0,
                        "1/2-1/2" => 0.5,
                        _ => 0.0,
                    },
                )
            } else {
                continue;
            };

            // Only count games against tied players
            if tied_players.contains(&opponent_id) && opponent_id != player.id {
                direct_score += game_score;
                _games_against_tied += 1;
            }
        }

        // Return the total score against tied players
        // This can be used for sorting - higher is better
        Ok(direct_score)
    }

    fn calculate_aro(
        &self,
        player: &Player,
        games: &[Game],
        all_players: &[Player],
    ) -> Result<f64, PawnError> {
        let opponent_ids = self.get_opponent_ids(player, games);
        let mut total_rating = 0;
        let mut rated_opponents = 0;

        for opponent_id in opponent_ids {
            if let Some(opponent) = all_players.iter().find(|p| p.id == opponent_id)
                && let Some(rating) = opponent.rating
            {
                total_rating += rating;
                rated_opponents += 1;
            }
        }

        if rated_opponents == 0 {
            return Ok(0.0);
        }

        Ok(total_rating as f64 / rated_opponents as f64)
    }

    fn calculate_performance_rating(
        &self,
        player: &Player,
        games: &[Game],
        all_players: &[Player],
    ) -> Result<Option<i32>, PawnError> {
        let mut opponent_ratings = Vec::new();
        let mut score = 0.0;
        let mut games_count = 0;

        for game in games {
            if game.result == "*" {
                continue;
            }

            let (opponent_id, game_score) = if game.white_player_id == player.id {
                (
                    game.black_player_id,
                    match game.result.as_str() {
                        "1-0" => 1.0,
                        "1/2-1/2" => 0.5,
                        _ => 0.0,
                    },
                )
            } else if game.black_player_id == player.id {
                (
                    game.white_player_id,
                    match game.result.as_str() {
                        "0-1" => 1.0,
                        "1/2-1/2" => 0.5,
                        _ => 0.0,
                    },
                )
            } else {
                continue;
            };

            if let Some(opponent) = all_players.iter().find(|p| p.id == opponent_id)
                && let Some(rating) = opponent.rating
            {
                opponent_ratings.push(rating);
                score += game_score;
                games_count += 1;
            }
        }

        if opponent_ratings.is_empty() {
            return Ok(None);
        }

        let avg_opponent_rating: f64 =
            opponent_ratings.iter().sum::<i32>() as f64 / opponent_ratings.len() as f64;
        let percentage = score / games_count as f64;

        // Simplified TPR calculation
        let tpr = avg_opponent_rating + 400.0 * (percentage - 0.5);

        Ok(Some(tpr as i32))
    }

    fn count_games_with_black(&self, player: &Player, games: &[Game]) -> Result<i32, PawnError> {
        Ok(games
            .iter()
            .filter(|g| g.black_player_id == player.id && g.result != "*")
            .count() as i32)
    }

    fn count_wins_with_black(&self, player: &Player, games: &[Game]) -> Result<i32, PawnError> {
        Ok(games
            .iter()
            .filter(|g| g.black_player_id == player.id && g.result == "0-1")
            .count() as i32)
    }

    fn get_opponent_ids(&self, player: &Player, games: &[Game]) -> Vec<i32> {
        let mut opponent_ids = Vec::new();

        for game in games {
            if game.result == "*" {
                continue;
            }

            if game.white_player_id == player.id {
                opponent_ids.push(game.black_player_id);
            } else if game.black_player_id == player.id {
                opponent_ids.push(game.white_player_id);
            }
        }

        opponent_ids
    }

    fn sort_standings(&self, standings: &mut [PlayerStanding]) {
        standings.sort_by(|a, b| {
            // First sort by points (descending)
            let points_cmp = b.points.partial_cmp(&a.points).unwrap();
            if points_cmp != std::cmp::Ordering::Equal {
                return points_cmp;
            }

            // Then by tiebreak scores in order
            for i in 0..a.tiebreak_scores.len() {
                if let (Some(a_score), Some(b_score)) =
                    (a.tiebreak_scores.get(i), b.tiebreak_scores.get(i))
                {
                    let tb_cmp = b_score.value.partial_cmp(&a_score.value).unwrap();
                    if tb_cmp != std::cmp::Ordering::Equal {
                        return tb_cmp;
                    }
                }
            }

            // Finally by name
            a.player.name.cmp(&b.player.name)
        });
    }

    fn assign_ranks(&self, standings: &mut [PlayerStanding]) {
        let mut current_rank = 1;

        for i in 0..standings.len() {
            if i > 0 {
                let prev = &standings[i - 1];
                let curr = &standings[i];

                // Check if tied with previous player
                let tied = prev.points == curr.points
                    && prev
                        .tiebreak_scores
                        .iter()
                        .zip(curr.tiebreak_scores.iter())
                        .all(|(a, b)| a.value == b.value);

                if !tied {
                    current_rank = i + 1;
                }
            }

            standings[i].rank = current_rank as i32;
        }
    }

    // Additional tiebreak calculation methods

    fn calculate_buchholz_median(
        &self,
        player: &Player,
        games: &[Game],
        results: &HashMap<i32, PlayerResult>,
    ) -> Result<f64, PawnError> {
        let opponent_ids = self.get_opponent_ids(player, games);
        let mut scores: Vec<f64> = opponent_ids
            .iter()
            .filter_map(|id| results.get(id).map(|r| r.points as f64))
            .collect();

        if scores.is_empty() {
            return Ok(0.0);
        }

        scores.sort_by(|a, b| a.partial_cmp(b).unwrap());

        // Remove highest and lowest scores, then calculate median
        if scores.len() > 2 {
            scores.remove(0); // Remove lowest
            scores.pop(); // Remove highest
        }

        let median = if scores.len().is_multiple_of(2) {
            let mid = scores.len() / 2;
            (scores[mid - 1] + scores[mid]) / 2.0
        } else {
            scores[scores.len() / 2]
        };

        Ok(median * scores.len() as f64) // Return sum of median scores
    }

    fn calculate_cumulative_score(
        &self,
        player: &Player,
        games: &[Game],
    ) -> Result<f64, PawnError> {
        let mut round_games: Vec<&Game> = games
            .iter()
            .filter(|g| g.white_player_id == player.id || g.black_player_id == player.id)
            .collect();

        round_games.sort_by_key(|g| g.round_number);

        let mut cumulative_total = 0.0;
        let mut current_score = 0.0;

        for game in round_games {
            if game.result == "*" {
                continue;
            }

            let points = if game.white_player_id == player.id {
                match game.result.as_str() {
                    "1-0" => 1.0,
                    "1/2-1/2" => 0.5,
                    _ => 0.0,
                }
            } else {
                match game.result.as_str() {
                    "0-1" => 1.0,
                    "1/2-1/2" => 0.5,
                    _ => 0.0,
                }
            };

            current_score += points;
            cumulative_total += current_score;
        }

        Ok(cumulative_total)
    }

    fn calculate_tournament_performance_rating(
        &self,
        player: &Player,
        games: &[Game],
        all_players: &[Player],
    ) -> Result<i32, PawnError> {
        let mut opponent_ratings = Vec::new();
        let mut total_score = 0.0;
        let mut games_count = 0;

        for game in games {
            if game.result == "*" {
                continue;
            }

            let (opponent_id, game_score) = if game.white_player_id == player.id {
                (
                    game.black_player_id,
                    match game.result.as_str() {
                        "1-0" => 1.0,
                        "1/2-1/2" => 0.5,
                        _ => 0.0,
                    },
                )
            } else if game.black_player_id == player.id {
                (
                    game.white_player_id,
                    match game.result.as_str() {
                        "0-1" => 1.0,
                        "1/2-1/2" => 0.5,
                        _ => 0.0,
                    },
                )
            } else {
                continue;
            };

            if let Some(opponent) = all_players.iter().find(|p| p.id == opponent_id)
                && let Some(rating) = opponent.rating
            {
                opponent_ratings.push(rating);
                total_score += game_score;
                games_count += 1;
            }
        }

        if opponent_ratings.is_empty() || games_count == 0 {
            return Ok(0);
        }

        let avg_opponent_rating: f64 =
            opponent_ratings.iter().sum::<i32>() as f64 / opponent_ratings.len() as f64;
        let percentage = total_score / games_count as f64;

        // Enhanced TPR calculation with more accurate formula
        let dp = if percentage >= 0.99 {
            800.0
        } else if percentage <= 0.01 {
            -800.0
        } else {
            400.0_f64 * (percentage / (1.0_f64 - percentage)).ln() / (2.0_f64).ln()
        };

        Ok((avg_opponent_rating + dp) as i32)
    }

    fn calculate_koya_system(
        &self,
        player: &Player,
        games: &[Game],
        results: &HashMap<i32, PlayerResult>,
    ) -> Result<f64, PawnError> {
        let mut koya_score = 0.0;
        let player_result = results.get(&player.id).unwrap();
        let min_score = player_result.points as f64;

        for game in games {
            if game.result == "*" {
                continue;
            }

            let (opponent_id, game_points) = if game.white_player_id == player.id {
                (
                    game.black_player_id,
                    match game.result.as_str() {
                        "1-0" => 1.0,
                        "1/2-1/2" => 0.5,
                        _ => 0.0,
                    },
                )
            } else if game.black_player_id == player.id {
                (
                    game.white_player_id,
                    match game.result.as_str() {
                        "0-1" => 1.0,
                        "1/2-1/2" => 0.5,
                        _ => 0.0,
                    },
                )
            } else {
                continue;
            };

            if let Some(opponent_result) = results.get(&opponent_id) {
                // Only count games against opponents with equal or higher score
                if opponent_result.points as f64 >= min_score {
                    koya_score += game_points;
                }
            }
        }

        Ok(koya_score)
    }

    fn calculate_aroc_cut1(
        &self,
        player: &Player,
        games: &[Game],
        all_players: &[Player],
    ) -> Result<f64, PawnError> {
        let opponent_ids = self.get_opponent_ids(player, games);
        let mut ratings: Vec<i32> = opponent_ids
            .iter()
            .filter_map(|id| {
                all_players
                    .iter()
                    .find(|p| p.id == *id)
                    .and_then(|p| p.rating)
            })
            .collect();

        if ratings.is_empty() {
            return Ok(0.0);
        }

        ratings.sort();
        if ratings.len() > 1 {
            ratings.remove(0); // Remove lowest rating
        }

        Ok(ratings.iter().sum::<i32>() as f64 / ratings.len() as f64)
    }

    fn calculate_aroc_cut2(
        &self,
        player: &Player,
        games: &[Game],
        all_players: &[Player],
    ) -> Result<f64, PawnError> {
        let opponent_ids = self.get_opponent_ids(player, games);
        let mut ratings: Vec<i32> = opponent_ids
            .iter()
            .filter_map(|id| {
                all_players
                    .iter()
                    .find(|p| p.id == *id)
                    .and_then(|p| p.rating)
            })
            .collect();

        if ratings.len() < 3 {
            return Ok(ratings.iter().sum::<i32>() as f64 / ratings.len().max(1) as f64);
        }

        ratings.sort();
        ratings.remove(0); // Remove lowest
        ratings.pop(); // Remove highest

        Ok(ratings.iter().sum::<i32>() as f64 / ratings.len() as f64)
    }

    fn calculate_match_points(&self, player: &Player, games: &[Game]) -> Result<f64, PawnError> {
        let mut match_points = 0.0;

        for game in games {
            if game.result == "*" {
                continue;
            }

            if game.white_player_id == player.id {
                match game.result.as_str() {
                    "1-0" => match_points += 1.0,
                    "1/2-1/2" => match_points += 0.5,
                    _ => {}
                }
            } else if game.black_player_id == player.id {
                match game.result.as_str() {
                    "0-1" => match_points += 1.0,
                    "1/2-1/2" => match_points += 0.5,
                    _ => {}
                }
            }
        }

        Ok(match_points)
    }

    fn calculate_game_points(&self, player: &Player, games: &[Game]) -> Result<f64, PawnError> {
        // For team tournaments, this would sum individual game points
        // For now, it's equivalent to match points
        self.calculate_match_points(player, games)
    }

    fn calculate_board_points(&self, player: &Player, games: &[Game]) -> Result<f64, PawnError> {
        // For team tournaments, this would consider board-specific scoring
        // For now, it's equivalent to match points
        self.calculate_match_points(player, games)
    }

    fn calculate_rating_change(
        &self,
        player: &Player,
        games: &[Game],
        all_players: &[Player],
    ) -> Result<Option<i32>, PawnError> {
        let player_rating = match player.rating {
            Some(rating) => rating,
            None => return Ok(None),
        };

        let mut total_expected = 0.0;
        let mut total_actual = 0.0;
        let mut rated_games = 0;

        for game in games {
            if game.result == "*" {
                continue;
            }

            let (opponent_id, actual_score) = if game.white_player_id == player.id {
                (
                    game.black_player_id,
                    match game.result.as_str() {
                        "1-0" => 1.0,
                        "1/2-1/2" => 0.5,
                        _ => 0.0,
                    },
                )
            } else if game.black_player_id == player.id {
                (
                    game.white_player_id,
                    match game.result.as_str() {
                        "0-1" => 1.0,
                        "1/2-1/2" => 0.5,
                        _ => 0.0,
                    },
                )
            } else {
                continue;
            };

            if let Some(opponent) = all_players.iter().find(|p| p.id == opponent_id)
                && let Some(opponent_rating) = opponent.rating
            {
                // Calculate expected score using ELO formula
                let rating_diff = opponent_rating - player_rating;
                let expected_score = 1.0 / (1.0 + 10.0_f64.powf(rating_diff as f64 / 400.0));

                total_expected += expected_score;
                total_actual += actual_score;
                rated_games += 1;
            }
        }

        if rated_games == 0 {
            return Ok(None);
        }

        // Calculate K-factor based on player rating and games played
        let k_factor = self.calculate_k_factor(player_rating, rated_games);

        // Calculate rating change
        let rating_change = k_factor * (total_actual - total_expected);

        Ok(Some(rating_change.round() as i32))
    }

    fn calculate_k_factor(&self, player_rating: i32, games_played: i32) -> f64 {
        // FIDE K-factor rules
        if player_rating >= 2400 {
            10.0 // Top players
        } else if player_rating < 2300 && games_played < 30 {
            40.0 // New players under 2300
        } else {
            20.0 // Standard K-factor
        }
    }

    /// Generate cross-table showing all player vs player results
    pub async fn generate_cross_table(
        &self,
        tournament_id: i32,
        players: Vec<Player>,
        games: Vec<Game>,
    ) -> Result<CrossTable, PawnError> {
        let mut cross_table_rows = Vec::new();

        for player in &players {
            let mut results = Vec::new();
            let mut total_points = 0.0;
            let mut games_played = 0;

            for opponent in &players {
                if player.id == opponent.id {
                    // Player vs themselves - no entry
                    results.push(CrossTableEntry {
                        player_id: player.id,
                        opponent_id: opponent.id,
                        result: None,
                        color: None,
                        round: None,
                    });
                    continue;
                }

                // Find game between these players
                let game = games.iter().find(|g| {
                    (g.white_player_id == player.id && g.black_player_id == opponent.id)
                        || (g.white_player_id == opponent.id && g.black_player_id == player.id)
                });

                if let Some(game) = game {
                    let (result, color) = if game.white_player_id == player.id {
                        // Player was white
                        let result = match game.result.as_str() {
                            "1-0" => Some(1.0),
                            "0-1" => Some(0.0),
                            "1/2-1/2" => Some(0.5),
                            _ => None,
                        };
                        (result, Some("white".to_string()))
                    } else {
                        // Player was black
                        let result = match game.result.as_str() {
                            "1-0" => Some(0.0),
                            "0-1" => Some(1.0),
                            "1/2-1/2" => Some(0.5),
                            _ => None,
                        };
                        (result, Some("black".to_string()))
                    };

                    if let Some(points) = result {
                        total_points += points;
                        games_played += 1;
                    }

                    results.push(CrossTableEntry {
                        player_id: player.id,
                        opponent_id: opponent.id,
                        result,
                        color,
                        round: Some(game.round_number),
                    });
                } else {
                    // No game between these players
                    results.push(CrossTableEntry {
                        player_id: player.id,
                        opponent_id: opponent.id,
                        result: None,
                        color: None,
                        round: None,
                    });
                }
            }

            cross_table_rows.push(CrossTableRow {
                player: player.clone(),
                results,
                total_points,
                games_played,
            });
        }

        Ok(CrossTable {
            tournament_id,
            players,
            rows: cross_table_rows,
            last_updated: chrono::Utc::now().to_rfc3339(),
        })
    }

    /// Generate detailed tiebreak breakdown for a specific player and tiebreak type
    pub async fn generate_tiebreak_breakdown(
        &self,
        player: &Player,
        tiebreak_type: TiebreakType,
        games: &[Game],
        all_players: &[Player],
        results: &HashMap<i32, PlayerResult>,
    ) -> Result<TiebreakBreakdown, PawnError> {
        // Create a dummy PlayerResult for the tiebreak calculation
        let player_result = PlayerResult {
            player: player.clone(),
            points: 0.0,
            games_played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
        };

        let tiebreak_score = self.calculate_tiebreak_score(
            player,
            &player_result,
            &tiebreak_type,
            all_players,
            games,
            results,
        )?;
        let value = tiebreak_score.value;

        let (explanation, calculation_details, opponents_involved) = match tiebreak_type {
            TiebreakType::BuchholzFull => {
                self.generate_buchholz_breakdown(player, games, all_players, results, false)
                    .await?
            }
            TiebreakType::BuchholzCut1 => {
                self.generate_buchholz_breakdown(player, games, all_players, results, true)
                    .await?
            }
            TiebreakType::SonnebornBerger => {
                self.generate_sonneborn_berger_breakdown(player, games, all_players, results)
                    .await?
            }
            TiebreakType::DirectEncounter => {
                self.generate_direct_encounter_breakdown(player, games, all_players, results)
                    .await?
            }
            TiebreakType::AverageRatingOfOpponents => {
                self.generate_aro_breakdown(player, games, all_players)
                    .await?
            }
            TiebreakType::TournamentPerformanceRating => {
                self.generate_tpr_breakdown(player, games, all_players, results)
                    .await?
            }
            TiebreakType::NumberOfWins => {
                self.generate_wins_breakdown(player, games, results).await?
            }
            _ => {
                // Generic breakdown for other tiebreak types
                let explanation = format!(
                    "Calculated using {display_name} formula",
                    display_name = tiebreak_type.display_name()
                );
                let calculation_details = vec![TiebreakCalculationStep {
                    step_number: 1,
                    description: "Direct calculation".to_string(),
                    calculation: format!("Result: {value:.1}"),
                    intermediate_result: value,
                }];
                (explanation, calculation_details, Vec::new())
            }
        };

        Ok(TiebreakBreakdown {
            tiebreak_type,
            value,
            display_value: tiebreak_score.display_value,
            explanation,
            calculation_details,
            opponents_involved,
        })
    }

    /// Generate detailed Buchholz breakdown
    async fn generate_buchholz_breakdown(
        &self,
        player: &Player,
        games: &[Game],
        all_players: &[Player],
        results: &HashMap<i32, PlayerResult>,
        cut_lowest: bool,
    ) -> Result<
        (
            String,
            Vec<TiebreakCalculationStep>,
            Vec<OpponentContribution>,
        ),
        PawnError,
    > {
        let opponent_ids = self.get_opponent_ids(player, games);
        let mut opponents_involved = Vec::new();
        let mut calculation_details = Vec::new();
        let mut total_points = 0.0;
        let mut step_number = 1;

        // Step 1: Identify opponents
        calculation_details.push(TiebreakCalculationStep {
            step_number,
            description: "Identify all opponents played".to_string(),
            calculation: format!("Found {count} opponents", count = opponent_ids.len()),
            intermediate_result: opponent_ids.len() as f64,
        });
        step_number += 1;

        // Step 2: Collect opponent scores
        for &opponent_id in &opponent_ids {
            if let Some(opponent_result) = results.get(&opponent_id)
                && let Some(opponent_player) = all_players.iter().find(|p| p.id == opponent_id)
            {
                let points = opponent_result.points as f64;
                total_points += points;

                opponents_involved.push(OpponentContribution {
                    opponent_id,
                    opponent_name: opponent_player.name.clone(),
                    opponent_rating: opponent_player.rating,
                    contribution_value: points,
                    game_result: self.get_game_result_against(player, opponent_player, games),
                    explanation: format!("Opponent scored {points:.1} points"),
                });
            }
        }

        calculation_details.push(TiebreakCalculationStep {
            step_number,
            description: "Sum all opponent scores".to_string(),
            calculation: format!("Total: {total_points:.1} points"),
            intermediate_result: total_points,
        });
        step_number += 1;

        // Step 3: Apply cut if needed
        let _final_score = if cut_lowest && opponents_involved.len() > 1 {
            // Find and remove lowest score
            let min_score = opponents_involved
                .iter()
                .map(|o| o.contribution_value)
                .min_by(|a, b| a.partial_cmp(b).unwrap())
                .unwrap_or(0.0);

            let adjusted_total = total_points - min_score;

            calculation_details.push(TiebreakCalculationStep {
                step_number,
                description: "Remove lowest opponent score".to_string(),
                calculation: format!("{total_points:.1} - {min_score:.1} = {adjusted_total:.1}"),
                intermediate_result: adjusted_total,
            });

            adjusted_total
        } else {
            total_points
        };

        let tiebreak_name = if cut_lowest {
            "Buchholz Cut-1"
        } else {
            "Buchholz"
        };
        let explanation = format!(
            "{} sums the total points scored by all opponents you played against{}",
            tiebreak_name,
            if cut_lowest {
                ", excluding the lowest scoring opponent"
            } else {
                ""
            }
        );

        Ok((explanation, calculation_details, opponents_involved))
    }

    /// Generate detailed Sonneborn-Berger breakdown
    async fn generate_sonneborn_berger_breakdown(
        &self,
        player: &Player,
        games: &[Game],
        all_players: &[Player],
        results: &HashMap<i32, PlayerResult>,
    ) -> Result<
        (
            String,
            Vec<TiebreakCalculationStep>,
            Vec<OpponentContribution>,
        ),
        PawnError,
    > {
        let mut opponents_involved = Vec::new();
        let mut calculation_details = Vec::new();
        let mut total_sb = 0.0;
        let mut step_number = 1;

        calculation_details.push(TiebreakCalculationStep {
            step_number,
            description: "Calculate Sonneborn-Berger for each game".to_string(),
            calculation: "Game result x Opponent's total score".to_string(),
            intermediate_result: 0.0,
        });
        step_number += 1;

        for game in games {
            if game.result == "*" {
                continue;
            }

            let (opponent_id, game_points) = if game.white_player_id == player.id {
                (
                    game.black_player_id,
                    match game.result.as_str() {
                        "1-0" => 1.0,
                        "1/2-1/2" => 0.5,
                        _ => 0.0,
                    },
                )
            } else if game.black_player_id == player.id {
                (
                    game.white_player_id,
                    match game.result.as_str() {
                        "0-1" => 1.0,
                        "1/2-1/2" => 0.5,
                        _ => 0.0,
                    },
                )
            } else {
                continue;
            };

            if let Some(opponent_result) = results.get(&opponent_id)
                && let Some(opponent_player) = all_players.iter().find(|p| p.id == opponent_id)
            {
                let opponent_total = opponent_result.points as f64;
                let sb_contribution = game_points * opponent_total;
                total_sb += sb_contribution;

                opponents_involved.push(OpponentContribution {
                    opponent_id,
                    opponent_name: opponent_player.name.clone(),
                    opponent_rating: opponent_player.rating,
                    contribution_value: sb_contribution,
                    game_result: Some(game.result.clone()),
                    explanation: format!(
                        "{game_points:.1} x {opponent_total:.1} = {sb_contribution:.1}"
                    ),
                });

                calculation_details.push(TiebreakCalculationStep {
                    step_number,
                    description: format!("vs {name}", name = opponent_player.name),
                    calculation: format!(
                        "{game_points:.1} x {opponent_total:.1} = {sb_contribution:.1}"
                    ),
                    intermediate_result: sb_contribution,
                });
                step_number += 1;
            }
        }

        calculation_details.push(TiebreakCalculationStep {
            step_number,
            description: "Sum all contributions".to_string(),
            calculation: format!("Total: {total_sb:.1}"),
            intermediate_result: total_sb,
        });

        let explanation = "Sonneborn-Berger multiplies your score from each game by your opponent's total tournament score, then sums all results".to_string();

        Ok((explanation, calculation_details, opponents_involved))
    }

    /// Generate detailed Direct Encounter breakdown
    async fn generate_direct_encounter_breakdown(
        &self,
        player: &Player,
        games: &[Game],
        all_players: &[Player],
        results: &HashMap<i32, PlayerResult>,
    ) -> Result<
        (
            String,
            Vec<TiebreakCalculationStep>,
            Vec<OpponentContribution>,
        ),
        PawnError,
    > {
        let mut opponents_involved = Vec::new();
        let mut calculation_details = Vec::new();
        let mut total_de = 0.0;
        let mut step_number = 1;

        // Find players tied on same points
        let player_points = results
            .get(&player.id)
            .map(|r| r.points as f64)
            .unwrap_or(0.0);
        let tied_players: Vec<i32> = results
            .iter()
            .filter(|(_, result)| (result.points as f64 - player_points).abs() < 0.01)
            .map(|(id, _)| *id)
            .collect();

        calculation_details.push(TiebreakCalculationStep {
            step_number,
            description: "Identify players tied on same points".to_string(),
            calculation: format!(
                "{} players tied with {:.1} points",
                tied_players.len(),
                player_points
            ),
            intermediate_result: tied_players.len() as f64,
        });
        step_number += 1;

        // Calculate head-to-head results
        for game in games {
            if game.result == "*" {
                continue;
            }

            let (opponent_id, game_points) = if game.white_player_id == player.id {
                (
                    game.black_player_id,
                    match game.result.as_str() {
                        "1-0" => 1.0,
                        "1/2-1/2" => 0.5,
                        _ => 0.0,
                    },
                )
            } else if game.black_player_id == player.id {
                (
                    game.white_player_id,
                    match game.result.as_str() {
                        "0-1" => 1.0,
                        "1/2-1/2" => 0.5,
                        _ => 0.0,
                    },
                )
            } else {
                continue;
            };

            // Only count games against tied players
            if tied_players.contains(&opponent_id)
                && opponent_id != player.id
                && let Some(opponent_player) = all_players.iter().find(|p| p.id == opponent_id)
            {
                total_de += game_points;

                opponents_involved.push(OpponentContribution {
                    opponent_id,
                    opponent_name: opponent_player.name.clone(),
                    opponent_rating: opponent_player.rating,
                    contribution_value: game_points,
                    game_result: Some(game.result.clone()),
                    explanation: format!("Head-to-head: {game_points:.1} points"),
                });

                calculation_details.push(TiebreakCalculationStep {
                    step_number,
                    description: format!("vs {name} (tied player)", name = opponent_player.name),
                    calculation: format!("Result: {game_points:.1} points"),
                    intermediate_result: game_points,
                });
                step_number += 1;
            }
        }

        calculation_details.push(TiebreakCalculationStep {
            step_number,
            description: "Sum head-to-head results".to_string(),
            calculation: format!("Total: {total_de:.1}"),
            intermediate_result: total_de,
        });

        let explanation = "Direct Encounter sums your scores from games played against other players who finished with the same number of points".to_string();

        Ok((explanation, calculation_details, opponents_involved))
    }

    /// Generate detailed ARO breakdown
    async fn generate_aro_breakdown(
        &self,
        player: &Player,
        games: &[Game],
        all_players: &[Player],
    ) -> Result<
        (
            String,
            Vec<TiebreakCalculationStep>,
            Vec<OpponentContribution>,
        ),
        PawnError,
    > {
        let opponent_ids = self.get_opponent_ids(player, games);
        let mut opponents_involved = Vec::new();
        let mut calculation_details = Vec::new();
        let mut total_rating = 0;
        let mut rated_opponents = 0;
        let mut step_number = 1;

        calculation_details.push(TiebreakCalculationStep {
            step_number,
            description: "Collect opponent ratings".to_string(),
            calculation: format!("Found {count} opponents", count = opponent_ids.len()),
            intermediate_result: opponent_ids.len() as f64,
        });
        step_number += 1;

        for &opponent_id in &opponent_ids {
            if let Some(opponent_player) = all_players.iter().find(|p| p.id == opponent_id)
                && let Some(rating) = opponent_player.rating
            {
                total_rating += rating;
                rated_opponents += 1;

                opponents_involved.push(OpponentContribution {
                    opponent_id,
                    opponent_name: opponent_player.name.clone(),
                    opponent_rating: Some(rating),
                    contribution_value: rating as f64,
                    game_result: self.get_game_result_against(player, opponent_player, games),
                    explanation: format!("Rating: {rating}"),
                });
            }
        }

        let average_rating = if rated_opponents > 0 {
            total_rating as f64 / rated_opponents as f64
        } else {
            0.0
        };

        calculation_details.push(TiebreakCalculationStep {
            step_number,
            description: "Calculate average rating".to_string(),
            calculation: format!("{total_rating} / {rated_opponents} = {average_rating:.0}"),
            intermediate_result: average_rating,
        });

        let explanation = "Average Rating of Opponents (ARO) calculates the mean rating of all opponents you played against".to_string();

        Ok((explanation, calculation_details, opponents_involved))
    }

    /// Generate detailed TPR breakdown
    async fn generate_tpr_breakdown(
        &self,
        player: &Player,
        games: &[Game],
        all_players: &[Player],
        _results: &HashMap<i32, PlayerResult>,
    ) -> Result<
        (
            String,
            Vec<TiebreakCalculationStep>,
            Vec<OpponentContribution>,
        ),
        PawnError,
    > {
        let mut opponents_involved = Vec::new();
        let mut calculation_details = Vec::new();
        let mut total_rating = 0;
        let mut total_score = 0.0;
        let mut games_count = 0;
        let mut step_number = 1;

        calculation_details.push(TiebreakCalculationStep {
            step_number,
            description: "Collect opponent ratings and game results".to_string(),
            calculation: "For Tournament Performance Rating calculation".to_string(),
            intermediate_result: 0.0,
        });
        step_number += 1;

        for game in games {
            if game.result == "*" {
                continue;
            }

            let (opponent_id, game_score) = if game.white_player_id == player.id {
                (
                    game.black_player_id,
                    match game.result.as_str() {
                        "1-0" => 1.0,
                        "1/2-1/2" => 0.5,
                        _ => 0.0,
                    },
                )
            } else if game.black_player_id == player.id {
                (
                    game.white_player_id,
                    match game.result.as_str() {
                        "0-1" => 1.0,
                        "1/2-1/2" => 0.5,
                        _ => 0.0,
                    },
                )
            } else {
                continue;
            };

            if let Some(opponent_player) = all_players.iter().find(|p| p.id == opponent_id)
                && let Some(rating) = opponent_player.rating
            {
                total_rating += rating;
                total_score += game_score;
                games_count += 1;

                opponents_involved.push(OpponentContribution {
                    opponent_id,
                    opponent_name: opponent_player.name.clone(),
                    opponent_rating: Some(rating),
                    contribution_value: game_score,
                    game_result: Some(game.result.clone()),
                    explanation: format!("Rating: {rating}, Score: {game_score:.1}"),
                });
            }
        }

        if games_count > 0 {
            let avg_opponent_rating = total_rating as f64 / games_count as f64;
            let percentage = total_score / games_count as f64;

            calculation_details.push(TiebreakCalculationStep {
                step_number,
                description: "Calculate average opponent rating".to_string(),
                calculation: format!("{total_rating} / {games_count} = {avg_opponent_rating:.0}"),
                intermediate_result: avg_opponent_rating,
            });
            step_number += 1;

            calculation_details.push(TiebreakCalculationStep {
                step_number,
                description: "Calculate performance percentage".to_string(),
                calculation: format!(
                    "{:.1} / {} = {:.1}%",
                    total_score,
                    games_count,
                    percentage * 100.0
                ),
                intermediate_result: percentage,
            });
            step_number += 1;

            let dp = if percentage >= 0.99 {
                800.0
            } else if percentage <= 0.01 {
                -800.0
            } else {
                400.0_f64 * (percentage / (1.0_f64 - percentage)).ln() / (2.0_f64).ln()
            };

            let tpr = avg_opponent_rating + dp;

            calculation_details.push(TiebreakCalculationStep {
                step_number,
                description: "Apply ELO formula".to_string(),
                calculation: format!("{avg_opponent_rating:.0} + {dp:.0} = {tpr:.0}"),
                intermediate_result: tpr,
            });
        }

        let explanation = "Tournament Performance Rating (TPR) estimates what your rating would be based on your performance against the opponents you faced".to_string();

        Ok((explanation, calculation_details, opponents_involved))
    }

    /// Generate detailed wins breakdown
    async fn generate_wins_breakdown(
        &self,
        player: &Player,
        games: &[Game],
        _results: &HashMap<i32, PlayerResult>,
    ) -> Result<
        (
            String,
            Vec<TiebreakCalculationStep>,
            Vec<OpponentContribution>,
        ),
        PawnError,
    > {
        let mut calculation_details = Vec::new();
        let mut wins = 0;
        let mut step_number = 1;

        calculation_details.push(TiebreakCalculationStep {
            step_number,
            description: "Count decisive wins".to_string(),
            calculation: "Count games where result was 1-0 or 0-1 in your favor".to_string(),
            intermediate_result: 0.0,
        });
        step_number += 1;

        for game in games {
            let won = (game.white_player_id == player.id && game.result == "1-0")
                || (game.black_player_id == player.id && game.result == "0-1");

            if won {
                wins += 1;
                calculation_details.push(TiebreakCalculationStep {
                    step_number,
                    description: format!("Win in round {round}", round = game.round_number),
                    calculation: format!("Result: {result}", result = game.result),
                    intermediate_result: 1.0,
                });
                step_number += 1;
            }
        }

        calculation_details.push(TiebreakCalculationStep {
            step_number,
            description: "Total wins".to_string(),
            calculation: format!("Total: {wins}"),
            intermediate_result: wins as f64,
        });

        let explanation =
            "Number of Wins counts your decisive victories (excludes draws and losses)".to_string();

        Ok((explanation, calculation_details, Vec::new()))
    }

    /// Helper method to get game result against specific opponent
    fn get_game_result_against(
        &self,
        player: &Player,
        opponent: &Player,
        games: &[Game],
    ) -> Option<String> {
        for game in games {
            if (game.white_player_id == player.id && game.black_player_id == opponent.id)
                || (game.white_player_id == opponent.id && game.black_player_id == player.id)
            {
                return Some(game.result.clone());
            }
        }
        None
    }
}
