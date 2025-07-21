import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import RealTimeStandings from '../RealTimeStandings';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: (date: Date, _options: { addSuffix: boolean }) => {
    return `${Math.round((Date.now() - date.getTime()) / 1000)} seconds ago`;
  },
}));

// Mock MUI icons
vi.mock('@mui/icons-material', () => ({
  Refresh: () => <span data-testid="refresh-icon">↻</span>,
  WifiOff: () => <span data-testid="wifi-off-icon">📴</span>,
  Wifi: () => <span data-testid="wifi-icon">📶</span>,
  Schedule: () => <span data-testid="schedule-icon">⏰</span>,
  TrendingUp: () => <span data-testid="trending-up-icon">📈</span>,
  ClearAll: () => <span data-testid="clear-all-icon">🗑️</span>,
  Warning: () => <span data-testid="warning-icon">⚠️</span>,
  CheckCircle: () => <span data-testid="check-circle-icon">✅</span>,
}));

// Mock StandingsTable
vi.mock('../../StandingsTable', () => ({
  default: ({
    standings,
    loading,
    onPlayerClick,
    onTiebreakBreakdown,
    onExportCsv,
    onExportPdf,
    onPrint,
  }: {
    standings: unknown[];
    loading: boolean;
    onPlayerClick?: (playerId: number) => void;
    onTiebreakBreakdown?: (
      playerId: number,
      tiebreakType: string
    ) => Promise<unknown>;
    onExportCsv?: () => void;
    onExportPdf?: () => void;
    onPrint?: () => void;
  }) => (
    <div data-testid="standings-table">
      <div data-loading={loading}>Standings: {standings.length} players</div>
      <button onClick={() => onPlayerClick?.(1)} data-testid="player-click">
        Click Player 1
      </button>
      <button
        onClick={() => onTiebreakBreakdown?.(1, 'buchholz')}
        data-testid="tiebreak-click"
      >
        Tiebreak for Player 1
      </button>
      <button onClick={onExportCsv} data-testid="export-csv">
        Export CSV
      </button>
      <button onClick={onExportPdf} data-testid="export-pdf">
        Export PDF
      </button>
      <button onClick={onPrint} data-testid="print">
        Print
      </button>
    </div>
  ),
}));

// Mock useRealTimeStandings hook
const mockUseRealTimeStandings = vi.fn();
vi.mock('../../hooks/useRealTimeStandings', () => ({
  useRealTimeStandings: mockUseRealTimeStandings,
}));

// Mock standings data
const mockStandings = {
  standings: [
    {
      player: {
        id: 1,
        name: 'Player 1',
        rating: 1800,
      },
      points: 2.5,
      buchholz: 8.5,
      position: 1,
    },
    {
      player: {
        id: 2,
        name: 'Player 2',
        rating: 1750,
      },
      points: 2.0,
      buchholz: 8.0,
      position: 2,
    },
  ],
};

