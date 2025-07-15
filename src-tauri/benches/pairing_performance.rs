/*!
 * Performance benchmarks for pairing algorithms
 * 
 * This benchmark suite tests the performance of various pairing algorithms
 * with different tournament sizes and configurations.
 */

use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use std::time::Duration;
use tokio::runtime::Runtime;
use tempfile::TempDir;
use sqlx::SqlitePool;

use pawn::pawn::db::sqlite::SqliteDatabase;
use pawn::pawn::service::swiss_pairing::SwissPairingEngine;
use pawn::pawn::service::round_robin_pairing::RoundRobinPairingEngine;
use pawn::pawn::service::knockout::KnockoutService;
use pawn::pawn::service::player::PlayerService;
use pawn::pawn::service::tournament::TournamentService;
use pawn::pawn::domain::model::*;
use pawn::pawn::domain::dto::*;

/// Benchmark configuration
struct BenchmarkConfig {
    player_counts: Vec<usize>,
    iterations: usize,
}

impl Default for BenchmarkConfig {
    fn default() -> Self {
        Self {
            player_counts: vec![8, 16, 32, 64, 128, 256, 512],
            iterations: 100,
        }
    }
}

/// Test database setup for benchmarks
struct BenchmarkDb {
    pool: SqlitePool,
    db: SqliteDatabase,
    _temp_dir: TempDir,
}

impl BenchmarkDb {
    async fn new() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let temp_dir = TempDir::new()?;
        let db_path = temp_dir.path().join("benchmark.db");
        
        let database_url = format!("sqlite:{}", db_path.display());
        let pool = SqlitePool::connect(&database_url).await?;
        
        // Apply migrations
        sqlx::migrate!("./migrations").run(&pool).await?;
        
        let db = SqliteDatabase::new(pool.clone()).await?;
        
        Ok(BenchmarkDb {
            pool,
            db,
            _temp_dir: temp_dir,
        })
    }
}

/// Create test players for benchmarking
async fn create_test_players(
    tournament_id: i32,
    count: usize,
    player_service: &PlayerService,
) -> Result<Vec<Player>, Box<dyn std::error::Error + Send + Sync>> {
    let mut players = Vec::new();
    
    for i in 0..count {
        let create_player = CreatePlayer {
            tournament_id,
            name: format!("Player {}", i + 1),
            rating: Some(1500 + ((i * 47) % 1000) as i32), // Distribute ratings
            country_code: Some("US".to_string()),
            title: None,
            birth_date: None,
            gender: None,
            email: None,
            phone: None,
            club: None,
        };
        
        let player = player_service.create_player_enhanced(create_player).await?;
        players.push(player);
    }
    
    Ok(players)
}

/// Benchmark Swiss pairing algorithm
fn bench_swiss_pairing(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let config = BenchmarkConfig::default();
    
    let mut group = c.benchmark_group("swiss_pairing");
    group.measurement_time(Duration::from_secs(10));
    
    for &player_count in &config.player_counts {
        group.bench_with_input(
            BenchmarkId::new("generate_pairings", player_count),
            &player_count,
            |b, &count| {
                b.to_async(&rt).iter(|| async {
                    let benchmark_db = BenchmarkDb::new().await
                        .expect("Failed to create benchmark database");
                    
                    let tournament_service = TournamentService::new(benchmark_db.db.clone());
                    let player_service = PlayerService::new(benchmark_db.db.clone());
                    
                    // Create tournament
                    let tournament = tournament_service.create_tournament(CreateTournament {
                        name: "Benchmark Tournament".to_string(),
                        location: None,
                        date: chrono::Utc::now().naive_utc(),
                        tournament_type: "Swiss".to_string(),
                        max_players: Some(count as i32),
                        rounds: Some(((count as f64).log2().ceil() as i32).max(1)),
                        time_control: Some("90+30".to_string()),
                        description: None,
                        pairing_method: Some("Swiss".to_string()),
                        time_control_id: None,
                    }).await.expect("Failed to create tournament");
                    
                    // Create players
                    let players = create_test_players(tournament.id, count, &player_service).await
                        .expect("Failed to create players");
                    
                    // Benchmark pairing generation
                    let pairing_engine = SwissPairingEngine::new();
                    let swiss_players: Vec<SwissPlayer> = players.into_iter().map(|p| SwissPlayer {
                        id: p.id,
                        name: p.name,
                        rating: p.rating.unwrap_or(1500),
                        score: 0.0,
                        tiebreak_scores: Vec::new(),
                        colors: Vec::new(),
                        opponents: Vec::new(),
                        team: None,
                        is_bye: false,
                        late_entry_round: None,
                        tournament_id: p.tournament_id,
                    }).collect();
                    
                    black_box(pairing_engine.generate_pairings(swiss_players, 1))
                        .expect("Failed to generate pairings");
                });
            },
        );
    }
    
    group.finish();
}

