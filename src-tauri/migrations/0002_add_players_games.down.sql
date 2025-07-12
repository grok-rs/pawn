-- Drop tables in reverse order due to foreign key constraints
DROP INDEX IF EXISTS idx_games_round;
DROP INDEX IF EXISTS idx_games_tournament_id;
DROP INDEX IF EXISTS idx_players_tournament_id;

DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS players;