describe('RealTimeStandings', () => {
  const defaultHookReturn = {
    standings: mockStandings,
    loading: false,
    error: null,
    lastUpdated: new Date(Date.now() - 5000), // 5 seconds ago
    isConnected: true,
    forceRefresh: vi.fn(),
    clearCache: vi.fn(),
    retryConnection: vi.fn(),
  };

  const mockOnTiebreakBreakdown = vi.fn();
  const mockOnPlayerClick = vi.fn();
  const mockOnExportCsv = vi.fn();
  const mockOnExportPdf = vi.fn();
  const mockOnPrint = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRealTimeStandings.mockReturnValue(defaultHookReturn);
  });

  describe('Initial Rendering', () => {
    test('renders real-time standings header', () => {
      render(<RealTimeStandings tournamentId={1} />);

      expect(screen.getByText('realTimeStandings')).toBeInTheDocument();
      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
    });

    test('renders auto-refresh toggle', () => {
      render(<RealTimeStandings tournamentId={1} />);

      const autoRefreshSwitch = screen.getByRole('checkbox');
      expect(autoRefreshSwitch).toBeInTheDocument();
      expect(autoRefreshSwitch).toBeChecked(); // Default is true
    });

    test('renders control buttons', () => {
      render(<RealTimeStandings tournamentId={1} />);

      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
      expect(screen.getByTestId('clear-all-icon')).toBeInTheDocument();
    });

    test('displays last updated time', () => {
      render(<RealTimeStandings tournamentId={1} />);

      expect(screen.getByText('5 seconds ago')).toBeInTheDocument();
      expect(screen.getByTestId('schedule-icon')).toBeInTheDocument();
    });

    test('renders standings table when data is available', () => {
      render(<RealTimeStandings tournamentId={1} />);

      expect(screen.getByTestId('standings-table')).toBeInTheDocument();
      expect(screen.getByText('Standings: 2 players')).toBeInTheDocument();
    });
  });

  describe('Connection Status', () => {
    test('shows connected status when connected', () => {
      render(<RealTimeStandings tournamentId={1} />);

      expect(screen.getByText('connected')).toBeInTheDocument();
      expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
    });

    test('shows disconnected status when not connected', () => {
      mockUseRealTimeStandings.mockReturnValue({
        ...defaultHookReturn,
        isConnected: false,
      });

      render(<RealTimeStandings tournamentId={1} />);

      expect(screen.getByText('disconnected')).toBeInTheDocument();
      expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
    });

    test('shows updating status when loading', () => {
      mockUseRealTimeStandings.mockReturnValue({
        ...defaultHookReturn,
        loading: true,
      });

      render(<RealTimeStandings tournamentId={1} />);

      expect(screen.getByText('updating')).toBeInTheDocument();
    });

    test('shows error status when there is an error', () => {
      mockUseRealTimeStandings.mockReturnValue({
        ...defaultHookReturn,
        error: new Error('Connection failed'),
      });

      render(<RealTimeStandings tournamentId={1} />);

      expect(screen.getByText('error')).toBeInTheDocument();
      expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
    });
  });

  describe('Auto Refresh Toggle', () => {
    test('toggles auto refresh when switched', async () => {
      const user = userEvent.setup();
      render(<RealTimeStandings tournamentId={1} />);

      const autoRefreshSwitch = screen.getByRole('checkbox');
      expect(autoRefreshSwitch).toBeChecked();

      await user.click(autoRefreshSwitch);
      expect(autoRefreshSwitch).not.toBeChecked();

      await user.click(autoRefreshSwitch);
      expect(autoRefreshSwitch).toBeChecked();
    });

    test('passes auto refresh state to useRealTimeStandings hook', () => {
      render(<RealTimeStandings tournamentId={1} />);

      expect(mockUseRealTimeStandings).toHaveBeenCalledWith(
        expect.objectContaining({
          autoRefresh: true,
          refreshInterval: 30000,
          tournamentId: 1,
        })
      );
    });

    test('updates hook when auto refresh is toggled', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<RealTimeStandings tournamentId={1} />);

      const autoRefreshSwitch = screen.getByRole('checkbox');
      await user.click(autoRefreshSwitch);

      // Rerender to trigger hook with new state
      rerender(<RealTimeStandings tournamentId={1} />);

      // Hook should be called again with updated autoRefresh value
      expect(mockUseRealTimeStandings).toHaveBeenLastCalledWith(
        expect.objectContaining({
          autoRefresh: false,
        })
      );
    });
  });

  describe('Control Actions', () => {
    test('calls forceRefresh when refresh button is clicked', async () => {
      const mockForceRefresh = vi.fn();
      mockUseRealTimeStandings.mockReturnValue({
        ...defaultHookReturn,
        forceRefresh: mockForceRefresh,
      });

      const user = userEvent.setup();
      render(<RealTimeStandings tournamentId={1} />);

      const refreshButton = screen
        .getByTestId('refresh-icon')
        .closest('button');
      await user.click(refreshButton!);

      expect(mockForceRefresh).toHaveBeenCalledTimes(1);
    });

    test('calls clearCache when clear cache button is clicked', async () => {
      const mockClearCache = vi.fn();
      mockUseRealTimeStandings.mockReturnValue({
        ...defaultHookReturn,
        clearCache: mockClearCache,
      });

      const user = userEvent.setup();
      render(<RealTimeStandings tournamentId={1} />);

      const clearButton = screen
        .getByTestId('clear-all-icon')
        .closest('button');
      await user.click(clearButton!);

      expect(mockClearCache).toHaveBeenCalledTimes(1);
    });

    test('disables buttons when loading', () => {
      mockUseRealTimeStandings.mockReturnValue({
        ...defaultHookReturn,
        loading: true,
      });

      render(<RealTimeStandings tournamentId={1} />);

      const refreshButton = screen
        .getByTestId('refresh-icon')
        .closest('button');
      const clearButton = screen
        .getByTestId('clear-all-icon')
        .closest('button');

      expect(refreshButton).toBeDisabled();
      expect(clearButton).toBeDisabled();
    });

    test('shows success message after force refresh', async () => {
      const mockForceRefresh = vi.fn().mockResolvedValue(undefined);
      mockUseRealTimeStandings.mockReturnValue({
        ...defaultHookReturn,
        forceRefresh: mockForceRefresh,
      });

      const user = userEvent.setup();
      render(<RealTimeStandings tournamentId={1} />);

      const refreshButton = screen
        .getByTestId('refresh-icon')
        .closest('button');
      await user.click(refreshButton!);

      await waitFor(() => {
        expect(screen.getByText('standingsRefreshed')).toBeInTheDocument();
      });
    });

    test('shows success message after clearing cache', async () => {
      const mockClearCache = vi.fn().mockResolvedValue(undefined);
      mockUseRealTimeStandings.mockReturnValue({
        ...defaultHookReturn,
        clearCache: mockClearCache,
      });

      const user = userEvent.setup();
      render(<RealTimeStandings tournamentId={1} />);

      const clearButton = screen
        .getByTestId('clear-all-icon')
        .closest('button');
      await user.click(clearButton!);

      await waitFor(() => {
        expect(screen.getByText('cacheCleared')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error alert when there is an error', () => {
      const error = new Error('Connection timeout');
      mockUseRealTimeStandings.mockReturnValue({
        ...defaultHookReturn,
        error,
      });

      render(<RealTimeStandings tournamentId={1} />);

      expect(screen.getByText('connectionError')).toBeInTheDocument();
      expect(screen.getByText('Connection timeout')).toBeInTheDocument();
      expect(screen.getByText('retry')).toBeInTheDocument();
    });

    test('calls retryConnection when retry button is clicked', async () => {
      const mockRetryConnection = vi.fn();
      const error = new Error('Connection failed');
      mockUseRealTimeStandings.mockReturnValue({
        ...defaultHookReturn,
        error,
        retryConnection: mockRetryConnection,
      });

      const user = userEvent.setup();
      render(<RealTimeStandings tournamentId={1} />);

      const retryButton = screen.getByText('retry');
      await user.click(retryButton);

      expect(mockRetryConnection).toHaveBeenCalledTimes(1);
    });

    test('shows no real-time connection warning when not connected but no error', () => {
      mockUseRealTimeStandings.mockReturnValue({
        ...defaultHookReturn,
        isConnected: false,
        error: null,
      });

      render(<RealTimeStandings tournamentId={1} />);

      expect(screen.getByText('noRealTimeConnection')).toBeInTheDocument();
      expect(screen.getByText('fallingBackToPolling')).toBeInTheDocument();
    });

    test('logs errors through hook callback', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(<RealTimeStandings tournamentId={1} />);

      // Get the onError callback from the hook call
      const hookCall = mockUseRealTimeStandings.mock.calls[0][0];
      const onError = hookCall.onError;

      // Call the error callback
      const testError = new Error('Test error');
      onError(testError);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Real-time standings error:',
        testError
      );

      consoleSpy.mkRestore();
    });
  });

  describe('Loading States', () => {
    test('shows loading state when no standings and loading', () => {
      mockUseRealTimeStandings.mockReturnValue({
        ...defaultHookReturn,
        standings: null,
        loading: true,
      });

      render(<RealTimeStandings tournamentId={1} />);

      expect(screen.getByText('loadingStandings')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('shows no standings available when not loading and no data', () => {
      mockUseRealTimeStandings.mockReturnValue({
        ...defaultHookReturn,
        standings: null,
        loading: false,
      });

      render(<RealTimeStandings tournamentId={1} />);

      expect(screen.getByText('noStandingsAvailable')).toBeInTheDocument();
      expect(screen.getByText('loadStandings')).toBeInTheDocument();
    });

    test('calls forceRefresh when load standings button is clicked', async () => {
      const mockForceRefresh = vi.fn();
      mockUseRealTimeStandings.mockReturnValue({
        ...defaultHookReturn,
        standings: null,
        loading: false,
        forceRefresh: mockForceRefresh,
      });

      const user = userEvent.setup();
      render(<RealTimeStandings tournamentId={1} />);

      const loadButton = screen.getByText('loadStandings');
      await user.click(loadButton);

      expect(mockForceRefresh).toHaveBeenCalledTimes(1);
    });

    test('passes loading state to StandingsTable', () => {
      mockUseRealTimeStandings.mockReturnValue({
        ...defaultHookReturn,
        loading: true,
      });

      render(<RealTimeStandings tournamentId={1} />);

      const standingsTable = screen.getByTestId('standings-table');
      expect(
        standingsTable.querySelector('[data-loading="true"]')
      ).toBeInTheDocument();
    });
  });

  describe('StandingsTable Integration', () => {
    test('passes all props to StandingsTable', () => {
      render(
        <RealTimeStandings
          tournamentId={1}
          onTiebreakBreakdown={mockOnTiebreakBreakdown}
          onPlayerClick={mockOnPlayerClick}
          onExportCsv={mockOnExportCsv}
          onExportPdf={mockOnExportPdf}
          onPrint={mockOnPrint}
        />
      );

      // All callback buttons should be present in the mocked StandingsTable
      expect(screen.getByTestId('player-click')).toBeInTheDocument();
      expect(screen.getByTestId('tiebreak-click')).toBeInTheDocument();
      expect(screen.getByTestId('export-csv')).toBeInTheDocument();
      expect(screen.getByTestId('export-pdf')).toBeInTheDocument();
      expect(screen.getByTestId('print')).toBeInTheDocument();
    });

    test('forwards player click events', async () => {
      const user = userEvent.setup();
      render(
        <RealTimeStandings tournamentId={1} onPlayerClick={mockOnPlayerClick} />
      );

      const playerButton = screen.getByTestId('player-click');
      await user.click(playerButton);

      expect(mockOnPlayerClick).toHaveBeenCalledWith(1);
    });

    test('forwards tiebreak breakdown events', async () => {
      mockOnTiebreakBreakdown.mockResolvedValue({ breakdown: 'test' });

      const user = userEvent.setup();
      render(
        <RealTimeStandings
          tournamentId={1}
          onTiebreakBreakdown={mockOnTiebreakBreakdown}
        />
      );

      const tiebreakButton = screen.getByTestId('tiebreak-click');
      await user.click(tiebreakButton);

      expect(mockOnTiebreakBreakdown).toHaveBeenCalledWith(1, 'buchholz');
    });

    test('forwards export events', async () => {
      const user = userEvent.setup();
      render(
        <RealTimeStandings
          tournamentId={1}
          onExportCsv={mockOnExportCsv}
          onExportPdf={mockOnExportPdf}
          onPrint={mockOnPrint}
        />
      );

      await user.click(screen.getByTestId('export-csv'));
      expect(mockOnExportCsv).toHaveBeenCalledTimes(1);

      await user.click(screen.getByTestId('export-pdf'));
      expect(mockOnExportPdf).toHaveBeenCalledTimes(1);

      await user.click(screen.getByTestId('print'));
      expect(mockOnPrint).toHaveBeenCalledTimes(1);
    });
  });

  describe('Success Messages', () => {
    test('shows success message on standings update', () => {
      render(<RealTimeStandings tournamentId={1} />);

      // Get the onUpdate callback from the hook call
      const hookCall = mockUseRealTimeStandings.mock.calls[0][0];
      const onUpdate = hookCall.onUpdate;

      // Call the update callback
      act(() => {
        onUpdate(mockStandings);
      });

      expect(screen.getByText('standingsUpdated')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });

    test('hides success message after timeout', async () => {
      vi.useFakeTimers();

      render(<RealTimeStandings tournamentId={1} />);

      // Trigger success message
      const hookCall = mockUseRealTimeStandings.mock.calls[0][0];
      const onUpdate = hookCall.onUpdate;

      act(() => {
        onUpdate(mockStandings);
      });

      expect(screen.getByText('standingsUpdated')).toBeInTheDocument();

      // Fast forward time
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.queryByText('standingsUpdated')).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    test('allows manual dismissal of success message', async () => {
      const user = userEvent.setup();
      render(<RealTimeStandings tournamentId={1} />);

      // Trigger success message
      const hookCall = mockUseRealTimeStandings.mock.calls[0][0];
      const onUpdate = hookCall.onUpdate;

      act(() => {
        onUpdate(mockStandings);
      });

      expect(screen.getByText('standingsUpdated')).toBeInTheDocument();

      // Find and click the close button in the alert
      const closeButton = screen
        .getByTestId('check-circle-icon')
        .closest('button');
      if (closeButton) {
        await user.click(closeButton);
      }

      await waitFor(() => {
        expect(screen.queryByText('standingsUpdated')).not.toBeInTheDocument();
      });
    });
  });

  describe('Hook Configuration', () => {
    test('configures useRealTimeStandings with correct parameters', () => {
      render(<RealTimeStandings tournamentId={123} />);

      expect(mockUseRealTimeStandings).toHaveBeenCalledWith({
        tournamentId: 123,
        autoRefresh: true,
        refreshInterval: 30000,
        onError: expect.any(Function),
        onUpdate: expect.any(Function),
      });
    });

    test('handles different tournament IDs', () => {
      const { rerender } = render(<RealTimeStandings tournamentId={1} />);

      rerender(<RealTimeStandings tournamentId={2} />);

      expect(mockUseRealTimeStandings).toHaveBeenLastCalledWith(
        expect.objectContaining({
          tournamentId: 2,
        })
      );
    });
  });

  describe('Accessibility and UI', () => {
    test('provides tooltips for interactive elements', () => {
      render(<RealTimeStandings tournamentId={1} />);

      // Tooltip content is rendered as title attributes or aria-labels
      expect(screen.getByText('forceRefresh')).toBeInTheDocument();
      expect(screen.getByText('clearCache')).toBeInTheDocument();
      expect(screen.getByText('connected')).toBeInTheDocument();
    });

    test('displays proper ARIA labels and roles', () => {
      render(<RealTimeStandings tournamentId={1} />);

      const autoRefreshSwitch = screen.getByRole('checkbox');
      expect(autoRefreshSwitch).toHaveAttribute('type', 'checkbox');
    });

    test('handles missing lastUpdated gracefully', () => {
      mockUseRealTimeStandings.mockReturnValue({
        ...defaultHookReturn,
        lastUpdated: null,
      });

      render(<RealTimeStandings tournamentId={1} />);

      // Should not crash and should not show last updated time
      expect(screen.queryByTestId('schedule-icon')).not.toBeInTheDocument();
    });
  });
});
