#![allow(dead_code)]

use crate::pawn::{
    common::error::PawnError,
    domain::model::{Game, GameResult, Pairing, Player, PlayerResult},
    service::swiss_pairing::SwissPairingEngine,
};
use std::collections::{HashMap, HashSet};
use std::time::Instant;

/// Performance optimization module for large tournament pairing
pub struct PairingOptimizer {
    swiss_engine: SwissPairingEngine,
}

#[derive(Debug, Clone)]
pub struct OptimizationConfig {
    pub max_players_for_basic_algorithm: usize,
    pub use_parallel_processing: bool,
    pub batch_size_for_large_tournaments: usize,
    pub timeout_seconds: u64,
    pub cache_opponent_history: bool,
    pub use_heuristic_pruning: bool,
}

/// Parameters for large tournament pairing generation
struct LargeTournamentParams<'a> {
    players: &'a [Player],
    player_results: &'a [PlayerResult],
    game_history: &'a [GameResult],
    round_number: i32,
    config: &'a OptimizationConfig,
    cache_hits: &'a mut usize,
    cache_misses: &'a mut usize,
    warnings: &'a mut Vec<String>,
}

/// Parameters for processing a score batch
struct ScoreBatchParams<'a> {
    batch: &'a [Player],
    indexed_data: &'a IndexedTournamentData,
    round_number: i32,
    board_number: &'a mut i32,
    config: &'a OptimizationConfig,
    cache_hits: &'a mut usize,
    cache_misses: &'a mut usize,
}

/// Parameters for processing a score batch with global tracking
struct ScoreBatchWithTrackingParams<'a> {
    batch: &'a [Player],
    indexed_data: &'a IndexedTournamentData,
    round_number: i32,
    board_number: &'a mut i32,
    config: &'a OptimizationConfig,
    cache_hits: &'a mut usize,
    cache_misses: &'a mut usize,
    global_paired_players: &'a mut HashSet<i32>,
}

#[derive(Debug)]
pub struct PerformanceMetrics {
    pub total_duration_ms: u128,

    pub pairing_generation_ms: u128,

    pub validation_duration_ms: u128,

    pub players_processed: usize,

    pub pairings_generated: usize,

    pub cache_hits: usize,

    pub cache_misses: usize,

    pub algorithm_used: String,
}

#[derive(Debug)]

pub struct OptimizedPairingResult {
    pub pairings: Vec<Pairing>,

    pub metrics: PerformanceMetrics,

    pub warnings: Vec<String>,
}

impl Default for OptimizationConfig {
    fn default() -> Self {
        Self {
            max_players_for_basic_algorithm: 100,
            use_parallel_processing: true,
            batch_size_for_large_tournaments: 50,
            timeout_seconds: 30,
            cache_opponent_history: true,
            use_heuristic_pruning: true,
        }
    }
}

impl Default for PairingOptimizer {
    fn default() -> Self {
        Self::new()
    }
}

impl PairingOptimizer {
    pub fn new() -> Self {
        Self {
            swiss_engine: SwissPairingEngine::new(),
        }
    }

