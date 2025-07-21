import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ResultsGrid } from '../ResultsGrid';
import type { GameResult } from '@dto/bindings';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock MUI components
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: vi.fn(() => false), // Desktop by default
    useTheme: vi.fn(() => ({
      palette: {
        mode: 'light',
        primary: { main: '#1976d2' },
      },
      breakpoints: {
        down: vi.fn(() => false),
      },
    })),
  };
});

// Mock commands
const mockCommands = {
  validateGameResult: vi.fn(),
  batchUpdateResults: vi.fn(),
  updateGameResult: vi.fn(),
  getGameAuditTrail: vi.fn(),
};

vi.mock('@dto/bindings', () => ({
  commands: mockCommands,
}));

// Mock sub-components
vi.mock('../MobileResultEntry', () => ({
  MobileResultEntry: ({
    games,
    onResultChange,
    readOnly,
  }: {
    games: GameResult[];
    onResultChange: (gameId: number, result: string) => void;
    readOnly?: boolean;
  }) => (
    <div data-testid="mobile-result-entry">
      {games.map(game => (
        <div key={game.id} data-testid={`mobile-game-${game.id}`}>
          <button
            onClick={() => onResultChange(game.id, '1-0')}
            disabled={readOnly}
            data-testid={`mobile-result-${game.id}`}
          >
            {game.result || 'Set Result'}
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../CsvImportDialog', () => ({
  CsvImportDialog: ({
    open,
    onClose,
    onImport,
  }: {
    open: boolean;
    onClose: () => void;
    onImport: (data: unknown) => void;
  }) =>
    open ? (
      <div data-testid="csv-import-dialog">
        <button onClick={onClose} data-testid="close-csv-dialog">
          Close
        </button>
        <button
          onClick={() => onImport({ test: 'data' })}
          data-testid="import-csv-data"
        >
          Import
        </button>
      </div>
    ) : null,
}));

// Mock game data
const createMockGame = (
  id: number,
  overrides: Partial<GameResult> = {}
): GameResult => ({
  id,
  tournament_id: 1,
  round_number: 1,
  white_player_id: id * 2 - 1,
  black_player_id: id * 2,
  white_player_name: `White Player ${id}`,
  black_player_name: `Black Player ${id}`,
  result: null,
  result_type: null,
  result_reason: null,
  arbiter_notes: null,
  board_number: id,
  game_status: 'scheduled',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('ResultsGrid', () => {
  const mockOnResultsUpdated = vi.fn();
  const mockGames = [
    createMockGame(1, { result: '1-0' }),
    createMockGame(2, { result: null }),
    createMockGame(3, { result: '1/2-1/2' }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockCommands.validateGameResult.mockResolvedValue({
      is_valid: true,
      errors: [],
      warnings: [],
    });
    mockCommands.batchUpdateResults.mockResolvedValue({
      success: true,
      results: [],
    });
  });

  describe('Initial Rendering', () => {
    test('renders table with game data', () => {
      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('White Player 1')).toBeInTheDocument();
      expect(screen.getByText('Black Player 1')).toBeInTheDocument();
      expect(screen.getByText('White Player 2')).toBeInTheDocument();
      expect(screen.getByText('Black Player 2')).toBeInTheDocument();
    });

    test('shows existing results in the table', () => {
      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      // First game has result '1-0', third game has '1/2-1/2'
      expect(screen.getByDisplayValue('1-0')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1/2-1/2')).toBeInTheDocument();
    });

    test('displays board numbers correctly', () => {
      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument(); // Board 1
      expect(screen.getByText('2')).toBeInTheDocument(); // Board 2
      expect(screen.getByText('3')).toBeInTheDocument(); // Board 3
    });

    test('renders action buttons when not read-only', () => {
      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      expect(
        screen.getByText('gameResults.actions.saveAll')
      ).toBeInTheDocument();
      expect(
        screen.getByText('gameResults.actions.batchValidate')
      ).toBeInTheDocument();
    });

    test('hides action buttons when read-only', () => {
      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
          readOnly={true}
        />
      );

      expect(
        screen.queryByText('gameResults.actions.saveAll')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('gameResults.actions.batchValidate')
      ).not.toBeInTheDocument();
    });
  });

  describe('Result Selection', () => {
    test('allows selecting results from dropdown', async () => {
      const user = userEvent.setup();
      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      // Find the first result select (game without result)
      const resultSelects = screen.getAllByRole('combobox');
      const secondGameSelect = resultSelects[1]; // Second game has no result

      await user.click(secondGameSelect);

      // Should open dropdown with result options
      await waitFor(() => {
        expect(
          screen.getByText('gameResults.results.whiteWins')
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText('gameResults.results.whiteWins'));

      // Should validate result automatically
      await waitFor(() => {
        expect(mockCommands.validateGameResult).toHaveBeenCalledWith({
          game_id: 2,
          result: '1-0',
          result_type: null,
          tournament_id: 1,
          changed_by: 'current_user',
        });
      });
    });

    test('shows different result options', async () => {
      const user = userEvent.setup();
      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      const resultSelects = screen.getAllByRole('combobox');
      await user.click(resultSelects[1]);

      await waitFor(() => {
        expect(
          screen.getByText('gameResults.results.whiteWins')
        ).toBeInTheDocument();
        expect(
          screen.getByText('gameResults.results.blackWins')
        ).toBeInTheDocument();
        expect(
          screen.getByText('gameResults.results.draw')
        ).toBeInTheDocument();
        expect(
          screen.getByText('gameResults.results.ongoing')
        ).toBeInTheDocument();
      });
    });

    test('disables result selection when read-only', () => {
      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
          readOnly={true}
        />
      );

      const resultSelects = screen.getAllByRole('combobox');
      resultSelects.forEach(select => {
        expect(select).toBeDisabled();
      });
    });
  });

  describe('Batch Operations', () => {
    test('validates all modified results', async () => {
      const user = userEvent.setup();
      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      // Modify a result first
      const resultSelects = screen.getAllByRole('combobox');
      await user.click(resultSelects[1]);

      await waitFor(() => {
        expect(
          screen.getByText('gameResults.results.draw')
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText('gameResults.results.draw'));

      // Click batch validate
      const batchValidateButton = screen.getByText(
        'gameResults.actions.batchValidate'
      );
      await user.click(batchValidateButton);

      await waitFor(() => {
        expect(mockCommands.batchUpdateResults).toHaveBeenCalledWith({
          tournament_id: 1,
          updates: expect.arrayContaining([
            expect.objectContaining({
              game_id: 2,
              result: '1/2-1/2',
              changed_by: 'current_user',
            }),
          ]),
          validate_only: true,
        });
      });
    });

    test('saves all modified results', async () => {
      const user = userEvent.setup();
      mockCommands.batchUpdateResults.mockResolvedValue({
        success: true,
        results: [],
      });

      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      // Modify a result
      const resultSelects = screen.getAllByRole('combobox');
      await user.click(resultSelects[1]);

      await waitFor(() => {
        expect(
          screen.getByText('gameResults.results.blackWins')
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText('gameResults.results.blackWins'));

      // Click save all
      const saveAllButton = screen.getByText('gameResults.actions.saveAll');
      await user.click(saveAllButton);

      await waitFor(() => {
        expect(mockCommands.batchUpdateResults).toHaveBeenCalledWith({
          tournament_id: 1,
          updates: expect.arrayContaining([
            expect.objectContaining({
              game_id: 2,
              result: '0-1',
              changed_by: 'current_user',
            }),
          ]),
          validate_only: false,
        });
      });

      expect(mockOnResultsUpdated).toHaveBeenCalled();
    });

    test('handles save errors gracefully', async () => {
      const user = userEvent.setup();
      mockCommands.batchUpdateResults.mockRejectedValue(
        new Error('Save failed')
      );

      // Spy on console.error
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      // Modify and try to save
      const resultSelects = screen.getAllByRole('combobox');
      await user.click(resultSelects[1]);

      await waitFor(() => {
        expect(
          screen.getByText('gameResults.results.draw')
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText('gameResults.results.draw'));

      const saveAllButton = screen.getByText('gameResults.actions.saveAll');
      await user.click(saveAllButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to save results:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Mobile/Desktop View', () => {
    test('renders mobile view when screen is small', () => {
      // Mock useMediaQuery to return true for mobile
      vi.mocked(vi.importActual('@mui/material')).useMediaQuery.mockReturnValue(
        true
      );

      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      expect(screen.getByTestId('mobile-result-entry')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    test('mobile view handles result changes', async () => {
      vi.mocked(vi.importActual('@mui/material')).useMediaQuery.mockReturnValue(
        true
      );

      const user = userEvent.setup();
      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      const resultButton = screen.getByTestId('mobile-result-2');
      await user.click(resultButton);

      await waitFor(() => {
        expect(mockCommands.validateGameResult).toHaveBeenCalledWith({
          game_id: 2,
          result: '1-0',
          result_type: null,
          tournament_id: 1,
          changed_by: 'current_user',
        });
      });
    });

    test('mobile view respects read-only mode', () => {
      vi.mocked(vi.importActual('@mui/material')).useMediaQuery.mockReturnValue(
        true
      );

      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
          readOnly={true}
        />
      );

      const resultButtons = screen.getAllByTestId(/mobile-result-\d+/);
      resultButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('CSV Import', () => {
    test('opens CSV import dialog', async () => {
      const user = userEvent.setup();
      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      // Look for CSV import button (likely has upload icon)
      const importButton = screen.getByText('gameResults.actions.importCsv');
      await user.click(importButton);

      expect(screen.getByTestId('csv-import-dialog')).toBeInTheDocument();
    });

    test('closes CSV import dialog', async () => {
      const user = userEvent.setup();
      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      const importButton = screen.getByText('gameResults.actions.importCsv');
      await user.click(importButton);

      const closeButton = screen.getByTestId('close-csv-dialog');
      await user.click(closeButton);

      expect(screen.queryByTestId('csv-import-dialog')).not.toBeInTheDocument();
    });

    test('handles CSV import data', async () => {
      const user = userEvent.setup();
      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      const importButton = screen.getByText('gameResults.actions.importCsv');
      await user.click(importButton);

      const importDataButton = screen.getByTestId('import-csv-data');
      await user.click(importDataButton);

      // Dialog should close after import
      expect(screen.queryByTestId('csv-import-dialog')).not.toBeInTheDocument();
    });
  });

  describe('Result Validation', () => {
    test('validates results automatically on change', async () => {
      const user = userEvent.setup();
      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      const resultSelects = screen.getAllByRole('combobox');
      await user.click(resultSelects[1]);

      await waitFor(() => {
        expect(
          screen.getByText('gameResults.results.whiteWins')
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText('gameResults.results.whiteWins'));

      await waitFor(() => {
        expect(mockCommands.validateGameResult).toHaveBeenCalledWith({
          game_id: 2,
          result: '1-0',
          result_type: null,
          tournament_id: 1,
          changed_by: 'current_user',
        });
      });
    });

    test('handles validation errors gracefully', async () => {
      const user = userEvent.setup();
      mockCommands.validateGameResult.mockRejectedValue(
        new Error('Validation failed')
      );

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      const resultSelects = screen.getAllByRole('combobox');
      await user.click(resultSelects[1]);

      await waitFor(() => {
        expect(
          screen.getByText('gameResults.results.draw')
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText('gameResults.results.draw'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to validate result:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    test('does not validate ongoing games', async () => {
      const user = userEvent.setup();
      render(
        <ResultsGrid
          tournamentId={1}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      const resultSelects = screen.getAllByRole('combobox');
      await user.click(resultSelects[1]);

      await waitFor(() => {
        expect(
          screen.getByText('gameResults.results.ongoing')
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText('gameResults.results.ongoing'));

      // Should not call validation for ongoing games (result = '*')
      await waitFor(() => {
        expect(mockCommands.validateGameResult).not.toHaveBeenCalled();
      });
    });
  });

  describe('Component Props and State Management', () => {
    test('handles roundNumber prop', () => {
      render(
        <ResultsGrid
          tournamentId={1}
          roundNumber={3}
          games={mockGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      // Component should render without issues
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    test('handles empty games array', () => {
      render(
        <ResultsGrid
          tournamentId={1}
          games={[]}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      // Should show table headers but no game rows
    });

    test('handles missing onResultsUpdated callback', () => {
      render(<ResultsGrid tournamentId={1} games={mockGames} />);

      // Component should render without crashing
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Error Boundaries and Edge Cases', () => {
    test('handles games with missing player names', () => {
      const gamesWithMissingNames = [
        createMockGame(1, {
          white_player_name: null as unknown as string,
          black_player_name: null as unknown as string,
        }),
      ];

      render(
        <ResultsGrid
          tournamentId={1}
          games={gamesWithMissingNames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    test('handles games with invalid IDs', () => {
      const gamesWithInvalidIds = [
        createMockGame(0, { id: 0 }),
        createMockGame(-1, { id: -1 }),
      ];

      render(
        <ResultsGrid
          tournamentId={1}
          games={gamesWithInvalidIds}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    test('handles large number of games', () => {
      const manyGames = Array.from({ length: 100 }, (_, i) =>
        createMockGame(i + 1)
      );

      render(
        <ResultsGrid
          tournamentId={1}
          games={manyGames}
          onResultsUpdated={mockOnResultsUpdated}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      // Should render all games
      expect(screen.getByText('White Player 1')).toBeInTheDocument();
      expect(screen.getByText('White Player 100')).toBeInTheDocument();
    });
  });
});
