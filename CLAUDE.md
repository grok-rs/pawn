# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the **Pawn** professional chess tournament management application.

## 🎯 Application Overview

**Pawn** is a professional-grade chess tournament management system built with Tauri, featuring a comprehensive **Enhanced Player Registration and Management System** and **Team Tournament Support** alongside advanced tournament administration capabilities.

## 🧪 Test-Driven Development Guidelines

**Pawn follows a strict Test-Driven Development (TDD) approach. ALWAYS write tests before implementing features.**

### TDD Core Principles

**Red-Green-Refactor Cycle**:
1. **🔴 RED**: Write a failing test that describes the desired functionality
2. **🟢 GREEN**: Write the minimal code to make the test pass
3. **🔵 REFACTOR**: Clean up code while keeping tests green

### Test Categories & Coverage Requirements

**Test Types** (in order of implementation):
1. **Unit Tests**: Test individual functions/methods (90%+ coverage required)
2. **Integration Tests**: Test service layer with database (80%+ coverage required)
3. **Command Tests**: Test Tauri commands and API contracts (100% coverage required)
4. **End-to-End Tests**: Test complete user workflows (critical paths only)

**Coverage Standards**:
- **New Features**: 90% minimum test coverage before code review
- **Bug Fixes**: Must include regression tests
- **Refactoring**: All tests must pass, coverage cannot decrease

### TDD Workflow Commands

**Backend Testing**:
- **Run All Tests**: `cd src-tauri && cargo test`
- **Run Specific Module**: `cd src-tauri && cargo test swiss_pairing`
- **Run with Coverage**: `cd src-tauri && cargo tarpaulin --out Html`
- **Watch Tests**: `cd src-tauri && cargo watch -x test`

**Frontend Testing**:
- **Run Unit Tests**: `npm test` or `yarn test`
- **Run with Coverage**: `npm run test:coverage`
- **Watch Tests**: `npm run test:watch`
- **E2E Tests**: `npm run test:e2e`

**Integration Testing**:
- **Database Tests**: `cd src-tauri && cargo test --test integration`
- **Full Stack Tests**: `npm run test:integration`

## Essential Commands

### Development
- **Primary**: `yarn tauri dev` - Starts complete application with hot reload
- **Frontend Only**: `yarn dev` - Vite dev server on port 1420 (for UI-only work)
- **Backend Only**: `cd src-tauri && cargo build` - Compile Rust backend

### Testing (TDD Workflow)
- **Test First**: `cd src-tauri && cargo test [module_name] --watch` - Write failing tests
- **Implement**: Write minimal code to pass tests
- **Refactor**: Clean up while maintaining green tests
- **Coverage Check**: `cd src-tauri && cargo tarpaulin --out Html`

### Building
- **Frontend**: `yarn build` - TypeScript compilation and Vite build
- **Full Application**: `yarn tauri build` - Complete desktop app with installers
- **Development Build**: `cargo build` in src-tauri/ - Debug Rust build

### Database & Types
- **Migrations**: `cd src-tauri && sqlx migrate run --database-url sqlite:pawn.sqlite`
- **Type Generation**: Auto-generated on dev server start (TypeScript bindings from Rust)
- **Database Reset**: Remove `~/.local/share/pawn/db/pawn.sqlite` to reset database

### Enhanced Features Testing
- **Player Management**: Access comprehensive player features within tournament pages
- **Sample Data**: Use "Create Sample Tournament" in tournaments page for testing
- **Player Features**: All enhanced player management accessible via tournament info pages

### GitHub Operations
- **Issues & PRs**: Use `gh` command for all GitHub operations (view issues, PRs, comments)
- **View PR Comments**: `gh api repos/owner/repo/pulls/123/comments`
- **Analyze Issues**: `gh issue view 123` or `gh issue list`
- **Repository Info**: `gh repo view` for repository details

## Enhanced Architecture Overview

**Pawn** is a professional chess tournament management application with a sophisticated multi-layered architecture:

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite + Material-UI v6
- **Backend**: Rust + Tauri 2.5 + SQLite + SQLx  
- **Communication**: 60+ Tauri commands with auto-generated TypeScript bindings
- **Type Safety**: Complete Rust-TypeScript integration via tauri-specta

### Frontend Architecture