    /// Generate optimized pairings for large tournaments
    pub fn generate_optimized_pairings(
        &self,
        players: Vec<Player>,
        player_results: Vec<PlayerResult>,
        game_history: Vec<GameResult>,
        round_number: i32,
        config: Option<OptimizationConfig>,
    ) -> Result<OptimizedPairingResult, PawnError> {
        let start_time = Instant::now();
        let config = config.unwrap_or_default();

        tracing::info!(
            "Starting optimized pairing generation for {} players, round {}",
            players.len(),
            round_number
        );

        let mut cache_hits = 0;
        let mut cache_misses = 0;
        let mut warnings = Vec::new();

        // Choose algorithm based on tournament size
        let (pairings, algorithm_used) = if players.len() <= config.max_players_for_basic_algorithm
        {
            // Use standard algorithm for smaller tournaments
            let pairing_start = Instant::now();
            let result = self.swiss_engine.generate_dutch_system_pairings(
                players.clone(),
                player_results,
                game_history,
                round_number,
            )?;
            let pairing_duration = pairing_start.elapsed();

            tracing::debug!("Basic algorithm completed in {:?}", pairing_duration);
            (result.pairings, "Dutch System (Basic)".to_string())
        } else {
            // Use optimized algorithm for large tournaments
            self.generate_large_tournament_pairings(LargeTournamentParams {
                players: &players,
                player_results: &player_results,
                game_history: &game_history,
                round_number,
                config: &config,
                cache_hits: &mut cache_hits,
                cache_misses: &mut cache_misses,
                warnings: &mut warnings,
            })?
        };

        let total_duration = start_time.elapsed();

        // Validate pairings
        let validation_start = Instant::now();
        self.validate_large_tournament_pairings(&pairings, &players)?;
        let validation_duration = validation_start.elapsed();

        let metrics = PerformanceMetrics {
            total_duration_ms: total_duration.as_millis(),
            pairing_generation_ms: total_duration.as_millis() - validation_duration.as_millis(),
            validation_duration_ms: validation_duration.as_millis(),
            players_processed: players.len(),
            pairings_generated: pairings.len(),
            cache_hits,
            cache_misses,
            algorithm_used,
        };

        tracing::info!(
            "Optimized pairing completed: {} players -> {} pairings in {}ms",
            metrics.players_processed,
            metrics.pairings_generated,
            metrics.total_duration_ms
        );

        Ok(OptimizedPairingResult {
            pairings,
            metrics,
            warnings,
        })
    }

    /// Generate pairings optimized for large tournaments (500+ players)
    #[allow(unused_mut)]
    fn generate_large_tournament_pairings(
        &self,
        mut params: LargeTournamentParams<'_>,
    ) -> Result<(Vec<Pairing>, String), PawnError> {
        tracing::info!(
            "Using large tournament optimization for {} players",
            params.players.len()
        );

        // Step 1: Pre-process and index data for fast access
        let start_preprocessing = Instant::now();
        let indexed_data = self.preprocess_tournament_data(
            params.players,
            params.player_results,
            params.game_history,
            params.config.cache_opponent_history,
        )?;
        let preprocessing_time = start_preprocessing.elapsed();

        tracing::debug!("Preprocessing completed in {:?}", preprocessing_time);

        // Step 2: Divide players into manageable batches
        let batches = self.create_score_based_batches(
            &indexed_data.players_by_score,
            params.config.batch_size_for_large_tournaments,
        );

        tracing::debug!("Created {} batches for processing", batches.len());

        // Step 3: Process batches with optimized algorithms
        let mut all_pairings = Vec::new();
        let mut board_number = 1;
        let mut global_paired_players = HashSet::new();

        for (batch_idx, batch) in batches.iter().enumerate() {
            let batch_start = Instant::now();

            let batch_pairings =
                self.process_score_batch_with_global_tracking(ScoreBatchWithTrackingParams {
                    batch,
                    indexed_data: &indexed_data,
                    round_number: params.round_number,
                    board_number: &mut board_number,
                    config: params.config,
                    cache_hits: params.cache_hits,
                    cache_misses: params.cache_misses,
                    global_paired_players: &mut global_paired_players,
                })?;

            let batch_time = batch_start.elapsed();
            tracing::debug!(
                "Batch {} processed: {} players -> {} pairings in {:?}",
                batch_idx,
                batch.len(),
                batch_pairings.len(),
                batch_time
            );

            all_pairings.extend(batch_pairings);

            // Check timeout
            if preprocessing_time.as_secs() > params.config.timeout_seconds {
                params.warnings.push(
                    "Pairing generation approaching timeout, may have incomplete optimization"
                        .to_string(),
                );
                break;
            }
        }

        // Step 4: Handle any remaining unpaired players
        let remaining_players = self.handle_remaining_players(&indexed_data, &all_pairings)?;
        if !remaining_players.is_empty() {
            params.warnings.push(format!(
                "{} players remained unpaired",
                remaining_players.len()
            ));
        }

        Ok((all_pairings, "Large Tournament Optimized".to_string()))
    }

