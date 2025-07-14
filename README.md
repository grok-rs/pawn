# Pawn - Professional Chess Tournament Management System

A comprehensive desktop application for professional chess tournament administration, built with Tauri, React, and Rust.

## Overview

**Pawn** is a professional-grade chess tournament management system designed for serious chess competitions. From local club championships to international tournaments, Pawn provides comprehensive tools for player registration, tournament administration, and results management.

✨ **Recently Enhanced**: Complete Player Registration and Management System with professional tournament features including chess titles, multiple rating systems, player categorization, bulk import, and advanced search capabilities.

## Features

### 🏆 Professional Tournament Management
- **Multiple Tournament Types**: Swiss system and Round-robin tournaments with advanced pairing algorithms
- **Flexible Configuration**: Customizable time controls, rounds, tiebreak systems, and tournament rules
- **Real-time Updates**: Live standings calculations with FIDE-standard tiebreak methods
- **Tournament Workflow**: Complete lifecycle management from planning to completion
- **Round Management**: Advanced round control with pairing generation and result tracking

### 👥 Enhanced Player Management System
- **Professional Registration**: Chess titles (GM, IM, FM, etc.), contact information, demographics
- **Multiple Rating Systems**: FIDE, national, club, rapid, blitz ratings with historical tracking
- **Player Categorization**: Flexible categories (Open, Women, age groups, rating sections)
- **Advanced Search**: Multi-criteria filtering by rating range, title, country, gender, status
- **Bulk Operations**: CSV import with comprehensive validation and error handling
- **Status Management**: Player withdrawals, bye requests, late entries with audit trails

### 📊 Advanced Game & Results Management
- **Comprehensive Result Recording**: Enhanced interface for all game outcomes and special cases
- **Audit Trail**: Complete game result history with approval workflows
- **Pairing Algorithms**: Intelligent pairing generation following tournament rules
- **Result Validation**: Automatic validation with arbiter approval for special cases
- **Batch Operations**: Bulk result updates with validation

### 🎯 Professional UI & Experience
- **Tournament Director Interface**: Purpose-built for professional tournament administration
- **Multi-language Support**: Available in English, Russian, and Ukrainian
- **Enhanced Player Demo**: Interactive demonstration of advanced features
- **Material-UI Design**: Professional, accessible interface with comprehensive forms
- **Real-time Feedback**: Instant validation and error handling

### ⚡ Advanced Technical Features
- **Cross-platform Desktop**: Native performance on Windows, macOS, and Linux
- **Offline-first Architecture**: Complete local data storage with SQLite database
- **Type-safe Integration**: Full Rust-TypeScript integration with auto-generated bindings
- **Professional Performance**: Optimized for tournaments with hundreds of players
- **Extensible Architecture**: Clean service layer for easy feature additions
- **Database Migrations**: Seamless schema updates and data preservation

## Installation

### Prerequisites
- **Node.js** (v18 or higher) - JavaScript runtime
- **Rust** (latest stable) - Systems programming language
- **Yarn** package manager - Dependency management
- **SQLite** - Database (included with Rust dependencies)

### Development Setup

1. **Clone the repository**:
```bash
git clone https://github.com/grok-rs/pawn.git
cd pawn
```

2. **Install dependencies**:
```bash
yarn install
```

3. **Run the development server**:
```bash
yarn tauri dev
```

The application will start with both frontend (React) and backend (Rust) in development mode. Database migrations will run automatically.

### Building for Production

Create platform-specific installers:

```bash
yarn tauri build
```

Builds are created in `src-tauri/target/release/bundle/` with installers for:
- **Windows**: `.msi` and `.exe` installers
- **macOS**: `.dmg` and `.app` bundles  
- **Linux**: `.deb`, `.AppImage`, and other formats

### Quick Demo Access

Once running, access the Enhanced Player Management demo at:
- **Main App**: `http://localhost:1420/tournaments`
- **Player Demo**: `http://localhost:1420/demo/enhanced-players`

## Usage

### Professional Tournament Workflow

