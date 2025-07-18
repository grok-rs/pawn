-- Enhance round states to support complete lifecycle management
-- Add new round statuses to support advanced workflow

-- Drop the existing check constraint on rounds.status
-- Note: SQLite doesn't have ALTER TABLE DROP CONSTRAINT, so we need to recreate the table

-- Create new rounds table with enhanced status options
CREATE TABLE rounds_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN (
        'planned',      -- Round scheduled but not started
        'pairing',      -- Actively generating pairings  
        'published',    -- Pairings complete and published
        'in_progress',  -- Games being played
        'finishing',    -- Some games complete, waiting for others
        'completed',    -- All results entered
        'verified',     -- Results confirmed by arbiter
        -- Keep backward compatibility
        'upcoming'      -- Maps to 'planned'
    )) DEFAULT 'planned',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    verified_at DATETIME,
    verified_by TEXT,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    UNIQUE(tournament_id, round_number)
);

-- Copy data from old table to new table, mapping 'upcoming' to 'planned'
INSERT INTO rounds_new (id, tournament_id, round_number, status, created_at, completed_at)
SELECT 
    id, 
    tournament_id, 
    round_number, 
    CASE 
        WHEN status = 'upcoming' THEN 'planned'
        ELSE status 
    END,
    created_at, 
    completed_at
FROM rounds;

-- Drop old table and rename new one
DROP TABLE rounds;
ALTER TABLE rounds_new RENAME TO rounds;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_rounds_tournament_id ON rounds(tournament_id);
CREATE INDEX IF NOT EXISTS idx_rounds_status ON rounds(tournament_id, status);

-- Update trigger to handle new status values
DROP TRIGGER IF EXISTS update_tournament_current_round;

CREATE TRIGGER update_tournament_current_round 
AFTER UPDATE OF status ON rounds
WHEN NEW.status = 'completed' AND OLD.status != 'completed'
BEGIN
    UPDATE tournaments 
    SET current_round = NEW.round_number 
    WHERE id = NEW.tournament_id AND current_round < NEW.round_number;
END;

-- Add trigger to set verified_at timestamp when status changes to verified
CREATE TRIGGER set_round_verified_timestamp
AFTER UPDATE OF status ON rounds
WHEN NEW.status = 'verified' AND OLD.status != 'verified'
BEGIN
    UPDATE rounds 
    SET verified_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Add trigger to set completed_at timestamp when status changes to completed or verified
CREATE TRIGGER set_round_completed_timestamp
AFTER UPDATE OF status ON rounds
WHEN (NEW.status = 'completed' OR NEW.status = 'verified') 
     AND (OLD.status != 'completed' AND OLD.status != 'verified')
BEGIN
    UPDATE rounds 
    SET completed_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id AND completed_at IS NULL;
END;