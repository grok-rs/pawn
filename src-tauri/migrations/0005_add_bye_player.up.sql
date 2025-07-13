-- Add virtual bye player for each existing tournament
-- This allows bye games to reference a valid player ID instead of using -1
INSERT INTO players (id, tournament_id, name, rating, country_code)
SELECT 
    -(tournament.id), -- Use negative tournament ID as the bye player ID
    tournament.id,
    'BYE',
    0,
    NULL
FROM tournaments tournament
WHERE NOT EXISTS (
    SELECT 1 FROM players p 
    WHERE p.tournament_id = tournament.id 
    AND p.name = 'BYE'
);

-- Create trigger to automatically add bye player when new tournament is created
CREATE TRIGGER IF NOT EXISTS add_bye_player_on_tournament_insert
AFTER INSERT ON tournaments
FOR EACH ROW
BEGIN
    INSERT INTO players (id, tournament_id, name, rating, country_code)
    VALUES (-(NEW.id), NEW.id, 'BYE', 0, NULL);
END;