**Component Organization**:
- **Pages**: `src/pages/` (Tournaments, NewTournament, TournamentInfo)
- **Components**: `src/components/` with index.ts barrel exports
  - `PlayerManagement/` - Complete player management system
  - `TeamManagement/` - Team tournament management interface
  - `TeamStandings/` - Real-time team standings display
  - `TeamTournamentConfig/` - Advanced team tournament configuration
  - `TournamentList/`, `BaseLayout/`, etc.
- **Routing**: React Router in `src/App.tsx` with tournament-focused navigation
- **State**: Local component state (no Redux dependency for simplicity)
- **Forms**: react-hook-form + Yup validation
- **Internationalization**: react-i18next (en, ru, ua)

**Backend Architecture - Service Layer Pattern**:
```
src-tauri/src/pawn/
├── command/              # 60+ Tauri command handlers
│   ├── tournament.rs     # Tournament operations (12 commands)
│   ├── player.rs         # Enhanced player management (15+ commands)
│   ├── team.rs           # Team tournament management (18+ commands)
│   ├── round.rs          # Round management (8 commands)
│   ├── game_result.rs    # Game result operations (6 commands)
│   ├── knockout.rs       # Knockout tournament operations (10 commands)
│   └── time_control.rs   # Time control management (8 commands)
├── service/              # Business logic layer
│   ├── player.rs         # PlayerService - CRUD, search, bulk import
│   ├── team.rs           # TeamService - team CRUD operations
│   ├── team_pairing.rs   # TeamPairingService - team pairing algorithms
│   ├── team_scoring.rs   # TeamScoringService - team scoring & tiebreaks
│   ├── tournament.rs     # TournamentService - tournament lifecycle
│   ├── round.rs          # RoundService - pairing and round management
│   ├── tiebreak.rs       # TiebreakCalculator - standings calculation
│   ├── knockout.rs       # KnockoutService - bracket management & algorithms
│   └── time_control.rs   # TimeControlService - FIDE-compliant time controls
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
- **60+ Commands**: All commands auto-generate TypeScript function signatures

### Enhanced Database Schema

**SQLite with Advanced Features**:
- **Database File**: `~/.local/share/pawn/db/pawn.sqlite`
- **10 Migrations**: Complete schema evolution from basic to professional system
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

-- Team tournament system (Migration 11)
teams (
  id, tournament_id, name, captain, description, color,
  club_affiliation, contact_email, contact_phone, max_board_count,
  status, created_at, updated_at
)

team_memberships (
  id, team_id, player_id, board_number, is_captain, is_reserve,
  rating_at_assignment, notes, status, created_at, updated_at
)

team_matches (
  id, tournament_id, round_number, team1_id, team2_id,
  team1_score, team2_score, result_status, created_at, updated_at
)

-- Knockout tournaments (Migrations 9-10)
knockout_brackets (
  id, tournament_id, bracket_type, total_rounds, created_at
)

-- Advanced time controls (Migration 10)
time_controls (
  id, name, time_control_type, base_time_minutes, increment_seconds,
  moves_per_session, session_time_minutes, total_sessions,
  is_default, description, created_at
)
```

### Major System Enhancements

**Enhanced Player Management System**:
- **Professional Registration**: Chess titles, contact info, demographics
- **Multiple Rating Systems**: FIDE, national, club, rapid, blitz with history
- **Advanced Search**: Multi-criteria filtering with performance optimization
- **Bulk Import**: CSV import with comprehensive validation pipeline
- **Player Categorization**: Flexible tournament section management
- **Status Management**: Player withdrawals, bye requests, late entries
- **Player Management**: Integrated player management system within tournament workflows

**Team Tournament System** (Latest):
- **Team Management**: Complete team creation with captains, colors, and member assignments
- **Team Pairing**: Advanced algorithms for Swiss, Round-robin, and Scheveningen formats
- **Team Scoring**: Multiple scoring systems (Match Points, Board Points, Olympic) with comprehensive tiebreaks
- **Team Standings**: Real-time calculations with 9 different tiebreak criteria
- **Professional UI**: TeamManagement, TeamStandings, and TeamTournamentConfig components
- **Database Integration**: Complete team tournament schema with migrations

**Knockout Tournament System**:
- **Bracket Generation**: Automatic seeding algorithms for single/double elimination
- **Winner Advancement**: Systematic progression through tournament rounds
- **Tournament Completion**: Winner determination and completion detection
- **Flexible Configuration**: Support for various bracket sizes and formats
- **Professional Integration**: Seamless integration with existing tournament workflow

