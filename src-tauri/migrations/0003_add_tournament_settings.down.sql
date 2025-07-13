-- Drop the trigger
DROP TRIGGER IF EXISTS update_tournament_settings_timestamp;

-- Drop the index
DROP INDEX IF EXISTS idx_tournament_settings_tournament_id;

-- Drop columns from tournaments table
-- Note: SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
CREATE TABLE tournaments_temp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    date TEXT NOT NULL,
    time_type TEXT NOT NULL,
    player_count INTEGER NOT NULL,
    rounds_played INTEGER NOT NULL,
    total_rounds INTEGER NOT NULL,
    country_code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tournaments_temp SELECT id, name, location, date, time_type, player_count, rounds_played, total_rounds, country_code, created_at FROM tournaments;
DROP TABLE tournaments;
ALTER TABLE tournaments_temp RENAME TO tournaments;

-- Drop the tournament_settings table
DROP TABLE IF EXISTS tournament_settings;