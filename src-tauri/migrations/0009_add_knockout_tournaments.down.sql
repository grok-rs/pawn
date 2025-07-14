-- Remove knockout tournament support tables

-- Drop indexes first
DROP INDEX IF EXISTS idx_bracket_positions_unique;
DROP INDEX IF EXISTS idx_bracket_positions_player;
DROP INDEX IF EXISTS idx_bracket_positions_round;
DROP INDEX IF EXISTS idx_bracket_positions_bracket_id;
DROP INDEX IF EXISTS idx_knockout_brackets_tournament_id;

-- Drop tables
DROP TABLE IF EXISTS bracket_positions;
DROP TABLE IF EXISTS knockout_brackets;