**Advanced Time Control System**:
- **FIDE-Compliant Templates**: 8 pre-populated official time control configurations
- **7 Time Control Types**: Classical, Rapid, Blitz, Bullet, Fischer, Bronstein, Correspondence
- **Validation & Estimation**: Game duration calculation and FIDE compliance checking
- **Template Management**: CRUD operations for custom time control creation
- **Tournament Integration**: Dynamic template selection in tournament creation UI

## Complete Command Reference

### Enhanced Player Management Commands (18)
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

### Team Tournament Management Commands (18)
```typescript
// Core Team Operations
commands.createTeam(data: CreateTeam): Promise<Team>
commands.getTeamById(teamId: number): Promise<Team>
commands.getTeamsByTournament(tournamentId: number): Promise<Team[]>
commands.updateTeam(data: UpdateTeam): Promise<Team>
commands.deleteTeam(teamId: number): Promise<null>

// Team Search & Statistics
commands.searchTeams(filters: TeamSearchFilters): Promise<Team[]>
commands.getTeamStatistics(tournamentId: number): Promise<TeamStatistics>
commands.getTeamStandings(tournamentId: number): Promise<TeamStanding[]>

// Team Membership Management
commands.addPlayerToTeam(data: AddPlayerToTeam): Promise<TeamMembership>
commands.removePlayerFromTeam(membershipId: number): Promise<null>
commands.getTeamMemberships(teamId: number): Promise<TeamMembership[]>
commands.getAllTeamMemberships(tournamentId: number): Promise<TeamMembership[]>

// Team Scoring & Configuration
commands.calculateTeamStandings(tournamentId: number, config: TeamScoringConfig): Promise<TeamStandingsResult>
commands.getTeamScoringConfigDefault(): Promise<TeamScoringConfig>
commands.validateTeamScoringConfig(config: TeamScoringConfig): Promise<boolean>

// Team Match Management
commands.createTeamMatch(data: CreateTeamMatch): Promise<TeamMatch>
commands.updateTeamMatch(data: UpdateTeamMatch): Promise<TeamMatch>
commands.getTeamMatches(tournamentId: number): Promise<TeamMatch[]>
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

### Knockout Tournament Commands (10)
```typescript
// Bracket Management
commands.createKnockoutBracket(data: CreateKnockoutBracket): Promise<KnockoutBracket>
commands.getKnockoutBracket(tournamentId: number): Promise<KnockoutBracket | null>
commands.initializeKnockoutTournament(tournamentId: number, bracketType: string): Promise<KnockoutBracket>

// Bracket Operations
commands.getBracketPositions(bracketId: number): Promise<BracketPosition[]>
commands.getBracketPositionsByRound(bracketId: number, roundNumber: number): Promise<BracketPosition[]>
commands.generateKnockoutPairings(bracketId: number, roundNumber: number): Promise<Pairing[]>

// Tournament Progression
commands.advanceKnockoutWinners(bracketId: number, roundNumber: number, winnerResults: ([number, number])[]): Promise<BracketPosition[]>
commands.getKnockoutTournamentWinner(bracketId: number): Promise<number | null>
commands.isKnockoutTournamentComplete(bracketId: number): Promise<boolean>
commands.validateKnockoutBracket(bracketId: number): Promise<boolean>
```

### Time Control Commands (8)
```typescript
// CRUD Operations
commands.createTimeControl(data: CreateTimeControl): Promise<TimeControl>
commands.getTimeControl(id: number): Promise<TimeControl>
commands.updateTimeControl(data: UpdateTimeControl): Promise<TimeControl>
commands.deleteTimeControl(id: number): Promise<null>

// Template & Query Operations
commands.getTimeControls(filter: TimeControlFilter | null): Promise<TimeControl[]>
commands.getDefaultTimeControls(): Promise<TimeControl[]>
commands.getTimeControlTemplates(): Promise<TimeControlTemplate[]>
commands.validateTimeControlData(data: CreateTimeControl): Promise<TimeControlValidation>
```

## Development Guidelines

### TDD Service Layer Pattern
When adding new features, follow the **Tests-First** approach:

**🔴 RED Phase (Write Failing Tests)**:
1. **Unit Tests** (`#[cfg(test)]` modules): Write tests for expected behavior
2. **Integration Tests** (`tests/` directory): Write database integration tests
3. **Command Tests**: Write tests for Tauri command contracts