#### 1. **Creating a Tournament**
1. Click "New Tournament" on the main screen
2. Configure tournament details:
   - Tournament name, location, and dates
   - Tournament format (Swiss/Round-robin)
   - Time controls and round settings
   - Tiebreak criteria (FIDE-standard options)
3. Save and initialize the tournament

#### 2. **Enhanced Player Registration**
1. Navigate to tournament player management
2. **Individual Registration**: Use the comprehensive form with:
   - Basic info (name, rating, country)
   - Chess title (GM, IM, FM, etc.)
   - Contact information (email, phone)
   - Demographics (birth date, gender)
   - Club/federation affiliation
3. **Bulk Import**: Upload CSV files with validation
4. **Player Categories**: Assign to tournament sections
5. **Status Management**: Handle withdrawals and bye requests

#### 3. **Advanced Player Operations**
- **Search & Filter**: Find players by multiple criteria
- **Category Management**: Create and manage tournament sections
- **Rating History**: Track multiple rating systems
- **Contact Management**: Maintain player communication data

#### 4. **Tournament Administration**
1. **Round Management**: Create rounds and generate pairings
2. **Result Recording**: Enter game results with validation
3. **Live Standings**: Real-time calculations with tiebreaks
4. **Audit Trail**: Track all changes and approvals

### Demo System

Try the **Enhanced Player Demo** to explore all features:
1. Start the development server
2. Navigate to the demo via the tournaments page button
3. Create a sample tournament
4. Test player registration, search, and management features

## Development

### Project Architecture

```
pawn/
├── src/                          # React Frontend
│   ├── components/               # Reusable UI components
│   │   ├── EnhancedPlayerDemo/  # Player management demo
│   │   ├── TournamentList/      # Tournament components
│   │   └── BaseLayout/          # App layout
│   ├── pages/                   # Main page components
│   ├── dto/                     # Auto-generated TypeScript bindings
│   └── locales/                 # Internationalization
├── src-tauri/                   # Rust Backend
│   ├── src/pawn/               # Core business logic
│   │   ├── command/            # 40+ Tauri command handlers
│   │   │   ├── tournament.rs   # Tournament operations
│   │   │   ├── player.rs       # Enhanced player management
│   │   │   ├── round.rs        # Round management  
│   │   │   └── game_result.rs  # Game result operations
│   │   ├── service/            # Business logic layer
│   │   │   ├── player.rs       # PlayerService with CRUD
│   │   │   ├── tournament.rs   # Tournament management
│   │   │   └── round.rs        # Round and pairing logic
│   │   ├── domain/             # Data models and DTOs
│   │   │   ├── model.rs        # Enhanced data models
│   │   │   └── dto.rs          # Request/response types
│   │   └── db/                 # Database layer
│   │       ├── sqlite.rs       # SQLite implementation
│   │       └── mod.rs          # Database traits
│   ├── migrations/             # Database schema evolution
│   │   ├── 0001_init_schemas.up.sql
│   │   └── 0007_enhance_player_management.up.sql
│   └── permissions/            # Tauri security permissions
└── docs/                       # Documentation
    ├── ENHANCED_PLAYER_MANAGEMENT.md
    └── PAIRING_TEST_GUIDE.md
```

### Technology Stack

#### Frontend
- **React 18** - Modern UI framework with hooks
- **TypeScript** - Type-safe JavaScript  
- **Material-UI v6** - Professional component library
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **react-hook-form + Yup** - Form handling with validation
- **react-i18next** - Internationalization (en, ru, ua)

#### Backend  
- **Rust** - Systems programming for performance
- **Tauri 2.5** - Desktop app framework
- **SQLite + SQLx** - Database with async operations
- **tauri-specta** - Auto-generated TypeScript bindings
- **serde** - Serialization/deserialization
- **tracing** - Structured logging

### Development Commands

```bash
# Development
yarn tauri dev          # Start full application (recommended)
yarn dev                # Frontend only (port 1420)
cd src-tauri && cargo build  # Backend only

# Building
yarn build              # Build frontend
yarn tauri build        # Build complete desktop application

# Type Generation
# TypeScript bindings auto-generate when starting dev server

# Database
cd src-tauri && sqlx migrate run --database-url sqlite:pawn.sqlite
```

