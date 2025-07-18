-- Add team tournament support with comprehensive team management
-- This migration adds tables for team tournaments including team management,
-- board assignments, team matches, and team-specific scoring

-- Teams table for tournament team management
CREATE TABLE teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    captain TEXT,                    -- Team captain name
    description TEXT,                -- Team description or notes
    color TEXT,                      -- Team color for UI display
    club_affiliation TEXT,           -- Club or organization affiliation
    contact_email TEXT,              -- Team contact email
    contact_phone TEXT,              -- Team contact phone
    max_board_count INTEGER NOT NULL DEFAULT 8,  -- Maximum boards for this team
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'disqualified')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    UNIQUE(tournament_id, name)      -- Team names must be unique within tournament
);

-- Team membership table for player-team assignments
CREATE TABLE team_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    board_number INTEGER NOT NULL,   -- Board position (1, 2, 3, etc.)
    is_captain BOOLEAN NOT NULL DEFAULT 0,
    is_reserve BOOLEAN NOT NULL DEFAULT 0,  -- Reserve/substitute player
    rating_at_assignment INTEGER,    -- Player rating when assigned to board
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    -- A player can only be on one board per team
    UNIQUE(team_id, player_id),
    -- Board numbers must be unique within a team (unless reserve)
    UNIQUE(team_id, board_number)
);

-- Team matches table for team vs team encounters
CREATE TABLE team_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    team_a_id INTEGER NOT NULL,
    team_b_id INTEGER NOT NULL,
    venue TEXT,                      -- Match venue location
    scheduled_time DATETIME,         -- Scheduled match time
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'in_progress', 'completed', 'postponed', 'cancelled'
    )),
    -- Team scoring results
    team_a_match_points REAL DEFAULT 0,     -- Match points for team A (typically 2-1-0)
    team_b_match_points REAL DEFAULT 0,     -- Match points for team B
    team_a_board_points REAL DEFAULT 0,     -- Sum of individual board points for team A
    team_b_board_points REAL DEFAULT 0,     -- Sum of individual board points for team B
    -- Match metadata
    arbiter_name TEXT,               -- Match arbiter
    arbiter_notes TEXT,              -- Arbiter notes and comments
    result_approved BOOLEAN NOT NULL DEFAULT 0,
    approved_by TEXT,                -- Who approved the match result
    approved_at DATETIME,            -- When match was approved
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (team_a_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (team_b_id) REFERENCES teams(id) ON DELETE CASCADE,
    -- Ensure teams don't play themselves
    CHECK (team_a_id != team_b_id),
    -- Unique match per round between two teams
    UNIQUE(tournament_id, round_number, team_a_id, team_b_id)
);

-- Team lineup submissions for round-by-round board assignments
CREATE TABLE team_lineups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    board_number INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    is_substitute BOOLEAN NOT NULL DEFAULT 0,  -- If this is a substitute player
    substituted_player_id INTEGER,             -- Original player being substituted
    submission_deadline DATETIME,              -- Deadline for lineup submission
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    submitted_by TEXT,                         -- Who submitted this lineup
    notes TEXT,                                -- Substitution or other notes
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (substituted_player_id) REFERENCES players(id) ON DELETE CASCADE,
    -- Unique lineup per team per round per board
    UNIQUE(team_id, round_number, board_number),
    -- Player can only play one board per round per team
    UNIQUE(team_id, round_number, player_id)
);

-- Team board order rules and constraints
CREATE TABLE team_board_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN (
        'strict_rating',     -- Strict rating order (board 1 highest, etc.)
        'flexible_rating',   -- Flexible with rating tolerance
        'fixed_assignment',  -- Fixed board assignments
        'captain_choice'     -- Captain determines order
    )),
    rating_tolerance INTEGER DEFAULT 0,        -- Rating difference tolerance for flexible rules
    allow_substitutions BOOLEAN NOT NULL DEFAULT 1,
    substitution_deadline_minutes INTEGER DEFAULT 30,  -- Minutes before round start
    max_substitutions_per_round INTEGER DEFAULT 2,     -- Max subs per round
    require_captain_approval BOOLEAN NOT NULL DEFAULT 1,
    board_order_validation BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