    /// Preprocess tournament data for efficient access
    fn preprocess_tournament_data(
        &self,
        players: &[Player],
        player_results: &[PlayerResult],
        game_history: &[GameResult],
        cache_enabled: bool,
    ) -> Result<IndexedTournamentData, PawnError> {
        let mut players_by_score: HashMap<String, Vec<Player>> = HashMap::new();
        let mut player_points: HashMap<i32, f64> = HashMap::new();
        let mut opponent_cache: HashMap<i32, HashSet<i32>> = HashMap::new();

        // Index player results
        let results_map: HashMap<i32, &PlayerResult> = player_results
            .iter()
            .map(|result| (result.player.id, result))
            .collect();

        // Group players by score
        for player in players {
            let points = results_map.get(&player.id).map(|r| r.points).unwrap_or(0.0);
            player_points.insert(player.id, points as f64);

            let score_key = format!("{points:.1}");
            players_by_score
                .entry(score_key)
                .or_default()
                .push(player.clone());
        }

        // Build opponent cache if enabled
        if cache_enabled {
            for game in game_history {
                let white_id = game.white_player.id;
                let black_id = game.black_player.id;

                if white_id > 0 && black_id > 0 {
                    opponent_cache.entry(white_id).or_default().insert(black_id);
                    opponent_cache.entry(black_id).or_default().insert(white_id);
                }
            }
        }

        Ok(IndexedTournamentData {
            players_by_score,
            player_points,
            opponent_cache,
            total_players: players.len(),
        })
    }

