# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the **Pawn** professional chess tournament management application.

## 🎯 Application Overview

**Pawn** is a professional-grade chess tournament management system built with Tauri, featuring a comprehensive **Enhanced Player Registration and Management System** alongside advanced tournament administration capabilities.

## Essential Commands

### Development
- **Primary**: `yarn tauri dev` - Starts complete application with hot reload
- **Frontend Only**: `yarn dev` - Vite dev server on port 1420 (for UI-only work)
- **Backend Only**: `cd src-tauri && cargo build` - Compile Rust backend

### Building
- **Frontend**: `yarn build` - TypeScript compilation and Vite build
- **Full Application**: `yarn tauri build` - Complete desktop app with installers
- **Development Build**: `cargo build` in src-tauri/ - Debug Rust build

### Database & Types
- **Migrations**: `cd src-tauri && sqlx migrate run --database-url sqlite:pawn.sqlite`
- **Type Generation**: Auto-generated on dev server start (TypeScript bindings from Rust)
- **Database Reset**: Remove `~/.local/share/pawn/db/pawn.sqlite` to reset database

### Enhanced Features Testing
- **Player Demo**: Navigate to `/demo/enhanced-players` in running application
- **Sample Data**: Use "Create Sample Tournament" in demo for testing

## Enhanced Architecture Overview

**Pawn** is a professional chess tournament management application with a sophisticated multi-layered architecture:

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite + Material-UI v6
- **Backend**: Rust + Tauri 2.5 + SQLite + SQLx  
- **Communication**: 40+ Tauri commands with auto-generated TypeScript bindings
- **Type Safety**: Complete Rust-TypeScript integration via tauri-specta

### Frontend Architecture

**Component Organization**:
- **Pages**: `src/pages/` (Tournaments, NewTournament, TournamentInfo)
- **Components**: `src/components/` with index.ts barrel exports
  - `EnhancedPlayerDemo/` - Complete player management demonstration
  - `TournamentList/`, `BaseLayout/`, etc.
- **Routing**: React Router in `src/App.tsx` with enhanced player demo route
- **State**: Local component state (no Redux dependency for simplicity)
- **Forms**: react-hook-form + Yup validation
- **Internationalization**: react-i18next (en, ru, ua)

**Backend Architecture - Service Layer Pattern**:
```
src-tauri/src/pawn/
├── command/              # 40+ Tauri command handlers
│   ├── tournament.rs     # Tournament operations (12 commands)
│   ├── player.rs         # Enhanced player management (15+ commands)
│   ├── round.rs          # Round management (8 commands)
│   └── game_result.rs    # Game result operations (6 commands)
├── service/              # Business logic layer
│   ├── player.rs         # PlayerService - CRUD, search, bulk import
│   ├── tournament.rs     # TournamentService - tournament lifecycle
│   ├── round.rs          # RoundService - pairing and round management
│   └── tiebreak.rs       # TiebreakCalculator - standings calculation
├── domain/               # Data models and DTOs
│   ├── model.rs          # Enhanced data models (Player, Tournament, etc.)
│   ├── dto.rs            # Request/response types
│   └── tiebreak.rs       # Tiebreak types and calculations
└── db/                   # Database layer
    ├── sqlite.rs         # SQLite implementation with enhanced schema
    └── mod.rs            # Database traits
```

### Type Safety & Integration

**Automatic Type Generation**:
- **Rust Structs**: Use `specta` and `tauri-specta` decorations (`#[derive(SpectaType)]`)
- **Generated Output**: `src/dto/bindings.ts` with complete TypeScript definitions
- **Auto-regeneration**: Bindings update automatically when dev server restarts after Rust changes
- **40+ Commands**: All commands auto-generate TypeScript function signatures

### Enhanced Database Schema

**SQLite with Advanced Features**:
- **Database File**: `~/.local/share/pawn/db/pawn.sqlite`
- **7 Migrations**: Complete schema evolution from basic to professional system
- **Performance**: Optimized indexes for player search, rating queries, tournament operations

**Key Tables**:
```sql
-- Enhanced players table (Migration 0007)
players (
  id, tournament_id, name, rating, country_code,
  title,        -- Chess titles (GM, IM, FM, etc.)
  birth_date,   -- Age-based categories
  gender,       -- Gender categories (M, F, O)  
  email, phone, -- Contact information
  club,         -- Club/federation affiliation
  status,       -- Registration status (active, withdrawn, bye_requested)
  created_at, updated_at
)

-- Rating history (Multiple rating systems)
rating_history (
  id, player_id, rating_type, rating, is_provisional, effective_date
)

-- Player categories (Tournament sections)
player_categories (
  id, tournament_id, name, description,
  min_rating, max_rating, min_age, max_age, gender_restriction
)

-- Plus: tournaments, games, rounds, game_result_audit, tournament_settings
```

### Major System Enhancements

**Enhanced Player Management System** (Recently Implemented):
- **Professional Registration**: Chess titles, contact info, demographics
- **Multiple Rating Systems**: FIDE, national, club, rapid, blitz with history
- **Advanced Search**: Multi-criteria filtering with performance optimization
- **Bulk Import**: CSV import with comprehensive validation pipeline
- **Player Categorization**: Flexible tournament section management
- **Status Management**: Player withdrawals, bye requests, late entries
- **Interactive Demo**: Complete demonstration system at `/demo/enhanced-players`

