<div align="center">
  <img src="./public/chess-logo.svg" alt="Pawn Logo" width="120" height="120">

  # Pawn - Chess Tournament Management System

  [![CI](https://github.com/grok-rs/pawn/workflows/Backend%20Quality%20Gates%20(Parallelized)/badge.svg)](https://github.com/grok-rs/pawn/actions/workflows/backend-test.yml)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
</div>

Professional desktop application for chess tournament management. Built with Tauri, React, and Rust for native performance across Windows, macOS, and Linux.

## Features

- **Tournament formats**: Swiss (FIDE Dutch system), Round-robin, Knockout, Scheveningen, Team
- **FIDE-compliant pairing**: Color assignment, float management, team/federation avoidance, accelerated pairings
- **Player management**: Registration, late entries, withdrawals, rating history, bulk CSV import, category management
- **Results tracking**: Game result entry with keyboard shortcuts, batch validation, audit trail, CSV import
- **Live standings**: Real-time calculations with configurable tiebreak criteria
- **Export**: PDF, Excel, HTML, CSV, JSON, and plain text formats
- **Norm calculation**: FIDE title norm calculations
- **Offline-first**: Local SQLite database, full functionality without internet
- **Multi-language**: English, Russian, Ukrainian

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Rust](https://rustup.rs/) (stable)
- System dependencies (Ubuntu/Debian):

```bash
sudo apt-get install -y libsqlite3-dev pkg-config libwebkit2gtk-4.1-dev \
  build-essential curl wget file libxdo-dev libssl-dev \
  libayatana-appindicator3-dev librsvg2-dev
```

### Installation

```bash
git clone https://github.com/grok-rs/pawn.git
cd pawn
pnpm install
pnpm tauri dev
```

The app will open automatically. Database migrations run on first launch.

### Build for Production

```bash
pnpm tauri build
```

Installers are created in `src-tauri/target/release/bundle/`.

## Development

### Commands

| Command | Description |
|---------|-------------|
| `pnpm tauri dev` | Full app with hot reload |
| `pnpm dev` | Frontend only (localhost:1420) |
| `pnpm test` | Unit tests (vitest) |
| `pnpm test:e2e` | Playwright E2E tests |
| `pnpm check` | Biome lint + format check |
| `pnpm check:fix` | Biome auto-fix |
| `pnpm type-check` | TypeScript validation |
| `pnpm quality:check` | Full quality gate (lint + format + types + locales + tests) |
| `pnpm tauri build` | Desktop app with installers |
| `pnpm db:reset` | Reset and re-migrate database |
| `pnpm locales:check` | Check translation consistency |

### Backend Commands

```bash
cd src-tauri
cargo test                    # All tests
cargo test swiss_pairing      # Specific module
cargo fmt                     # Format
cargo clippy                  # Lint
```

### Project Structure

```
pawn/
├── src/                    # React frontend (TypeScript)
│   ├── app/                # App entry, providers, routes, global styles
│   ├── pages/              # Route-level components
│   ├── widgets/            # Composite UI blocks with custom hooks
│   ├── shared/             # Shared utilities, UI components, layouts
│   ├── dto/                # Auto-generated TypeScript bindings
│   ├── locales/            # Translation files (en, ru, ua)
│   └── test/               # Test infrastructure
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── command/        # Tauri IPC command handlers
│   │   ├── service/        # Business logic (pairing, standings, export, etc.)
│   │   ├── domain/         # Data models and DTOs
│   │   ├── db/             # SQLite access layer (SQLx)
│   │   └── common/         # Error types, macros, constants
│   └── migrations/         # SQLite migrations
├── biome.json              # Biome lint/format config
└── CLAUDE.md               # AI assistant context
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop runtime | [Tauri 2](https://v2.tauri.app/) |
| Frontend | React 19, TypeScript 5.9, Vite 8 |
| UI | Material-UI 7, Emotion |
| Forms | react-hook-form, Yup |
| i18n | i18next |
| Backend | Rust (2024 edition) |
| Database | SQLite via SQLx |
| Type generation | Specta + tauri-specta |
| Lint/Format | Biome (frontend), rustfmt + clippy (backend) |
| Testing | Vitest + Testing Library (frontend), cargo test (backend), Playwright (E2E) |

### Type Generation

TypeScript bindings are auto-generated from Rust types via Specta:

```bash
pnpm generate-bindings
```

This runs automatically before `pnpm dev` and `pnpm build`. Generated types live in `src/dto/bindings.ts` — never edit manually.

## Use Cases

- **FIDE Tournaments**: Official ratings, titles, norm calculations, multi-language support
- **Club Championships**: Member management, local ratings, historical data
- **Team Events**: Scheveningen, Olympic-style competitions with flexible scoring
- **Youth Tournaments**: Age-based categories, parent contacts

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/name`
3. Follow existing patterns (service layer, custom hooks, DTOs)
4. Run `pnpm quality:check` before submitting
5. Submit PR with clear description

## License

MIT License - see [LICENSE](LICENSE) file

## Support

- [Issues](https://github.com/grok-rs/pawn/issues) - Bug reports & feature requests
- [Discussions](https://github.com/grok-rs/pawn/discussions) - Community support
