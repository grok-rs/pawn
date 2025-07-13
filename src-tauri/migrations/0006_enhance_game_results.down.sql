-- Drop triggers
DROP TRIGGER IF EXISTS update_game_last_updated;
DROP TRIGGER IF EXISTS create_game_result_audit;

-- Drop audit table
DROP TABLE IF EXISTS game_result_audit;

-- Restore original games table structure
CREATE TABLE games_original (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    white_player_id INTEGER NOT NULL,
    black_player_id INTEGER NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('1-0', '0-1', '1/2-1/2', '*')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (white_player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (black_player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Copy back original data only (filter out enhanced results)
INSERT INTO games_original (id, tournament_id, round_number, white_player_id, black_player_id, result, created_at)
SELECT id, tournament_id, round_number, white_player_id, black_player_id, 
       CASE 
           WHEN result IN ('1-0', '0-1', '1/2-1/2', '*') THEN result
           ELSE '*'  -- Convert unsupported results back to ongoing
       END as result,
       created_at
FROM games;

-- Replace table
DROP TABLE games;
ALTER TABLE games_original RENAME TO games;

-- Recreate original indexes
CREATE INDEX IF NOT EXISTS idx_games_tournament_id ON games(tournament_id);
CREATE INDEX IF NOT EXISTS idx_games_round ON games(tournament_id, round_number);