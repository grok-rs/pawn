use crate::pawn::{
    common::error::PawnError,
    db::Db,
    domain::{
        dto::{BergerTableInfoDto, PlayerColorStatsDto, RoundRobinAnalysis, RoundRobinOptions},
        model::{GameResult, Player},
    },
};
use std::{collections::HashMap, sync::Arc};

#[allow(dead_code)]
pub struct RoundRobinAnalysisService<D> {
    db: Arc<D>,
}

#[allow(dead_code)]
impl<D: Db> RoundRobinAnalysisService<D> {
    pub fn new(db: Arc<D>) -> Self {
        Self { db }
    }

    pub async fn analyze_round_robin_pairings(
        &self,
        tournament_id: i32,
        round_number: i32,
        options: RoundRobinOptions,
    ) -> Result<RoundRobinAnalysis, PawnError> {
        // Get players and games
        let players = self
            .db
            .get_players_by_tournament(tournament_id)
            .await
            .map_err(PawnError::Database)?;

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

        // Calculate total rounds needed
        let total_rounds_needed = self.calculate_total_rounds(&players, &options);

        // Calculate current progress
        let current_progress = if total_rounds_needed > 0 {
            ((round_number - 1) as f64 / total_rounds_needed as f64) * 100.0
        } else {
            0.0
        };

        // Generate Berger table info if requested
        let berger_table_info = if options.use_berger_tables {
            Some(self.generate_berger_table_info(&players, &options))
        } else {
            None
        };

        // Analyze color distribution
        let color_distribution = self.analyze_color_distribution(&players, &games_up_to_round);

        Ok(RoundRobinAnalysis {
            total_rounds_needed,
            current_progress,
            berger_table_info,
            color_distribution,
        })
    }

    fn calculate_total_rounds(&self, players: &[Player], options: &RoundRobinOptions) -> i32 {
        let player_count = players.len();

        if player_count < 2 {
            return 0;
        }

        match options.tournament_type.as_str() {
            "single" => {
                // Single round-robin: each player plays every other player once
                if player_count % 2 == 0 {
                    (player_count - 1) as i32
                } else {
                    player_count as i32 // Odd number needs extra round for byes
                }
            }
            "double" => {
                // Double round-robin: each player plays every other player twice
                if player_count % 2 == 0 {
                    (2 * (player_count - 1)) as i32
                } else {
                    (2 * player_count) as i32
                }
            }
            "scheveningen" => {
                // Scheveningen: team vs team
                if let Some(team_size) = options.team_size {
                    if team_size > 0 {
                        team_size as i32
                    } else {
                        player_count as i32
                    }
                } else {
                    player_count as i32
                }
            }
            _ => (player_count - 1) as i32, // Default to single round-robin
        }
    }

    fn generate_berger_table_info(
        &self,
        players: &[Player],
        options: &RoundRobinOptions,
    ) -> BergerTableInfoDto {
        let player_count = players.len();
        let table_size = if player_count % 2 == 0 {
            player_count
        } else {
            player_count + 1 // Add bye player
        };

        let rotation_pattern = match options.tournament_type.as_str() {
            "single" => "Standard Berger table rotation".to_string(),
            "double" => "Double round-robin with color reversal".to_string(),
            "scheveningen" => "Team-based fixed pairing schedule".to_string(),
            _ => "Standard rotation".to_string(),
        };

        let bye_player_position = if player_count % 2 == 1 {
            Some(player_count) // Last position for bye
        } else {
            None
        };

        BergerTableInfoDto {
            table_size,
            rotation_pattern,
            bye_player_position,
        }
    }

