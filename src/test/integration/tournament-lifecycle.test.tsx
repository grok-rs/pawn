import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithAllProviders } from '../utils/test-utils';
import App from '../../App';

// Type definitions for mock payloads
interface MockTournamentPayload {
  name: string;
  description: string;
  maxPlayers?: number;
  maxRounds?: number;
  pairingMethod?: string;
  timeControl?: object;
}

interface MockPlayerPayload {
  name: string;
  rating: number;
  email: string;
  tournamentId?: number;
}

interface MockTeamTournamentPayload {
  name: string;
  maxTeams: number;
  tournamentType: string;
}

interface MockTeamPayload {
  name: string;
  tournamentId?: number;
}

interface MockBulkImportPayload {
  players: unknown[];
  tournamentId?: number;
}

interface MockExportPayload {
  tournamentId: number;
  format: string;
}

type MockCommand =
  | 'get_tournaments'
  | 'create_tournament'
  | 'get_tournament'
  | 'get_players_by_tournament_enhanced'
  | 'create_player_enhanced'
  | 'get_rounds_by_tournament'
  | 'generate_pairings'
  | 'create_round'
  | 'update_game_result'
  | 'get_tournament_standings'
  | 'validate_bulk_import'
  | 'bulk_import_players'
  | 'get_teams_by_tournament'
  | 'create_team'
  | 'get_available_export_formats'
  | 'export_tournament_data'
  | string;

// Type guard functions to avoid type assertions
function isMockTournamentPayload(
  payload: unknown
): payload is MockTournamentPayload {
  return typeof payload === 'object' && payload !== null && 'name' in payload;
}

function isMockPlayerPayload(payload: unknown): payload is MockPlayerPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'name' in payload &&
    'rating' in payload
  );
}

function isMockBulkImportPayload(
  payload: unknown
): payload is MockBulkImportPayload {
  return (
    typeof payload === 'object' && payload !== null && 'players' in payload
  );
}

function isMockTeamTournamentPayload(
  payload: unknown
): payload is MockTeamTournamentPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'name' in payload &&
    'maxTeams' in payload &&
    'tournamentType' in payload
  );
}

function isMockTeamPayload(payload: unknown): payload is MockTeamPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'name' in payload &&
    !('maxTeams' in payload)
  );
}

function isMockExportPayload(payload: unknown): payload is MockExportPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'tournamentId' in payload &&
    'format' in payload
  );
}

// Mock Tauri API
const mockInvoke = vi.fn();
const mockListen = vi.fn(() => Promise.resolve(() => {}));

beforeAll(() => {
  Object.defineProperty(window, '__TAURI_INTERNALS__', {
    value: {
      invoke: mockInvoke,
      listen: mockListen,
    },
    configurable: true,
  });

  Object.defineProperty(window, '__TAURI__', {
    value: {
      core: {
        invoke: mockInvoke,
      },
      event: {
        listen: mockListen,
      },
    },
    configurable: true,
  });
});

