---
name: create-migration
description: Create a new SQLx migration pair (up/down) with proper naming and conventions
disable-model-invocation: true
---

# Create Database Migration

Generate a new SQLx migration pair for the Pawn chess tournament database.

## Arguments

The user provides a description of the migration, e.g., `/create-migration add user preferences table`

## Steps

1. **Determine next migration number**: List existing migrations in `src-tauri/migrations/` and increment the highest number (zero-padded to 4 digits).

2. **Generate file names**: Create both up and down files:
   - `NNNN_<snake_case_description>.up.sql`
   - `NNNN_<snake_case_description>.down.sql`

3. **Write the UP migration**: Create the SQL file with:
   - A comment header describing the migration purpose
   - `CREATE TABLE` / `ALTER TABLE` statements as needed
   - Proper SQLite types: `TEXT`, `INTEGER`, `REAL`, `BLOB`
   - `NOT NULL` constraints where appropriate
   - Foreign keys referencing existing tables with `ON DELETE CASCADE` or `ON DELETE SET NULL`
   - UUID primary keys as `TEXT NOT NULL` (matching project convention)
   - Timestamps as `TEXT NOT NULL DEFAULT (datetime('now'))` (matching project convention)

4. **Write the DOWN migration**: Create the reverse SQL:
   - `DROP TABLE IF EXISTS` for created tables
   - Reverse `ALTER TABLE` operations
   - Must cleanly undo everything in the UP migration

5. **Verify**: Read back both files and confirm they are syntactically valid SQL.

## Project Conventions

- Primary keys: `id TEXT NOT NULL PRIMARY KEY` (UUID v4 stored as text)
- Timestamps: `created_at TEXT NOT NULL DEFAULT (datetime('now'))`, `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`
- Foreign keys: Always include `REFERENCES <table>(id)` with explicit ON DELETE behavior
- Table names: snake_case, plural (e.g., `players`, `tournaments`, `games`)
- Column names: snake_case
- Indexes: Create indexes for foreign key columns and frequently queried fields
- All migrations are in `src-tauri/migrations/`

## Example

For `/create-migration add player notes`:

**`0016_add_player_notes.up.sql`**:
```sql
-- Add player notes table for storing per-tournament player annotations
CREATE TABLE IF NOT EXISTS player_notes (
    id TEXT NOT NULL PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_player_notes_player_id ON player_notes(player_id);
CREATE INDEX IF NOT EXISTS idx_player_notes_tournament_id ON player_notes(tournament_id);
```

**`0016_add_player_notes.down.sql`**:
```sql
DROP TABLE IF EXISTS player_notes;
```
