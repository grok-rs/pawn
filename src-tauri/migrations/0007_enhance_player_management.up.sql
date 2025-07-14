-- Enhance players table with additional fields for professional tournament management
ALTER TABLE players ADD COLUMN title TEXT; -- Chess titles: GM, IM, FM, CM, WGM, WIM, WFM, WCM, etc.
ALTER TABLE players ADD COLUMN birth_date DATE; -- For age-based categories
ALTER TABLE players ADD COLUMN gender TEXT; -- Male, Female, Other
ALTER TABLE players ADD COLUMN email TEXT; -- Contact information
ALTER TABLE players ADD COLUMN phone TEXT; -- Contact information
ALTER TABLE players ADD COLUMN club TEXT; -- Club/federation affiliation
ALTER TABLE players ADD COLUMN status TEXT; -- Registration status
ALTER TABLE players ADD COLUMN updated_at DATETIME; -- Track updates

-- Update status column to have 'active' as default for existing players
UPDATE players SET status = 'active' WHERE status IS NULL;

-- Update updated_at column to current time for existing players
UPDATE players SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;

-- Create rating_history table for multiple rating systems
CREATE TABLE IF NOT EXISTS rating_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    rating_type TEXT NOT NULL CHECK (rating_type IN ('fide', 'national', 'club', 'rapid', 'blitz')),
    rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 4000),
    is_provisional BOOLEAN DEFAULT FALSE,
    effective_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Create player_categories table for flexible categorization
CREATE TABLE IF NOT EXISTS player_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    name TEXT NOT NULL, -- e.g., "Open", "Women", "U18", "1800-2000"
    description TEXT,
    min_rating INTEGER,
    max_rating INTEGER,
    min_age INTEGER,
    max_age INTEGER,
    gender_restriction TEXT CHECK (gender_restriction IN ('M', 'F', NULL)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

-- Create player_category_assignments table for many-to-many relationship
CREATE TABLE IF NOT EXISTS player_category_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES player_categories(id) ON DELETE CASCADE,
    UNIQUE(player_id, category_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rating_history_player_id ON rating_history(player_id);
CREATE INDEX IF NOT EXISTS idx_rating_history_type_date ON rating_history(rating_type, effective_date);
CREATE INDEX IF NOT EXISTS idx_player_categories_tournament_id ON player_categories(tournament_id);
CREATE INDEX IF NOT EXISTS idx_player_category_assignments_player_id ON player_category_assignments(player_id);
CREATE INDEX IF NOT EXISTS idx_player_category_assignments_category_id ON player_category_assignments(category_id);
CREATE INDEX IF NOT EXISTS idx_players_status ON players(status);
CREATE INDEX IF NOT EXISTS idx_players_rating ON players(rating);
CREATE INDEX IF NOT EXISTS idx_players_birth_date ON players(birth_date);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_players_updated_at 
    AFTER UPDATE ON players
    FOR EACH ROW
BEGIN
    UPDATE players SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;