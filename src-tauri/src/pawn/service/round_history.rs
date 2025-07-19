use std::collections::HashMap;
use std::sync::Arc;

use crate::pawn::{
    common::error::PawnError,
    db::Db,
    domain::{
        dto::{
            ColorBalance, PlayerActivityMetric, PlayerPerformanceMetric, PlayerProgressionData,
            ResultDistribution, RoundDurationStats, RoundExportRequest, RoundHistory,
            RoundProgression, RoundStatistics, TournamentStatistics,
        },
        model::{GameResult},
        tiebreak::{PlayerStanding, TournamentTiebreakConfig},
    },
    service::tiebreak::TiebreakCalculator,
};

pub struct RoundHistoryService<D> {
    db: Arc<D>,
    tiebreak_calculator: TiebreakCalculator<D>,
}

impl<D: Db> RoundHistoryService<D> {
    pub fn new(db: Arc<D>) -> Self {
        Self {
            tiebreak_calculator: TiebreakCalculator::new(Arc::clone(&db)),
            db,
        }
    }

    /// Get historical data for a specific round
    pub async fn get_round_history(
        &self,
        tournament_id: i32,
        round_number: i32,
    ) -> Result<RoundHistory, PawnError> {
        // Get the round
        let rounds = self
            .db
            .get_rounds_by_tournament(tournament_id)
            .await
            .map_err(PawnError::Database)?;

        let round = rounds
            .into_iter()
            .find(|r| r.round_number == round_number)
            .ok_or_else(|| {
                PawnError::InvalidInput(format!("Round {} not found", round_number))
            })?;

        // Get games for this round
        let games = self
            .db
            .get_games_by_round(tournament_id, round_number)
            .await
            .map_err(PawnError::Database)?;

        // Calculate standings as they were at the end of this round
        let standings = self
            .calculate_historical_standings(tournament_id, round_number)
            .await?;

        // Calculate round statistics
        let statistics = self.calculate_round_statistics(&games, &standings).await?;

        Ok(RoundHistory {
            round,
            standings,
            games,
            statistics,
        })
    }

    /// Get progression data for all rounds in a tournament
    pub async fn get_tournament_progression(
        &self,
        tournament_id: i32,
    ) -> Result<RoundProgression, PawnError> {
        let rounds = self
            .db
            .get_rounds_by_tournament(tournament_id)
            .await
            .map_err(PawnError::Database)?;

        let mut round_histories = Vec::new();
        let mut progression_chart = Vec::new();
        let mut player_data_map: HashMap<i32, PlayerProgressionData> = HashMap::new();

        // Process each round
        for round in &rounds {
            let round_history = self
                .get_round_history(tournament_id, round.round_number)
                .await?;

            // Update progression chart data
            for standing in &round_history.standings {
                let player_data = player_data_map
                    .entry(standing.player.id)
                    .or_insert_with(|| PlayerProgressionData {
                        player_id: standing.player.id,
                        player_name: standing.player.name.clone(),
                        round_scores: Vec::new(),
                        cumulative_scores: Vec::new(),
                        positions: Vec::new(),
                        rating_changes: Vec::new(),
                    });

                // Calculate round score (difference from previous cumulative)
                let round_score = if let Some(prev_score) = player_data.cumulative_scores.last() {
                    (standing.points - (*prev_score as f64)) as f32
                } else {
                    standing.points as f32
                };

                player_data.round_scores.push(round_score);
                player_data.cumulative_scores.push(standing.points as f32);
                player_data.positions.push(standing.rank);
                player_data.rating_changes.push(None); // TODO: Calculate rating changes
            }

            round_histories.push(round_history);
        }

        progression_chart = player_data_map.into_values().collect();

        // Calculate tournament statistics
        let tournament_statistics = self.calculate_tournament_statistics(&round_histories).await?;

        Ok(RoundProgression {
            tournament_id,
            round_histories,
            progression_chart,
            tournament_statistics,
        })
    }

