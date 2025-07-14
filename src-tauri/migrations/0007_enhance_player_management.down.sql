-- Drop trigger
DROP TRIGGER IF EXISTS update_players_updated_at;

-- Drop indexes
DROP INDEX IF EXISTS idx_players_birth_date;
DROP INDEX IF EXISTS idx_players_rating;
DROP INDEX IF EXISTS idx_players_status;
DROP INDEX IF EXISTS idx_player_category_assignments_category_id;
DROP INDEX IF EXISTS idx_player_category_assignments_player_id;
DROP INDEX IF EXISTS idx_player_categories_tournament_id;
DROP INDEX IF EXISTS idx_rating_history_type_date;
DROP INDEX IF EXISTS idx_rating_history_player_id;

-- Drop new tables
DROP TABLE IF EXISTS player_category_assignments;
DROP TABLE IF EXISTS player_categories;
DROP TABLE IF EXISTS rating_history;

-- Remove columns from players table (SQLite doesn't support DROP COLUMN, so we need to recreate the table)
CREATE TABLE players_backup AS SELECT id, tournament_id, name, rating, country_code, created_at FROM players;
DROP TABLE players;

CREATE TABLE players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    rating INTEGER,
    country_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

INSERT INTO players (id, tournament_id, name, rating, country_code, created_at)
SELECT id, tournament_id, name, rating, country_code, created_at FROM players_backup;

DROP TABLE players_backup;

-- Recreate original indexes
CREATE INDEX IF NOT EXISTS idx_players_tournament_id ON players(tournament_id);