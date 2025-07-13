-- Drop trigger
DROP TRIGGER IF EXISTS update_tournament_current_round;

-- Drop indexes
DROP INDEX IF EXISTS idx_rounds_status;
DROP INDEX IF EXISTS idx_rounds_tournament_id;
DROP INDEX IF EXISTS idx_games_unique_black_round;
DROP INDEX IF EXISTS idx_games_unique_white_round;

-- Remove columns from tournaments table
ALTER TABLE tournaments DROP COLUMN IF EXISTS pairing_method;
ALTER TABLE tournaments DROP COLUMN IF EXISTS current_round;

-- Drop rounds table
DROP TABLE IF EXISTS rounds;