# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Pawn chess tournament management application.

## Common Commands

- **Development**: `yarn tauri dev` (starts both frontend and Tauri backend)
- **Build Frontend**: `yarn build` (compiles TypeScript and builds frontend)
- **Build Full App**: `yarn tauri build` (builds complete desktop application)
- **Frontend only**: `yarn dev` (Vite dev server on port 1420)
- **Rust backend**: `cd src-tauri && cargo build`
- **Type generation**: Start dev server to auto-generate TypeScript bindings from Rust
- **Database migrations**: `cd src-tauri && sqlx migrate run --database-url sqlite:database.db`

## Architecture Overview

This is **Pawn**, a chess tournament management desktop application built with Tauri, combining:
- **Frontend**: React + TypeScript + Vite + Material-UI
- **Backend**: Rust with SQLite database
- **Communication**: Tauri commands with auto-generated TypeScript bindings

### Key Architecture Patterns

**Frontend Structure**:
- Pages in `src/pages/` (Tournaments, NewTournament, TournamentInfo)
- Components in `src/components/` with index.ts barrel exports
- Routing via React Router in `src/App.tsx`
- State management with Redux Toolkit
- Internationalization with react-i18next (en, ru, ua)

**Backend Structure**:
- Main entry in `src-tauri/src/main.rs` with Tauri plugin architecture
- Core logic in `src-tauri/src/pawn/` module:
  - `command/` - Tauri command handlers
  - `service/` - Business logic layer
  - `domain/` - Data models and DTOs
  - `db/` - Database layer with SQLite
- Database migrations in `src-tauri/migrations/`

**Type Safety**:
- Rust structs use `specta` and `tauri-specta` for TypeScript binding generation
- Generated types go to `src/dto/bindings.ts`
- Bindings auto-regenerate when running dev server after Rust changes

**Database**:
- SQLite with `sqlx` for async database operations
- Migrations in `src-tauri/migrations/` (players, games, tournaments)
- Database file: `pawn.sqlite` stored in app data directory
- Tournament standings calculated with SQL aggregations

**New Features Added**:
- Tournament details page with player standings table
- Games history with results tracking
- Mock data generation for testing
- Enhanced error handling with custom error types
- Chess-specific game result types (1-0, 0-1, 1/2-1/2, *)

## Key Development Notes

- The app uses custom window decorations (`decorations: false` in tauri.conf.json)
- Logging configured to both stdout and file in app data directory
- Frontend uses Material-UI Grid2 and data tables (replaced AG Grid)
- Material-UI with custom theme configuration and comprehensive chess tournament UI
- Form validation with react-hook-form + yup
- Chess tournament management with Swiss/Round-robin support
- Plugin name: "pawn" (commands use "plugin:pawn|command_name" format)

## API and External Resource Handling

- If encountering repeated failing API requests to external resources:
  - Limit retry attempts to 2-3 times
  - Attempt to use alternative resources
  - Update project documentation with context about the failures