describe('Tournament Lifecycle Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    mockInvoke.mockClear();
    mockListen.mockClear();

    // Default mock responses
    mockInvoke.mockImplementation(
      (command: MockCommand, _payload?: unknown) => {
        switch (command) {
          case 'get_tournaments':
            return Promise.resolve([]);
          case 'create_tournament': {
            if (isMockTournamentPayload(_payload)) {
              return Promise.resolve({
                id: 1,
                name: _payload.name,
                description: _payload.description,
                status: 'draft',
                playerCount: 0,
                maxPlayers: _payload.maxPlayers || 16,
                rounds: 0,
                maxRounds: _payload.maxRounds || 5,
                pairingMethod: _payload.pairingMethod || 'swiss',
                timeControl: _payload.timeControl,
                tiebreaks: ['buchholz', 'sonneborn_berger'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
            return Promise.resolve({});
          }
          case 'get_tournament':
            return Promise.resolve({
              id: 1,
              name: 'Test Tournament',
              status: 'draft',
              playerCount: 0,
              maxPlayers: 16,
            });
          case 'get_players_by_tournament_enhanced':
            return Promise.resolve([]);
          case 'create_player_enhanced': {
            if (isMockPlayerPayload(_payload)) {
              return Promise.resolve({
                id: Date.now(),
                name: _payload.name,
                rating: _payload.rating,
                email: _payload.email,
                isActive: true,
                pairingNumber: 1,
                tournamentId: _payload.tournamentId,
              });
            }
            return Promise.resolve({});
          }
          case 'get_rounds_by_tournament':
            return Promise.resolve([]);
          case 'generate_pairings':
            return Promise.resolve({
              success: true,
              pairings: [
                { whitePlayerId: 1, blackPlayerId: 2, boardNumber: 1 },
              ],
            });
          case 'create_round':
            return Promise.resolve({
              id: 1,
              tournamentId: 1,
              roundNumber: 1,
              status: 'active',
            });
          case 'update_game_result':
            return Promise.resolve({ success: true });
          case 'get_tournament_standings':
            return Promise.resolve([
              { playerId: 1, rank: 1, points: 1.0, tiebreaks: [2.0, 1.0] },
              { playerId: 2, rank: 2, points: 0.0, tiebreaks: [1.0, 0.0] },
            ]);
          default:
            return Promise.resolve(null);
        }
      }
    );
  });

  describe('Complete Tournament Workflow', () => {
    test('should handle complete tournament creation to game results workflow', async () => {
      renderWithAllProviders(<App />, { initialEntries: ['/'] });

      // Step 1: Create a new tournament
      const newTournamentButton = await screen.findByRole('button', {
        name: /new tournament|create tournament/i,
      });
      await user.click(newTournamentButton);

      // Fill tournament form
      const nameInput = await screen.findByLabelText(/tournament name/i);
      await user.type(nameInput, 'Integration Test Tournament');

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(
        descriptionInput,
        'A test tournament for integration testing'
      );

      const maxPlayersInput = screen.getByLabelText(/max players/i);
      await user.clear(maxPlayersInput);
      await user.type(maxPlayersInput, '8');

      const maxRoundsInput = screen.getByLabelText(/max rounds/i);
      await user.clear(maxRoundsInput);
      await user.type(maxRoundsInput, '3');

      // Submit tournament creation
      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      // Verify tournament creation API call
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('create_tournament', {
          name: 'Integration Test Tournament',
          description: 'A test tournament for integration testing',
          maxPlayers: 8,
          maxRounds: 3,
          pairingMethod: expect.any(String),
          timeControl: expect.any(Object),
        });
      });

      // Step 2: Navigate to tournament and add players
      // Mock tournament exists for navigation
      mockInvoke.mockImplementation(
        (command: MockCommand, _payload?: unknown) => {
          if (command === 'get_tournament') {
            return Promise.resolve({
              id: 1,
              name: 'Integration Test Tournament',
              status: 'draft',
              playerCount: 0,
              maxPlayers: 8,
            });
          }
          if (command === 'get_players_by_tournament_enhanced') {
            return Promise.resolve([]);
          }
          return Promise.resolve(null);
        }
      );

      // Navigate to tournament info page
      const tournamentLink = await screen.findByText(
        'Integration Test Tournament'
      );
      await user.click(tournamentLink);

      // Step 3: Add players to tournament
      const addPlayerButton = await screen.findByRole('button', {
        name: /add player/i,
      });
      await user.click(addPlayerButton);

      // Fill first player form
      const playerNameInput = await screen.findByLabelText(/name/i);
      await user.type(playerNameInput, 'Alice Johnson');

      const playerRatingInput = screen.getByLabelText(/rating/i);
      await user.type(playerRatingInput, '1650');

      const playerEmailInput = screen.getByLabelText(/email/i);
      await user.type(playerEmailInput, 'alice@example.com');

      // Submit first player
      const savePlayerButton = screen.getByRole('button', { name: /save/i });
      await user.click(savePlayerButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('create_player_enhanced', {
          name: 'Alice Johnson',
          rating: 1650,
          email: 'alice@example.com',
          tournamentId: 1,
        });
      });

      // Add second player
      await user.click(addPlayerButton);

      const secondPlayerName = await screen.findByLabelText(/name/i);
      await user.type(secondPlayerName, 'Bob Smith');

      const secondPlayerRating = screen.getByLabelText(/rating/i);
      await user.type(secondPlayerRating, '1480');

      const secondPlayerEmail = screen.getByLabelText(/email/i);
      await user.type(secondPlayerEmail, 'bob@example.com');

      await user.click(savePlayerButton);

      // Step 4: Generate pairings for round 1
      mockInvoke.mockImplementation(
        (command: MockCommand, _payload?: unknown) => {
          if (command === 'get_players_by_tournament_enhanced') {
            return Promise.resolve([
              {
                id: 1,
                name: 'Alice Johnson',
                rating: 1650,
                email: 'alice@example.com',
                isActive: true,
              },
              {
                id: 2,
                name: 'Bob Smith',
                rating: 1480,
                email: 'bob@example.com',
                isActive: true,
              },
            ]);
          }
          if (command === 'get_rounds_by_tournament') {
            return Promise.resolve([]);
          }
          if (command === 'generate_pairings') {
            return Promise.resolve({
              success: true,
              pairings: [
                { whitePlayerId: 1, blackPlayerId: 2, boardNumber: 1 },
              ],
            });
          }
          if (command === 'create_round') {
            return Promise.resolve({
              id: 1,
              tournamentId: 1,
              roundNumber: 1,
              status: 'active',
            });
          }
          return Promise.resolve(null);
        }
      );

      const pairingsTab = await screen.findByRole('tab', { name: /pairings/i });
      await user.click(pairingsTab);

      const generatePairingsButton = await screen.findByRole('button', {
        name: /generate pairings/i,
      });
      await user.click(generatePairingsButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('generate_pairings', {
          tournamentId: 1,
          roundNumber: 1,
        });
      });

      // Step 5: Enter game results
      mockInvoke.mockImplementation(
        (command: MockCommand, _payload?: unknown) => {
          if (command === 'get_rounds_by_tournament') {
            return Promise.resolve([
              {
                id: 1,
                tournamentId: 1,
                roundNumber: 1,
                status: 'active',
                pairings: [
                  {
                    id: 1,
                    whitePlayerId: 1,
                    blackPlayerId: 2,
                    boardNumber: 1,
                    result: null,
                  },
                ],
              },
            ]);
          }
          if (command === 'update_game_result') {
            return Promise.resolve({ success: true });
          }
          return Promise.resolve(null);
        }
      );

      const resultsTab = await screen.findByRole('tab', { name: /results/i });
      await user.click(resultsTab);

      // Find the game result input
      const resultSelect = await screen.findByRole('combobox', {
        name: /result/i,
      });
      await user.click(resultSelect);

      const whiteWinsOption = await screen.findByRole('option', {
        name: /white wins/i,
      });
      await user.click(whiteWinsOption);

      const submitResultButton = screen.getByRole('button', {
        name: /submit result/i,
      });
      await user.click(submitResultButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('update_game_result', {
          gameId: expect.any(Number),
          result: 'white_wins',
          resultType: 'normal',
        });
      });

      // Step 6: View standings
      mockInvoke.mockImplementation(
        (command: MockCommand, _payload?: unknown) => {
          if (command === 'get_tournament_standings') {
            return Promise.resolve([
              {
                playerId: 1,
                playerName: 'Alice Johnson',
                rank: 1,
                points: 1.0,
                tiebreaks: [2.0, 1.0],
              },
              {
                playerId: 2,
                playerName: 'Bob Smith',
                rank: 2,
                points: 0.0,
                tiebreaks: [1.0, 0.0],
              },
            ]);
          }
          return Promise.resolve(null);
        }
      );

      const standingsTab = await screen.findByRole('tab', {
        name: /standings/i,
      });
      await user.click(standingsTab);

      // Verify standings are displayed
      await screen.findByText('Alice Johnson');
      await screen.findByText('Bob Smith');
      await screen.findByText('1.0'); // Alice's points
      await screen.findByText('0.0'); // Bob's points

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('get_tournament_standings', {
          tournamentId: 1,
        });
      });
    });

    test('should handle error scenarios gracefully during workflow', async () => {
      renderWithAllProviders(<App />, { initialEntries: ['/'] });

      // Mock API error for tournament creation
      mockInvoke.mockImplementation(
        (command: MockCommand, _payload?: unknown) => {
          if (command === 'create_tournament') {
            return Promise.reject(new Error('Database connection failed'));
          }
          return Promise.resolve([]);
        }
      );

      const newTournamentButton = await screen.findByRole('button', {
        name: /new tournament|create tournament/i,
      });
      await user.click(newTournamentButton);

      const nameInput = await screen.findByLabelText(/tournament name/i);
      await user.type(nameInput, 'Error Test Tournament');

      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      // Verify error handling
      await screen.findByText(/database connection failed/i);
      expect(mockInvoke).toHaveBeenCalledWith(
        'create_tournament',
        expect.any(Object)
      );
    });

    test('should handle bulk player import workflow', async () => {
      renderWithAllProviders(<App />, { initialEntries: ['/tournament/1'] });

      mockInvoke.mockImplementation(
        (command: MockCommand, _payload?: unknown) => {
          if (command === 'get_tournament') {
            return Promise.resolve({
              id: 1,
              name: 'Bulk Import Tournament',
              status: 'draft',
              playerCount: 0,
              maxPlayers: 50,
            });
          }
          if (command === 'validate_bulk_import') {
            return Promise.resolve({
              valid: true,
              errors: [],
              warnings: ['Player "John Doe" has no rating'],
            });
          }
          if (command === 'bulk_import_players') {
            if (isMockBulkImportPayload(_payload)) {
              return Promise.resolve({
                success: true,
                imported: _payload.players.length,
                errors: [],
              });
            }
            return Promise.resolve({ success: false, imported: 0, errors: [] });
          }
          return Promise.resolve([]);
        }
      );

      const playersTab = await screen.findByRole('tab', { name: /players/i });
      await user.click(playersTab);

      const importButton = await screen.findByRole('button', {
        name: /import players/i,
      });
      await user.click(importButton);

      // Mock file input with CSV data
      const csvData = `Name,Rating,Email
Alice Johnson,1650,alice@example.com
Bob Smith,1480,bob@example.com
Charlie Brown,1520,charlie@example.com`;

      const fileInput = screen.getByLabelText(/upload file/i);
      const file = new File([csvData], 'players.csv', { type: 'text/csv' });
      await user.upload(fileInput, file);

      const validateButton = screen.getByRole('button', { name: /validate/i });
      await user.click(validateButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('validate_bulk_import', {
          data: csvData,
          format: 'csv',
        });
      });

      // Check validation results
      await screen.findByText(/Player "John Doe" has no rating/);

      const importConfirmButton = screen.getByRole('button', {
        name: /import/i,
      });
      await user.click(importConfirmButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('bulk_import_players', {
          tournamentId: 1,
          players: expect.any(Array),
        });
      });

      await screen.findByText(/3 players imported successfully/);
    });
  });

  describe('Team Tournament Integration', () => {
    test('should handle team tournament creation and management', async () => {
      renderWithAllProviders(<App />, { initialEntries: ['/'] });

      mockInvoke.mockImplementation(
        (command: MockCommand, _payload?: unknown) => {
          if (command === 'create_tournament') {
            if (isMockTeamTournamentPayload(_payload)) {
              return Promise.resolve({
                id: 2,
                name: _payload.name,
                tournamentType: _payload.tournamentType,
                status: 'draft',
                teamCount: 0,
                maxTeams: _payload.maxTeams,
              });
            }
            return Promise.resolve({});
          }
          if (command === 'get_teams_by_tournament') {
            return Promise.resolve([]);
          }
          if (command === 'create_team') {
            if (isMockTeamPayload(_payload)) {
              return Promise.resolve({
                id: Date.now(),
                tournament_id: _payload.tournamentId || 2,
                name: _payload.name,
                captain: null,
                description: null,
                color: null,
                club_affiliation: null,
                contact_email: null,
                contact_phone: null,
                max_board_count: 4,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: null,
              });
            }
            return Promise.resolve({});
          }
          return Promise.resolve([]);
        }
      );

      const newTournamentButton = await screen.findByRole('button', {
        name: /new tournament/i,
      });
      await user.click(newTournamentButton);

      const nameInput = await screen.findByLabelText(/tournament name/i);
      await user.type(nameInput, 'Team Championship');

      const typeSelect = screen.getByLabelText(/tournament type/i);
      await user.click(typeSelect);

      const teamOption = await screen.findByRole('option', { name: /team/i });
      await user.click(teamOption);

      const maxTeamsInput = screen.getByLabelText(/max teams/i);
      await user.type(maxTeamsInput, '8');

      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('create_tournament', {
          name: 'Team Championship',
          tournamentType: 'team',
          maxTeams: 8,
        });
      });

      // Navigate to team management
      const tournamentLink = await screen.findByText('Team Championship');
      await user.click(tournamentLink);

      const teamsTab = await screen.findByRole('tab', { name: /teams/i });
      await user.click(teamsTab);

      const addTeamButton = await screen.findByRole('button', {
        name: /add team/i,
      });
      await user.click(addTeamButton);

      const teamNameInput = await screen.findByLabelText(/team name/i);
      await user.type(teamNameInput, 'Team Alpha');

      const saveTeamButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveTeamButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('create_team', {
          tournamentId: 2,
          name: 'Team Alpha',
        });
      });
    });
  });

  describe('Export and Reporting Integration', () => {
    test('should handle tournament data export workflow', async () => {
      renderWithAllProviders(<App />, { initialEntries: ['/tournament/1'] });

      mockInvoke.mockImplementation(
        (command: MockCommand, _payload?: unknown) => {
          if (command === 'get_tournament') {
            return Promise.resolve({
              id: 1,
              name: 'Export Test Tournament',
              status: 'completed',
              playerCount: 16,
            });
          }
          if (command === 'get_available_export_formats') {
            return Promise.resolve(['json', 'csv', 'pdf', 'pgn']);
          }
          if (command === 'export_tournament_data') {
            if (isMockExportPayload(_payload)) {
              return Promise.resolve({
                success: true,
                filename: `tournament_${_payload.tournamentId}_export.${_payload.format}`,
                path: '/path/to/export/file',
              });
            }
            return Promise.resolve({ success: false, filename: '', path: '' });
          }
          return Promise.resolve([]);
        }
      );

      const exportButton = await screen.findByRole('button', {
        name: /export/i,
      });
      await user.click(exportButton);

      const formatSelect = await screen.findByLabelText(/export format/i);
      await user.click(formatSelect);

      const pdfOption = await screen.findByRole('option', { name: /pdf/i });
      await user.click(pdfOption);

      const exportConfirmButton = screen.getByRole('button', {
        name: /export tournament/i,
      });
      await user.click(exportConfirmButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('export_tournament_data', {
          tournamentId: 1,
          format: 'pdf',
          includeStandings: true,
          includePairings: true,
          includeResults: true,
        });
      });

      await screen.findByText(/tournament exported successfully/i);
    });
  });
});
