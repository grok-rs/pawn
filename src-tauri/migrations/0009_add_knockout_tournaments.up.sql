-- Add knockout tournament support tables

-- Create knockout_brackets table for managing tournament brackets
CREATE TABLE IF NOT EXISTS knockout_brackets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    bracket_type TEXT NOT NULL DEFAULT 'single_elimination',
    total_rounds INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

-- Create bracket_positions table for tracking player positions in brackets
CREATE TABLE IF NOT EXISTS bracket_positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bracket_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    position_number INTEGER NOT NULL,
    player_id INTEGER,
    advanced_from_position INTEGER,
    status TEXT NOT NULL DEFAULT 'waiting',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bracket_id) REFERENCES knockout_brackets(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (advanced_from_position) REFERENCES bracket_positions(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_knockout_brackets_tournament_id ON knockout_brackets(tournament_id);
CREATE INDEX IF NOT EXISTS idx_bracket_positions_bracket_id ON bracket_positions(bracket_id);
CREATE INDEX IF NOT EXISTS idx_bracket_positions_round ON bracket_positions(bracket_id, round_number);
CREATE INDEX IF NOT EXISTS idx_bracket_positions_player ON bracket_positions(player_id);

-- Add unique constraint to prevent duplicate positions
CREATE UNIQUE INDEX IF NOT EXISTS idx_bracket_positions_unique ON bracket_positions(bracket_id, round_number, position_number);