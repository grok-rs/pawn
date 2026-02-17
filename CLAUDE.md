# CLAUDE.md

Pawn is a chess tournament management desktop app built with Tauri 2, React 18, and Rust. It supports Swiss, Round-robin, and Team tournaments with FIDE-compliant pairing, offline-first SQLite storage, and multi-language support (EN/RU/UK).

## Architecture

### Frontend (Feature-Sliced Design)

```
src/
├── app/            # App entry, providers, routes, global styles
├── pages/          # Route-level components (new-tournament, settings, tournament-info, tournaments)
├── widgets/        # Composite UI blocks (player-management, round-manager, standings-table, etc.)
├── features/       # Business logic slices (game, player, round, settings, standings, team, tournament)
├── entities/       # Domain models (game, player, round, standings, team, tournament)
├── shared/         # Shared code (config, hooks, layouts, lib, types, ui)
├── dto/            # Auto-generated TypeScript bindings from Rust (bindings.ts)
├── locales/        # i18n translation files
└── test/           # E2E test infrastructure
```

FSD import rule: layers can only import from layers below them (app > pages > widgets > features > entities > shared).

### Backend (Rust/Tauri)

```
src-tauri/src/pawn/
├── command/    # Tauri command handlers (thin delegates to services)
├── service/    # Business logic layer (primary test target)
├── domain/     # Data models and types
├── db/         # SQLite database access (SQLx)
├── common/     # Shared utilities
└── templates/  # Tournament templates
```

## Coding Conventions

- No `any` types - set types at variable declaration
- No type casting (`as`) - prefer type annotations upfront
- Auto-generated types live in `src/dto/bindings.ts` - never edit manually
- Frontend uses Material-UI v6, react-hook-form, Redux Toolkit, i18next
- Backend follows service pattern: command -> service -> db

## Commands

### Development

```bash
pnpm tauri dev          # Full app with hot reload
pnpm dev                # Frontend only (localhost:1420)
cd src-tauri && cargo build  # Backend only
```

### Testing

```bash
# Frontend
pnpm test               # Unit tests (vitest)
pnpm test:e2e           # Playwright E2E

# Backend
cd src-tauri && cargo test                    # All tests
cd src-tauri && cargo test swiss_pairing      # Specific module
cd src-tauri && cargo test --test integration # Integration tests
```

### Building

```bash
pnpm build              # Frontend (tsc + vite)
pnpm tauri build        # Full desktop app with installers
```

### Code Quality

```bash
pnpm format:check       # Prettier check
pnpm lint               # ESLint
pnpm type-check         # TypeScript validation
```

### Database

```bash
cd src-tauri && sqlx migrate run --database-url sqlite:pawn.sqlite  # Run migrations
rm -f ~/.local/share/pawn/db/pawn.sqlite  # Reset database
```

### System Dependencies (Ubuntu/Debian)

```bash
sudo apt-get install -y libsqlite3-dev pkg-config libwebkit2gtk-4.1-dev \
  build-essential curl wget file libxdo-dev libssl-dev \
  libayatana-appindicator3-dev librsvg2-dev
```

## Testing Strategy

Pawn follows TDD (Red-Green-Refactor). Write tests before implementation.

**Tauri limitation**: Command wrappers in `src-tauri/src/pawn/command/` cannot be unit tested (`tauri::State<T>` has private fields). These are thin delegates with zero logic - all business logic is tested in the service layer.