**🟢 GREEN Phase (Minimal Implementation)**:
4. **Domain Models** (`domain/model.rs`): Add new structs with `#[derive(SpectaType)]`
5. **DTOs** (`domain/dto.rs`): Create request/response types to satisfy tests
6. **Database Layer** (`db/sqlite.rs`): Implement operations to pass integration tests
7. **Service Layer** (`service/`): Add business logic to pass unit tests
8. **Commands** (`command/`): Create Tauri command handlers to pass command tests

**🔵 REFACTOR Phase (Clean Implementation)**:
9. **Permissions & Capabilities** ⚠️ **CRITICAL**: Update Tauri security configuration
10. **Frontend Tests**: Write component and integration tests
11. **Frontend Implementation**: TypeScript bindings auto-generate, implement UI

**Quality Gates**:
- All tests must pass before proceeding to next phase
- Minimum 90% test coverage for new code
- Integration tests must cover database operations
- Command tests must validate all API contracts

### ⚠️ IMPORTANT: Tauri Permissions & Capabilities

**ALWAYS update permissions when adding new commands:**

1. **Create Permission Files**: For each new command, create `/src-tauri/permissions/pawn/[command-name].toml`:
   ```toml
   [[permission]]
   identifier = "allow-[command-name]"
   description = "Allows [description]"
   commands.allow = ["command_function_name"]

   [[permission]]
   identifier = "deny-[command-name]" 
   description = "Denies the [command-name] command"
   commands.deny = ["command_function_name"]
   ```

2. **Update Capabilities**: Add new permissions to `/src-tauri/capabilities/default.json`:
   ```json
   {
     "permissions": [
       "pawn:allow-[command-name]"
     ]
   }
   ```

3. **Register Commands**: Add to `/src-tauri/src/pawn/mod.rs` in `collect_commands![]` macro

**Without proper permissions, commands will be blocked by Tauri security even if implemented correctly!**

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

### Test Structure & Organization

**Backend Test Organization** (Rust):
```
src-tauri/src/pawn/
├── service/
│   ├── player.rs           # Business logic
│   └── tests/              # Unit tests
│       └── player_tests.rs # Test player service
├── command/
│   ├── player.rs           # Tauri commands
│   └── tests/              # Command tests
│       └── player_cmd_tests.rs
└── tests/                  # Integration tests
    ├── integration/
    │   ├── player_integration.rs
    │   └── database_integration.rs
    └── common/             # Shared test utilities
        └── mod.rs
```

**Frontend Test Organization** (TypeScript):
```
src/
├── components/
│   ├── PlayerList.tsx
│   └── __tests__/
│       ├── PlayerList.test.tsx    # Unit tests
│       └── PlayerList.integration.test.tsx
├── pages/
│   ├── Tournament.tsx
│   └── __tests__/
├── services/
│   └── __tests__/
└── __tests__/              # E2E tests
    └── tournament-flow.test.ts
```

**Test File Naming Conventions**:
- **Unit Tests**: `[module_name]_test.rs` or `[component].test.tsx`
- **Integration Tests**: `[feature]_integration.rs` or `[feature].integration.test.tsx`
- **E2E Tests**: `[workflow]-flow.test.ts`

### Testing Patterns & Best Practices

**Rust Test Patterns**:
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    // Test data builders
    fn create_test_player() -> Player { /* ... */ }
    
    // Happy path tests
    #[test]
    fn test_create_player_success() { /* ... */ }
    
    // Error case tests
    #[test]
    fn test_create_player_invalid_input() { /* ... */ }
    
    // Integration tests with database
    #[tokio::test]
    async fn test_player_crud_operations() { /* ... */ }
}
```

**Frontend Test Patterns**:
```typescript
// Component unit tests
describe('PlayerList', () => {
  test('renders player data correctly', () => { /* ... */ });
  test('handles empty state', () => { /* ... */ });
});

