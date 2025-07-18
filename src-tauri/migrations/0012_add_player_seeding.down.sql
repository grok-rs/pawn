-- Rollback seeding support

-- Drop tournament seeding settings table
DROP TABLE IF EXISTS tournament_seeding_settings;

-- Remove seeding columns from players table  
ALTER TABLE players DROP COLUMN seed_number;
ALTER TABLE players DROP COLUMN pairing_number;
ALTER TABLE players DROP COLUMN initial_rating;

-- Note: SQLite doesn't support dropping indexes in ALTER TABLE,
-- but they will be automatically dropped when the columns are dropped