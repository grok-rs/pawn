/*!
 * Integration tests for the Pawn chess tournament management system
 *
 * This module contains integration tests that verify the complete functionality
 * of the system including database operations, service layer integration,
 * and end-to-end workflows.
 */

use serial_test::serial;
use sqlx::{Row, SqlitePool};
use tempfile::TempDir;

// Test database setup and cleanup utilities
pub struct TestDatabase {
    pub pool: SqlitePool,
    pub temp_dir: TempDir,
}

impl TestDatabase {
    /// Create a new test database with migrations applied
    pub async fn new() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let temp_dir = TempDir::new()?;
        let db_path = temp_dir.path().join("test.db");

        let database_url = format!("sqlite://{}?mode=rwc", db_path.display());
        let pool = SqlitePool::connect(&database_url).await?;

        // Apply all migrations
        sqlx::migrate!("./migrations").run(&pool).await?;

        Ok(TestDatabase { pool, temp_dir })
    }

    /// Clean up the test database
    pub async fn cleanup(self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        self.pool.close().await;
        drop(self.temp_dir);
        Ok(())
    }
}

#[tokio::test]
#[serial]
async fn test_database_connection_and_migrations() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");

    // Test that all tables exist after migrations
    let tables = sqlx::query("SELECT name FROM sqlite_master WHERE type='table'")
        .fetch_all(&test_db.pool)
        .await
        .expect("Failed to query tables");

    let table_names: Vec<String> = tables
        .into_iter()
        .map(|row| row.get::<String, _>("name"))
        .collect();

    // Verify all expected tables exist
    assert!(table_names.contains(&"tournaments".to_string()));
    assert!(table_names.contains(&"players".to_string()));
    assert!(table_names.contains(&"rounds".to_string()));
    assert!(table_names.contains(&"games".to_string()));

    test_db
        .cleanup()
        .await
        .expect("Failed to cleanup test database");
}

#[tokio::test]
#[serial]
async fn test_basic_crud_operations() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");

    // Test tournament creation
    let tournament_insert = sqlx::query("INSERT INTO tournaments (name, location, date, time_type, player_count, rounds_played, total_rounds, country_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind("Test Tournament")
        .bind("Test Location")
        .bind("2024-01-01")
        .bind("Classical")
        .bind(10)
        .bind(0)
        .bind(9)
        .bind("US")
        .execute(&test_db.pool)
        .await;

    assert!(
        tournament_insert.is_ok(),
        "Should be able to insert tournament"
    );

    let tournament_id = tournament_insert.unwrap().last_insert_rowid();

    // Test player creation
    let player_insert =
        sqlx::query("INSERT INTO players (tournament_id, name, rating) VALUES (?, ?, ?)")
            .bind(tournament_id)
            .bind("Test Player")
            .bind(1500)
            .execute(&test_db.pool)
            .await;

    assert!(player_insert.is_ok(), "Should be able to insert player");

    // Test data retrieval (expect 2 players: BYE player from trigger + test player)
    let players = sqlx::query("SELECT * FROM players WHERE tournament_id = ? ORDER BY name")
        .bind(tournament_id)
        .fetch_all(&test_db.pool)
        .await
        .expect("Failed to fetch players");

    assert_eq!(players.len(), 2);
    assert_eq!(players[0].get::<String, _>("name"), "BYE");
    assert_eq!(players[0].get::<i32, _>("rating"), 0);
    assert_eq!(players[1].get::<String, _>("name"), "Test Player");
    assert_eq!(players[1].get::<i32, _>("rating"), 1500);

    test_db
        .cleanup()
        .await
        .expect("Failed to cleanup test database");
}

#[tokio::test]
#[serial]
async fn test_migration_idempotency() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let db_path = temp_dir.path().join("idempotency_test.db");
    let database_url = format!("sqlite://{}?mode=rwc", db_path.display());

    // Create fresh database
    let pool = SqlitePool::connect(&database_url)
        .await
        .expect("Failed to connect to database");

    // Apply migrations first time
    let first_migration = sqlx::migrate!("./migrations").run(&pool).await;
    assert!(
        first_migration.is_ok(),
        "First migration failed: {:?}",
        first_migration
    );

    // Apply migrations second time (should be idempotent)
    let second_migration = sqlx::migrate!("./migrations").run(&pool).await;
    assert!(
        second_migration.is_ok(),
        "Second migration failed: {:?}",
        second_migration
    );

    // Verify migration records
    let migration_records = sqlx::query("SELECT version FROM _sqlx_migrations ORDER BY version")
        .fetch_all(&pool)
        .await
        .expect("Failed to query migration records");

    // Should have records for all migration files
    assert!(
        migration_records.len() >= 10,
        "Expected at least 10 migration records"
    );

    pool.close().await;
}

