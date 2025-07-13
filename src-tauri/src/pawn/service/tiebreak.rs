use std::collections::HashMap;
use std::sync::Arc;
use tracing::instrument;

use crate::pawn::{
    common::error::PawnError,
    db::Db,
    domain::{
        model::{Game, Player, PlayerResult},
        tiebreak::{
            PlayerStanding, StandingsCalculationResult, TiebreakScore, TiebreakType,
            TournamentTiebreakConfig,
        },
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
        let players = self.db.get_players_by_tournament(tournament_id).await
            .map_err(PawnError::Database)?;
        let games = self.db.get_games_by_tournament(tournament_id).await
            .map_err(PawnError::Database)?;
        
        // Calculate base scores
        let player_results = self.calculate_player_results(&players, &games)?;
        
        // Calculate tiebreak scores for each player
        let mut standings: Vec<PlayerStanding> = Vec::new();
        
        for (player_id, result) in player_results.iter() {
            // Find the actual player object
            let player = players.iter()
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
                rating_change: None, // TODO: Implement rating change calculation
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
            TiebreakType::BuchholzFull => self.calculate_buchholz_full(player, all_games, all_results)?,
            TiebreakType::BuchholzCut1 => self.calculate_buchholz_cut1(player, all_games, all_results)?,
            TiebreakType::BuchholzCut2 => self.calculate_buchholz_cut2(player, all_games, all_results)?,
            TiebreakType::SonnebornBerger => self.calculate_sonneborn_berger(player, all_games, all_results)?,
            TiebreakType::NumberOfWins => player_result.wins as f64,
            TiebreakType::ProgressiveScore => self.calculate_progressive_score(player, all_games)?,
            TiebreakType::DirectEncounter => self.calculate_direct_encounter(player, all_games, all_results)?,
            TiebreakType::AverageRatingOfOpponents => self.calculate_aro(player, all_games, all_players)?,
            TiebreakType::NumberOfGamesWithBlack => self.count_games_with_black(player, all_games)? as f64,
            TiebreakType::NumberOfWinsWithBlack => self.count_wins_with_black(player, all_games)? as f64,
            _ => 0.0, // TODO: Implement remaining tiebreak types
        };
        
        Ok(TiebreakScore {
            tiebreak_type: tiebreak_type.clone(),
            value,
            display_value: format!("{:.3}", value),
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
                (true, game.black_player_id, match game.result.as_str() {
                    "1-0" => 1.0,
                    "1/2-1/2" => 0.5,
                    _ => 0.0,
                })
            } else if game.black_player_id == player.id {
                (false, game.white_player_id, match game.result.as_str() {
                    "0-1" => 1.0,
                    "1/2-1/2" => 0.5,
                    _ => 0.0,
                })
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
        _player: &Player,
        _games: &[Game],
        _results: &HashMap<i32, PlayerResult>,
    ) -> Result<f64, PawnError> {
        // This is a simplified version - in a real implementation,
        // we'd need to handle multiple players tied on points
        Ok(0.0)
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
            if let Some(opponent) = all_players.iter().find(|p| p.id == opponent_id) {
                if let Some(rating) = opponent.rating {
                    total_rating += rating;
                    rated_opponents += 1;
                }
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
                (game.black_player_id, match game.result.as_str() {
                    "1-0" => 1.0,
                    "1/2-1/2" => 0.5,
                    _ => 0.0,
                })
            } else if game.black_player_id == player.id {
                (game.white_player_id, match game.result.as_str() {
                    "0-1" => 1.0,
                    "1/2-1/2" => 0.5,
                    _ => 0.0,
                })
            } else {
                continue;
            };
            
            if let Some(opponent) = all_players.iter().find(|p| p.id == opponent_id) {
                if let Some(rating) = opponent.rating {
                    opponent_ratings.push(rating);
                    score += game_score;
                    games_count += 1;
                }
            }
        }
        
        if opponent_ratings.is_empty() {
            return Ok(None);
        }
        
        let avg_opponent_rating: f64 = opponent_ratings.iter().sum::<i32>() as f64 / opponent_ratings.len() as f64;
        let percentage = score / games_count as f64;
        
        // Simplified TPR calculation
        let tpr = avg_opponent_rating + 400.0 * (percentage - 0.5);
        
        Ok(Some(tpr as i32))
    }

    fn count_games_with_black(
        &self,
        player: &Player,
        games: &[Game],
    ) -> Result<i32, PawnError> {
        Ok(games
            .iter()
            .filter(|g| g.black_player_id == player.id && g.result != "*")
            .count() as i32)
    }

    fn count_wins_with_black(
        &self,
        player: &Player,
        games: &[Game],
    ) -> Result<i32, PawnError> {
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
                if let (Some(a_score), Some(b_score)) = (
                    a.tiebreak_scores.get(i),
                    b.tiebreak_scores.get(i),
                ) {
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
                let tied = prev.points == curr.points &&
                    prev.tiebreak_scores.iter().zip(curr.tiebreak_scores.iter())
                        .all(|(a, b)| a.value == b.value);
                
                if !tied {
                    current_rank = i + 1;
                }
            }
            
            standings[i].rank = current_rank as i32;
        }
    }
}