-- Create tournament_settings table for storing tiebreak configuration
CREATE TABLE IF NOT EXISTS tournament_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL UNIQUE,
    tiebreak_order TEXT NOT NULL DEFAULT '["buchholz_full","buchholz_cut_1","number_of_wins","direct_encounter"]',
    use_fide_defaults BOOLEAN NOT NULL DEFAULT 1,
    k_factor INTEGER DEFAULT 20,
    rating_floor INTEGER DEFAULT 1000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

-- Add columns to tournaments table for additional settings
ALTER TABLE tournaments ADD COLUMN tournament_type TEXT DEFAULT 'swiss';
ALTER TABLE tournaments ADD COLUMN rating_category TEXT DEFAULT 'open';
ALTER TABLE tournaments ADD COLUMN federation TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tournament_settings_tournament_id ON tournament_settings(tournament_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_tournament_settings_timestamp 
AFTER UPDATE ON tournament_settings
BEGIN
    UPDATE tournament_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;