/// Benchmark Round Robin pairing algorithm
fn bench_round_robin_pairing(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let config = BenchmarkConfig::default();
    
    let mut group = c.benchmark_group("round_robin_pairing");
    group.measurement_time(Duration::from_secs(10));
    
    // Round Robin is impractical for large tournaments, so we use smaller sizes
    let round_robin_sizes = vec![4, 6, 8, 10, 12, 14, 16];
    
    for &player_count in &round_robin_sizes {
        group.bench_with_input(
            BenchmarkId::new("generate_all_rounds", player_count),
            &player_count,
            |b, &count| {
                b.to_async(&rt).iter(|| async {
                    let benchmark_db = BenchmarkDb::new().await
                        .expect("Failed to create benchmark database");
                    
                    let tournament_service = TournamentService::new(benchmark_db.db.clone());
                    let player_service = PlayerService::new(benchmark_db.db.clone());
                    
                    // Create tournament
                    let tournament = tournament_service.create_tournament(CreateTournament {
                        name: "Benchmark Tournament".to_string(),
                        location: None,
                        date: chrono::Utc::now().naive_utc(),
                        tournament_type: "RoundRobin".to_string(),
                        max_players: Some(count as i32),
                        rounds: Some(if count % 2 == 0 { count as i32 - 1 } else { count as i32 }),
                        time_control: Some("90+30".to_string()),
                        description: None,
                        pairing_method: Some("RoundRobin".to_string()),
                        time_control_id: None,
                    }).await.expect("Failed to create tournament");
                    
                    // Create players
                    let players = create_test_players(tournament.id, count, &player_service).await
                        .expect("Failed to create players");
                    
                    // Benchmark all round generation
                    let pairing_engine = RoundRobinPairingEngine::new();
                    let total_rounds = if count % 2 == 0 { count - 1 } else { count };
                    
                    for round in 1..=total_rounds {
                        let round_robin_players: Vec<RoundRobinPlayer> = players.iter().map(|p| RoundRobinPlayer {
                            id: p.id,
                            name: p.name.clone(),
                            rating: p.rating.unwrap_or(1500),
                            tournament_id: p.tournament_id,
                        }).collect();
                        
                        black_box(pairing_engine.generate_pairings(round_robin_players, round as i32))
                            .expect("Failed to generate round robin pairings");
                    }
                });
            },
        );
    }
    
    group.finish();
}