    /// Calculate historical standings as they were at the end of a specific round
    async fn calculate_historical_standings(
        &self,
        tournament_id: i32,
        round_number: i32,
    ) -> Result<Vec<PlayerStanding>, PawnError> {
        // Get all games up to and including the specified round
        let all_games = self
            .db
            .get_game_results(tournament_id)
            .await
            .map_err(PawnError::Database)?;

        let historical_games: Vec<GameResult> = all_games
            .into_iter()
            .filter(|game_result| game_result.game.round_number <= round_number)
            .collect();

        // Get tournament tiebreak config
        let config = TournamentTiebreakConfig::default();

        // Calculate standings using the tiebreak calculator
        let standings_result = self
            .tiebreak_calculator
            .calculate_standings(tournament_id, &config)
            .await?;

        Ok(standings_result.standings)
    }

    /// Calculate statistics for a specific round
    async fn calculate_round_statistics(
        &self,
        games: &[GameResult],
        standings: &[PlayerStanding],
    ) -> Result<RoundStatistics, PawnError> {
        let total_games = games.len() as i32;
        let completed_games = games.iter().filter(|g| g.game.result != "*").count() as i32;
        let ongoing_games = total_games - completed_games;

        let mut white_wins = 0;
        let mut black_wins = 0;
        let mut draws = 0;

        for game in games {
            match game.game.result.as_str() {
                "1-0" => white_wins += 1,
                "0-1" => black_wins += 1,
                "1/2-1/2" => draws += 1,
                _ => {} // Ongoing or other results
            }
        }

        let completion_rate = if total_games > 0 {
            (completed_games as f64 / total_games as f64) * 100.0
        } else {
            0.0
        };

        // Calculate performance metrics for each player
        let mut performance_metrics = Vec::new();
        for standing in standings {
            let player_games: Vec<&GameResult> = games
                .iter()
                .filter(|g| {
                    g.game.white_player_id == standing.player.id
                        || g.game.black_player_id == standing.player.id
                })
                .collect();

            let mut white_games = 0;
            let mut black_games = 0;
            let mut round_score = 0.0;

            for game in &player_games {
                if game.game.white_player_id == standing.player.id {
                    white_games += 1;
                    match game.game.result.as_str() {
                        "1-0" => round_score += 1.0,
                        "1/2-1/2" => round_score += 0.5,
                        _ => {}
                    }
                } else if game.game.black_player_id == standing.player.id {
                    black_games += 1;
                    match game.game.result.as_str() {
                        "0-1" => round_score += 1.0,
                        "1/2-1/2" => round_score += 0.5,
                        _ => {}
                    }
                }
            }

            let color_preference = if white_games > black_games {
                "white".to_string()
            } else if black_games > white_games {
                "black".to_string()
            } else {
                "balanced".to_string()
            };

            performance_metrics.push(PlayerPerformanceMetric {
                player_id: standing.player.id,
                player_name: standing.player.name.clone(),
                round_score: round_score as f32,
                cumulative_score: standing.points as f32,
                position: standing.rank,
                position_change: 0, // TODO: Calculate position change
                rating_change: None, // TODO: Calculate rating change
                color_balance: ColorBalance {
                    white_games,
                    black_games,
                    color_preference,
                },
            });
        }

        Ok(RoundStatistics {
            total_games,
            completed_games,
            ongoing_games,
            white_wins,
            black_wins,
            draws,
            completion_rate,
            average_game_duration: None, // TODO: Calculate from timestamps
            performance_metrics,
        })
    }