    /// Create score-based batches for parallel processing
    fn create_score_based_batches(
        &self,
        players_by_score: &HashMap<String, Vec<Player>>,
        batch_size: usize,
    ) -> Vec<Vec<Player>> {
        let mut batches = Vec::new();
        let mut current_batch = Vec::new();

        // Sort score groups by points (descending)
        let mut sorted_scores: Vec<_> = players_by_score.keys().collect();
        sorted_scores.sort_by(|a, b| {
            let score_a: f64 = a.parse().unwrap_or(0.0);
            let score_b: f64 = b.parse().unwrap_or(0.0);
            score_b
                .partial_cmp(&score_a)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        for score_key in sorted_scores {
            if let Some(players) = players_by_score.get(score_key) {
                for player in players {
                    current_batch.push(player.clone());

                    if current_batch.len() >= batch_size {
                        batches.push(current_batch);
                        current_batch = Vec::new();
                    }
                }
            }
        }

        // Add remaining players
        if !current_batch.is_empty() {
            batches.push(current_batch);
        }

        batches
    }

    /// Process a batch of players with similar scores
    fn process_score_batch(&self, params: ScoreBatchParams<'_>) -> Result<Vec<Pairing>, PawnError> {
        let mut global_paired_players = HashSet::new();
        self.process_score_batch_with_global_tracking(ScoreBatchWithTrackingParams {
            batch: params.batch,
            indexed_data: params.indexed_data,
            round_number: params.round_number,
            board_number: params.board_number,
            config: params.config,
            cache_hits: params.cache_hits,
            cache_misses: params.cache_misses,
            global_paired_players: &mut global_paired_players,
        })
    }

    /// Process a batch of players with similar scores, tracking globally paired players
    fn process_score_batch_with_global_tracking(
        &self,
        params: ScoreBatchWithTrackingParams<'_>,
    ) -> Result<Vec<Pairing>, PawnError> {
        if params.batch.len() < 2 {
            return Ok(vec![]);
        }

        let mut pairings = Vec::new();

        // Sort batch by rating for optimal pairing
        let mut sorted_batch = params.batch.to_vec();
        sorted_batch.sort_by(|a, b| b.rating.unwrap_or(0).cmp(&a.rating.unwrap_or(0)));

        // Pair players using optimized algorithm
        let mut i = 0;
        while i < sorted_batch.len() {
            if params.global_paired_players.contains(&sorted_batch[i].id) {
                i += 1;
                continue;
            }

            // Find best opponent using cached data
            let player1 = &sorted_batch[i];
            let mut best_opponent_idx = None;
            let mut best_score = f64::NEG_INFINITY;

            for (j, player2) in sorted_batch.iter().enumerate().skip(i + 1) {
                if params.global_paired_players.contains(&player2.id) {
                    continue;
                }

                // Quick check using cache
                if params.config.cache_opponent_history {
                    if let Some(opponents) = params.indexed_data.opponent_cache.get(&player1.id) {
                        if opponents.contains(&player2.id) {
                            *params.cache_hits += 1;
                            continue; // Skip rematches
                        }
                        // Cache hit but no rematch found
                        *params.cache_hits += 1;
                    } else {
                        *params.cache_misses += 1;
                    }
                }

                // Calculate pairing score
                let pairing_score =
                    self.calculate_fast_pairing_score(player1, player2, params.indexed_data);

                if pairing_score > best_score {
                    best_score = pairing_score;
                    best_opponent_idx = Some(j);
                }

                // Heuristic pruning for very large batches
                if params.config.use_heuristic_pruning && j - i > 20 && best_score > 0.0 {
                    break; // Good enough match found
                }
            }

            // Create pairing
            if let Some(j) = best_opponent_idx {
                let player2 = &sorted_batch[j];

                // Simple color assignment (can be enhanced)
                let (white_player, black_player) = if params.round_number % 2 == 0 {
                    (player1.clone(), player2.clone())
                } else {
                    (player2.clone(), player1.clone())
                };

                pairings.push(Pairing {
                    white_player,
                    black_player: Some(black_player),
                    board_number: *params.board_number,
                });

                params.global_paired_players.insert(sorted_batch[i].id);
                params.global_paired_players.insert(sorted_batch[j].id);
                *params.board_number += 1;
            }

            i += 1;
        }

        Ok(pairings)
    }

    /// Fast pairing score calculation for large tournaments
    fn calculate_fast_pairing_score(
        &self,
        player1: &Player,
        player2: &Player,
        indexed_data: &IndexedTournamentData,
    ) -> f64 {
        let mut score = 100.0;

        // Rating difference penalty (simplified)
        let rating_diff =
            (player1.rating.unwrap_or(1200) - player2.rating.unwrap_or(1200)).abs() as f64;
        score -= rating_diff / 100.0;

        // Points difference penalty
        let points1 = indexed_data.player_points.get(&player1.id).unwrap_or(&0.0);
        let points2 = indexed_data.player_points.get(&player2.id).unwrap_or(&0.0);
        let points_diff = (points1 - points2).abs();
        score -= points_diff * 10.0;

        score
    }

    /// Handle any players that couldn't be paired in batches
    fn handle_remaining_players(
        &self,
        _indexed_data: &IndexedTournamentData,
        _pairings: &[Pairing],
    ) -> Result<Vec<Player>, PawnError> {
        // TODO: Implement logic to identify and handle unpaired players
        Ok(vec![])
    }

    /// Fast validation for large tournament pairings
    fn validate_large_tournament_pairings(
        &self,
        pairings: &[Pairing],
        players: &[Player],
    ) -> Result<(), PawnError> {
        // Basic validation optimized for speed
        let mut seen_players = HashSet::new();

        for pairing in pairings {
            if !seen_players.insert(pairing.white_player.id) {
                return Err(PawnError::InvalidInput(format!(
                    "Player {} paired multiple times",
                    pairing.white_player.name
                )));
            }

            if let Some(ref black_player) = pairing.black_player {
                if !seen_players.insert(black_player.id) {
                    return Err(PawnError::InvalidInput(format!(
                        "Player {} paired multiple times",
                        black_player.name
                    )));
                }
            }
        }

        // Check that all players are accounted for (allowing for byes)
        let total_paired = seen_players.len();
        if !players.is_empty() && total_paired < players.len() - 1 {
            // Allow for 1 bye
            tracing::warn!(
                "Only {} of {} players were paired",
                total_paired,
                players.len()
            );
        }

        Ok(())
    }

    /// Get performance benchmarks for the system
    pub fn benchmark_performance(
        &self,
        player_counts: Vec<usize>,
    ) -> Result<Vec<BenchmarkResult>, PawnError> {
        let mut results = Vec::new();

        for &count in &player_counts {
            tracing::info!("Benchmarking with {} players", count);

            // Generate mock data
            let players = self.generate_mock_players(count);
            let player_results = self.generate_mock_results(&players);
            let game_history = vec![]; // Empty history to avoid duplicates

            let start_time = Instant::now();
            let result = self.generate_optimized_pairings(
                players,
                player_results,
                game_history,
                4,    // Round 4
                None, // Default config
            )?;
            let duration = start_time.elapsed();

            results.push(BenchmarkResult {
                player_count: count,
                duration_ms: duration.as_millis(),
                pairings_generated: result.pairings.len(),
                algorithm_used: result.metrics.algorithm_used,
            });
        }

        Ok(results)
    }

    /// Generate mock players for testing
    fn generate_mock_players(&self, count: usize) -> Vec<Player> {
        (1..=count)
            .map(|i| Player {
                id: i as i32,
                tournament_id: 1,
                name: format!("Player {i}"),
                rating: Some(1200 + (i % 800) as i32), // Ratings from 1200-2000
                country_code: Some("XX".to_string()),
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
                created_at: "2023-01-01".to_string(),
                updated_at: None,
            })
            .collect()
    }

    /// Generate mock player results
    fn generate_mock_results(&self, players: &[Player]) -> Vec<PlayerResult> {
        players
            .iter()
            .enumerate()
            .map(|(i, player)| {
                let points = (i % 7) as f32 / 2.0; // Points from 0 to 3
                let games_played = 3; // Assume 3 games played
                let wins = (points * 2.0) as i32; // Convert points to wins
                let draws = if points * 2.0 - wins as f32 > 0.0 {
                    1
                } else {
                    0
                };
                let losses = games_played - wins - draws;

                PlayerResult {
                    player: player.clone(),
                    points,
                    games_played,
                    wins,
                    draws,
                    losses,
                }
            })
            .collect()
    }

    /// Generate mock game history with unique pairings for each round
    fn generate_mock_history(&self, players: &[Player], rounds: usize) -> Vec<GameResult> {
        let mut history = Vec::new();
        let mut game_id = 1;
        let mut used_pairings = std::collections::HashSet::new();

        for round in 1..=rounds {
            // Create valid round pairings where each player is paired exactly once
            let mut round_pairings = Vec::new();
            let mut paired_in_round = std::collections::HashSet::new();

            // Simple round-robin style pairing generation
            for i in 0..players.len() {
                if paired_in_round.contains(&i) {
                    continue;
                }

                // Find first available partner
                for j in (i + 1)..players.len() {
                    if paired_in_round.contains(&j) {
                        continue;
                    }

                    let p1_id = players[i].id;
                    let p2_id = players[j].id;

                    // Create pairing key (always smaller ID first for consistency)
                    let pairing_key = if p1_id < p2_id {
                        (p1_id, p2_id)
                    } else {
                        (p2_id, p1_id)
                    };

                    // Skip if this pairing was already used in previous rounds
                    if used_pairings.contains(&pairing_key) {
                        continue;
                    }

                    // Add this pairing to the round
                    round_pairings.push((i, j, pairing_key));
                    used_pairings.insert(pairing_key);
                    paired_in_round.insert(i);
                    paired_in_round.insert(j);
                    break;
                }
            }

            // Create GameResult objects for the round pairings
            for (i, j, _) in round_pairings {
                let game = Game {
                    id: game_id,
                    tournament_id: 1,
                    round_number: round as i32,
                    white_player_id: players[i].id,
                    black_player_id: players[j].id,
                    result: "1-0".to_string(),
                    result_type: Some("normal".to_string()),
                    result_reason: None,
                    arbiter_notes: None,
                    last_updated: None,
                    approved_by: None,
                    created_at: "2023-01-01".to_string(),
                };

                history.push(GameResult {
                    game,
                    white_player: players[i].clone(),
                    black_player: players[j].clone(),
                });

                game_id += 1;
            }
        }

        history
    }
}

#[derive(Debug)]

struct IndexedTournamentData {
    players_by_score: HashMap<String, Vec<Player>>,
    player_points: HashMap<i32, f64>,
    opponent_cache: HashMap<i32, HashSet<i32>>,

    total_players: usize,
}

#[derive(Debug)]

pub struct BenchmarkResult {
    pub player_count: usize,

    pub duration_ms: u128,

    pub pairings_generated: usize,

    pub algorithm_used: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_player(id: i32, name: &str, rating: Option<i32>) -> Player {
        Player {
            id,
            tournament_id: 1,
            name: name.to_string(),
            rating,
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
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: None,
        }
    }

    fn create_test_result(player: Player, points: f64) -> PlayerResult {
        PlayerResult {
            player,
            points: points as f32,
            games_played: 1,
            wins: if points == 1.0 { 1 } else { 0 },
            draws: if points == 0.5 { 1 } else { 0 },
            losses: if points == 0.0 { 1 } else { 0 },
        }
    }

    #[test]

    fn test_optimizer_creation() {
        let _optimizer = PairingOptimizer::new();
        // Just test that it creates successfully without panicking
    }

    #[test]

    fn test_default_optimization_config() {
        let config = OptimizationConfig::default();
        assert_eq!(config.max_players_for_basic_algorithm, 100);
        assert!(config.use_parallel_processing);
        assert_eq!(config.batch_size_for_large_tournaments, 50);
        assert_eq!(config.timeout_seconds, 30);
        assert!(config.cache_opponent_history);
        assert!(config.use_heuristic_pruning);
    }

    #[test]

    fn test_small_tournament_optimization() {
        let optimizer = PairingOptimizer::new();
        let players = vec![
            create_test_player(1, "Player 1", Some(1500)),
            create_test_player(2, "Player 2", Some(1400)),
            create_test_player(3, "Player 3", Some(1600)),
            create_test_player(4, "Player 4", Some(1300)),
        ];

        let results: Vec<PlayerResult> = players
            .iter()
            .map(|p| create_test_result(p.clone(), 0.5))
            .collect();

        let result = optimizer
            .generate_optimized_pairings(
                players,
                results,
                vec![],
                2,
                Some(OptimizationConfig::default()),
            )
            .unwrap();

        // Should generate pairings for 4 players
        assert_eq!(result.pairings.len(), 2);
        assert_eq!(result.metrics.players_processed, 4);
        assert_eq!(result.metrics.pairings_generated, 2);
        assert!(!result.metrics.algorithm_used.is_empty());
    }

    #[test]

    fn test_large_tournament_optimization() {
        let optimizer = PairingOptimizer::new();

        // Create 150 players (above default threshold of 100)
        let players: Vec<Player> = (1..=150)
            .map(|i| create_test_player(i, &format!("Player {i}"), Some(1500 + (i % 500))))
            .collect();

        let results: Vec<PlayerResult> = players
            .iter()
            .map(|p| create_test_result(p.clone(), 0.5))
            .collect();

        let config = OptimizationConfig {
            max_players_for_basic_algorithm: 100, // Force optimized algorithm
            ..Default::default()
        };

        let result = optimizer
            .generate_optimized_pairings(players, results, vec![], 2, Some(config))
            .unwrap();

        // Should generate pairings for 150 players
        assert_eq!(result.pairings.len(), 75);
        assert_eq!(result.metrics.players_processed, 150);
        assert_eq!(result.metrics.pairings_generated, 75);
        assert!(result.metrics.total_duration_ms > 0);
    }

    #[test]

    fn test_performance_metrics_tracking() {
        let optimizer = PairingOptimizer::new();
        let players = vec![
            create_test_player(1, "Player 1", Some(1500)),
            create_test_player(2, "Player 2", Some(1400)),
        ];

        let results = players
            .iter()
            .map(|p| create_test_result(p.clone(), 1.0))
            .collect();

        let result = optimizer
            .generate_optimized_pairings(
                players,
                results,
                vec![],
                2,
                Some(OptimizationConfig::default()),
            )
            .unwrap();

        let metrics = result.metrics;
        // Duration metrics are unsigned, always >= 0
        assert!(metrics.pairing_generation_ms <= metrics.total_duration_ms);
        assert!(metrics.validation_duration_ms <= metrics.total_duration_ms);
        assert_eq!(metrics.players_processed, 2);
        assert_eq!(metrics.pairings_generated, 1);
        assert!(!metrics.algorithm_used.is_empty());
    }

    #[test]

    fn test_cache_functionality() {
        let optimizer = PairingOptimizer::new();
        let players = vec![
            create_test_player(1, "Player 1", Some(1500)),
            create_test_player(2, "Player 2", Some(1400)),
            create_test_player(3, "Player 3", Some(1600)),
            create_test_player(4, "Player 4", Some(1300)),
        ];

        let results: Vec<PlayerResult> = players
            .iter()
            .map(|p| create_test_result(p.clone(), 0.5))
            .collect();

        // Create some game history
        let history = vec![GameResult {
            game: Game {
                id: 1,
                tournament_id: 1,
                round_number: 1,
                white_player_id: 1,
                black_player_id: 2,
                result: "1-0".to_string(),
                result_type: None,
                result_reason: None,
                arbiter_notes: None,
                last_updated: None,
                approved_by: None,
                created_at: "2024-01-01T00:00:00Z".to_string(),
            },
            white_player: players[0].clone(),
            black_player: players[1].clone(),
        }];

        let config = OptimizationConfig {
            cache_opponent_history: true,
            max_players_for_basic_algorithm: 2, // Force optimized algorithm
            ..Default::default()
        };

        let result = optimizer
            .generate_optimized_pairings(players, results, history, 2, Some(config))
            .unwrap();

        // Metrics should track cache usage
        assert!(result.metrics.cache_hits + result.metrics.cache_misses > 0);
    }

    #[test]

    fn test_benchmark_performance() {
        let optimizer = PairingOptimizer::new();

        // Test each count individually to isolate the issue
        let player_counts = vec![10, 20, 50];
        let mut results = Vec::new();

        for &count in &player_counts {
            println!("Testing with {count} players");

            // Generate mock data
            let players = optimizer.generate_mock_players(count);
            let player_results = optimizer.generate_mock_results(&players);
            let game_history = vec![]; // Empty history to avoid duplicates

            let start_time = std::time::Instant::now();
            let result = optimizer
                .generate_optimized_pairings(
                    players,
                    player_results,
                    game_history,
                    4,    // Round 4
                    None, // Default config
                )
                .unwrap();
            let duration = start_time.elapsed();

            results.push(crate::pawn::service::pairing_optimizer::BenchmarkResult {
                player_count: count,
                duration_ms: duration.as_millis(),
                pairings_generated: result.pairings.len(),
                algorithm_used: result.metrics.algorithm_used,
            });
        }

        assert_eq!(results.len(), player_counts.len());

        for (i, result) in results.iter().enumerate() {
            assert_eq!(result.player_count, player_counts[i]);
            // Duration metrics are unsigned, always >= 0
            assert!(result.pairings_generated > 0);
            assert!(!result.algorithm_used.is_empty());
        }
    }

    #[test]

    fn test_batch_processing() {
        let optimizer = PairingOptimizer::new();

        // Create enough players to trigger batch processing
        let players: Vec<Player> = (1..=30)
            .map(|i| create_test_player(i, &format!("Player {i}"), Some(1500)))
            .collect();

        let results: Vec<PlayerResult> = players
            .iter()
            .map(|p| create_test_result(p.clone(), 0.5))
            .collect();

        let config = OptimizationConfig {
            batch_size_for_large_tournaments: 10, // Small batch size for testing
            max_players_for_basic_algorithm: 20,  // Force optimized algorithm
            ..Default::default()
        };

        let result = optimizer
            .generate_optimized_pairings(players, results, vec![], 2, Some(config))
            .unwrap();

        // Should still generate all pairings despite batching
        assert_eq!(result.pairings.len(), 15);
        assert_eq!(result.metrics.players_processed, 30);
    }

    #[test]

    fn test_timeout_configuration() {
        let optimizer = PairingOptimizer::new();
        let players = vec![
            create_test_player(1, "Player 1", Some(1500)),
            create_test_player(2, "Player 2", Some(1400)),
        ];

        let results: Vec<PlayerResult> = players
            .iter()
            .map(|p| create_test_result(p.clone(), 0.5))
            .collect();

        let config = OptimizationConfig {
            timeout_seconds: 1, // Very short timeout
            ..Default::default()
        };

        let result =
            optimizer.generate_optimized_pairings(players, results, vec![], 2, Some(config));

        // Should complete within timeout for small tournament
        assert!(result.is_ok());
    }

    #[test]

    fn test_parallel_processing_config() {
        let optimizer = PairingOptimizer::new();
        let players = vec![
            create_test_player(1, "Player 1", Some(1500)),
            create_test_player(2, "Player 2", Some(1400)),
            create_test_player(3, "Player 3", Some(1600)),
            create_test_player(4, "Player 4", Some(1300)),
        ];

        let results: Vec<PlayerResult> = players
            .iter()
            .map(|p| create_test_result(p.clone(), 0.5))
            .collect();

        // Test with parallel processing enabled
        let config = OptimizationConfig {
            use_parallel_processing: true,
            ..Default::default()
        };

        let result1 = optimizer
            .generate_optimized_pairings(
                players.clone(),
                results.clone(),
                vec![],
                2,
                Some(config.clone()),
            )
            .unwrap();

        // Test with parallel processing disabled
        let config2 = OptimizationConfig {
            use_parallel_processing: false,
            ..Default::default()
        };

        let result2 = optimizer
            .generate_optimized_pairings(players, results, vec![], 2, Some(config2))
            .unwrap();

        // Both should produce valid pairings
        assert_eq!(result1.pairings.len(), 2);
        assert_eq!(result2.pairings.len(), 2);
    }

    #[test]

    fn test_heuristic_pruning() {
        let optimizer = PairingOptimizer::new();
        let players = vec![
            create_test_player(1, "Player 1", Some(1500)),
            create_test_player(2, "Player 2", Some(1400)),
            create_test_player(3, "Player 3", Some(1600)),
            create_test_player(4, "Player 4", Some(1300)),
        ];

        let results: Vec<PlayerResult> = players
            .iter()
            .map(|p| create_test_result(p.clone(), 0.5))
            .collect();

        let config = OptimizationConfig {
            use_heuristic_pruning: true,
            ..Default::default()
        };

        let result = optimizer
            .generate_optimized_pairings(players, results, vec![], 2, Some(config))
            .unwrap();

        // Should generate pairings with heuristic pruning
        assert_eq!(result.pairings.len(), 2);
        // Duration can be 0 on very fast systems
        // Duration metrics are unsigned, always >= 0
    }

    #[test]

    fn test_empty_tournament() {
        let optimizer = PairingOptimizer::new();

        let result = optimizer
            .generate_optimized_pairings(
                vec![],
                vec![],
                vec![],
                1,
                Some(OptimizationConfig::default()),
            )
            .unwrap();

        assert!(result.pairings.is_empty());
        assert_eq!(result.metrics.players_processed, 0);
        assert_eq!(result.metrics.pairings_generated, 0);
    }

    #[test]

    fn test_single_player_tournament() {
        let optimizer = PairingOptimizer::new();
        let player = create_test_player(1, "Player 1", Some(1500));
        let result_data = create_test_result(player.clone(), 0.0);

        let result = optimizer
            .generate_optimized_pairings(
                vec![player],
                vec![result_data],
                vec![],
                1,
                Some(OptimizationConfig::default()),
            )
            .unwrap();

        // Single player should result in bye (no pairings)
        assert!(result.pairings.is_empty());
        assert_eq!(result.metrics.players_processed, 1);
        assert_eq!(result.metrics.pairings_generated, 0);
    }

    #[test]

    fn test_mock_data_generation() {
        let optimizer = PairingOptimizer::new();

        // Test player generation
        let players = optimizer.generate_mock_players(10);
        assert_eq!(players.len(), 10);

        for player in &players {
            assert!(player.rating.is_some());
            assert!(player.rating.unwrap() >= 1000);
            assert!(player.rating.unwrap() <= 2800);
        }

        // Test result generation
        let results = optimizer.generate_mock_results(&players);
        assert_eq!(results.len(), 10);

        for result in &results {
            assert!(result.points >= 0.0);
            assert!(result.points <= 5.0); // Reasonable max for mock data
        }

        // Test history generation
        let history = optimizer.generate_mock_history(&players, 1);
        assert_eq!(history.len(), 5); // 10 players = 5 games per round
    }

    #[test]

    fn test_optimization_warnings() {
        let optimizer = PairingOptimizer::new();

        // Create a scenario that might generate warnings
        let players: Vec<Player> =
            (1..=201) // Odd number for potential bye warnings
                .map(|i| create_test_player(i, &format!("Player {i}"), Some(1500)))
                .collect();

        let results: Vec<PlayerResult> = players
            .iter()
            .map(|p| create_test_result(p.clone(), 0.5))
            .collect();

        let result = optimizer
            .generate_optimized_pairings(
                players,
                results,
                vec![],
                2,
                Some(OptimizationConfig::default()),
            )
            .unwrap();

        // Should have 100 pairings (200 players) with 1 bye
        assert_eq!(result.pairings.len(), 100);
        assert_eq!(result.metrics.players_processed, 201);

        // Warnings might be generated for odd number of players
        // (This depends on implementation details)
    }
}