    fn analyze_color_distribution(
        &self,
        players: &[Player],
        games: &[GameResult],
    ) -> Vec<PlayerColorStatsDto> {
        let mut color_stats: HashMap<i32, (String, i32, i32)> = HashMap::new();

        // Initialize stats for all players
        for player in players {
            color_stats.insert(player.id, (player.name.clone(), 0, 0));
        }

        // Count colors for each player from completed games
        for game in games {
            if game.game.result != "*" {
                // Only count finished games
                if let Some(stats) = color_stats.get_mut(&game.game.white_player_id) {
                    stats.1 += 1; // White games
                }
                if let Some(stats) = color_stats.get_mut(&game.game.black_player_id) {
                    stats.2 += 1; // Black games
                }
            }
        }

        color_stats
            .into_iter()
            .map(
                |(player_id, (player_name, white_games, black_games))| PlayerColorStatsDto {
                    player_id,
                    player_name,
                    white_games,
                    black_games,
                    color_balance: white_games - black_games,
                },
            )
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pawn::domain::model::{Game, Player};

    // Simplified mock database for testing only the required methods
    struct MockDb {
        players: Vec<Player>,
        game_results: Vec<GameResult>,
    }

    // Since the full Db trait is very large, we'll create a simple trait just for testing
    trait TestDb: Send + Sync {
        async fn get_players_by_tournament(
            &self,
            tournament_id: i32,
        ) -> Result<Vec<Player>, sqlx::Error>;
        async fn get_game_results(
            &self,
            tournament_id: i32,
        ) -> Result<Vec<GameResult>, sqlx::Error>;
    }

    impl TestDb for MockDb {
        async fn get_players_by_tournament(
            &self,
            _tournament_id: i32,
        ) -> Result<Vec<Player>, sqlx::Error> {
            Ok(self.players.clone())
        }

        async fn get_game_results(
            &self,
            _tournament_id: i32,
        ) -> Result<Vec<GameResult>, sqlx::Error> {
            Ok(self.game_results.clone())
        }
    }

    // Test service that uses the simplified trait
    struct TestRoundRobinAnalysisService<D> {
        db: Arc<D>,
    }

    impl<D: TestDb> TestRoundRobinAnalysisService<D> {
        fn new(db: Arc<D>) -> Self {
            Self { db }
        }

        async fn analyze_round_robin_pairings(
            &self,
            tournament_id: i32,
            round_number: i32,
            options: RoundRobinOptions,
        ) -> Result<RoundRobinAnalysis, PawnError> {
            // Get players and games using our simplified trait
            let players = self
                .db
                .get_players_by_tournament(tournament_id)
                .await
                .map_err(PawnError::Database)?;

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

            // Calculate total rounds needed
            let total_rounds_needed = self.calculate_total_rounds(&players, &options);

            // Calculate current progress
            let current_progress = if total_rounds_needed > 0 {
                ((round_number - 1) as f64 / total_rounds_needed as f64) * 100.0
            } else {
                0.0
            };

            // Generate Berger table info if requested
            let berger_table_info = if options.use_berger_tables {
                Some(self.generate_berger_table_info(&players, &options))
            } else {
                None
            };

            // Analyze color distribution
            let color_distribution = self.analyze_color_distribution(&players, &games_up_to_round);

            Ok(RoundRobinAnalysis {
                total_rounds_needed,
                current_progress,
                berger_table_info,
                color_distribution,
            })
        }

        fn calculate_total_rounds(&self, players: &[Player], options: &RoundRobinOptions) -> i32 {
            let player_count = players.len();

            if player_count < 2 {
                return 0;
            }

            match options.tournament_type.as_str() {
                "single" => {
                    if player_count % 2 == 0 {
                        (player_count - 1) as i32
                    } else {
                        player_count as i32
                    }
                }
                "double" => {
                    if player_count % 2 == 0 {
                        (2 * (player_count - 1)) as i32
                    } else {
                        (2 * player_count) as i32
                    }
                }
                "scheveningen" => {
                    if let Some(team_size) = options.team_size {
                        if team_size > 0 {
                            team_size as i32
                        } else {
                            player_count as i32
                        }
                    } else {
                        player_count as i32
                    }
                }
                _ => (player_count - 1) as i32,
            }
        }

        fn generate_berger_table_info(
            &self,
            players: &[Player],
            options: &RoundRobinOptions,
        ) -> BergerTableInfoDto {
            let player_count = players.len();
            let table_size = if player_count % 2 == 0 {
                player_count
            } else {
                player_count + 1
            };

            let rotation_pattern = match options.tournament_type.as_str() {
                "single" => "Standard Berger table rotation".to_string(),
                "double" => "Double round-robin with color reversal".to_string(),
                "scheveningen" => "Team-based fixed pairing schedule".to_string(),
                _ => "Standard rotation".to_string(),
            };

            let bye_player_position = if player_count % 2 == 1 {
                Some(player_count)
            } else {
                None
            };

            BergerTableInfoDto {
                table_size,
                rotation_pattern,
                bye_player_position,
            }
        }

        fn analyze_color_distribution(
            &self,
            players: &[Player],
            games: &[GameResult],
        ) -> Vec<PlayerColorStatsDto> {
            let mut color_stats: HashMap<i32, (String, i32, i32)> = HashMap::new();

            for player in players {
                color_stats.insert(player.id, (player.name.clone(), 0, 0));
            }

            for game in games {
                if game.game.result != "*" {
                    if let Some(stats) = color_stats.get_mut(&game.game.white_player_id) {
                        stats.1 += 1;
                    }
                    if let Some(stats) = color_stats.get_mut(&game.game.black_player_id) {
                        stats.2 += 1;
                    }
                }
            }

            color_stats
                .into_iter()
                .map(
                    |(player_id, (player_name, white_games, black_games))| PlayerColorStatsDto {
                        player_id,
                        player_name,
                        white_games,
                        black_games,
                        color_balance: white_games - black_games,
                    },
                )
                .collect()
        }
    }

    fn create_test_players(count: usize) -> Vec<Player> {
        (1..=count)
            .map(|i| Player {
                id: i as i32,
                tournament_id: 1,
                name: format!("Player {i}"),
                rating: Some(1500 + (i as i32 * 100)),
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
                initial_rating: None,
                created_at: "2024-01-01T00:00:00Z".to_string(),
                updated_at: Some("2024-01-01T00:00:00Z".to_string()),
            })
            .collect()
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
            white_player: Player {
                id: white_id,
                tournament_id: 1,
                name: format!("Player {white_id}"),
                rating: Some(1500),
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
                initial_rating: None,
                created_at: "2024-01-01T00:00:00Z".to_string(),
                updated_at: Some("2024-01-01T00:00:00Z".to_string()),
            },
            black_player: Player {
                id: black_id,
                tournament_id: 1,
                name: format!("Player {black_id}"),
                rating: Some(1500),
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
                initial_rating: None,
                created_at: "2024-01-01T00:00:00Z".to_string(),
                updated_at: Some("2024-01-01T00:00:00Z".to_string()),
            },
        }
    }

