-- Add enhanced result columns to games table
ALTER TABLE games ADD COLUMN result_type TEXT;
ALTER TABLE games ADD COLUMN result_reason TEXT;
ALTER TABLE games ADD COLUMN arbiter_notes TEXT;
ALTER TABLE games ADD COLUMN last_updated DATETIME;
ALTER TABLE games ADD COLUMN approved_by TEXT;

-- Create game result audit trail table
CREATE TABLE IF NOT EXISTS game_result_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    old_result TEXT,
    new_result TEXT NOT NULL,
    old_result_type TEXT,
    new_result_type TEXT,
    reason TEXT,
    changed_by TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved BOOLEAN DEFAULT FALSE,
    approved_by TEXT,
    approved_at DATETIME,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Update games table constraint to allow new result types
-- First drop the old constraint
CREATE TABLE games_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    white_player_id INTEGER NOT NULL,
    black_player_id INTEGER NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('1-0', '0-1', '1/2-1/2', '*', '0-1F', '1-0F', '0-1D', '1-0D', 'ADJ', '0-1T', '1-0T', '0-0', 'CANC')),
    result_type TEXT,
    result_reason TEXT,
    arbiter_notes TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (white_player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (black_player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Copy existing data
INSERT INTO games_new (id, tournament_id, round_number, white_player_id, black_player_id, result, last_updated, created_at)
SELECT id, tournament_id, round_number, white_player_id, black_player_id, result, CURRENT_TIMESTAMP, created_at
FROM games;

-- Drop old table and rename new one
DROP TABLE games;
ALTER TABLE games_new RENAME TO games;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_games_tournament_id ON games(tournament_id);
CREATE INDEX IF NOT EXISTS idx_games_round ON games(tournament_id, round_number);
CREATE INDEX IF NOT EXISTS idx_game_result_audit_game_id ON game_result_audit(game_id);
CREATE INDEX IF NOT EXISTS idx_game_result_audit_changed_at ON game_result_audit(changed_at);

-- Create trigger to automatically update last_updated timestamp
CREATE TRIGGER update_game_last_updated 
    AFTER UPDATE ON games
    FOR EACH ROW
    WHEN OLD.result != NEW.result OR OLD.result_type IS NOT NEW.result_type
BEGIN
    UPDATE games SET last_updated = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create trigger to automatically create audit records
CREATE TRIGGER create_game_result_audit
    AFTER UPDATE ON games
    FOR EACH ROW
    WHEN OLD.result != NEW.result OR OLD.result_type IS NOT NEW.result_type
BEGIN
    INSERT INTO game_result_audit (
        game_id, old_result, new_result, old_result_type, new_result_type, 
        reason, changed_by, approved
    ) VALUES (
        NEW.id, OLD.result, NEW.result, OLD.result_type, NEW.result_type,
        NEW.result_reason, NEW.approved_by,
        CASE WHEN NEW.result_type IN ('white_forfeit', 'black_forfeit', 'white_default', 'black_default', 'double_forfeit', 'cancelled') 
             THEN FALSE ELSE TRUE END
    );
END;