#[tokio::test]
#[serial]
async fn test_foreign_key_constraints() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");

    // Test foreign key constraint
    let insert_result =
        sqlx::query("INSERT INTO players (tournament_id, name) VALUES (99999, 'Test Player')")
            .execute(&test_db.pool)
            .await;

    // Should fail due to foreign key constraint
    assert!(
        insert_result.is_err(),
        "Insert should fail due to foreign key constraint"
    );

    test_db
        .cleanup()
        .await
        .expect("Failed to cleanup test database");
}

#[tokio::test]
#[serial]
async fn test_large_dataset_performance() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");

    // Create tournament
    let tournament_insert = sqlx::query("INSERT INTO tournaments (name, location, date, time_type, player_count, rounds_played, total_rounds, country_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind("Performance Test Tournament")
        .bind("Test Location")
        .bind("2024-01-01")
        .bind("Classical")
        .bind(100)
        .bind(0)
        .bind(9)
        .bind("US")
        .execute(&test_db.pool)
        .await
        .expect("Failed to create tournament");

    let tournament_id = tournament_insert.last_insert_rowid();

    // Create many players
    let start_time = std::time::Instant::now();

    for i in 0..100 {
        sqlx::query("INSERT INTO players (tournament_id, name, rating) VALUES (?, ?, ?)")
            .bind(tournament_id)
            .bind(format!("Player {}", i + 1))
            .bind(1500 + i * 10)
            .execute(&test_db.pool)
            .await
            .expect("Failed to insert player");
    }

    let insertion_time = start_time.elapsed();

    // Verify all players were created
    let players = sqlx::query("SELECT COUNT(*) as count FROM players WHERE tournament_id = ?")
        .bind(tournament_id)
        .fetch_one(&test_db.pool)
        .await
        .expect("Failed to count players");

    assert_eq!(players.get::<i64, _>("count"), 101); // 100 test players + 1 BYE player

    // Test search performance
    let search_start = std::time::Instant::now();
    let search_results =
        sqlx::query("SELECT * FROM players WHERE tournament_id = ? AND rating BETWEEN ? AND ?")
            .bind(tournament_id)
            .bind(1500)
            .bind(1700)
            .fetch_all(&test_db.pool)
            .await
            .expect("Failed to search players");

    let search_time = search_start.elapsed();

    assert!(!search_results.is_empty());

    // Assert performance requirements
    assert!(
        insertion_time.as_millis() < 5000,
        "Player insertion took too long: {}ms",
        insertion_time.as_millis()
    );
    assert!(
        search_time.as_millis() < 100,
        "Player search took too long: {}ms",
        search_time.as_millis()
    );

    test_db
        .cleanup()
        .await
        .expect("Failed to cleanup test database");
}

#[tokio::test]
#[serial]
async fn test_concurrent_access() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");

    // Create tournament
    let tournament_insert = sqlx::query("INSERT INTO tournaments (name, location, date, time_type, player_count, rounds_played, total_rounds, country_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind("Concurrent Test Tournament")
        .bind("Test Location")
        .bind("2024-01-01")
        .bind("Classical")
        .bind(10)
        .bind(0)
        .bind(9)
        .bind("US")
        .execute(&test_db.pool)
        .await
        .expect("Failed to create tournament");

    let tournament_id = tournament_insert.last_insert_rowid();

    // Create multiple players concurrently
    let mut handles = Vec::new();

    for i in 0..10 {
        let pool = test_db.pool.clone();
        let handle = tokio::spawn(async move {
            sqlx::query("INSERT INTO players (tournament_id, name, rating) VALUES (?, ?, ?)")
                .bind(tournament_id)
                .bind(format!("Concurrent Player {}", i))
                .bind(1500 + i * 10)
                .execute(&pool)
                .await
        });

        handles.push(handle);
    }

    // Wait for all operations to complete
    let results = futures::future::join_all(handles).await;

    // Verify all operations succeeded
    for result in results {
        let insert_result = result.expect("Task failed");
        assert!(insert_result.is_ok());
    }

    // Verify all players were created
    let players = sqlx::query("SELECT COUNT(*) as count FROM players WHERE tournament_id = ?")
        .bind(tournament_id)
        .fetch_one(&test_db.pool)
        .await
        .expect("Failed to count players");

    assert_eq!(players.get::<i64, _>("count"), 11); // 10 test players + 1 BYE player

    test_db
        .cleanup()
        .await
        .expect("Failed to cleanup test database");
}
