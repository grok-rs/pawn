-- Create the tournaments table to store tournament details
CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    date TEXT NOT NULL,
    time_type TEXT NOT NULL,
    player_count INTEGER NOT NULL,
    rounds_played INTEGER NOT NULL,
    total_rounds INTEGER NOT NULL,
    country_code TEXT NOT NULL
);
