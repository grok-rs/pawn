use crate::pawn::{
    common::error::PawnError,
    db::Db,
    domain::{
        dto::{
            ColorBalanceAnalysisDto, FloatStatisticsDto, RatingDistributionDto,
            ScoreGroupDto, SwissPairingAnalysis, SwissPairingOptions,
        },
        model::{GameResult, Player, PlayerResult},
    },
};
use std::{collections::HashMap, sync::Arc};

pub struct SwissAnalysisService<D> {
    db: Arc<D>,
}

impl<D: Db> SwissAnalysisService<D> {
    pub fn new(db: Arc<D>) -> Self {
        Self { db }
    }

    pub async fn analyze_swiss_pairings(
        &self,
        tournament_id: i32,
        round_number: i32,
        options: SwissPairingOptions,
    ) -> Result<SwissPairingAnalysis, PawnError> {
        // Get players and their current results
        let players = self
            .db
            .get_players_by_tournament(tournament_id)
            .await
            .map_err(PawnError::Database)?;

        let player_results = self
            .db
            .get_player_results(tournament_id)
            .await
            .map_err(PawnError::Database)?;

        // Get game history for color and opponent analysis
        let game_results = self
            .db
            .get_game_results(tournament_id)
            .await
            .map_err(PawnError::Database)?;

        // Filter games up to the specified round
        let games_up_to_round: Vec<_> = game_results
            .into_iter()
            .filter(|game| game.game.round_number < round_number)
            .collect();

        // Create lookup maps
        let player_map: HashMap<i32, &Player> = players.iter().map(|p| (p.id, p)).collect();
        let results_map: HashMap<i32, &PlayerResult> =
            player_results.iter().map(|pr| (pr.player.id, pr)).collect();

        // Analyze score groups
        let score_groups = self.analyze_score_groups(&player_results);

        // Analyze floats (players moving between score groups)
        let float_statistics = self.analyze_floats(&player_results, &score_groups);

        // Analyze color balance
        let color_balance_analysis =
            self.analyze_color_balance(&players, &games_up_to_round, &player_map);

        // Analyze rating distribution
        let rating_distribution = self.analyze_rating_distribution(&player_results, &options);

        Ok(SwissPairingAnalysis {
            score_groups,
            float_statistics,
            color_balance_analysis,
            rating_distribution,
        })
    }

    fn analyze_score_groups(&self, player_results: &[PlayerResult]) -> Vec<ScoreGroupDto> {
        let mut score_groups: HashMap<String, Vec<&PlayerResult>> = HashMap::new();

        // Group players by score (using string to handle half-points)
        for result in player_results {
            let score_key = format!("{:.1}", result.points);
            score_groups.entry(score_key).or_default().push(result);
        }

        let mut groups: Vec<ScoreGroupDto> = score_groups
            .into_iter()
            .map(|(score_str, results)| {
                let score = score_str.parse::<f64>().unwrap_or(0.0);
                let player_count = results.len();

                // Calculate average rating for this score group
                let total_rating: i32 = results
                    .iter()
                    .filter_map(|r| r.player.rating)
                    .sum();
                let rated_players = results.iter().filter(|r| r.player.rating.is_some()).count();
                let average_rating = if rated_players > 0 {
                    total_rating as f64 / rated_players as f64
                } else {
                    0.0
                };

                ScoreGroupDto {
                    score,
                    player_count,
                    average_rating,
                    floats_up: 0,   // Will be calculated in analyze_floats
                    floats_down: 0, // Will be calculated in analyze_floats
                }
            })
            .collect();

        // Sort by score descending
        groups.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
        groups
    }

    fn analyze_floats(
        &self,
        _player_results: &[PlayerResult],
        score_groups: &[ScoreGroupDto],
    ) -> FloatStatisticsDto {
        // For now, calculate theoretical floats based on group sizes
        // In a full implementation, this would track actual floats from pairing generation
        let total_players: usize = score_groups.iter().map(|g| g.player_count).sum();
        let odd_groups = score_groups.iter().filter(|g| g.player_count % 2 == 1).count();

        // Estimate floats based on odd-sized groups
        let estimated_floats = odd_groups;
        let float_percentage = if total_players > 0 {
            (estimated_floats as f64 / total_players as f64) * 100.0
        } else {
            0.0
        };

        FloatStatisticsDto {
            total_floats: estimated_floats,
            up_floats: estimated_floats / 2,   // Rough estimate
            down_floats: estimated_floats / 2, // Rough estimate
            float_percentage,
        }
    }