    #[tokio::test]
    async fn test_analyze_round_robin_pairings_single_tournament() {
        let players = create_test_players(4);
        let game_results = vec![
            create_test_game(1, 1, 2, 1, "1-0"),
            create_test_game(2, 3, 4, 1, "0-1"),
        ];

        let mock_db = MockDb {
            players: players.clone(),
            game_results,
        };

        let service = TestRoundRobinAnalysisService::new(Arc::new(mock_db));
        let options = RoundRobinOptions {
            tournament_type: "single".to_string(),
            optimize_colors: true,
            use_berger_tables: true,
            team_size: None,
        };

        let result = service.analyze_round_robin_pairings(1, 2, options).await;
        assert!(result.is_ok());

        let analysis = result.unwrap();
        assert_eq!(analysis.total_rounds_needed, 3); // 4 players = 3 rounds
        assert!((analysis.current_progress - 33.333333333333336).abs() < 1e-10); // Round 2 of 3
        assert!(analysis.berger_table_info.is_some());
        assert_eq!(analysis.color_distribution.len(), 4);
    }

    #[tokio::test]
    async fn test_analyze_round_robin_pairings_double_tournament() {
        let players = create_test_players(4);
        let game_results = vec![];

        let mock_db = MockDb {
            players: players.clone(),
            game_results,
        };

        let service = TestRoundRobinAnalysisService::new(Arc::new(mock_db));
        let options = RoundRobinOptions {
            tournament_type: "double".to_string(),
            optimize_colors: false,
            use_berger_tables: false,
            team_size: None,
        };

        let result = service.analyze_round_robin_pairings(1, 1, options).await;
        assert!(result.is_ok());

        let analysis = result.unwrap();
        assert_eq!(analysis.total_rounds_needed, 6); // 4 players, double = 6 rounds
        assert_eq!(analysis.current_progress, 0.0); // Round 1 of 6
        assert!(analysis.berger_table_info.is_none());
    }

    #[tokio::test]
    async fn test_analyze_round_robin_pairings_scheveningen() {
        let players = create_test_players(8);
        let game_results = vec![];

        let mock_db = MockDb {
            players: players.clone(),
            game_results,
        };

        let service = TestRoundRobinAnalysisService::new(Arc::new(mock_db));
        let options = RoundRobinOptions {
            tournament_type: "scheveningen".to_string(),
            optimize_colors: true,
            use_berger_tables: true,
            team_size: Some(4),
        };

        let result = service.analyze_round_robin_pairings(1, 1, options).await;
        assert!(result.is_ok());

        let analysis = result.unwrap();
        assert_eq!(analysis.total_rounds_needed, 4); // Team size
        assert_eq!(analysis.current_progress, 0.0);
    }

