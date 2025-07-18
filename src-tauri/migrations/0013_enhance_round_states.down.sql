-- Rollback enhanced round states to original simple states

-- Drop new triggers
DROP TRIGGER IF EXISTS set_round_verified_timestamp;
DROP TRIGGER IF EXISTS set_round_completed_timestamp;
DROP TRIGGER IF EXISTS update_tournament_current_round;

-- Create old rounds table structure
CREATE TABLE rounds_old (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('upcoming', 'in_progress', 'completed')) DEFAULT 'upcoming',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    UNIQUE(tournament_id, round_number)
);

-- Copy data back, mapping new statuses to old ones
INSERT INTO rounds_old (id, tournament_id, round_number, status, created_at, completed_at)
SELECT 
    id, 
    tournament_id, 
    round_number, 
    CASE 
        WHEN status IN ('planned', 'pairing', 'published') THEN 'upcoming'
        WHEN status IN ('finishing') THEN 'in_progress'
        WHEN status IN ('verified') THEN 'completed'
        ELSE status 
    END,
    created_at, 
    completed_at
FROM rounds;

-- Drop new table and rename old one
DROP TABLE rounds;
ALTER TABLE rounds_old RENAME TO rounds;

-- Recreate original indexes and triggers
CREATE INDEX IF NOT EXISTS idx_rounds_tournament_id ON rounds(tournament_id);
CREATE INDEX IF NOT EXISTS idx_rounds_status ON rounds(tournament_id, status);

CREATE TRIGGER IF NOT EXISTS update_tournament_current_round 
AFTER UPDATE OF status ON rounds
WHEN NEW.status = 'completed' AND OLD.status != 'completed'
BEGIN
    UPDATE tournaments 
    SET current_round = NEW.round_number 
    WHERE id = NEW.tournament_id AND current_round < NEW.round_number;
END;