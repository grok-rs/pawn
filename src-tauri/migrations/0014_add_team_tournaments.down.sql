-- Rollback team tournament support
-- This migration removes all team tournament related tables and columns

-- Drop indexes first
DROP INDEX IF EXISTS idx_games_team_board;
DROP INDEX IF EXISTS idx_games_team_match;
DROP INDEX IF EXISTS idx_tournaments_team_tournament;

-- Remove team-related columns from existing tables
ALTER TABLE games DROP COLUMN IF EXISTS board_number;
ALTER TABLE games DROP COLUMN IF EXISTS team_match_id;

ALTER TABLE tournaments DROP COLUMN IF EXISTS max_teams;
ALTER TABLE tournaments DROP COLUMN IF EXISTS team_size;
ALTER TABLE tournaments DROP COLUMN IF EXISTS is_team_tournament;

-- Drop triggers
DROP TRIGGER IF EXISTS update_team_tournament_settings_timestamp;
DROP TRIGGER IF EXISTS update_team_matches_timestamp;
DROP TRIGGER IF EXISTS update_teams_timestamp;

-- Drop indexes
DROP INDEX IF EXISTS idx_team_lineups_player;
DROP INDEX IF EXISTS idx_team_lineups_team_round;
DROP INDEX IF EXISTS idx_team_matches_status;
DROP INDEX IF EXISTS idx_team_matches_teams;
DROP INDEX IF EXISTS idx_team_matches_tournament_round;
DROP INDEX IF EXISTS idx_team_memberships_board;
DROP INDEX IF EXISTS idx_team_memberships_player_id;
DROP INDEX IF EXISTS idx_team_memberships_team_id;
DROP INDEX IF EXISTS idx_teams_status;
DROP INDEX IF EXISTS idx_teams_tournament_id;

-- Drop team-related tables in reverse dependency order
DROP TABLE IF EXISTS team_tournament_settings;
DROP TABLE IF EXISTS team_board_rules;
DROP TABLE IF EXISTS team_lineups;
DROP TABLE IF EXISTS team_matches;
DROP TABLE IF EXISTS team_memberships;
DROP TABLE IF EXISTS teams;