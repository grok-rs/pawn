-- Add advanced time control system

-- Create time_controls table for managing time control templates
CREATE TABLE IF NOT EXISTS time_controls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    time_control_type TEXT NOT NULL DEFAULT 'classical',
    base_time_minutes INTEGER,
    increment_seconds INTEGER,
    moves_per_session INTEGER,
    session_time_minutes INTEGER,
    total_sessions INTEGER,
    is_default BOOLEAN NOT NULL DEFAULT 0,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add time_control_id to tournaments table
ALTER TABLE tournaments ADD COLUMN time_control_id INTEGER REFERENCES time_controls(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_controls_type ON time_controls(time_control_type);
CREATE INDEX IF NOT EXISTS idx_time_controls_default ON time_controls(is_default);
CREATE INDEX IF NOT EXISTS idx_tournaments_time_control ON tournaments(time_control_id);

-- Insert default time control templates
INSERT INTO time_controls (name, time_control_type, base_time_minutes, increment_seconds, is_default, description) VALUES
    ('Classical FIDE', 'classical', 90, 30, 1, '90 minutes + 30 seconds increment per move'),
    ('Rapid FIDE', 'rapid', 15, 10, 1, '15 minutes + 10 seconds increment per move'),
    ('Blitz FIDE', 'blitz', 5, 3, 1, '5 minutes + 3 seconds increment per move'),
    ('Bullet', 'bullet', 1, 1, 1, '1 minute + 1 second increment per move'),
    ('Fischer 15+10', 'fischer', 15, 10, 0, '15 minutes + 10 seconds per move (Fischer)'),
    ('Bronstein 10+5', 'bronstein', 10, 5, 0, '10 minutes + 5 seconds delay (Bronstein)'),
    ('Classical 40/2h+30m+30s', 'classical', 120, 30, 0, '40 moves in 2 hours, then 30 minutes + 30 seconds per move'),
    ('Correspondence', 'correspondence', NULL, NULL, 0, 'Days per move for correspondence chess');

-- Update the classical time controls with proper multi-session settings
UPDATE time_controls 
SET moves_per_session = 40, session_time_minutes = 120, total_sessions = 2 
WHERE name = 'Classical 40/2h+30m+30s';

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_time_controls_timestamp 
AFTER UPDATE ON time_controls
BEGIN
    UPDATE time_controls SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;