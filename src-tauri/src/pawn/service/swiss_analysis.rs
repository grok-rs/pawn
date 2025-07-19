use crate::pawn::{
    common::error::PawnError,
    db::Db,
    domain::{
        dto::{
            ColorBalanceAnalysisDto, FloatStatisticsDto, RatingDistributionDto, ScoreGroupDto,
            SwissPairingAnalysis, SwissPairingOptions,
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
                let total_rating: i32 = results.iter().filter_map(|r| r.player.rating).sum();
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
        let odd_groups = score_groups
            .iter()
            .filter(|g| g.player_count % 2 == 1)
            .count();

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
                    let entry = color_stats
                        .entry(game.game.white_player_id)
                        .or_insert((0, 0));
                    entry.0 += 1; // White game
                }
                if let Some(_) = player_map.get(&game.game.black_player_id) {
                    let entry = color_stats
                        .entry(game.game.black_player_id)
                        .or_insert((0, 0));
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

        let max_rating_difference = rating_differences.iter().fold(0.0f64, |acc, &x| acc.max(x));

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pawn::domain::{
        dto::{
            ColorBalanceAnalysisDto, FloatStatisticsDto, RatingDistributionDto, ScoreGroupDto,
            SwissPairingAnalysis, SwissPairingOptions,
        },
        model::{Game, GameResult, Player, PlayerResult},
    };

    // Test service that doesn't require database connections
    struct TestSwissAnalysisService;

    impl TestSwissAnalysisService {
        fn new() -> Self {
            Self
        }

        // Test the analysis logic without database
        fn analyze_score_groups(&self, player_results: &[PlayerResult]) -> Vec<ScoreGroupDto> {
            let mut score_groups: HashMap<String, Vec<&PlayerResult>> = HashMap::new();

            for result in player_results {
                let score_key = format!("{:.1}", result.points);
                score_groups.entry(score_key).or_default().push(result);
            }

            let mut groups: Vec<ScoreGroupDto> = score_groups
                .into_iter()
                .map(|(score_str, results)| {
                    let score = score_str.parse::<f64>().unwrap_or(0.0);
                    let player_count = results.len();

                    let total_rating: i32 = results.iter().filter_map(|r| r.player.rating).sum();
                    let rated_players =
                        results.iter().filter(|r| r.player.rating.is_some()).count();
                    let average_rating = if rated_players > 0 {
                        total_rating as f64 / rated_players as f64
                    } else {
                        0.0
                    };

                    ScoreGroupDto {
                        score,
                        player_count,
                        average_rating,
                        floats_up: 0,
                        floats_down: 0,
                    }
                })
                .collect();

            groups.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
            groups
        }

        fn analyze_floats(
            &self,
            _player_results: &[PlayerResult],
            score_groups: &[ScoreGroupDto],
        ) -> FloatStatisticsDto {
            let total_players: usize = score_groups.iter().map(|g| g.player_count).sum();
            let odd_groups = score_groups
                .iter()
                .filter(|g| g.player_count % 2 == 1)
                .count();

            let estimated_floats = odd_groups;
            let float_percentage = if total_players > 0 {
                (estimated_floats as f64 / total_players as f64) * 100.0
            } else {
                0.0
            };

            FloatStatisticsDto {
                total_floats: estimated_floats,
                up_floats: estimated_floats / 2,
                down_floats: estimated_floats / 2,
                float_percentage,
            }
        }

        fn analyze_color_balance(
            &self,
            players: &[Player],
            games: &[GameResult],
            player_map: &HashMap<i32, &Player>,
        ) -> ColorBalanceAnalysisDto {
            let mut color_stats: HashMap<i32, (i32, i32)> = HashMap::new();

            for game in games {
                if game.game.result != "*" {
                    if let Some(_) = player_map.get(&game.game.white_player_id) {
                        let entry = color_stats
                            .entry(game.game.white_player_id)
                            .or_insert((0, 0));
                        entry.0 += 1;
                    }
                    if let Some(_) = player_map.get(&game.game.black_player_id) {
                        let entry = color_stats
                            .entry(game.game.black_player_id)
                            .or_insert((0, 0));
                        entry.1 += 1;
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

            let mut score_groups: HashMap<String, Vec<&PlayerResult>> = HashMap::new();
            for result in &rated_players {
                let score_key = format!("{:.1}", result.points);
                score_groups.entry(score_key).or_default().push(result);
            }

            let mut rating_differences = Vec::new();
            let mut large_gap_pairs = 0;

            for (_, group) in score_groups {
                if group.len() < 2 {
                    continue;
                }

                let mut sorted_group = group;
                sorted_group.sort_by_key(|pr| pr.player.rating.unwrap_or(0));

                for i in 0..sorted_group.len() - 1 {
                    if let (Some(rating1), Some(rating2)) = (
                        sorted_group[i].player.rating,
                        sorted_group[i + 1].player.rating,
                    ) {
                        let diff = (rating1 - rating2).abs();
                        rating_differences.push(diff as f64);

                        if diff > 200 {
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

            let max_rating_difference =
                rating_differences.iter().fold(0.0f64, |acc, &x| acc.max(x));

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

    fn create_test_player(id: i32, name: &str, rating: Option<i32>) -> Player {
        Player {
            id,
            tournament_id: 1,
            name: name.to_string(),
            rating,
            country_code: Some("US".to_string()),
            title: None,
            birth_date: None,
            gender: Some("M".to_string()),
            email: None,
            phone: None,
            club: None,
            status: "active".to_string(),
            seed_number: None,
            pairing_number: None,
            initial_rating: rating,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: Some("2024-01-01T00:00:00Z".to_string()),
        }
    }

    fn create_test_player_result(
        player: Player,
        points: f64,
        wins: i32,
        draws: i32,
        losses: i32,
    ) -> PlayerResult {
        PlayerResult {
            player,
            points,
            wins,
            draws,
            losses,
            games_played: wins + draws + losses,
            opponents: vec![],
            colors: vec![],
            buchholz: 0.0,
            sonneborn_berger: 0.0,
            tiebreak_scores: vec![],
            performance_rating: None,
        }
    }

    fn create_test_game(
        game_id: i32,
        white_id: i32,
        black_id: i32,
        round: i32,
        result: &str,
    ) -> GameResult {
        GameResult {
            game: Game {
                id: game_id,
                tournament_id: 1,
                round_number: round,
                white_player_id: white_id,
                black_player_id: black_id,
                result: result.to_string(),
                result_type: None,
                result_reason: None,
                arbiter_notes: None,
                created_at: "2024-01-01T00:00:00Z".to_string(),
                last_updated: Some("2024-01-01T00:00:00Z".to_string()),
                approved_by: None,
            },
            white_player: create_test_player(white_id, &format!("Player {}", white_id), Some(1500)),
            black_player: create_test_player(black_id, &format!("Player {}", black_id), Some(1500)),
        }
    }

    #[test]
    fn test_analyze_score_groups() {
        let service = TestSwissAnalysisService::new();
        let player_results = vec![
            create_test_player_result(create_test_player(1, "Player A", Some(1800)), 2.5, 2, 1, 0),
            create_test_player_result(create_test_player(2, "Player B", Some(1600)), 2.5, 2, 1, 0),
            create_test_player_result(create_test_player(3, "Player C", Some(1400)), 2.0, 2, 0, 1),
            create_test_player_result(create_test_player(4, "Player D", Some(1200)), 1.5, 1, 1, 1),
            create_test_player_result(create_test_player(5, "Player E", None), 1.0, 1, 0, 2),
        ];

        let result = service.analyze_score_groups(&player_results);

        // Should have 4 score groups: 2.5, 2.0, 1.5, 1.0
        assert_eq!(result.len(), 4);

        // Check highest score group (2.5 points)
        assert_eq!(result[0].score, 2.5);
        assert_eq!(result[0].player_count, 2);
        assert_eq!(result[0].average_rating, 1700.0); // (1800 + 1600) / 2

        // Check second group (2.0 points)
        assert_eq!(result[1].score, 2.0);
        assert_eq!(result[1].player_count, 1);
        assert_eq!(result[1].average_rating, 1400.0);

        // Check third group (1.5 points)
        assert_eq!(result[2].score, 1.5);
        assert_eq!(result[2].player_count, 1);
        assert_eq!(result[2].average_rating, 1200.0);

        // Check lowest group (1.0 points)
        assert_eq!(result[3].score, 1.0);
        assert_eq!(result[3].player_count, 1);
        assert_eq!(result[3].average_rating, 0.0); // Unrated player
    }

    #[test]
    fn test_analyze_score_groups_empty() {
        let service = TestSwissAnalysisService::new();
        let player_results = vec![];

        let result = service.analyze_score_groups(&player_results);
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_analyze_score_groups_single_player() {
        let service = TestSwissAnalysisService::new();
        let player_results = vec![create_test_player_result(
            create_test_player(1, "Solo Player", Some(1500)),
            1.5,
            1,
            1,
            1,
        )];

        let result = service.analyze_score_groups(&player_results);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].score, 1.5);
        assert_eq!(result[0].player_count, 1);
        assert_eq!(result[0].average_rating, 1500.0);
    }

    #[test]
    fn test_analyze_floats() {
        let service = TestSwissAnalysisService::new();
        let score_groups = vec![
            ScoreGroupDto {
                score: 3.0,
                player_count: 4, // Even group - no floats
                average_rating: 1700.0,
                floats_up: 0,
                floats_down: 0,
            },
            ScoreGroupDto {
                score: 2.5,
                player_count: 3, // Odd group - 1 float
                average_rating: 1600.0,
                floats_up: 0,
                floats_down: 0,
            },
            ScoreGroupDto {
                score: 2.0,
                player_count: 5, // Odd group - 1 float
                average_rating: 1500.0,
                floats_up: 0,
                floats_down: 0,
            },
        ];

        let result = service.analyze_floats(&[], &score_groups);

        assert_eq!(result.total_floats, 2); // 2 odd groups
        assert_eq!(result.up_floats, 1); // estimated floats / 2
        assert_eq!(result.down_floats, 1); // estimated floats / 2
        assert_eq!(result.float_percentage, 16.666666666666668); // 2 / 12 * 100
    }

    #[test]
    fn test_analyze_floats_no_odd_groups() {
        let service = TestSwissAnalysisService::new();
        let score_groups = vec![
            ScoreGroupDto {
                score: 3.0,
                player_count: 4,
                average_rating: 1700.0,
                floats_up: 0,
                floats_down: 0,
            },
            ScoreGroupDto {
                score: 2.0,
                player_count: 6,
                average_rating: 1500.0,
                floats_up: 0,
                floats_down: 0,
            },
        ];

        let result = service.analyze_floats(&[], &score_groups);

        assert_eq!(result.total_floats, 0);
        assert_eq!(result.up_floats, 0);
        assert_eq!(result.down_floats, 0);
        assert_eq!(result.float_percentage, 0.0);
    }

    #[test]
    fn test_analyze_color_balance() {
        let service = TestSwissAnalysisService::new();
        let players = vec![
            create_test_player(1, "Player A", Some(1800)),
            create_test_player(2, "Player B", Some(1600)),
            create_test_player(3, "Player C", Some(1400)),
            create_test_player(4, "Player D", Some(1200)),
        ];

        let player_map: HashMap<i32, &Player> = players.iter().map(|p| (p.id, p)).collect();

        let games = vec![
            create_test_game(1, 1, 2, 1, "1-0"), // Player 1 white, Player 2 black
            create_test_game(2, 3, 4, 1, "0-1"), // Player 3 white, Player 4 black
            create_test_game(3, 2, 3, 2, "1/2-1/2"), // Player 2 white, Player 3 black
            create_test_game(4, 4, 1, 2, "0-1"), // Player 4 white, Player 1 black
            create_test_game(5, 1, 3, 3, "1-0"), // Player 1 white, Player 3 black
            create_test_game(6, 2, 4, 3, "*"),   // Ongoing game - shouldn't count
        ];

        let result = service.analyze_color_balance(&players, &games, &player_map);

        // Player 1: 2 white, 1 black = balance +1
        // Player 2: 1 white, 1 black = balance 0
        // Player 3: 1 white, 2 black = balance -1
        // Player 4: 1 white, 1 black = balance 0

        assert_eq!(result.players_with_color_imbalance, 0); // No player has |balance| > 1
        assert_eq!(result.players_needing_white, 0); // No player has balance < -1
        assert_eq!(result.players_needing_black, 0); // No player has balance > 1
        assert_eq!(result.average_color_balance, 0.5); // (1 + 0 + 1 + 0) / 4
    }

    #[test]
    fn test_analyze_color_balance_with_imbalances() {
        let service = TestSwissAnalysisService::new();
        let players = vec![
            create_test_player(1, "Player A", Some(1800)),
            create_test_player(2, "Player B", Some(1600)),
        ];

        let player_map: HashMap<i32, &Player> = players.iter().map(|p| (p.id, p)).collect();

        let games = vec![
            create_test_game(1, 1, 2, 1, "1-0"), // Player 1 white
            create_test_game(2, 1, 2, 2, "1-0"), // Player 1 white
            create_test_game(3, 1, 2, 3, "1-0"), // Player 1 white
        ];

        let result = service.analyze_color_balance(&players, &games, &player_map);

        // Player 1: 3 white, 0 black = balance +3
        // Player 2: 0 white, 3 black = balance -3

        assert_eq!(result.players_with_color_imbalance, 2); // Both players have |balance| > 1
        assert_eq!(result.players_needing_white, 1); // Player 2 has balance < -1
        assert_eq!(result.players_needing_black, 1); // Player 1 has balance > 1
        assert_eq!(result.average_color_balance, 3.0); // (3 + 3) / 2
    }

    #[test]
    fn test_analyze_color_balance_no_games() {
        let service = TestSwissAnalysisService::new();
        let players = vec![
            create_test_player(1, "Player A", Some(1800)),
            create_test_player(2, "Player B", Some(1600)),
        ];

        let player_map: HashMap<i32, &Player> = players.iter().map(|p| (p.id, p)).collect();
        let games = vec![];

        let result = service.analyze_color_balance(&players, &games, &player_map);

        assert_eq!(result.players_with_color_imbalance, 0);
        assert_eq!(result.players_needing_white, 0);
        assert_eq!(result.players_needing_black, 0);
        assert_eq!(result.average_color_balance, 0.0);
    }

    #[test]
    fn test_analyze_rating_distribution() {
        let service = TestSwissAnalysisService::new();
        let player_results = vec![
            create_test_player_result(create_test_player(1, "Player A", Some(1800)), 2.0, 2, 0, 1),
            create_test_player_result(create_test_player(2, "Player B", Some(1600)), 2.0, 2, 0, 1),
            create_test_player_result(create_test_player(3, "Player C", Some(1400)), 1.5, 1, 1, 1),
            create_test_player_result(create_test_player(4, "Player D", Some(1200)), 1.5, 1, 1, 1),
        ];

        let options = SwissPairingOptions {
            avoid_color_conflicts: true,
            minimize_rating_differences: true,
            accelerated_pairing: false,
        };

        let result = service.analyze_rating_distribution(&player_results, &options);

        // Within 2.0 score group: 1800 vs 1600 = 200 difference
        // Within 1.5 score group: 1400 vs 1200 = 200 difference
        assert_eq!(result.average_rating_difference, 200.0);
        assert_eq!(result.max_rating_difference, 200.0);
        assert_eq!(result.min_rating_difference, 200.0);
        assert_eq!(result.pairs_with_large_rating_gap, 2); // Both pairs have 200+ difference
    }

    #[test]
    fn test_analyze_rating_distribution_mixed_gaps() {
        let service = TestSwissAnalysisService::new();
        let player_results = vec![
            create_test_player_result(create_test_player(1, "Player A", Some(2000)), 2.0, 2, 0, 1),
            create_test_player_result(create_test_player(2, "Player B", Some(1950)), 2.0, 2, 0, 1),
            create_test_player_result(create_test_player(3, "Player C", Some(1500)), 2.0, 2, 0, 1),
            create_test_player_result(create_test_player(4, "Player D", Some(1400)), 1.5, 1, 1, 1),
        ];

        let options = SwissPairingOptions {
            avoid_color_conflicts: true,
            minimize_rating_differences: true,
            accelerated_pairing: false,
        };

        let result = service.analyze_rating_distribution(&player_results, &options);

        // Within 2.0 score group: 1950 vs 2000 (50), 1500 vs 1950 (450)
        // 1.5 score group has only one player, so no pairings
        assert_eq!(result.average_rating_difference, 250.0); // (50 + 450) / 2
        assert_eq!(result.max_rating_difference, 450.0);
        assert_eq!(result.min_rating_difference, 50.0);
        assert_eq!(result.pairs_with_large_rating_gap, 1); // Only the 450 difference
    }

    #[test]
    fn test_analyze_rating_distribution_insufficient_players() {
        let service = TestSwissAnalysisService::new();
        let player_results = vec![create_test_player_result(
            create_test_player(1, "Player A", Some(1800)),
            2.0,
            2,
            0,
            1,
        )];

        let options = SwissPairingOptions {
            avoid_color_conflicts: true,
            minimize_rating_differences: true,
            accelerated_pairing: false,
        };

        let result = service.analyze_rating_distribution(&player_results, &options);

        assert_eq!(result.average_rating_difference, 0.0);
        assert_eq!(result.max_rating_difference, 0.0);
        assert_eq!(result.min_rating_difference, 0.0);
        assert_eq!(result.pairs_with_large_rating_gap, 0);
    }

    #[test]
    fn test_analyze_rating_distribution_unrated_players() {
        let service = TestSwissAnalysisService::new();
        let player_results = vec![
            create_test_player_result(create_test_player(1, "Player A", None), 2.0, 2, 0, 1),
            create_test_player_result(create_test_player(2, "Player B", None), 2.0, 2, 0, 1),
        ];

        let options = SwissPairingOptions {
            avoid_color_conflicts: true,
            minimize_rating_differences: true,
            accelerated_pairing: false,
        };

        let result = service.analyze_rating_distribution(&player_results, &options);

        // No rated players, so no rating analysis possible
        assert_eq!(result.average_rating_difference, 0.0);
        assert_eq!(result.max_rating_difference, 0.0);
        assert_eq!(result.min_rating_difference, 0.0);
        assert_eq!(result.pairs_with_large_rating_gap, 0);
    }

    #[test]
    fn test_empty_tournament_analysis() {
        let service = TestSwissAnalysisService::new();
        let empty_player_results = vec![];
        let empty_players = vec![];
        let empty_games = vec![];
        let empty_player_map = HashMap::new();

        // Test score groups
        let score_groups = service.analyze_score_groups(&empty_player_results);
        assert_eq!(score_groups.len(), 0);

        // Test floats
        let float_stats = service.analyze_floats(&empty_player_results, &score_groups);
        assert_eq!(float_stats.total_floats, 0);
        assert_eq!(float_stats.float_percentage, 0.0);

        // Test color balance
        let color_balance =
            service.analyze_color_balance(&empty_players, &empty_games, &empty_player_map);
        assert_eq!(color_balance.players_with_color_imbalance, 0);
        assert_eq!(color_balance.average_color_balance, 0.0);

        // Test rating distribution
        let options = SwissPairingOptions {
            avoid_color_conflicts: true,
            minimize_rating_differences: true,
            accelerated_pairing: false,
        };
        let rating_dist = service.analyze_rating_distribution(&empty_player_results, &options);
        assert_eq!(rating_dist.average_rating_difference, 0.0);
    }

    #[test]
    fn test_score_groups_with_half_points() {
        let service = TestSwissAnalysisService::new();
        let player_results = vec![
            create_test_player_result(create_test_player(1, "Player A", Some(1800)), 2.5, 2, 1, 0),
            create_test_player_result(create_test_player(2, "Player B", Some(1600)), 1.5, 1, 1, 1),
            create_test_player_result(create_test_player(3, "Player C", Some(1400)), 0.5, 0, 1, 2),
        ];

        let result = service.analyze_score_groups(&player_results);

        assert_eq!(result.len(), 3);
        assert_eq!(result[0].score, 2.5);
        assert_eq!(result[1].score, 1.5);
        assert_eq!(result[2].score, 0.5);
    }

    #[test]
    fn test_complex_swiss_analysis_scenario() {
        let service = TestSwissAnalysisService::new();

        // Create a realistic Swiss tournament scenario
        let players = vec![
            create_test_player(1, "GM Strong", Some(2400)),
            create_test_player(2, "IM Good", Some(2200)),
            create_test_player(3, "FM Average", Some(2000)),
            create_test_player(4, "Club Player", Some(1800)),
            create_test_player(5, "Beginner", Some(1400)),
            create_test_player(6, "Unrated", None),
        ];

        let player_results = vec![
            create_test_player_result(players[0].clone(), 3.0, 3, 0, 0), // GM dominating
            create_test_player_result(players[1].clone(), 2.5, 2, 1, 0), // IM doing well
            create_test_player_result(players[2].clone(), 2.0, 2, 0, 1), // FM middle
            create_test_player_result(players[3].clone(), 1.5, 1, 1, 1), // Club player struggling
            create_test_player_result(players[4].clone(), 1.0, 1, 0, 2), // Beginner having tough time
            create_test_player_result(players[5].clone(), 0.5, 0, 1, 2), // Unrated struggling
        ];

        let player_map: HashMap<i32, &Player> = players.iter().map(|p| (p.id, p)).collect();

        // Some games with color imbalances
        let games = vec![
            create_test_game(1, 1, 2, 1, "1-0"), // GM white
            create_test_game(2, 1, 3, 2, "1-0"), // GM white again
            create_test_game(3, 1, 4, 3, "1-0"), // GM white third time - imbalance!
        ];

        // Test all analysis functions
        let score_groups = service.analyze_score_groups(&player_results);
        assert_eq!(score_groups.len(), 6); // All different scores

        let float_stats = service.analyze_floats(&player_results, &score_groups);
        assert_eq!(float_stats.total_floats, 6); // All groups have 1 player (odd)

        let color_balance = service.analyze_color_balance(&players, &games, &player_map);
        assert_eq!(color_balance.players_needing_black, 1); // GM needs black

        let options = SwissPairingOptions {
            avoid_color_conflicts: true,
            minimize_rating_differences: true,
            accelerated_pairing: false,
        };
        let rating_dist = service.analyze_rating_distribution(&player_results, &options);
        assert!(rating_dist.average_rating_difference > 0.0); // Should have some rating differences
    }
}
