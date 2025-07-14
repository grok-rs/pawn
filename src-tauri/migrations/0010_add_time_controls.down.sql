-- Remove advanced time control system

-- Drop trigger
DROP TRIGGER IF EXISTS update_time_controls_timestamp;

-- Drop indexes
DROP INDEX IF EXISTS idx_tournaments_time_control;
DROP INDEX IF EXISTS idx_time_controls_default;
DROP INDEX IF EXISTS idx_time_controls_type;

-- Remove time_control_id column from tournaments
ALTER TABLE tournaments DROP COLUMN time_control_id;

-- Drop time_controls table
DROP TABLE IF EXISTS time_controls;