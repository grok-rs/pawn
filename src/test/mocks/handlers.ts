import { http, HttpResponse } from 'msw';

// Mock data factories
const createMockTournament = (overrides = {}) => ({
  id: 1,
  name: 'Test Tournament',
  description: 'A test tournament',
  status: 'draft',
  playerCount: 0,
  maxPlayers: 16,
  rounds: 0,
  maxRounds: 5,
  pairingMethod: 'swiss',
  timeControl: {
    mainTime: 90,
    increment: 30,
    type: 'fischer',
  },
  tiebreaks: ['buchholz', 'sonneborn_berger'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createMockPlayer = (overrides = {}) => ({
  id: 1,
  name: 'Test Player',
  rating: 1500,
  countryCode: 'US',
  title: '',
  birthDate: '1990-01-01',
  gender: 'M',
  fideId: null,
  email: 'test@example.com',
  phone: '+1234567890',
  address: '123 Test St',
  city: 'Test City',
  state: 'Test State',
  zipCode: '12345',
  emergencyContact: 'Emergency Contact',
  emergencyPhone: '+0987654321',
  medicalInfo: '',
  notes: '',
  isActive: true,
  pairingNumber: 1,
  ...overrides,
});

// Unused mock function (kept for reference)
// const createMockGameResult = (overrides = {}) => ({
//   id: 1,
//   tournamentId: 1,
//   roundNumber: 1,
//   whitePlayerId: 1,
//   blackPlayerId: 2,
//   result: 'white_wins',
//   resultType: 'normal',
//   boardNumber: 1,
//   isApproved: false,
//   approvedBy: null,
//   approvedAt: null,
//   notes: '',
//   createdAt: new Date().toISOString(),
//   updatedAt: new Date().toISOString(),
//   ...overrides,
// });

export const handlers = [
  // Mock Tauri commands
  http.post('/__tauri__/command', async ({ request }) => {
    const body = await request.json();
    const { cmd, payload } = body as { cmd: string; payload?: any };

    // Tournament management commands
    if (cmd === 'get_tournaments') {
      return HttpResponse.json([
        createMockTournament({
          id: 1,
          name: 'Spring Championship 2024',
          playerCount: 16,
        }),
        createMockTournament({
          id: 2,
          name: 'Summer Open',
          playerCount: 32,
          status: 'active',
        }),
        createMockTournament({
          id: 3,
          name: 'Club Championship',
          playerCount: 8,
          status: 'completed',
        }),
      ]);
    }

    if (cmd === 'create_tournament') {
      return HttpResponse.json(
        createMockTournament({
          id: Date.now(),
          name: payload.name,
          description: payload.description,
          maxPlayers: payload.maxPlayers,
          maxRounds: payload.maxRounds,
          pairingMethod: payload.pairingMethod,
          timeControl: payload.timeControl,
        })
      );
    }

    if (cmd === 'get_tournament') {
      return HttpResponse.json(
        createMockTournament({ id: payload.tournamentId })
      );
    }

    if (cmd === 'update_tournament_settings') {
      return HttpResponse.json({ success: true });
    }

    if (cmd === 'delete_tournament') {
      return HttpResponse.json({ success: true });
    }

    // Player management commands
    if (cmd === 'get_players_by_tournament_enhanced') {
      return HttpResponse.json([
        createMockPlayer({
          id: 1,
          name: 'Alice Johnson',
          rating: 1650,
          title: 'WFM',
        }),
        createMockPlayer({
          id: 2,
          name: 'Bob Smith',
          rating: 1480,
          countryCode: 'CA',
        }),
        createMockPlayer({
          id: 3,
          name: 'Carlos Martinez',
          rating: 1720,
          title: 'FM',
          countryCode: 'ES',
        }),
        createMockPlayer({
          id: 4,
          name: 'Diana Chen',
          rating: 1590,
          countryCode: 'CN',
        }),
      ]);
    }

    if (cmd === 'create_player_enhanced') {
      return HttpResponse.json(
        createMockPlayer({
          id: Date.now(),
          ...payload,
        })
      );
    }

    if (cmd === 'update_player') {
      return HttpResponse.json({ success: true });
    }

    if (cmd === 'delete_player') {
      return HttpResponse.json({ success: true });
    }

    if (cmd === 'search_players') {
      return HttpResponse.json([
        createMockPlayer({ id: 1, name: 'Matching Player 1' }),
        createMockPlayer({ id: 2, name: 'Matching Player 2' }),
      ]);
    }

    // Round and pairing commands
    if (cmd === 'get_rounds_by_tournament') {
      return HttpResponse.json([
        { id: 1, tournamentId: 1, roundNumber: 1, status: 'completed' },
        { id: 2, tournamentId: 1, roundNumber: 2, status: 'active' },
      ]);
    }

    if (cmd === 'generate_pairings') {
      return HttpResponse.json({
        success: true,
        pairings: [
          { whitePlayerId: 1, blackPlayerId: 2, boardNumber: 1 },
          { whitePlayerId: 3, blackPlayerId: 4, boardNumber: 2 },
        ],
      });
    }

    if (cmd === 'create_round') {
      return HttpResponse.json({
        id: Date.now(),
        roundNumber: payload.roundNumber,
      });
    }

    // Game result commands
    if (cmd === 'update_game_result') {
      return HttpResponse.json({ success: true });
    }

    if (cmd === 'batch_update_results') {
      return HttpResponse.json({
        success: true,
        updated: payload.results.length,
      });
    }

    if (cmd === 'approve_game_result') {
      return HttpResponse.json({ success: true });
    }

    // Standings and statistics
    if (cmd === 'get_tournament_standings') {
      return HttpResponse.json([
        { playerId: 1, rank: 1, points: 2.0, tiebreaks: [5.5, 4.0] },
        { playerId: 2, rank: 2, points: 1.5, tiebreaks: [4.5, 3.0] },
        { playerId: 3, rank: 3, points: 1.5, tiebreaks: [4.0, 2.5] },
        { playerId: 4, rank: 4, points: 1.0, tiebreaks: [3.5, 2.0] },
      ]);
    }

    if (cmd === 'get_player_statistics') {
      return HttpResponse.json({
        playerId: payload.playerId,
        wins: 3,
        losses: 2,
        draws: 1,
        winRate: 0.583,
        averageOpponentRating: 1580,
      });
    }

    // Export commands
    if (cmd === 'export_tournament_data') {
      return HttpResponse.json({
        success: true,
        filename: `tournament_${payload.tournamentId}_export.${payload.format}`,
        path: '/path/to/export/file',
      });
    }

    if (cmd === 'get_available_export_formats') {
      return HttpResponse.json(['json', 'csv', 'pdf', 'pgn']);
    }

    // Settings commands
    if (cmd === 'get_tournament_settings') {
      return HttpResponse.json({
        tiebreaks: ['buchholz', 'sonneborn_berger', 'direct_encounter'],
        pairingMethod: 'swiss',
        maxRounds: 7,
        timeControl: {
          mainTime: 90,
          increment: 30,
          type: 'fischer',
        },
      });
    }

    if (cmd === 'get_application_settings') {
      return HttpResponse.json({
        theme: 'light',
        language: 'en',
        notifications: true,
        autoSave: true,
      });
    }

    if (cmd === 'update_application_settings') {
      return HttpResponse.json({ success: true });
    }

    // Time control commands
    if (cmd === 'get_time_controls') {
      return HttpResponse.json([
        { id: 1, name: 'Rapid', mainTime: 15, increment: 10, type: 'fischer' },
        {
          id: 2,
          name: 'Classical',
          mainTime: 90,
          increment: 30,
          type: 'fischer',
        },
        { id: 3, name: 'Blitz', mainTime: 5, increment: 3, type: 'fischer' },
      ]);
    }

    if (cmd === 'create_time_control') {
      return HttpResponse.json({ id: Date.now(), ...payload });
    }

    // Team tournament commands
    if (cmd === 'get_teams_by_tournament') {
      return HttpResponse.json([
        { id: 1, name: 'Team Alpha', memberCount: 4 },
        { id: 2, name: 'Team Beta', memberCount: 4 },
      ]);
    }

    if (cmd === 'create_team') {
      return HttpResponse.json({ id: Date.now(), name: payload.name });
    }

    if (cmd === 'get_team_standings') {
      return HttpResponse.json([
        { teamId: 1, rank: 1, matchPoints: 6, gamePoints: 12 },
        { teamId: 2, rank: 2, matchPoints: 4, gamePoints: 10 },
      ]);
    }

    // Bulk operations
    if (cmd === 'bulk_import_players') {
      return HttpResponse.json({
        success: true,
        imported: payload.players.length,
        errors: [],
      });
    }

    if (cmd === 'validate_bulk_import') {
      return HttpResponse.json({
        valid: true,
        errors: [],
        warnings: [`Player "John Doe" has no rating`],
      });
    }

    // Mock data population (for testing)
    if (cmd === 'populate_mock_tournaments') {
      return HttpResponse.json({ created: 3 });
    }

    if (cmd === 'populate_mock_data') {
      return HttpResponse.json({
        tournaments: 3,
        players: 24,
        games: 48,
      });
    }

    // Error simulation for testing error handling
    if (cmd === 'simulate_error') {
      return HttpResponse.json(
        { error: 'Simulated error for testing' },
        { status: 500 }
      );
    }

    // Default response for unknown commands
    console.warn(`Unhandled Tauri command: ${cmd}`);
    return HttpResponse.json(
      { error: `Unknown command: ${cmd}` },
      { status: 400 }
    );
  }),

  // Mock any external API calls
  http.get('*/api/*', () => {
    return HttpResponse.json({ message: 'Mock external API response' });
  }),

  // Mock file operations
  http.post('*/files/*', () => {
    return HttpResponse.json({
      success: true,
      message: 'File operation successful',
    });
  }),
];
