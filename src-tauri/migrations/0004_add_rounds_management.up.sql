-- Create rounds table for tracking round state
CREATE TABLE IF NOT EXISTS rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('upcoming', 'in_progress', 'completed')) DEFAULT 'upcoming',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    UNIQUE(tournament_id, round_number)
);

-- Add columns to tournaments table for round management
ALTER TABLE tournaments ADD COLUMN current_round INTEGER DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN pairing_method TEXT DEFAULT 'manual' CHECK (pairing_method IN ('manual', 'swiss', 'round_robin'));

-- Add unique constraints to games table to prevent duplicate pairings
CREATE UNIQUE INDEX IF NOT EXISTS idx_games_unique_white_round 
ON games(tournament_id, round_number, white_player_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_games_unique_black_round 
ON games(tournament_id, round_number, black_player_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_rounds_tournament_id ON rounds(tournament_id);
CREATE INDEX IF NOT EXISTS idx_rounds_status ON rounds(tournament_id, status);

-- Trigger to update tournament current_round when round is completed
CREATE TRIGGER IF NOT EXISTS update_tournament_current_round 
AFTER UPDATE OF status ON rounds
WHEN NEW.status = 'completed' AND OLD.status != 'completed'
BEGIN
    UPDATE tournaments 
    SET current_round = NEW.round_number 
    WHERE id = NEW.tournament_id AND current_round < NEW.round_number;
END;