### Enhanced Features (Recently Added)

#### Player Management System
- **15+ New Commands**: Complete CRUD operations for enhanced player management
- **Professional Registration**: Chess titles, contact info, demographics
- **Advanced Search**: Multi-criteria filtering with performance optimization
- **Bulk Import**: CSV import with comprehensive validation
- **Rating Systems**: Support for FIDE, national, club, rapid, blitz ratings
- **Player Categories**: Flexible tournament section management

#### Demo System
- **Interactive Demo**: Live demonstration of enhanced player features
- **Sample Data**: Auto-generated tournaments and players for testing
- **Feature Showcase**: Complete workflow examples

For detailed technical documentation, see [ENHANCED_PLAYER_MANAGEMENT.md](./ENHANCED_PLAYER_MANAGEMENT.md).

## Professional Use Cases

### International Tournaments
- **FIDE Integration**: Support for official ratings and titles
- **Multi-language**: Tournament administration in multiple languages
- **Categories**: Automatic section assignment based on rating/age/gender
- **Professional Workflow**: Complete tournament lifecycle management

### Club Championships  
- **Member Management**: Contact information and club affiliation tracking
- **Local Ratings**: Club-specific rating systems alongside official ratings
- **Communication**: Email and phone contact management
- **Historical Data**: Rating progression and tournament history

### Youth Tournaments
- **Age Categories**: Automatic age-based section assignment
- **Parent Information**: Contact details for underage participants
- **Educational Features**: Rating calculation explanations
- **Safety Features**: Proper data handling for minors

## Contributing

We welcome contributions to Pawn! Please follow these guidelines:

### Development Process
1. **Fork** the repository
2. **Create feature branch**: `git checkout -b feature/enhanced-feature`
3. **Follow patterns**: Use existing architecture patterns (service layer, DTOs)
4. **Test thoroughly**: Verify both frontend and backend functionality
5. **Update documentation**: Include relevant documentation updates
6. **Submit PR**: Create a pull request with clear description

### Areas for Contribution
- **Frontend Components**: Enhanced UI for tournament administration
- **Backend Services**: Additional tournament management features  
- **Database Schema**: New tables for extended functionality
- **Internationalization**: Additional language support
- **Testing**: Unit and integration tests
- **Documentation**: User guides and API documentation

## Roadmap

### Completed ✅
- ✅ Enhanced Player Registration and Management System
- ✅ Chess titles and professional player data
- ✅ Multiple rating systems with history
- ✅ Player categorization and advanced search
- ✅ Bulk import with validation
- ✅ Interactive demo system

### In Progress 🚧
- 📊 Advanced tournament statistics and analytics
- 📄 Tournament report generation (PDF/HTML)
- 🔄 Enhanced export capabilities

### Planned 📋
- 📱 Mobile companion app for tournament directors
- ☁️ Optional cloud backup and sync
- 🌐 Integration with chess servers (lichess, chess.com)
- 👥 Team tournament support
- 🎯 Advanced pairing algorithms
- 📈 Player performance analytics

## Documentation

- **[ENHANCED_PLAYER_MANAGEMENT.md](./ENHANCED_PLAYER_MANAGEMENT.md)** - Complete technical documentation
- **[CLAUDE.md](./CLAUDE.md)** - Development guidance for Claude Code
- **[PAIRING_TEST_GUIDE.md](./PAIRING_TEST_GUIDE.md)** - Tournament pairing system testing

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **[Tauri](https://tauri.app/)** - Cross-platform desktop app framework
- **[Material-UI](https://mui.com/)** - React component library  
- **[SQLite](https://sqlite.org/)** - Embedded database engine
- **[Rust](https://www.rust-lang.org/)** - Systems programming language
- **Chess Community** - For feedback and feature requirements

## Support & Community

- **GitHub Issues**: [Report bugs and request features](https://github.com/grok-rs/pawn/issues)
- **Discussions**: [Community discussions and support](https://github.com/grok-rs/pawn/discussions)
- **Demo**: Try the enhanced player management demo in the application

---

**Pawn - Professional Chess Tournament Management** 🏆  
*Built for tournament directors, by developers who understand chess*