/// Benchmark Knockout tournament bracket generation
fn bench_knockout_bracket_generation(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let config = BenchmarkConfig::default();
    
    let mut group = c.benchmark_group("knockout_bracket");
    group.measurement_time(Duration::from_secs(10));
    
    // Use power-of-2 sizes for knockout tournaments
    let knockout_sizes = vec![8, 16, 32, 64, 128, 256, 512];
    
    for &player_count in &knockout_sizes {
        group.bench_with_input(
            BenchmarkId::new("generate_bracket", player_count),
            &player_count,
            |b, &count| {
                b.to_async(&rt).iter(|| async {
                    let benchmark_db = BenchmarkDb::new().await
                        .expect("Failed to create benchmark database");
                    
                    let tournament_service = TournamentService::new(benchmark_db.db.clone());
                    let player_service = PlayerService::new(benchmark_db.db.clone());
                    let knockout_service = KnockoutService::new(benchmark_db.db.clone());
                    
                    // Create tournament
                    let tournament = tournament_service.create_tournament(CreateTournament {
                        name: "Benchmark Tournament".to_string(),
                        location: None,
                        date: chrono::Utc::now().naive_utc(),
                        tournament_type: "Knockout".to_string(),
                        max_players: Some(count as i32),
                        rounds: Some(((count as f64).log2().ceil() as i32).max(1)),
                        time_control: Some("90+30".to_string()),
                        description: None,
                        pairing_method: Some("Knockout".to_string()),
                        time_control_id: None,
                    }).await.expect("Failed to create tournament");
                    
                    // Create players
                    let _players = create_test_players(tournament.id, count, &player_service).await
                        .expect("Failed to create players");
                    
                    // Benchmark bracket initialization
                    black_box(knockout_service.initialize_knockout_tournament(
                        tournament.id,
                        "SingleElimination".to_string()
                    ).await)
                    .expect("Failed to initialize knockout tournament");
                });
            },
        );
    }
    
    group.finish();
}

/// Benchmark player search operations
fn bench_player_search(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let config = BenchmarkConfig::default();
    
    let mut group = c.benchmark_group("player_search");
    group.measurement_time(Duration::from_secs(10));
    
    for &player_count in &config.player_counts {
        group.bench_with_input(
            BenchmarkId::new("search_by_rating", player_count),
            &player_count,
            |b, &count| {
                b.to_async(&rt).iter_batched(
                    || {
                        // Setup: Create database and players
                        rt.block_on(async {
                            let benchmark_db = BenchmarkDb::new().await
                                .expect("Failed to create benchmark database");
                            
                            let tournament_service = TournamentService::new(benchmark_db.db.clone());
                            let player_service = PlayerService::new(benchmark_db.db.clone());
                            
                            let tournament = tournament_service.create_tournament(CreateTournament {
                                name: "Benchmark Tournament".to_string(),
                                location: None,
                                date: chrono::Utc::now().naive_utc(),
                                tournament_type: "Swiss".to_string(),
                                max_players: Some(count as i32),
                                rounds: Some(5),
                                time_control: Some("90+30".to_string()),
                                description: None,
                                pairing_method: Some("Swiss".to_string()),
                                time_control_id: None,
                            }).await.expect("Failed to create tournament");
                            
                            create_test_players(tournament.id, count, &player_service).await
                                .expect("Failed to create players");
                            
                            (tournament.id, player_service)
                        })
                    },
                    |(tournament_id, player_service)| {
                        // Benchmark: Search players by rating
                        rt.block_on(async {
                            let search_filters = PlayerSearchFilters {
                                tournament_id: Some(tournament_id),
                                name: None,
                                rating_min: Some(1400),
                                rating_max: Some(1800),
                                country_code: None,
                                title: None,
                                status: None,
                                limit: Some(50),
                                offset: Some(0),
                            };
                            
                            black_box(player_service.search_players(search_filters).await)
                                .expect("Failed to search players");
                        })
                    },
                    criterion::BatchSize::SmallInput,
                );
            },
        );
    }
    
    group.finish();
}