    /// Calculate overall tournament statistics
    async fn calculate_tournament_statistics(
        &self,
        round_histories: &[RoundHistory],
    ) -> Result<TournamentStatistics, PawnError> {
        let total_rounds = round_histories.len() as i32;
        let completed_rounds = round_histories
            .iter()
            .filter(|r| r.round.status == "completed" || r.round.status == "verified")
            .count() as i32;

        let mut total_games = 0;
        let mut total_white_wins = 0;
        let mut total_black_wins = 0;
        let mut total_draws = 0;

        for round_history in round_histories {
            let stats = &round_history.statistics;
            total_games += stats.total_games;
            total_white_wins += stats.white_wins;
            total_black_wins += stats.black_wins;
            total_draws += stats.draws;
        }

        let decisive_games = total_white_wins + total_black_wins;
        let draw_rate = if total_games > 0 {
            (total_draws as f64 / total_games as f64) * 100.0
        } else {
            0.0
        };

        let white_advantage = if decisive_games > 0 {
            (total_white_wins as f64 / decisive_games as f64) * 100.0 - 50.0
        } else {
            0.0
        };

        let result_distribution = ResultDistribution {
            white_wins: total_white_wins,
            black_wins: total_black_wins,
            draws: total_draws,
            decisive_games,
            draw_rate,
            white_advantage,
        };

        // Calculate player activity metrics
        let mut player_activity_map: HashMap<i32, (String, i32, i32, i32)> = HashMap::new();
        for round_history in round_histories {
            for game in &round_history.games {
                // Track games played for each player
                {
                    let white_entry = player_activity_map
                        .entry(game.white_player.id)
                        .or_insert((game.white_player.name.clone(), 0, 0, 0));
                    white_entry.1 += 1;
                    
                    // Check for byes (opponent with negative ID)
                    if game.black_player.id < 0 {
                        white_entry.2 += 1; // Bye for white player
                    }
                }

                {
                    let black_entry = player_activity_map
                        .entry(game.black_player.id)
                        .or_insert((game.black_player.name.clone(), 0, 0, 0));
                    black_entry.1 += 1;
                }
            }
        }

        let player_activity: Vec<PlayerActivityMetric> = player_activity_map
            .into_iter()
            .map(|(player_id, (name, games_played, byes, withdrawals))| {
                let activity_rate = if total_rounds > 0 {
                    (games_played as f64 / total_rounds as f64) * 100.0
                } else {
                    0.0
                };

                PlayerActivityMetric {
                    player_id,
                    player_name: name,
                    games_played,
                    byes,
                    withdrawals,
                    activity_rate,
                }
            })
            .collect();

        // Calculate round duration stats
        let round_duration_stats = RoundDurationStats {
            average_duration: 0.0,    // TODO: Calculate from timestamps
            median_duration: 0.0,     // TODO: Calculate from timestamps
            min_duration: 0.0,        // TODO: Calculate from timestamps
            max_duration: 0.0,        // TODO: Calculate from timestamps
            duration_by_round: vec![], // TODO: Calculate from timestamps
        };

        Ok(TournamentStatistics {
            total_rounds,
            completed_rounds,
            total_games,
            result_distribution,
            player_activity,
            round_duration_stats,
        })
    }

    /// Export round data
    pub async fn export_round_data(
        &self,
        request: RoundExportRequest,
    ) -> Result<Vec<u8>, PawnError> {
        match request.format.as_str() {
            "json" => {
                let data = if let Some(round_number) = request.round_number {
                    // Export specific round
                    let round_history = self
                        .get_round_history(request.tournament_id, round_number)
                        .await?;
                    serde_json::to_vec_pretty(&round_history)
                        .map_err(|e| PawnError::InvalidInput(format!("JSON export failed: {}", e)))?
                } else {
                    // Export all rounds
                    let progression = self.get_tournament_progression(request.tournament_id).await?;
                    serde_json::to_vec_pretty(&progression)
                        .map_err(|e| PawnError::InvalidInput(format!("JSON export failed: {}", e)))?
                };
                Ok(data)
            }
            "csv" => {
                // TODO: Implement CSV export
                Err(PawnError::InvalidInput("CSV export not yet implemented".into()))
            }
            "pdf" => {
                // TODO: Implement PDF export
                Err(PawnError::InvalidInput("PDF export not yet implemented".into()))
            }
            _ => Err(PawnError::InvalidInput(format!(
                "Unsupported export format: {}",
                request.format
            ))),
        }
    }
}

// TODO: Add tests when mock database is available
// #[cfg(test)]
// mod tests {
//     use super::*;
//     use std::sync::Arc;
//
//     #[tokio::test]
//     async fn test_round_history_service_creation() {
//         // Test service creation
//         assert!(true); // Service created successfully
//     }
// }