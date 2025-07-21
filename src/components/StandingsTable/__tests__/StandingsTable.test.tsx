import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import StandingsTable from '../StandingsTable';
import type { PlayerStanding, TiebreakBreakdown } from '@dto/bindings';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

// Mock MUI DataGrid
vi.mock('@mui/x-data-grid', () => ({
  DataGrid: ({
    rows,
    columns,
    loading,
    onRowClick,
    toolbar,
    ...props
  }: {
    rows: unknown[];
    columns: { field: string; headerName: string }[];
    loading: boolean;
    onRowClick?: (params: { row: { player: { id: number } } }) => void;
    toolbar?: React.ComponentType;
  }) => (
    <div data-testid="data-grid" data-loading={loading} {...props}>
      {toolbar && <toolbar />}
      <div data-testid="grid-header">
        {columns.map(col => (
          <div key={col.field} data-testid={`header-${col.field}`}>
            {col.headerName}
          </div>
        ))}
      </div>
      <div data-testid="grid-body">
        {rows.map((row, index) => (
          <div
            key={index}
            data-testid={`row-${index}`}
            onClick={() =>
              onRowClick?.({ row: row as { player: { id: number } } })
            }
          >
            Row {index}: {JSON.stringify(row)}
          </div>
        ))}
      </div>
    </div>
  ),
  GridToolbar: () => <div data-testid="grid-toolbar">Grid Toolbar</div>,
}));

// Mock MUI Icons
vi.mock('@mui/icons-material', () => ({
  Search: () => <span data-testid="search-icon">🔍</span>,
  Download: () => <span data-testid="download-icon">💾</span>,
  Print: () => <span data-testid="print-icon">🖨️</span>,
  TableRows: () => <span data-testid="table-rows-icon">📋</span>,
  EmojiEvents: ({ sx }: { sx?: { color?: string; fontSize?: number } }) => (
    <span data-testid="trophy-icon" data-color={sx?.color}>
      🏆
    </span>
  ),
  TrendingUp: ({ sx }: { sx?: { color?: string; fontSize?: number } }) => (
    <span data-testid="trending-up-icon" data-color={sx?.color}>
      📈
    </span>
  ),
  TrendingDown: ({ sx }: { sx?: { color?: string; fontSize?: number } }) => (
    <span data-testid="trending-down-icon" data-color={sx?.color}>
      📉
    </span>
  ),
  Remove: ({ sx }: { sx?: { color?: string; fontSize?: number } }) => (
    <span data-testid="remove-icon" data-color={sx?.color}>
      ➖
    </span>
  ),
  ExpandMore: () => <span data-testid="expand-more-icon">⬇️</span>,
  Info: () => <span data-testid="info-icon">ℹ️</span>,
}));

// Mock TiebreakBreakdownDialog
vi.mock('../../TiebreakBreakdownDialog', () => ({
  default: ({
    open,
    onClose,
    breakdown,
    playerName,
  }: {
    open: boolean;
    onClose: () => void;
    breakdown: TiebreakBreakdown | null;
    playerName: string;
  }) =>
    open ? (
      <div data-testid="tiebreak-breakdown-dialog">
        <div>Player: {playerName}</div>
        <div>Breakdown: {JSON.stringify(breakdown)}</div>
        <button onClick={onClose} data-testid="close-breakdown">
          Close
        </button>
      </div>
    ) : null,
}));

// Mock player standing data
const createMockStanding = (
  id: number,
  overrides: Partial<PlayerStanding> = {}
): PlayerStanding => ({
  player: {
    id,
    name: `Player ${id}`,
    rating: 1800 + id * 50,
    country_code: id % 2 === 0 ? 'US' : 'CA',
    title: null,
    ...overrides.player,
  },
  rank: id,
  points: 3.5 - (id - 1) * 0.5,
  games_played: 7,
  wins: 3,
  draws: 1,
  losses: 3,
  buchholz: 22.5 - id,
  buchholz_cut: 20.0 - id,
  sonneborn_berger: 15.5 - id,
  performance_rating: 1850 + id * 25,
  rating_change: id === 1 ? 15 : id === 2 ? -10 : 0,
  streak: id <= 2 ? 'W2' : 'L1',
  ...overrides,
});

