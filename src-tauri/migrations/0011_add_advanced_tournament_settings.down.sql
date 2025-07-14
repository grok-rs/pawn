-- Remove indexes
DROP INDEX IF EXISTS idx_tournaments_date;
DROP INDEX IF EXISTS idx_tournaments_status;

-- Remove columns from tournaments table
ALTER TABLE tournaments DROP COLUMN currency;
ALTER TABLE tournaments DROP COLUMN entry_fee;
ALTER TABLE tournaments DROP COLUMN contact_email;
ALTER TABLE tournaments DROP COLUMN website_url;
ALTER TABLE tournaments DROP COLUMN description;
ALTER TABLE tournaments DROP COLUMN end_time;
ALTER TABLE tournaments DROP COLUMN start_time;
ALTER TABLE tournaments DROP COLUMN status;

-- Remove columns from tournament_settings table
ALTER TABLE tournament_settings DROP COLUMN prize_structure;
ALTER TABLE tournament_settings DROP COLUMN organizer_email;
ALTER TABLE tournament_settings DROP COLUMN organizer_name;
ALTER TABLE tournament_settings DROP COLUMN tournament_category;
ALTER TABLE tournament_settings DROP COLUMN arbiter_notes;
ALTER TABLE tournament_settings DROP COLUMN bye_assignment_rule;
ALTER TABLE tournament_settings DROP COLUMN late_entry_allowed;
ALTER TABLE tournament_settings DROP COLUMN default_color_allocation;
ALTER TABLE tournament_settings DROP COLUMN mobile_phone_policy;
ALTER TABLE tournament_settings DROP COLUMN draw_offers_allowed;
ALTER TABLE tournament_settings DROP COLUMN forfeit_time_minutes;