/// Benchmark tiebreak calculations
fn bench_tiebreak_calculations(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let config = BenchmarkConfig::default();
    
    let mut group = c.benchmark_group("tiebreak_calculations");
    group.measurement_time(Duration::from_secs(10));
    
    for &player_count in &config.player_counts {
        group.bench_with_input(
            BenchmarkId::new("calculate_standings", player_count),
            &player_count,
            |b, &count| {
                b.to_async(&rt).iter_batched(
                    || {
                        // Setup: Create tournament with completed games
                        rt.block_on(async {
                            let benchmark_db = BenchmarkDb::new().await
                                .expect("Failed to create benchmark database");
                            
                            let tournament_service = TournamentService::new(benchmark_db.db.clone());
                            let player_service = PlayerService::new(benchmark_db.db.clone());
                            
                            let tournament = tournament_service.create_tournament(CreateTournament {
                                name: "Benchmark Tournament".to_string(),
                                location: None,
                                date: chrono::Utc::now().naive_utc(),
                                tournament_type: "Swiss".to_string(),
                                max_players: Some(count as i32),
                                rounds: Some(5),
                                time_control: Some("90+30".to_string()),
                                description: None,
                                pairing_method: Some("Swiss".to_string()),
                                time_control_id: None,
                            }).await.expect("Failed to create tournament");
                            
                            let players = create_test_players(tournament.id, count, &player_service).await
                                .expect("Failed to create players");
                            
                            // Create some games with results for tiebreak calculation
                            // This would require implementing game creation and result setting
                            // For now, we'll just return the tournament service
                            
                            (tournament.id, tournament_service)
                        })
                    },
                    |(tournament_id, tournament_service)| {
                        // Benchmark: Calculate standings with tiebreaks
                        rt.block_on(async {
                            black_box(tournament_service.get_tournament_standings(tournament_id).await)
                                .expect("Failed to calculate standings");
                        })
                    },
                    criterion::BatchSize::SmallInput,
                );
            },
        );
    }
    
    group.finish();
}

/// Benchmark memory usage patterns
fn bench_memory_usage(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    
    let mut group = c.benchmark_group("memory_usage");
    group.measurement_time(Duration::from_secs(10));
    
    group.bench_function("tournament_lifecycle", |b| {
        b.to_async(&rt).iter(|| async {
            let benchmark_db = BenchmarkDb::new().await
                .expect("Failed to create benchmark database");
            
            let tournament_service = TournamentService::new(benchmark_db.db.clone());
            let player_service = PlayerService::new(benchmark_db.db.clone());
            
            // Create tournament
            let tournament = tournament_service.create_tournament(CreateTournament {
                name: "Memory Test Tournament".to_string(),
                location: None,
                date: chrono::Utc::now().naive_utc(),
                tournament_type: "Swiss".to_string(),
                max_players: Some(100),
                rounds: Some(7),
                time_control: Some("90+30".to_string()),
                description: None,
                pairing_method: Some("Swiss".to_string()),
                time_control_id: None,
            }).await.expect("Failed to create tournament");
            
            // Create players
            let players = create_test_players(tournament.id, 100, &player_service).await
                .expect("Failed to create players");
            
            // Generate pairings
            let pairing_engine = SwissPairingEngine::new();
            let swiss_players: Vec<SwissPlayer> = players.into_iter().map(|p| SwissPlayer {
                id: p.id,
                name: p.name,
                rating: p.rating.unwrap_or(1500),
                score: 0.0,
                tiebreak_scores: Vec::new(),
                colors: Vec::new(),
                opponents: Vec::new(),
                team: None,
                is_bye: false,
                late_entry_round: None,
                tournament_id: p.tournament_id,
            }).collect();
            
            for round in 1..=7 {
                black_box(pairing_engine.generate_pairings(swiss_players.clone(), round))
                    .expect("Failed to generate pairings");
            }
            
            // Calculate standings
            black_box(tournament_service.get_tournament_standings(tournament.id).await)
                .expect("Failed to calculate standings");
        });
    });
    
    group.finish();
}

criterion_group!(
    benches,
    bench_swiss_pairing,
    bench_round_robin_pairing,
    bench_knockout_bracket_generation,
    bench_player_search,
    bench_tiebreak_calculations,
    bench_memory_usage
);

criterion_main!(benches);