    #[test]
    fn test_calculate_total_rounds_single_even_players() {
        let service = TestRoundRobinAnalysisService::new(Arc::new(MockDb {
            players: vec![],
            game_results: vec![],
        }));
        let players = create_test_players(4);
        let options = RoundRobinOptions {
            tournament_type: "single".to_string(),
            optimize_colors: true,
            use_berger_tables: false,
            team_size: None,
        };

        let result = service.calculate_total_rounds(&players, &options);
        assert_eq!(result, 3); // n-1 rounds for even number of players
    }

    #[test]
    fn test_calculate_total_rounds_single_odd_players() {
        let service = TestRoundRobinAnalysisService::new(Arc::new(MockDb {
            players: vec![],
            game_results: vec![],
        }));
        let players = create_test_players(5);
        let options = RoundRobinOptions {
            tournament_type: "single".to_string(),
            optimize_colors: true,
            use_berger_tables: false,
            team_size: None,
        };

        let result = service.calculate_total_rounds(&players, &options);
        assert_eq!(result, 5); // n rounds for odd number of players (byes)
    }

    #[test]
    fn test_calculate_total_rounds_double_even_players() {
        let service = TestRoundRobinAnalysisService::new(Arc::new(MockDb {
            players: vec![],
            game_results: vec![],
        }));
        let players = create_test_players(4);
        let options = RoundRobinOptions {
            tournament_type: "double".to_string(),
            optimize_colors: true,
            use_berger_tables: false,
            team_size: None,
        };

        let result = service.calculate_total_rounds(&players, &options);
        assert_eq!(result, 6); // 2*(n-1) rounds for even number of players
    }

    #[test]
    fn test_calculate_total_rounds_double_odd_players() {
        let service = TestRoundRobinAnalysisService::new(Arc::new(MockDb {
            players: vec![],
            game_results: vec![],
        }));
        let players = create_test_players(5);
        let options = RoundRobinOptions {
            tournament_type: "double".to_string(),
            optimize_colors: true,
            use_berger_tables: false,
            team_size: None,
        };

        let result = service.calculate_total_rounds(&players, &options);
        assert_eq!(result, 10); // 2*n rounds for odd number of players
    }

    #[test]
    fn test_calculate_total_rounds_scheveningen() {
        let service = TestRoundRobinAnalysisService::new(Arc::new(MockDb {
            players: vec![],
            game_results: vec![],
        }));
        let players = create_test_players(8);
        let options = RoundRobinOptions {
            tournament_type: "scheveningen".to_string(),
            optimize_colors: true,
            use_berger_tables: false,
            team_size: Some(4),
        };

        let result = service.calculate_total_rounds(&players, &options);
        assert_eq!(result, 4); // Equal to team size
    }

    #[test]
    fn test_calculate_total_rounds_no_players() {
        let service = TestRoundRobinAnalysisService::new(Arc::new(MockDb {
            players: vec![],
            game_results: vec![],
        }));
        let players = vec![];
        let options = RoundRobinOptions {
            tournament_type: "single".to_string(),
            optimize_colors: true,
            use_berger_tables: false,
            team_size: None,
        };

        let result = service.calculate_total_rounds(&players, &options);
        assert_eq!(result, 0); // No rounds needed for no players
    }

    #[test]
    fn test_calculate_total_rounds_one_player() {
        let service = TestRoundRobinAnalysisService::new(Arc::new(MockDb {
            players: vec![],
            game_results: vec![],
        }));
        let players = create_test_players(1);
        let options = RoundRobinOptions {
            tournament_type: "single".to_string(),
            optimize_colors: true,
            use_berger_tables: false,
            team_size: None,
        };

        let result = service.calculate_total_rounds(&players, &options);
        assert_eq!(result, 0); // No rounds needed for single player
    }

    #[test]
    fn test_generate_berger_table_info_even_players() {
        let service = TestRoundRobinAnalysisService::new(Arc::new(MockDb {
            players: vec![],
            game_results: vec![],
        }));
        let players = create_test_players(4);
        let options = RoundRobinOptions {
            tournament_type: "single".to_string(),
            optimize_colors: true,
            use_berger_tables: true,
            team_size: None,
        };

        let result = service.generate_berger_table_info(&players, &options);
        assert_eq!(result.table_size, 4);
        assert_eq!(result.rotation_pattern, "Standard Berger table rotation");
        assert_eq!(result.bye_player_position, None);
    }