    fn analyze_color_balance(
        &self,
        players: &[Player],
        games: &[GameResult],
        player_map: &HashMap<i32, &Player>,
    ) -> ColorBalanceAnalysisDto {
        let mut color_stats: HashMap<i32, (i32, i32)> = HashMap::new(); // (white_games, black_games)

        // Count colors for each player
        for game in games {
            if game.game.result != "*" {
                // Only count finished games
                if let Some(_) = player_map.get(&game.game.white_player_id) {
                    let entry = color_stats.entry(game.game.white_player_id).or_insert((0, 0));
                    entry.0 += 1; // White game
                }
                if let Some(_) = player_map.get(&game.game.black_player_id) {
                    let entry = color_stats.entry(game.game.black_player_id).or_insert((0, 0));
                    entry.1 += 1; // Black game
                }
            }
        }

        let mut players_with_imbalance = 0;
        let mut players_needing_white = 0;
        let mut players_needing_black = 0;
        let mut total_balance = 0i32;

        for player in players {
            if let Some((white_games, black_games)) = color_stats.get(&player.id) {
                let balance = white_games - black_games;
                total_balance += balance.abs();

                if balance.abs() > 1 {
                    players_with_imbalance += 1;
                }

                if balance < -1 {
                    players_needing_white += 1;
                } else if balance > 1 {
                    players_needing_black += 1;
                }
            }
        }

        let average_color_balance = if players.len() > 0 {
            total_balance as f64 / players.len() as f64
        } else {
            0.0
        };

        ColorBalanceAnalysisDto {
            players_with_color_imbalance: players_with_imbalance,
            average_color_balance,
            players_needing_white,
            players_needing_black,
        }
    }

    fn analyze_rating_distribution(
        &self,
        player_results: &[PlayerResult],
        _options: &SwissPairingOptions,
    ) -> RatingDistributionDto {
        let rated_players: Vec<_> = player_results
            .iter()
            .filter(|pr| pr.player.rating.is_some())
            .collect();

        if rated_players.len() < 2 {
            return RatingDistributionDto {
                average_rating_difference: 0.0,
                max_rating_difference: 0.0,
                min_rating_difference: 0.0,
                pairs_with_large_rating_gap: 0,
            };
        }

        // For this analysis, we'll estimate based on score groups
        // Group players by score for potential pairings
        let mut score_groups: HashMap<String, Vec<&PlayerResult>> = HashMap::new();
        for result in &rated_players {
            let score_key = format!("{:.1}", result.points);
            score_groups.entry(score_key).or_default().push(result);
        }

        let mut rating_differences = Vec::new();
        let mut large_gap_pairs = 0;

        // Analyze potential pairings within each score group
        for (_, group) in score_groups {
            if group.len() < 2 {
                continue;
            }

            // Sort by rating within the group
            let mut sorted_group = group;
            sorted_group.sort_by_key(|pr| pr.player.rating.unwrap_or(0));

            // Calculate differences between adjacent players (most likely pairings)
            for i in 0..sorted_group.len() - 1 {
                if let (Some(rating1), Some(rating2)) = (
                    sorted_group[i].player.rating,
                    sorted_group[i + 1].player.rating,
                ) {
                    let diff = (rating1 - rating2).abs();
                    rating_differences.push(diff as f64);

                    if diff > 200 {
                        // Consider >200 rating difference as large gap
                        large_gap_pairs += 1;
                    }
                }
            }
        }

        let average_rating_difference = if !rating_differences.is_empty() {
            rating_differences.iter().sum::<f64>() / rating_differences.len() as f64
        } else {
            0.0
        };

        let max_rating_difference = rating_differences
            .iter()
            .fold(0.0f64, |acc, &x| acc.max(x));

        let min_rating_difference = rating_differences
            .iter()
            .fold(f64::INFINITY, |acc, &x| acc.min(x));

        RatingDistributionDto {
            average_rating_difference,
            max_rating_difference,
            min_rating_difference: if min_rating_difference == f64::INFINITY {
                0.0
            } else {
                min_rating_difference
            },
            pairs_with_large_rating_gap: large_gap_pairs,
        }
    }
}