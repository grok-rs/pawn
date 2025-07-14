-- Add advanced tournament configuration fields to tournament_settings table
ALTER TABLE tournament_settings ADD COLUMN forfeit_time_minutes INTEGER DEFAULT 30;
ALTER TABLE tournament_settings ADD COLUMN draw_offers_allowed BOOLEAN DEFAULT 1;
ALTER TABLE tournament_settings ADD COLUMN mobile_phone_policy TEXT DEFAULT 'prohibited';
ALTER TABLE tournament_settings ADD COLUMN default_color_allocation TEXT DEFAULT 'automatic';
ALTER TABLE tournament_settings ADD COLUMN late_entry_allowed BOOLEAN DEFAULT 1;
ALTER TABLE tournament_settings ADD COLUMN bye_assignment_rule TEXT DEFAULT 'lowest_rated';
ALTER TABLE tournament_settings ADD COLUMN arbiter_notes TEXT;
ALTER TABLE tournament_settings ADD COLUMN tournament_category TEXT;
ALTER TABLE tournament_settings ADD COLUMN organizer_name TEXT;
ALTER TABLE tournament_settings ADD COLUMN organizer_email TEXT;
ALTER TABLE tournament_settings ADD COLUMN prize_structure TEXT; -- JSON string for prize distribution

-- Add advanced tournament rules to tournaments table
ALTER TABLE tournaments ADD COLUMN status TEXT DEFAULT 'created'; -- created, ongoing, paused, completed, cancelled
ALTER TABLE tournaments ADD COLUMN start_time TEXT;
ALTER TABLE tournaments ADD COLUMN end_time TEXT;
ALTER TABLE tournaments ADD COLUMN description TEXT;
ALTER TABLE tournaments ADD COLUMN website_url TEXT;
ALTER TABLE tournaments ADD COLUMN contact_email TEXT;
ALTER TABLE tournaments ADD COLUMN entry_fee REAL DEFAULT 0.0;
ALTER TABLE tournaments ADD COLUMN currency TEXT DEFAULT 'USD';

-- Create index for tournament status queries
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);

-- Create index for tournament dates
CREATE INDEX IF NOT EXISTS idx_tournaments_date ON tournaments(date);