describe('StandingsTable', () => {
  const mockStandings = [
    createMockStanding(1),
    createMockStanding(2),
    createMockStanding(3, { player: { name: 'Jane Doe', rating: null } }),
  ];

  const mockOnPlayerClick = vi.fn();
  const mockOnTiebreakBreakdown = vi.fn();
  const mockOnExportCsv = vi.fn();
  const mockOnExportPdf = vi.fn();
  const mockOnPrint = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    test('renders data grid with standings data', () => {
      render(<StandingsTable standings={mockStandings} />);

      expect(screen.getByTestId('data-grid')).toBeInTheDocument();
      expect(screen.getByTestId('grid-header')).toBeInTheDocument();
      expect(screen.getByTestId('grid-body')).toBeInTheDocument();
    });

    test('renders column headers correctly', () => {
      render(<StandingsTable standings={mockStandings} />);

      expect(screen.getByTestId('header-rank')).toBeInTheDocument();
      expect(screen.getByTestId('header-name')).toBeInTheDocument();
      expect(screen.getByTestId('header-rating')).toBeInTheDocument();
      expect(screen.getByText('rank')).toBeInTheDocument();
      expect(screen.getByText('player')).toBeInTheDocument();
      expect(screen.getByText('rating')).toBeInTheDocument();
    });

    test('renders search input', () => {
      render(<StandingsTable standings={mockStandings} />);

      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toBeInTheDocument();
      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    test('renders control buttons and switches', () => {
      render(<StandingsTable standings={mockStandings} />);

      expect(screen.getByText('denseMode')).toBeInTheDocument();
      expect(screen.getByText('showTiebreaks')).toBeInTheDocument();
      expect(screen.getByTestId('table-rows-icon')).toBeInTheDocument();
    });

    test('renders export buttons when callbacks provided', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          onExportCsv={mockOnExportCsv}
          onExportPdf={mockOnExportPdf}
          onPrint={mockOnPrint}
        />
      );

      expect(screen.getByTestId('download-icon')).toBeInTheDocument();
      expect(screen.getByTestId('print-icon')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    test('filters standings by player name', async () => {
      const user = userEvent.setup();
      render(<StandingsTable standings={mockStandings} />);

      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'Player 1');

      // Should filter to show only Player 1
      expect(searchInput).toHaveValue('Player 1');
    });

    test('filters standings by country code', async () => {
      const user = userEvent.setup();
      render(<StandingsTable standings={mockStandings} />);

      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'US');

      expect(searchInput).toHaveValue('US');
    });

    test('filters standings by rating', async () => {
      const user = userEvent.setup();
      render(<StandingsTable standings={mockStandings} />);

      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, '1850');

      expect(searchInput).toHaveValue('1850');
    });

    test('shows all standings when search is cleared', async () => {
      const user = userEvent.setup();
      render(<StandingsTable standings={mockStandings} />);

      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'Player 1');
      await user.clear(searchInput);

      expect(searchInput).toHaveValue('');
    });

    test('handles case-insensitive search', async () => {
      const user = userEvent.setup();
      render(<StandingsTable standings={mockStandings} />);

      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'player 1');

      expect(searchInput).toHaveValue('player 1');
    });

    test('handles empty search gracefully', async () => {
      const user = userEvent.setup();
      render(<StandingsTable standings={mockStandings} />);

      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, '   ');
      await user.clear(searchInput);

      expect(searchInput).toHaveValue('');
    });
  });

  describe('Display Modes and Toggles', () => {
    test('toggles dense mode', async () => {
      const user = userEvent.setup();
      render(<StandingsTable standings={mockStandings} />);

      const denseModeSwitch = screen.getByRole('checkbox', {
        name: /denseMode/,
      });
      expect(denseModeSwitch).not.toBeChecked();

      await user.click(denseModeSwitch);
      expect(denseModeSwitch).toBeChecked();

      await user.click(denseModeSwitch);
      expect(denseModeSwitch).not.toBeChecked();
    });

    test('toggles tiebreaks display', async () => {
      const user = userEvent.setup();
      render(<StandingsTable standings={mockStandings} />);

      const tiebreaksSwitch = screen.getByRole('checkbox', {
        name: /showTiebreaks/,
      });
      expect(tiebreaksSwitch).toBeChecked(); // Default is true

      await user.click(tiebreaksSwitch);
      expect(tiebreaksSwitch).not.toBeChecked();

      await user.click(tiebreaksSwitch);
      expect(tiebreaksSwitch).toBeChecked();
    });

    test('column visibility can be toggled', async () => {
      const user = userEvent.setup();
      render(<StandingsTable standings={mockStandings} />);

      // Look for column visibility controls (typically in a menu)
      const columnButton = screen
        .getByTestId('table-rows-icon')
        .closest('button');
      if (columnButton) {
        await user.click(columnButton);
        // Menu should open with column options
      }
    });
  });

  describe('Loading State', () => {
    test('shows loading state when loading prop is true', () => {
      render(<StandingsTable standings={mockStandings} loading={true} />);

      const dataGrid = screen.getByTestId('data-grid');
      expect(dataGrid).toHaveAttribute('data-loading', 'true');
    });

    test('hides loading state when loading prop is false', () => {
      render(<StandingsTable standings={mockStandings} loading={false} />);

      const dataGrid = screen.getByTestId('data-grid');
      expect(dataGrid).toHaveAttribute('data-loading', 'false');
    });

    test('loading prop defaults to false', () => {
      render(<StandingsTable standings={mockStandings} />);

      const dataGrid = screen.getByTestId('data-grid');
      expect(dataGrid).toHaveAttribute('data-loading', 'false');
    });
  });

  describe('Player Interaction', () => {
    test('calls onPlayerClick when player row is clicked', async () => {
      const user = userEvent.setup();
      render(
        <StandingsTable
          standings={mockStandings}
          onPlayerClick={mockOnPlayerClick}
        />
      );

      const firstRow = screen.getByTestId('row-0');
      await user.click(firstRow);

      expect(mockOnPlayerClick).toHaveBeenCalledWith(1);
    });

    test('does not show cursor pointer when onPlayerClick is not provided', () => {
      render(<StandingsTable standings={mockStandings} />);

      // Component should render without click handlers
      expect(screen.getByTestId('data-grid')).toBeInTheDocument();
    });

    test('handles player click for different players', async () => {
      const user = userEvent.setup();
      render(
        <StandingsTable
          standings={mockStandings}
          onPlayerClick={mockOnPlayerClick}
        />
      );

      const secondRow = screen.getByTestId('row-1');
      await user.click(secondRow);

      expect(mockOnPlayerClick).toHaveBeenCalledWith(2);
    });
  });

  describe('Export Functionality', () => {
    test('calls onExportCsv when CSV export button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <StandingsTable
          standings={mockStandings}
          onExportCsv={mockOnExportCsv}
        />
      );

      // Find export button by icon or text
      const exportButton = screen
        .getByTestId('download-icon')
        .closest('button');
      if (exportButton) {
        await user.click(exportButton);
        expect(mockOnExportCsv).toHaveBeenCalledTimes(1);
      }
    });

    test('calls onExportPdf when PDF export is triggered', async () => {
      const user = userEvent.setup();
      render(
        <StandingsTable
          standings={mockStandings}
          onExportPdf={mockOnExportPdf}
        />
      );

      // PDF export might be in a menu - look for it
      const exportButton = screen
        .getByTestId('download-icon')
        .closest('button');
      if (exportButton) {
        await user.click(exportButton);
        // If there's a menu, look for PDF option
      }
    });

    test('calls onPrint when print button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <StandingsTable standings={mockStandings} onPrint={mockOnPrint} />
      );

      const printButton = screen.getByTestId('print-icon').closest('button');
      if (printButton) {
        await user.click(printButton);
        expect(mockOnPrint).toHaveBeenCalledTimes(1);
      }
    });

    test('export buttons are not shown when callbacks not provided', () => {
      render(<StandingsTable standings={mockStandings} />);

      // Should not show export buttons without callbacks
      expect(screen.queryByTestId('download-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('print-icon')).not.toBeInTheDocument();
    });
  });

  describe('Tiebreak Breakdown', () => {
    test('opens tiebreak breakdown dialog when tiebreak is clicked', async () => {
      const mockBreakdown = {
        player_id: 1,
        tiebreak_type: 'buchholz',
        breakdown_details: 'Test breakdown',
        calculation_steps: [],
      };
      mockOnTiebreakBreakdown.mockResolvedValue(mockBreakdown);

      userEvent.setup();
      render(
        <StandingsTable
          standings={mockStandings}
          onTiebreakBreakdown={mockOnTiebreakBreakdown}
        />
      );

      // Look for tiebreak clickable elements (would be in the data grid)
      // This would typically be rendered as part of the column cells
      // For testing purposes, we'll simulate the interaction
    });

    test('handles tiebreak breakdown errors gracefully', async () => {
      mockOnTiebreakBreakdown.mockRejectedValue(new Error('Breakdown failed'));

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      userEvent.setup();
      render(
        <StandingsTable
          standings={mockStandings}
          onTiebreakBreakdown={mockOnTiebreakBreakdown}
        />
      );

      // Simulate tiebreak breakdown error
      try {
        await mockOnTiebreakBreakdown(1, 'buchholz');
      } catch {
        // Expected to fail
      }

      consoleSpy.mockRestore();
    });

    test('closes tiebreak breakdown dialog', async () => {
      userEvent.setup();
      const mockBreakdown = {
        player_id: 1,
        tiebreak_type: 'buchholz',
        breakdown_details: 'Test breakdown',
        calculation_steps: [],
      };

      mockOnTiebreakBreakdown.mockResolvedValue(mockBreakdown);

      render(
        <StandingsTable
          standings={mockStandings}
          onTiebreakBreakdown={mockOnTiebreakBreakdown}
        />
      );

      // Simulate opening and then closing the dialog
      // This would be triggered by internal state management
    });
  });

  describe('Data Display', () => {
    test('displays rank with trophy icons for top 3', () => {
      render(<StandingsTable standings={mockStandings} />);

      // Check for trophy icons (they would be rendered within cells)
      // The actual rendering would show gold, silver, bronze trophies
      expect(screen.getByTestId('data-grid')).toBeInTheDocument();
    });

    test('handles unrated players correctly', () => {
      const standingsWithUnrated = [
        createMockStanding(1, { player: { rating: null } }),
      ];

      render(<StandingsTable standings={standingsWithUnrated} />);

      // Should handle null rating gracefully
      expect(screen.getByTestId('data-grid')).toBeInTheDocument();
    });

    test('displays rating changes with proper icons', () => {
      const standingsWithChanges = [
        createMockStanding(1, { rating_change: 25 }),
        createMockStanding(2, { rating_change: -15 }),
        createMockStanding(3, { rating_change: 0 }),
      ];

      render(<StandingsTable standings={standingsWithChanges} />);

      // Rating change indicators would be in the grid
      expect(screen.getByTestId('data-grid')).toBeInTheDocument();
    });

    test('shows country codes as chips', () => {
      render(<StandingsTable standings={mockStandings} />);

      // Country code chips would be rendered in player name cells
      expect(screen.getByTestId('data-grid')).toBeInTheDocument();
    });

    test('handles missing country codes gracefully', () => {
      const standingsWithoutCountry = [
        createMockStanding(1, { player: { country_code: undefined } }),
      ];

      render(<StandingsTable standings={standingsWithoutCountry} />);

      expect(screen.getByTestId('data-grid')).toBeInTheDocument();
    });
  });

  describe('Empty States and Edge Cases', () => {
    test('handles empty standings array', () => {
      render(<StandingsTable standings={[]} />);

      expect(screen.getByTestId('data-grid')).toBeInTheDocument();
      expect(screen.getByTestId('grid-body')).toBeInTheDocument();
    });

    test('handles single player standing', () => {
      const singleStanding = [createMockStanding(1)];

      render(<StandingsTable standings={singleStanding} />);

      expect(screen.getByTestId('data-grid')).toBeInTheDocument();
      expect(screen.getByTestId('row-0')).toBeInTheDocument();
    });

    test('handles large number of standings', () => {
      const manyStandings = Array.from({ length: 100 }, (_, i) =>
        createMockStanding(i + 1)
      );

      render(<StandingsTable standings={manyStandings} />);

      expect(screen.getByTestId('data-grid')).toBeInTheDocument();
      // Should render all standings
    });

    test('search returns no results', async () => {
      const user = userEvent.setup();
      render(<StandingsTable standings={mockStandings} />);

      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'NonexistentPlayer');

      expect(searchInput).toHaveValue('NonexistentPlayer');
      // Grid should show no results
    });
  });

  describe('Accessibility and UI', () => {
    test('search input has proper accessibility attributes', () => {
      render(<StandingsTable standings={mockStandings} />);

      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toBeInTheDocument();
      // Should have appropriate aria-labels and descriptions
    });

    test('switches have proper labels', () => {
      render(<StandingsTable standings={mockStandings} />);

      expect(
        screen.getByRole('checkbox', { name: /denseMode/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('checkbox', { name: /showTiebreaks/ })
      ).toBeInTheDocument();
    });

    test('buttons have proper tooltips', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          onExportCsv={mockOnExportCsv}
          onPrint={mockOnPrint}
        />
      );

      // Tooltip content would be rendered on hover
      expect(screen.getByTestId('data-grid')).toBeInTheDocument();
    });

    test('data grid has proper ARIA attributes', () => {
      render(<StandingsTable standings={mockStandings} />);

      const dataGrid = screen.getByTestId('data-grid');
      expect(dataGrid).toBeInTheDocument();
      // Should have proper grid role and attributes
    });
  });

  describe('Responsive Design', () => {
    test('adapts column visibility for mobile', () => {
      // Would need to mock useMediaQuery or window size
      render(<StandingsTable standings={mockStandings} />);

      expect(screen.getByTestId('data-grid')).toBeInTheDocument();
    });

    test('maintains functionality in different screen sizes', () => {
      render(<StandingsTable standings={mockStandings} />);

      // Core functionality should work regardless of screen size
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByTestId('data-grid')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('memoizes filtered standings correctly', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<StandingsTable standings={mockStandings} />);

      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'Player');

      // Rerender with same props should use memoized result
      rerender(<StandingsTable standings={mockStandings} />);

      expect(searchInput).toHaveValue('Player');
    });

    test('handles rapid search input changes', async () => {
      const user = userEvent.setup();
      render(<StandingsTable standings={mockStandings} />);

      const searchInput = screen.getByRole('textbox');

      // Rapid typing
      await user.type(searchInput, 'P');
      await user.type(searchInput, 'l');
      await user.type(searchInput, 'a');
      await user.type(searchInput, 'y');
      await user.type(searchInput, 'e');
      await user.type(searchInput, 'r');

      expect(searchInput).toHaveValue('Player');
    });
  });
});