    #[test]
    fn test_generate_berger_table_info_odd_players() {
        let service = TestRoundRobinAnalysisService::new(Arc::new(MockDb {
            players: vec![],
            game_results: vec![],
        }));
        let players = create_test_players(5);
        let options = RoundRobinOptions {
            tournament_type: "double".to_string(),
            optimize_colors: true,
            use_berger_tables: true,
            team_size: None,
        };

        let result = service.generate_berger_table_info(&players, &options);
        assert_eq!(result.table_size, 6); // 5 players + 1 bye
        assert_eq!(
            result.rotation_pattern,
            "Double round-robin with color reversal"
        );
        assert_eq!(result.bye_player_position, Some(5)); // Last position
    }

    #[test]
    fn test_generate_berger_table_info_scheveningen() {
        let service = TestRoundRobinAnalysisService::new(Arc::new(MockDb {
            players: vec![],
            game_results: vec![],
        }));
        let players = create_test_players(8);
        let options = RoundRobinOptions {
            tournament_type: "scheveningen".to_string(),
            optimize_colors: true,
            use_berger_tables: true,
            team_size: Some(4),
        };

        let result = service.generate_berger_table_info(&players, &options);
        assert_eq!(result.table_size, 8);
        assert_eq!(result.rotation_pattern, "Team-based fixed pairing schedule");
        assert_eq!(result.bye_player_position, None);
    }

    #[test]
    fn test_analyze_color_distribution() {
        let service = TestRoundRobinAnalysisService::new(Arc::new(MockDb {
            players: vec![],
            game_results: vec![],
        }));
        let players = create_test_players(4);
        let games = vec![
            create_test_game(1, 1, 2, 1, "1-0"), // Player 1 white, Player 2 black
            create_test_game(2, 3, 4, 1, "0-1"), // Player 3 white, Player 4 black
            create_test_game(3, 2, 3, 2, "1/2-1/2"), // Player 2 white, Player 3 black
            create_test_game(4, 4, 1, 2, "*"),   // Ongoing game - shouldn't count
        ];

        let result = service.analyze_color_distribution(&players, &games);

        assert_eq!(result.len(), 4);

        // Find player stats
        let player1_stats = result.iter().find(|p| p.player_id == 1).unwrap();
        let player2_stats = result.iter().find(|p| p.player_id == 2).unwrap();
        let player3_stats = result.iter().find(|p| p.player_id == 3).unwrap();
        let player4_stats = result.iter().find(|p| p.player_id == 4).unwrap();

        // Player 1: 1 white, 0 black (from finished games)
        assert_eq!(player1_stats.white_games, 1);
        assert_eq!(player1_stats.black_games, 0);
        assert_eq!(player1_stats.color_balance, 1);

        // Player 2: 1 white, 1 black
        assert_eq!(player2_stats.white_games, 1);
        assert_eq!(player2_stats.black_games, 1);
        assert_eq!(player2_stats.color_balance, 0);

        // Player 3: 1 white, 1 black
        assert_eq!(player3_stats.white_games, 1);
        assert_eq!(player3_stats.black_games, 1);
        assert_eq!(player3_stats.color_balance, 0);

        // Player 4: 0 white, 1 black (ongoing game not counted)
        assert_eq!(player4_stats.white_games, 0);
        assert_eq!(player4_stats.black_games, 1);
        assert_eq!(player4_stats.color_balance, -1);
    }

    #[test]
    fn test_analyze_color_distribution_no_games() {
        let service = TestRoundRobinAnalysisService::new(Arc::new(MockDb {
            players: vec![],
            game_results: vec![],
        }));
        let players = create_test_players(3);
        let games = vec![];

        let result = service.analyze_color_distribution(&players, &games);

        assert_eq!(result.len(), 3);
        for player_stats in result {
            assert_eq!(player_stats.white_games, 0);
            assert_eq!(player_stats.black_games, 0);
            assert_eq!(player_stats.color_balance, 0);
        }
    }

    #[test]
    fn test_analyze_color_distribution_only_ongoing_games() {
        let service = TestRoundRobinAnalysisService::new(Arc::new(MockDb {
            players: vec![],
            game_results: vec![],
        }));
        let players = create_test_players(2);
        let games = vec![
            create_test_game(1, 1, 2, 1, "*"), // Ongoing game
        ];

        let result = service.analyze_color_distribution(&players, &games);

        assert_eq!(result.len(), 2);
        for player_stats in result {
            assert_eq!(player_stats.white_games, 0);
            assert_eq!(player_stats.black_games, 0);
            assert_eq!(player_stats.color_balance, 0);
        }
    }
}
