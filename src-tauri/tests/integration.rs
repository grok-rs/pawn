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

    // Verify team tournament tables exist
    assert!(table_names.contains(&"teams".to_string()));
    assert!(table_names.contains(&"team_memberships".to_string()));
    assert!(table_names.contains(&"team_matches".to_string()));
    assert!(table_names.contains(&"team_lineups".to_string()));
    assert!(table_names.contains(&"team_board_rules".to_string()));
    assert!(table_names.contains(&"team_tournament_settings".to_string()));

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

// =====================================================
// Team Tournament Integration Tests
// =====================================================

#[tokio::test]
#[serial]
async fn test_team_basic_crud_operations() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");

    // Create a team tournament
    let tournament_insert = sqlx::query("INSERT INTO tournaments (name, location, date, time_type, player_count, rounds_played, total_rounds, country_code, is_team_tournament, team_size, max_teams) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind("Team Tournament Test")
        .bind("Test Location")
        .bind("2024-01-01")
        .bind("Classical")
        .bind(16)
        .bind(0)
        .bind(7)
        .bind("US")
        .bind(true)
        .bind(4)
        .bind(4)
        .execute(&test_db.pool)
        .await
        .expect("Failed to create team tournament");

    let tournament_id = tournament_insert.last_insert_rowid();

    // Test team creation
    let team_insert = sqlx::query("INSERT INTO teams (tournament_id, name, captain, description, color, club_affiliation) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(tournament_id)
        .bind("Team Alpha")
        .bind("Captain Smith")
        .bind("Strong team from Chess Club A")
        .bind("#FF0000")
        .bind("Chess Club A")
        .execute(&test_db.pool)
        .await
        .expect("Failed to create team");

    let team_id = team_insert.last_insert_rowid();

    // Test team data retrieval
    let team_row = sqlx::query("SELECT * FROM teams WHERE id = ?")
        .bind(team_id)
        .fetch_one(&test_db.pool)
        .await
        .expect("Failed to fetch team");

    assert_eq!(team_row.get::<String, _>("name"), "Team Alpha");
    assert_eq!(team_row.get::<String, _>("captain"), "Captain Smith");
    assert_eq!(team_row.get::<String, _>("color"), "#FF0000");
    assert_eq!(team_row.get::<String, _>("status"), "active");

    // Test team update
    sqlx::query("UPDATE teams SET description = ? WHERE id = ?")
        .bind("Updated team description")
        .bind(team_id)
        .execute(&test_db.pool)
        .await
        .expect("Failed to update team");

    let updated_team = sqlx::query("SELECT description FROM teams WHERE id = ?")
        .bind(team_id)
        .fetch_one(&test_db.pool)
        .await
        .expect("Failed to fetch updated team");

    assert_eq!(
        updated_team.get::<String, _>("description"),
        "Updated team description"
    );

    test_db
        .cleanup()
        .await
        .expect("Failed to cleanup test database");
}

#[tokio::test]
#[serial]
async fn test_team_membership_operations() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");

    // Create tournament and team
    let tournament_insert = sqlx::query("INSERT INTO tournaments (name, location, date, time_type, player_count, rounds_played, total_rounds, country_code, is_team_tournament, team_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind("Team Membership Test")
        .bind("Test Location")
        .bind("2024-01-01")
        .bind("Classical")
        .bind(16)
        .bind(0)
        .bind(7)
        .bind("US")
        .bind(true)
        .bind(4)
        .execute(&test_db.pool)
        .await
        .expect("Failed to create tournament");

    let tournament_id = tournament_insert.last_insert_rowid();

    let team_insert =
        sqlx::query("INSERT INTO teams (tournament_id, name, captain) VALUES (?, ?, ?)")
            .bind(tournament_id)
            .bind("Team Beta")
            .bind("Captain Jones")
            .execute(&test_db.pool)
            .await
            .expect("Failed to create team");

    let team_id = team_insert.last_insert_rowid();

    // Create players for the team
    let mut player_ids = Vec::new();
    for i in 1..=4 {
        let player_insert =
            sqlx::query("INSERT INTO players (tournament_id, name, rating) VALUES (?, ?, ?)")
                .bind(tournament_id)
                .bind(format!("Player {}", i))
                .bind(1500 + i * 50)
                .execute(&test_db.pool)
                .await
                .expect("Failed to create player");

        player_ids.push(player_insert.last_insert_rowid());
    }

    // Test team membership creation
    for (i, player_id) in player_ids.iter().enumerate() {
        let board_number = i + 1;
        let is_captain = i == 0; // First player is captain

        sqlx::query("INSERT INTO team_memberships (team_id, player_id, board_number, is_captain, rating_at_assignment) VALUES (?, ?, ?, ?, ?)")
            .bind(team_id)
            .bind(player_id)
            .bind(board_number as i32)
            .bind(is_captain)
            .bind(1500 + (i as i32) * 50)
            .execute(&test_db.pool)
            .await
            .expect("Failed to create team membership");
    }

    // Test team membership retrieval
    let memberships =
        sqlx::query("SELECT * FROM team_memberships WHERE team_id = ? ORDER BY board_number")
            .bind(team_id)
            .fetch_all(&test_db.pool)
            .await
            .expect("Failed to fetch team memberships");

    assert_eq!(memberships.len(), 4);
    assert_eq!(memberships[0].get::<i32, _>("board_number"), 1);
    assert_eq!(memberships[0].get::<bool, _>("is_captain"), true);
    assert_eq!(memberships[1].get::<i32, _>("board_number"), 2);
    assert_eq!(memberships[1].get::<bool, _>("is_captain"), false);

    // Test unique constraints
    let duplicate_board_result = sqlx::query("INSERT INTO team_memberships (team_id, player_id, board_number, is_captain) VALUES (?, ?, ?, ?)")
        .bind(team_id)
        .bind(player_ids[0])
        .bind(1) // Same board number
        .bind(false)
        .execute(&test_db.pool)
        .await;

    assert!(
        duplicate_board_result.is_err(),
        "Should not allow duplicate board numbers"
    );

    test_db
        .cleanup()
        .await
        .expect("Failed to cleanup test database");
}

#[tokio::test]
#[serial]
async fn test_team_match_operations() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");

    // Create tournament and teams
    let tournament_insert = sqlx::query("INSERT INTO tournaments (name, location, date, time_type, player_count, rounds_played, total_rounds, country_code, is_team_tournament, team_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind("Team Match Test")
        .bind("Test Location")
        .bind("2024-01-01")
        .bind("Classical")
        .bind(16)
        .bind(0)
        .bind(7)
        .bind("US")
        .bind(true)
        .bind(4)
        .execute(&test_db.pool)
        .await
        .expect("Failed to create tournament");

    let tournament_id = tournament_insert.last_insert_rowid();

    let team_a_insert =
        sqlx::query("INSERT INTO teams (tournament_id, name, captain) VALUES (?, ?, ?)")
            .bind(tournament_id)
            .bind("Team Alpha")
            .bind("Captain Alpha")
            .execute(&test_db.pool)
            .await
            .expect("Failed to create team A");

    let team_a_id = team_a_insert.last_insert_rowid();

    let team_b_insert =
        sqlx::query("INSERT INTO teams (tournament_id, name, captain) VALUES (?, ?, ?)")
            .bind(tournament_id)
            .bind("Team Beta")
            .bind("Captain Beta")
            .execute(&test_db.pool)
            .await
            .expect("Failed to create team B");

    let team_b_id = team_b_insert.last_insert_rowid();

    // Test team match creation
    let match_insert = sqlx::query("INSERT INTO team_matches (tournament_id, round_number, team_a_id, team_b_id, venue, scheduled_time, arbiter_name) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(tournament_id)
        .bind(1)
        .bind(team_a_id)
        .bind(team_b_id)
        .bind("Main Hall")
        .bind("2024-01-01 10:00:00")
        .bind("Arbiter Johnson")
        .execute(&test_db.pool)
        .await
        .expect("Failed to create team match");

    let match_id = match_insert.last_insert_rowid();

    // Test match retrieval
    let match_row = sqlx::query("SELECT * FROM team_matches WHERE id = ?")
        .bind(match_id)
        .fetch_one(&test_db.pool)
        .await
        .expect("Failed to fetch team match");

    assert_eq!(match_row.get::<i32, _>("round_number"), 1);
    assert_eq!(match_row.get::<i64, _>("team_a_id"), team_a_id);
    assert_eq!(match_row.get::<i64, _>("team_b_id"), team_b_id);
    assert_eq!(match_row.get::<String, _>("venue"), "Main Hall");
    assert_eq!(match_row.get::<String, _>("status"), "scheduled");

    // Test match result updates
    sqlx::query("UPDATE team_matches SET status = ?, team_a_match_points = ?, team_b_match_points = ?, team_a_board_points = ?, team_b_board_points = ? WHERE id = ?")
        .bind("completed")
        .bind(2.0)
        .bind(0.0)
        .bind(2.5)
        .bind(1.5)
        .bind(match_id)
        .execute(&test_db.pool)
        .await
        .expect("Failed to update match result");

    let updated_match = sqlx::query("SELECT * FROM team_matches WHERE id = ?")
        .bind(match_id)
        .fetch_one(&test_db.pool)
        .await
        .expect("Failed to fetch updated match");

    assert_eq!(updated_match.get::<String, _>("status"), "completed");
    assert_eq!(updated_match.get::<f64, _>("team_a_match_points"), 2.0);
    assert_eq!(updated_match.get::<f64, _>("team_b_match_points"), 0.0);
    assert_eq!(updated_match.get::<f64, _>("team_a_board_points"), 2.5);
    assert_eq!(updated_match.get::<f64, _>("team_b_board_points"), 1.5);

    test_db
        .cleanup()
        .await
        .expect("Failed to cleanup test database");
}

#[tokio::test]
#[serial]
async fn test_team_lineup_operations() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");

    // Create tournament, team, and players
    let tournament_insert = sqlx::query("INSERT INTO tournaments (name, location, date, time_type, player_count, rounds_played, total_rounds, country_code, is_team_tournament, team_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind("Team Lineup Test")
        .bind("Test Location")
        .bind("2024-01-01")
        .bind("Classical")
        .bind(16)
        .bind(0)
        .bind(7)
        .bind("US")
        .bind(true)
        .bind(4)
        .execute(&test_db.pool)
        .await
        .expect("Failed to create tournament");

    let tournament_id = tournament_insert.last_insert_rowid();

    let team_insert =
        sqlx::query("INSERT INTO teams (tournament_id, name, captain) VALUES (?, ?, ?)")
            .bind(tournament_id)
            .bind("Team Gamma")
            .bind("Captain Gamma")
            .execute(&test_db.pool)
            .await
            .expect("Failed to create team");

    let team_id = team_insert.last_insert_rowid();

    // Create players
    let mut player_ids = Vec::new();
    for i in 1..=5 {
        // 5 players (4 regular + 1 substitute)
        let player_insert =
            sqlx::query("INSERT INTO players (tournament_id, name, rating) VALUES (?, ?, ?)")
                .bind(tournament_id)
                .bind(format!("Player {}", i))
                .bind(1500 + i * 50)
                .execute(&test_db.pool)
                .await
                .expect("Failed to create player");

        player_ids.push(player_insert.last_insert_rowid());
    }

    // Test team lineup creation for round 1
    for i in 0..4 {
        let lineup_insert = sqlx::query("INSERT INTO team_lineups (team_id, round_number, board_number, player_id, submission_deadline, submitted_by) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(team_id)
            .bind(1)
            .bind((i + 1) as i32)
            .bind(player_ids[i])
            .bind("2024-01-01 09:00:00")
            .bind("Captain Gamma")
            .execute(&test_db.pool)
            .await
            .expect("Failed to create team lineup");
    }

    // Test lineup retrieval
    let lineups = sqlx::query(
        "SELECT * FROM team_lineups WHERE team_id = ? AND round_number = ? ORDER BY board_number",
    )
    .bind(team_id)
    .bind(1)
    .fetch_all(&test_db.pool)
    .await
    .expect("Failed to fetch team lineups");

    assert_eq!(lineups.len(), 4);
    assert_eq!(lineups[0].get::<i32, _>("board_number"), 1);
    assert_eq!(lineups[1].get::<i32, _>("board_number"), 2);
    assert_eq!(lineups[2].get::<i32, _>("board_number"), 3);
    assert_eq!(lineups[3].get::<i32, _>("board_number"), 4);

    // Test substitution for round 2
    let substitution_insert = sqlx::query("INSERT INTO team_lineups (team_id, round_number, board_number, player_id, is_substitute, substituted_player_id, notes, submitted_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(team_id)
        .bind(2)
        .bind(2)
        .bind(player_ids[4]) // Substitute player
        .bind(true)
        .bind(player_ids[1]) // Original player being substituted
        .bind("Player 2 is ill")
        .bind("Captain Gamma")
        .execute(&test_db.pool)
        .await
        .expect("Failed to create substitution");

    let substitution = sqlx::query(
        "SELECT * FROM team_lineups WHERE team_id = ? AND round_number = ? AND board_number = ?",
    )
    .bind(team_id)
    .bind(2)
    .bind(2)
    .fetch_one(&test_db.pool)
    .await
    .expect("Failed to fetch substitution");

    assert_eq!(substitution.get::<bool, _>("is_substitute"), true);
    assert_eq!(
        substitution.get::<i64, _>("substituted_player_id"),
        player_ids[1]
    );
    assert_eq!(substitution.get::<String, _>("notes"), "Player 2 is ill");

    test_db
        .cleanup()
        .await
        .expect("Failed to cleanup test database");
}

#[tokio::test]
#[serial]
async fn test_team_tournament_settings() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");

    // Create tournament
    let tournament_insert = sqlx::query("INSERT INTO tournaments (name, location, date, time_type, player_count, rounds_played, total_rounds, country_code, is_team_tournament, team_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind("Team Settings Test")
        .bind("Test Location")
        .bind("2024-01-01")
        .bind("Classical")
        .bind(16)
        .bind(0)
        .bind(7)
        .bind("US")
        .bind(true)
        .bind(4)
        .execute(&test_db.pool)
        .await
        .expect("Failed to create tournament");

    let tournament_id = tournament_insert.last_insert_rowid();

    // Test team tournament settings creation
    let _settings_insert = sqlx::query("INSERT INTO team_tournament_settings (tournament_id, team_size, max_teams, match_scoring_system, match_points_win, match_points_draw, match_points_loss, board_weight_system, require_board_order, allow_late_entries, team_pairing_method, color_allocation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(tournament_id)
        .bind(4)
        .bind(8)
        .bind("match_points")
        .bind(2)
        .bind(1)
        .bind(0)
        .bind("equal")
        .bind(true)
        .bind(false)
        .bind("swiss")
        .bind("balanced")
        .execute(&test_db.pool)
        .await
        .expect("Failed to create team tournament settings");

    // Test settings retrieval
    let settings = sqlx::query("SELECT * FROM team_tournament_settings WHERE tournament_id = ?")
        .bind(tournament_id)
        .fetch_one(&test_db.pool)
        .await
        .expect("Failed to fetch team tournament settings");

    assert_eq!(settings.get::<i32, _>("team_size"), 4);
    assert_eq!(settings.get::<i32, _>("max_teams"), 8);
    assert_eq!(
        settings.get::<String, _>("match_scoring_system"),
        "match_points"
    );
    assert_eq!(settings.get::<i32, _>("match_points_win"), 2);
    assert_eq!(settings.get::<i32, _>("match_points_draw"), 1);
    assert_eq!(settings.get::<i32, _>("match_points_loss"), 0);
    assert_eq!(settings.get::<String, _>("board_weight_system"), "equal");
    assert_eq!(settings.get::<bool, _>("require_board_order"), true);
    assert_eq!(settings.get::<bool, _>("allow_late_entries"), false);
    assert_eq!(settings.get::<String, _>("team_pairing_method"), "swiss");
    assert_eq!(settings.get::<String, _>("color_allocation"), "balanced");

    // Test settings update
    sqlx::query("UPDATE team_tournament_settings SET max_teams = ?, match_points_win = ? WHERE tournament_id = ?")
        .bind(12)
        .bind(3)
        .bind(tournament_id)
        .execute(&test_db.pool)
        .await
        .expect("Failed to update team tournament settings");

    let updated_settings =
        sqlx::query("SELECT * FROM team_tournament_settings WHERE tournament_id = ?")
            .bind(tournament_id)
            .fetch_one(&test_db.pool)
            .await
            .expect("Failed to fetch updated team tournament settings");

    assert_eq!(updated_settings.get::<i32, _>("max_teams"), 12);
    assert_eq!(updated_settings.get::<i32, _>("match_points_win"), 3);

    test_db
        .cleanup()
        .await
        .expect("Failed to cleanup test database");
}

#[tokio::test]
#[serial]
async fn test_team_foreign_key_constraints() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");

    // Test team foreign key constraint
    let invalid_team_result = sqlx::query("INSERT INTO teams (tournament_id, name) VALUES (?, ?)")
        .bind(99999)
        .bind("Invalid Team")
        .execute(&test_db.pool)
        .await;

    assert!(
        invalid_team_result.is_err(),
        "Should fail due to foreign key constraint"
    );

    // Test team membership foreign key constraints
    let invalid_membership_result = sqlx::query(
        "INSERT INTO team_memberships (team_id, player_id, board_number) VALUES (?, ?, ?)",
    )
    .bind(99999)
    .bind(99999)
    .bind(1)
    .execute(&test_db.pool)
    .await;

    assert!(
        invalid_membership_result.is_err(),
        "Should fail due to foreign key constraint"
    );

    // Test team match foreign key constraints
    let invalid_match_result = sqlx::query("INSERT INTO team_matches (tournament_id, round_number, team_a_id, team_b_id) VALUES (?, ?, ?, ?)")
        .bind(99999)
        .bind(1)
        .bind(99999)
        .bind(99998)
        .execute(&test_db.pool)
        .await;

    assert!(
        invalid_match_result.is_err(),
        "Should fail due to foreign key constraint"
    );

    test_db
        .cleanup()
        .await
        .expect("Failed to cleanup test database");
}

#[tokio::test]
#[serial]
async fn test_team_performance_with_large_dataset() {
    let test_db = TestDatabase::new()
        .await
        .expect("Failed to create test database");

    // Create tournament
    let tournament_insert = sqlx::query("INSERT INTO tournaments (name, location, date, time_type, player_count, rounds_played, total_rounds, country_code, is_team_tournament, team_size, max_teams) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind("Large Team Tournament")
        .bind("Test Location")
        .bind("2024-01-01")
        .bind("Classical")
        .bind(200)
        .bind(0)
        .bind(7)
        .bind("US")
        .bind(true)
        .bind(4)
        .bind(50)
        .execute(&test_db.pool)
        .await
        .expect("Failed to create tournament");

    let tournament_id = tournament_insert.last_insert_rowid();

    let start_time = std::time::Instant::now();

    // Create 50 teams with 4 players each
    for team_num in 1..=50 {
        let team_insert =
            sqlx::query("INSERT INTO teams (tournament_id, name, captain) VALUES (?, ?, ?)")
                .bind(tournament_id)
                .bind(format!("Team {}", team_num))
                .bind(format!("Captain {}", team_num))
                .execute(&test_db.pool)
                .await
                .expect("Failed to create team");

        let team_id = team_insert.last_insert_rowid();

        // Create 4 players for each team
        for player_num in 1..=4 {
            let player_insert =
                sqlx::query("INSERT INTO players (tournament_id, name, rating) VALUES (?, ?, ?)")
                    .bind(tournament_id)
                    .bind(format!("Team {} Player {}", team_num, player_num))
                    .bind(1500 + player_num * 50)
                    .execute(&test_db.pool)
                    .await
                    .expect("Failed to create player");

            let player_id = player_insert.last_insert_rowid();

            // Add player to team
            sqlx::query("INSERT INTO team_memberships (team_id, player_id, board_number, rating_at_assignment) VALUES (?, ?, ?, ?)")
                .bind(team_id)
                .bind(player_id)
                .bind(player_num as i32)
                .bind(1500 + player_num * 50)
                .execute(&test_db.pool)
                .await
                .expect("Failed to create team membership");
        }
    }

    let creation_time = start_time.elapsed();

    // Test team search performance
    let search_start = std::time::Instant::now();
    let teams = sqlx::query("SELECT t.*, COUNT(tm.id) as member_count FROM teams t LEFT JOIN team_memberships tm ON t.id = tm.team_id WHERE t.tournament_id = ? GROUP BY t.id ORDER BY t.name")
        .bind(tournament_id)
        .fetch_all(&test_db.pool)
        .await
        .expect("Failed to search teams");

    let search_time = search_start.elapsed();

    assert_eq!(teams.len(), 50);
    assert_eq!(teams[0].get::<i64, _>("member_count"), 4);

    // Test team membership query performance
    let membership_start = std::time::Instant::now();
    let memberships = sqlx::query("SELECT tm.*, p.name as player_name FROM team_memberships tm JOIN players p ON tm.player_id = p.id WHERE tm.team_id IN (SELECT id FROM teams WHERE tournament_id = ?) ORDER BY tm.team_id, tm.board_number")
        .bind(tournament_id)
        .fetch_all(&test_db.pool)
        .await
        .expect("Failed to query team memberships");

    let membership_time = membership_start.elapsed();

    assert_eq!(memberships.len(), 200); // 50 teams * 4 players each

    // Assert performance requirements
    assert!(
        creation_time.as_millis() < 10000,
        "Team creation took too long: {}ms",
        creation_time.as_millis()
    );
    assert!(
        search_time.as_millis() < 200,
        "Team search took too long: {}ms",
        search_time.as_millis()
    );
    assert!(
        membership_time.as_millis() < 300,
        "Team membership query took too long: {}ms",
        membership_time.as_millis()
    );

    test_db
        .cleanup()
        .await
        .expect("Failed to cleanup test database");
}

// Team command integration tests
// Note: team_commands_integration module temporarily removed until implementation is complete