// Integration tests with API
describe('PlayerList Integration', () => {
  test('fetches and displays players', async () => { /* ... */ });
});
```

### Enhanced Testing Commands

**Backend Testing Workflow**:
- **Start TDD**: `cd src-tauri && cargo test [feature] --watch` (write failing tests)
- **Run All Tests**: `cd src-tauri && cargo test`
- **Run Specific Tests**: `cd src-tauri && cargo test player_service`
- **Integration Tests**: `cd src-tauri && cargo test --test integration`
- **Coverage Report**: `cd src-tauri && cargo tarpaulin --out Html --output-dir coverage`
- **Performance Tests**: `cd src-tauri && cargo test --release perf_`

**Frontend Testing Workflow**:
- **Unit Tests**: `npm test` or `yarn test`
- **Watch Mode**: `npm run test:watch`
- **Coverage**: `npm run test:coverage`
- **Integration**: `npm run test:integration`
- **E2E Tests**: `npm run test:e2e`

**Quality Assurance Commands**:
- **Lint & Test**: `npm run lint && npm test && cd src-tauri && cargo test`
- **Pre-commit Check**: `npm run pre-commit` (runs all quality checks)
- **Coverage Threshold**: All tests must maintain 90%+ coverage

### Quality Gates & CI/CD Integration

**Pre-commit Quality Gates**:
1. **Code Formatting**: `cargo fmt --check` and `prettier --check`
2. **Linting**: `cargo clippy -- -D warnings` and `eslint src/`
3. **Type Checking**: `cargo check` and `tsc --noEmit`
4. **Unit Tests**: `cargo test` and `npm test`
5. **Coverage Check**: Minimum 90% coverage for new code
6. **Integration Tests**: All database operations must pass

**Git Hooks Setup**:
```bash
# Install pre-commit hooks
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npm run pre-commit"
```

**Continuous Integration Pipeline**:
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
      - name: Setup Rust
      - name: Setup Node.js
      - name: Run backend tests
        run: cd src-tauri && cargo test
      - name: Run frontend tests
        run: npm test -- --coverage
      - name: Check coverage threshold
        run: npm run coverage:check
```

**Quality Metrics Tracking**:
- **Test Coverage**: Must be ≥90% for new features
- **Performance**: Pairing algorithms must handle 500+ players
- **Memory Usage**: No memory leaks in long-running tournaments
- **API Response Time**: Commands must respond <100ms for typical operations

### Testing Enhanced Features

**TDD Demo Workflow**:
1. Access player management through tournament info pages for comprehensive testing
2. Use "Create Sample Tournament" for quick setup
3. Write tests for new features before implementation
4. Test all CRUD operations, search, and bulk import
5. Verify performance with large datasets

**Database Testing**:
- **Clean State**: Remove `~/.local/share/pawn/db/pawn.sqlite`
- **Migration Tests**: Verify all migrations apply cleanly
- **Performance Tests**: Test with hundreds of players
- **Transaction Tests**: Verify rollback behavior

### Concrete TDD Workflow Examples

**Example 1: Implementing Swiss Pairing Algorithm**

**🔴 RED Phase - Write Failing Tests**:
```rust
// src-tauri/src/pawn/service/swiss_pairing.rs
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_generate_swiss_pairings_basic() {
        let engine = SwissPairingEngine::new();
        let players = create_test_players(4);
        
        let result = engine.generate_pairings(players, 1);
        
        assert!(result.is_ok());
        let pairings = result.unwrap();
        assert_eq!(pairings.len(), 2); // 4 players = 2 pairings
        // Should fail initially - algorithm not implemented
    }
}
```

**🟢 GREEN Phase - Minimal Implementation**:
```rust
impl SwissPairingEngine {
    pub fn generate_pairings(&self, players: Vec<Player>, round: i32) -> Result<Vec<Pairing>, PawnError> {
        // Minimal implementation to pass test
        if players.len() == 4 {
            Ok(vec![
                Pairing { /* basic pairing 1 */ },
                Pairing { /* basic pairing 2 */ },
            ])
        } else {
            Err(PawnError::InvalidInput("Not implemented".to_string()))
        }
    }
}
```

**🔵 REFACTOR Phase - Full Implementation**:
```rust
impl SwissPairingEngine {
    pub fn generate_pairings(&self, players: Vec<Player>, round: i32) -> Result<Vec<Pairing>, PawnError> {
        // Full FIDE-compliant Dutch System implementation
        let swiss_players = self.prepare_swiss_players(players);
        let score_groups = self.create_score_groups(&swiss_players);
        self.generate_group_pairings(score_groups, round)
    }
}
```

**Example 2: Frontend Component TDD**

**🔴 RED Phase - Write Failing Tests**:
```typescript
// src/components/__tests__/TournamentList.test.tsx
import { render, screen } from '@testing-library/react';
import TournamentList from '../TournamentList';

test('displays tournament list with correct data', async () => {
  const mockTournaments = [
    { id: 1, name: 'Test Tournament', playerCount: 10 }
  ];
  
  render(<TournamentList tournaments={mockTournaments} />);
  
  expect(screen.getByText('Test Tournament')).toBeInTheDocument();
  expect(screen.getByText('10 players')).toBeInTheDocument();
  // Will fail - component doesn't exist yet
});
```

