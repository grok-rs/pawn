<div align="center">
  <img src="./public/chess-logo.svg" alt="Pawn Logo" width="120" height="120">

  # Pawn - Chess Tournament Management System

  [![CI](https://github.com/grok-rs/pawn/workflows/CI%20Orchestration%20(Complete%20Pipeline)/badge.svg)](https://github.com/grok-rs/pawn/actions/workflows/ci-orchestration.yml)
  [![codecov](https://codecov.io/gh/grok-rs/pawn/branch/main/graph/badge.svg)](https://codecov.io/gh/grok-rs/pawn)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
</div>

Professional desktop application for chess tournament management. Built with Tauri, React, and Rust for native performance across Windows, macOS, and Linux.

## Features

- **Tournament Types**: Swiss system, Round-robin, and Team tournaments with FIDE-compliant pairing
- **Player Management**: Professional registration with chess titles, ratings (FIDE, national, rapid, blitz), bulk CSV import
- **Team Tournaments**: Complete team management with multiple scoring systems (Match Points, Board Points, Olympic)
- **Live Standings**: Real-time calculations with standard tiebreak methods
- **Offline-First**: Local SQLite database with full functionality without internet
- **Multi-language**: English, Russian, and Ukrainian

## Quick Start

### Prerequisites

- Node.js 18+
- Rust (latest stable)
- Yarn

### Installation

```bash
# Clone repository
git clone https://github.com/grok-rs/pawn.git
cd pawn

# Install dependencies
yarn install

# Run development server
yarn tauri dev
```

The app will open automatically. Database migrations run on first launch.

### Build for Production

```bash
yarn tauri build
```

Installers are created in `src-tauri/target/release/bundle/`.

## Development

### Commands

```bash
# Development
yarn tauri dev              # Full app with hot reload
yarn dev                    # Frontend only (localhost:1420)

# Code Quality
yarn format:all             # Format code (frontend + backend)
yarn lint                   # Run linter
yarn type-check             # TypeScript validation

# Testing
yarn test                   # Unit tests
yarn test:coverage          # With coverage
yarn test:integration       # Backend integration tests

# Security
yarn security:audit         # Check dependencies
```

### Project Structure

```
pawn/
├── src/                    # React frontend (TypeScript)
│   ├── components/         # UI components
│   ├── pages/              # Main pages
│   └── locales/            # i18n translations
├── src-tauri/              # Rust backend
│   ├── src/pawn/
│   │   ├── command/        # Tauri commands (API)
│   │   ├── service/        # Business logic
│   │   ├── domain/         # Data models
│   │   └── db/             # Database layer
│   └── migrations/         # SQL migrations
└── docs/                   # Documentation
```

### Tech Stack

**Frontend**: React 18, TypeScript, Material-UI v6, Vite
**Backend**: Rust, Tauri 2.5, SQLite, SQLx
**Tools**: tauri-specta (type-safe bindings), react-hook-form, i18next

## Use Cases

- **FIDE Tournaments**: Official ratings, titles, multi-language support
- **Club Championships**: Member management, local ratings, historical data
- **Team Events**: Olympic-style competitions with flexible scoring
- **Youth Tournaments**: Age-based categories, parent contacts, safety features

## Documentation

- [Enhanced Player Management](./ENHANCED_PLAYER_MANAGEMENT.md) - Player system details
- [Pairing Test Guide](./PAIRING_TEST_GUIDE.md) - Tournament pairing system

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/name`
3. Follow existing patterns (service layer, DTOs, tests)
4. Submit PR with clear description

**Areas to contribute**: UI components, pairing algorithms, i18n translations, testing, documentation

## Roadmap

**Current**: Advanced statistics, PDF reports, enhanced export

**Planned**: Mobile app, cloud sync, chess server integration, analytics

Full roadmap: [GitHub Projects](https://github.com/grok-rs/pawn/projects)

## License

MIT License - see [LICENSE](LICENSE) file

## Support

- [Issues](https://github.com/grok-rs/pawn/issues) - Bug reports & feature requests
- [Discussions](https://github.com/grok-rs/pawn/discussions) - Community support

---

**Built for tournament directors who value reliability and professional features** 🏆
