-- Remove the trigger
DROP TRIGGER IF EXISTS add_bye_player_on_tournament_insert;

-- Remove all bye players
DELETE FROM players WHERE name = 'BYE';