## Complete Command Reference

### Enhanced Player Management Commands (15+)
```typescript
// Core CRUD Operations
commands.createPlayerEnhanced(data: CreatePlayer): Promise<Player>
commands.updatePlayer(data: UpdatePlayer): Promise<Player>  
commands.deletePlayer(playerId: number): Promise<null>
commands.getPlayerById(playerId: number): Promise<Player>
commands.getPlayersByTournamentEnhanced(tournamentId: number): Promise<Player[]>

// Advanced Operations
commands.searchPlayers(filters: PlayerSearchFilters): Promise<Player[]>
commands.bulkImportPlayers(request: BulkImportRequest): Promise<BulkImportResult>
commands.validateBulkImport(request: BulkImportRequest): Promise<BulkImportResult>

// Rating Management
commands.addPlayerRatingHistory(data: CreateRatingHistory): Promise<RatingHistory>
commands.getPlayerRatingHistory(playerId: number): Promise<RatingHistory[]>

// Category Management
commands.createPlayerCategory(data: CreatePlayerCategory): Promise<PlayerCategory>
commands.getTournamentCategories(tournamentId: number): Promise<PlayerCategory[]>
commands.assignPlayerToCategory(data: AssignPlayerToCategory): Promise<PlayerCategoryAssignment>

// Status Management
commands.updatePlayerStatus(playerId: number, status: string): Promise<Player>
commands.withdrawPlayer(playerId: number): Promise<Player>
commands.requestPlayerBye(playerId: number): Promise<Player>
commands.getPlayerStatistics(tournamentId: number): Promise<PlayerStatistics>
```

### Tournament Operations (12 commands)
```typescript
commands.getTournaments(): Promise<Tournament[]>
commands.createTournament(data: CreateTournament): Promise<Tournament>
commands.getTournamentDetails(id: number): Promise<TournamentDetails>
commands.deleteTournament(id: number): Promise<null>
// Plus: settings, standings, mock data operations
```

### Round & Game Management (14 commands)
```typescript
// Round operations
commands.getRoundsByTournament(tournamentId: number): Promise<Round[]>
commands.createRound(data: CreateRound): Promise<Round>
commands.generatePairings(request: GeneratePairingsRequest): Promise<Pairing[]>

// Game result operations with audit trail
commands.updateGameResult(data: UpdateGameResult): Promise<Game>
commands.getEnhancedGameResult(gameId: number): Promise<EnhancedGameResult>
commands.approveGameResult(data: ApproveGameResult): Promise<null>
// Plus: batch operations, validation, audit trail
```

## Development Guidelines

### Service Layer Pattern
When adding new features, follow the established pattern:

1. **Domain Models** (`domain/model.rs`): Add new structs with `#[derive(SpectaType)]`
2. **DTOs** (`domain/dto.rs`): Create request/response types  
3. **Database Layer** (`db/sqlite.rs`): Implement database operations
4. **Service Layer** (`service/`): Add business logic with validation
5. **Commands** (`command/`): Create Tauri command handlers
6. **Frontend**: TypeScript bindings auto-generate

### Enhanced Player System Development

**Key Patterns**:
- **Validation**: Always validate input in service layer AND frontend
- **Error Handling**: Use `PawnError` enum for structured error responses
- **Search**: Implement pagination for large datasets (`limit`/`offset`)
- **Bulk Operations**: Use validation-first approach with preview mode
- **Status Management**: Maintain audit trails for status changes

**Database Performance**:
- Use provided indexes for player search queries
- Implement COALESCE for partial updates
- Use transactions for multi-table operations

### Testing Enhanced Features

**Demo System**:
- Navigate to `/demo/enhanced-players` for interactive testing
- Use "Create Sample Tournament" for quick setup
- Test all CRUD operations, search, and bulk import

**Database Testing**:
- Reset database: Remove `~/.local/share/pawn/db/pawn.sqlite`
- Check migrations: Verify all 7 migrations apply cleanly
- Performance: Test with hundreds of players

## Technical Implementation Notes

- **Custom Window**: Uses `decorations: false` in tauri.conf.json for custom titlebar
- **Logging**: Configured to stdout and app data directory files
- **UI Framework**: Material-UI v6 with custom theme for chess tournament UI  
- **Forms**: react-hook-form + Yup validation throughout
- **Plugin Architecture**: Commands use "plugin:pawn|command_name" format
- **Performance**: Optimized for tournaments with 200+ players
- **Type Safety**: Complete Rust-TypeScript integration with zero manual binding

## API and External Resource Handling

- **Local-first**: All data stored locally in SQLite, no external dependencies
- **Import Sources**: CSV import framework supports various formats
- **Future Integration**: Prepared for FIDE rating API, chess server integration
- **Error Handling**: Comprehensive validation with user-friendly messages

For complete technical documentation, see [ENHANCED_PLAYER_MANAGEMENT.md](./ENHANCED_PLAYER_MANAGEMENT.md).

---

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.