# Pawn - Chess Tournament Manager

A modern desktop application for managing chess tournaments, built with Tauri, React, and Rust.

## Overview

Pawn is a comprehensive chess tournament management system designed to streamline the organization and administration of chess competitions. Whether you're running a small club tournament or a large-scale championship, Pawn provides all the tools you need to manage players, pairings, results, and standings.

## Features

### Tournament Management
- **Multiple Tournament Types**: Support for Swiss system and Round-robin tournaments
- **Flexible Configuration**: Customizable time controls, number of rounds, and tournament rules
- **Real-time Updates**: Live standings and pairing calculations
- **Tournament Status Tracking**: Manage tournaments from planning through completion

### Player Management
- **Player Database**: Maintain a comprehensive database of players with ratings
- **Registration System**: Easy player registration and management
- **Country Support**: Track player nationalities with flag display
- **Rating Integration**: Support for various rating systems

### Game Tracking
- **Result Recording**: Simple interface for recording game results
- **Game History**: Complete game-by-game tournament history
- **Pairing Generation**: Automatic pairing generation based on tournament rules
- **Result Types**: Support for all standard chess results (1-0, 0-1, 1/2-1/2, *)

### User Interface
- **Modern Design**: Clean, intuitive interface built with Material-UI
- **Multi-language Support**: Available in English, Russian, and Ukrainian
- **Dark Mode**: (Coming soon) Support for light and dark themes
- **Responsive Layout**: Optimized for various screen sizes

### Technical Features
- **Cross-platform**: Runs on Windows, macOS, and Linux
- **Offline-first**: All data stored locally with SQLite
- **Type Safety**: Full TypeScript support with auto-generated bindings
- **Performance**: Native performance with Rust backend
- **Data Export**: Export tournament data in various formats

## Installation

### Prerequisites
- Node.js (v18 or higher)
- Rust (latest stable)
- Yarn package manager

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pawn.git
cd pawn
```

2. Install dependencies:
```bash
yarn install
```

3. Run the development server:
```bash
yarn tauri dev
```

### Building for Production

To create a production build:

```bash
yarn tauri build
```

This will create platform-specific installers in the `src-tauri/target/release/bundle/` directory.

## Usage

### Creating a Tournament

1. Click "New Tournament" on the main screen
2. Fill in tournament details:
   - Tournament name and description
   - Location and dates
   - Tournament type (Swiss/Round-robin)
   - Time control settings
   - Number of rounds
3. Configure tournament rules and tiebreak criteria
4. Save the tournament

### Managing Players

1. Navigate to the tournament
2. Add players through the registration interface
3. Import players from external sources (coming soon)
4. Manage player withdrawals and late entries

### Recording Results

1. Open the active tournament
2. Navigate to the current round
3. Enter game results as they complete
4. View updated standings in real-time

## Development

### Project Structure

```
pawn/
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page components
│   ├── dto/               # TypeScript type definitions
│   └── locales/           # Translation files
├── src-tauri/             # Rust backend
│   ├── src/
│   │   └── pawn/         # Core business logic
│   │       ├── command/  # Tauri command handlers
│   │       ├── service/  # Business logic layer
│   │       ├── domain/   # Data models
│   │       └── db/       # Database layer
│   └── migrations/        # Database migrations
└── public/                # Static assets
```

### Key Technologies

- **Frontend**: React, TypeScript, Material-UI, Vite
- **Backend**: Rust, Tauri, SQLite, SQLx
- **State Management**: Redux Toolkit
- **Internationalization**: react-i18next
- **Form Handling**: react-hook-form with Yup validation

### Commands

- `yarn dev` - Start frontend development server
- `yarn tauri dev` - Start full application in development mode
- `yarn build` - Build frontend
- `yarn tauri build` - Build complete application
- `yarn lint` - Run linting
- `yarn typecheck` - Run TypeScript type checking

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Roadmap

- [ ] Player import/export functionality
- [ ] Tournament report generation
- [ ] Online backup and sync
- [ ] Mobile companion app
- [ ] Integration with chess servers
- [ ] Advanced statistics and analytics
- [ ] Team tournament support

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Tauri](https://tauri.app/)
- UI components from [Material-UI](https://mui.com/)
- Icons from [Tabler Icons](https://tabler-icons.io/)

## Support

For support, please open an issue on GitHub or contact the maintainers.
