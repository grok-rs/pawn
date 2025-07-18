-- Add seeding and pairing number support to players table

-- Add seeding fields to players table
ALTER TABLE players ADD COLUMN seed_number INTEGER; -- Manual seed assignment (1, 2, 3, etc.)
ALTER TABLE players ADD COLUMN pairing_number INTEGER; -- Sequential pairing number for tournaments
ALTER TABLE players ADD COLUMN initial_rating INTEGER; -- Rating at tournament start for seeding consistency

-- Create index for efficient seeding queries
CREATE INDEX IF NOT EXISTS idx_players_seed_number ON players(seed_number);
CREATE INDEX IF NOT EXISTS idx_players_pairing_number ON players(pairing_number);
CREATE INDEX IF NOT EXISTS idx_players_initial_rating ON players(initial_rating);

-- Create tournament_seeding_settings table for seeding configuration
CREATE TABLE IF NOT EXISTS tournament_seeding_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    seeding_method TEXT NOT NULL CHECK (seeding_method IN ('rating', 'manual', 'random', 'category_based')),
    use_initial_rating BOOLEAN DEFAULT TRUE, -- Use rating at tournament start
    randomize_unrated BOOLEAN DEFAULT FALSE, -- Randomize placement of unrated players
    protect_top_seeds INTEGER DEFAULT 0, -- Number of top seeds to protect from changes
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    UNIQUE(tournament_id)
);

-- Create trigger to update seeding settings updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_tournament_seeding_settings_updated_at 
    AFTER UPDATE ON tournament_seeding_settings
    FOR EACH ROW
BEGIN
    UPDATE tournament_seeding_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;