**🟢 GREEN Phase - Minimal Implementation**:
```typescript
// src/components/TournamentList.tsx
export default function TournamentList({ tournaments }) {
  return (
    <div>
      {tournaments.map(t => (
        <div key={t.id}>
          <span>{t.name}</span>
          <span>{t.playerCount} players</span>
        </div>
      ))}
    </div>
  );
}
```

**🔵 REFACTOR Phase - Production-Ready**:
```typescript
// Enhanced component with proper TypeScript, styling, error handling
export default function TournamentList({ tournaments, onSelect }: TournamentListProps) {
  return (
    <Grid container spacing={2}>
      {tournaments.map(tournament => (
        <TournamentCard 
          key={tournament.id}
          tournament={tournament}
          onClick={() => onSelect(tournament)}
        />
      ))}
    </Grid>
  );
}
```

### TDD Best Practices for Chess Tournament Features

**When implementing pairing algorithms**:
1. Start with simple cases (2-4 players)
2. Test edge cases (odd players, byes)
3. Test FIDE compliance (color balance, team avoidance)
4. Test performance with large datasets

**When adding database operations**:
1. Test with in-memory SQLite for speed
2. Test transaction rollback scenarios
3. Test concurrent access patterns
4. Test migration compatibility

**When building UI components**:
1. Test component rendering first
2. Test user interactions (clicks, inputs)
3. Test API integration with mocked services
4. Test error states and loading states

### Required Testing Dependencies

**Backend Testing (Cargo.toml)**:
```toml
[dev-dependencies]
# Core testing framework
tokio-test = "0.4"           # Async testing utilities
tempfile = "3.8"             # Temporary files for testing
mockall = "0.12"             # Mocking framework

# Database testing
sqlx = { version = "0.8", features = ["sqlite", "testing"] }
sqlite = "0.36"              # In-memory database for tests

# Property-based testing
proptest = "1.4"             # Property-based testing
quickcheck = "1.0"           # Alternative property testing

# Performance testing
criterion = "0.5"            # Benchmarking framework

# Coverage reporting
tarpaulin = "0.29"           # Code coverage for Rust
```

**Frontend Testing (package.json)**:
```json
{
  "devDependencies": {
    // Core testing framework
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0",
    
    // Test runner and utilities
    "vitest": "^1.0.0",
    "jsdom": "^23.0.0",
    "happy-dom": "^12.0.0",
    
    // Mocking and fixtures
    "msw": "^2.0.0",              // Mock Service Worker for API mocking
    "@faker-js/faker": "^8.3.0",  // Test data generation
    
    // Component testing
    "@storybook/react": "^7.6.0", // Component development and testing
    "chromatic": "^8.0.0",        // Visual regression testing
    
    // E2E testing
    "playwright": "^1.40.0",      // End-to-end testing
    "@playwright/test": "^1.40.0",
    
    // Coverage and reporting
    "c8": "^8.0.0",               // Coverage reporting
    "eslint-plugin-testing-library": "^6.2.0"
  },
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:storybook": "test-storybook",
    "coverage:check": "c8 check-coverage --lines 90 --functions 90 --branches 90"
  }
}
```

### Testing Environment Setup

**Vitest Configuration (vitest.config.ts)**:
```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*'
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    }
  }
})
```

**Test Setup (src/test/setup.ts)**:
```typescript
import '@testing-library/jest-dom'
import { server } from './mocks/server'

// Establish API mocking before all tests
beforeAll(() => server.listen())

// Reset any request handlers that we may add during the tests
afterEach(() => server.resetHandlers())

// Clean up after the tests are finished
afterAll(() => server.close())
```

### Mock Service Setup for API Testing

**MSW Server Setup (src/test/mocks/server.ts)**:
```typescript
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

**API Handlers (src/test/mocks/handlers.ts)**:
```typescript
import { rest } from 'msw'

export const handlers = [
  rest.get('/api/tournaments', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: 1, name: 'Test Tournament', players: 16 }
      ])
    )
  }),
  
  rest.post('/api/tournaments', (req, res, ctx) => {
    return res(ctx.json({ id: 2, name: 'New Tournament' }))
  })
]
```

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