-- Team tournament settings extension
CREATE TABLE team_tournament_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    team_size INTEGER NOT NULL DEFAULT 4,      -- Number of boards per team
    max_teams INTEGER,                          -- Maximum teams allowed
    match_scoring_system TEXT NOT NULL DEFAULT 'match_points' CHECK (match_scoring_system IN (
        'match_points',      -- 2-1-0 or 3-1-0 for team match results
        'board_points',      -- Sum of individual board points
        'olympic_points',    -- Olympic system (2 for win, 1 for draw)
        'custom'             -- Custom scoring formula
    )),
    match_points_win INTEGER NOT NULL DEFAULT 2,
    match_points_draw INTEGER NOT NULL DEFAULT 1,
    match_points_loss INTEGER NOT NULL DEFAULT 0,
    board_weight_system TEXT DEFAULT 'equal' CHECK (board_weight_system IN (
        'equal',            -- All boards weighted equally
        'progressive',      -- Board 1 worth more than board 2, etc.
        'custom'            -- Custom board weights
    )),
    require_board_order BOOLEAN NOT NULL DEFAULT 1,
    allow_late_entries BOOLEAN NOT NULL DEFAULT 0,
    team_pairing_method TEXT NOT NULL DEFAULT 'swiss' CHECK (team_pairing_method IN (
        'swiss', 'round_robin', 'knockout', 'scheveningen'
    )),
    color_allocation TEXT NOT NULL DEFAULT 'balanced' CHECK (color_allocation IN (
        'balanced',         -- Ensure equal white/black distribution
        'alternating',      -- Alternate colors by round
        'random'            -- Random color assignment
    )),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    UNIQUE(tournament_id)  -- One setting per tournament
);

-- Indexes for performance optimization
CREATE INDEX idx_teams_tournament_id ON teams(tournament_id);
CREATE INDEX idx_teams_status ON teams(tournament_id, status);
CREATE INDEX idx_team_memberships_team_id ON team_memberships(team_id);
CREATE INDEX idx_team_memberships_player_id ON team_memberships(player_id);
CREATE INDEX idx_team_memberships_board ON team_memberships(team_id, board_number);
CREATE INDEX idx_team_matches_tournament_round ON team_matches(tournament_id, round_number);
CREATE INDEX idx_team_matches_teams ON team_matches(team_a_id, team_b_id);
CREATE INDEX idx_team_matches_status ON team_matches(tournament_id, status);
CREATE INDEX idx_team_lineups_team_round ON team_lineups(team_id, round_number);
CREATE INDEX idx_team_lineups_player ON team_lineups(player_id, round_number);

-- Update triggers for team-related tables
CREATE TRIGGER update_teams_timestamp
AFTER UPDATE ON teams
FOR EACH ROW
BEGIN
    UPDATE teams SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_team_matches_timestamp
AFTER UPDATE ON team_matches
FOR EACH ROW
BEGIN
    UPDATE team_matches SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_team_tournament_settings_timestamp
AFTER UPDATE ON team_tournament_settings
FOR EACH ROW
BEGIN
    UPDATE team_tournament_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Add team-specific tournament type to tournaments table
ALTER TABLE tournaments ADD COLUMN is_team_tournament BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN team_size INTEGER;
ALTER TABLE tournaments ADD COLUMN max_teams INTEGER;

-- Add team_id to games table for team tournament game tracking
ALTER TABLE games ADD COLUMN team_match_id INTEGER REFERENCES team_matches(id) ON DELETE CASCADE;
ALTER TABLE games ADD COLUMN board_number INTEGER;  -- Board number within team match

-- Create indexes for the new tournament columns
CREATE INDEX idx_tournaments_team_tournament ON tournaments(is_team_tournament);
CREATE INDEX idx_games_team_match ON games(team_match_id);
CREATE INDEX idx_games_team_board ON games(team_match_id, board_number);