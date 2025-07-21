import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealTimeStandings } from '../useRealTimeStandings';
import type { StandingsCalculationResult, PlayerStanding } from '@dto/bindings';

// Mock Tauri API - must be defined before the mock
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

vi.mock('@dto/bindings', () => ({
  commands: {
    getRealtimeStandings: vi.fn(),
    forceRecalculateStandings: vi.fn(),
    clearStandingsCache: vi.fn(),
  },
}));

// Mock data factories
const createMockPlayerStanding = (overrides = {}): PlayerStanding => ({
  rank: 1,
  player: {
    id: 1,
    name: 'Test Player',
    country_code: 'US',
    rating: 1500,
    title: '',
    birth_date: '1990-01-01',
    gender: 'M',
    fide_id: null,
    email: 'test@example.com',
    phone: '+1234567890',
    address: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    zip_code: '12345',
    emergency_contact: 'Emergency Contact',
    emergency_phone: '+0987654321',
    medical_info: '',
    notes: '',
    is_active: true,
    pairing_number: 1,
  },
  points: 2.5,
  games_played: 4,
  wins: 2,
  draws: 1,
  losses: 1,
  performance_rating: 1550,
  tiebreak_scores: [],
  ...overrides,
});

const createMockStandingsResult = (
  overrides = {}
): StandingsCalculationResult => ({
  standings: [createMockPlayerStanding()],
  last_updated: new Date().toISOString(),
  tiebreak_config: {
    tournament_id: 1,
    tiebreaks: ['buchholz', 'sonneborn_berger'],
    use_fide_defaults: true,
    forfeit_time_minutes: null,
    draw_offers_allowed: null,
    mobile_phone_policy: null,
    default_color_allocation: null,
    late_entry_allowed: null,
    bye_assignment_rule: null,
    arbiter_notes: null,
    tournament_category: null,
    organizer_name: null,
    organizer_email: null,
    prize_structure: null,
  },
  ...overrides,
});

describe('useRealTimeStandings', () => {
  let mockUnlisten: ReturnType<typeof vi.fn>;
  let mockListen: any;
  let mockCommands: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    mockUnlisten = vi.fn();

    // Get the mocked functions
    const { listen } = await import('@tauri-apps/api/event');
    const { commands } = await import('@dto/bindings');
    mockListen = vi.mocked(listen);
    mockCommands = vi.mocked(commands);

    mockListen.mockResolvedValue(mockUnlisten);

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockCommands.getRealtimeStandings.mockResolvedValue(
      createMockStandingsResult()
    );
    mockCommands.forceRecalculateStandings.mockResolvedValue(
      createMockStandingsResult()
    );
    mockCommands.clearStandingsCache.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Initial state and setup', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() =>
        useRealTimeStandings({ tournamentId: 1 })
      );

      expect(result.current.standings).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeNull();
      expect(result.current.isConnected).toBe(false);
      expect(typeof result.current.forceRefresh).toBe('function');
      expect(typeof result.current.clearCache).toBe('function');
      expect(typeof result.current.retryConnection).toBe('function');
    });

    it('should fetch standings on mount', async () => {
      renderHook(() => useRealTimeStandings({ tournamentId: 1 }));

      await waitFor(() => {
        expect(mockCommands.getRealtimeStandings).toHaveBeenCalledWith(1);
      });
    });

    it('should not fetch standings when tournamentId is 0', () => {
      renderHook(() => useRealTimeStandings({ tournamentId: 0 }));

      expect(mockCommands.getRealtimeStandings).not.toHaveBeenCalled();
    });

    it('should setup event listener on mount', async () => {
      renderHook(() => useRealTimeStandings({ tournamentId: 1 }));

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith(
          'standings-update',
          expect.any(Function)
        );
      });
    });
  });

  describe('Data fetching', () => {
    it('should successfully fetch and set standings', async () => {
      const mockResult = createMockStandingsResult();
      mockCommands.getRealtimeStandings.mockResolvedValue(mockResult);

      const { result } = renderHook(() =>
        useRealTimeStandings({ tournamentId: 1 })
      );

      await waitFor(() => {
        expect(result.current.standings).toEqual(mockResult);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.isConnected).toBe(true);
        expect(result.current.lastUpdated).toBeInstanceOf(Date);
      });
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Network error');
      mockCommands.getRealtimeStandings.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useRealTimeStandings({ tournamentId: 1 })
      );

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
        expect(result.current.loading).toBe(false);
        expect(result.current.isConnected).toBe(false);
        expect(result.current.standings).toBeNull();
      });
    });

    it('should call onUpdate callback when data is fetched', async () => {
      const mockResult = createMockStandingsResult();
      const onUpdate = vi.fn();
      mockCommands.getRealtimeStandings.mockResolvedValue(mockResult);

      renderHook(() => useRealTimeStandings({ tournamentId: 1, onUpdate }));

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(mockResult);
      });
    });

    it('should call onError callback when fetch fails', async () => {
      const error = new Error('Network error');
      const onError = vi.fn();
      mockCommands.getRealtimeStandings.mockRejectedValue(error);

      renderHook(() => useRealTimeStandings({ tournamentId: 1, onError }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('Force refresh functionality', () => {
    it('should force recalculate standings when forceRefresh is called', async () => {
      const mockResult = createMockStandingsResult();
      mockCommands.forceRecalculateStandings.mockResolvedValue(mockResult);

      const { result } = renderHook(() =>
        useRealTimeStandings({ tournamentId: 1 })
      );

      await act(async () => {
        await result.current.forceRefresh();
      });

      expect(mockCommands.forceRecalculateStandings).toHaveBeenCalledWith(1);
    });

    it('should update state when force refresh succeeds', async () => {
      const mockResult = createMockStandingsResult({
        standings: [createMockPlayerStanding({ rank: 1, points: 3.0 })],
      });
      mockCommands.forceRecalculateStandings.mockResolvedValue(mockResult);

      const { result } = renderHook(() =>
        useRealTimeStandings({ tournamentId: 1 })
      );

      await act(async () => {
        await result.current.forceRefresh();
      });

      await waitFor(() => {
        expect(result.current.standings).toEqual(mockResult);
        expect(result.current.lastUpdated).toBeInstanceOf(Date);
      });
    });
  });

  describe('Cache management', () => {
    it('should clear cache and refresh when clearCache is called', async () => {
      const mockResult = createMockStandingsResult();
      mockCommands.forceRecalculateStandings.mockResolvedValue(mockResult);

      const { result } = renderHook(() =>
        useRealTimeStandings({ tournamentId: 1 })
      );

      await act(async () => {
        await result.current.clearCache();
      });

      expect(mockCommands.clearStandingsCache).toHaveBeenCalledWith(1);
      expect(mockCommands.forceRecalculateStandings).toHaveBeenCalledWith(1);
    });

    it('should handle cache clear errors', async () => {
      const error = new Error('Cache clear failed');
      const onError = vi.fn();
      mockCommands.clearStandingsCache.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useRealTimeStandings({ tournamentId: 1, onError })
      );

      await act(async () => {
        await result.current.clearCache();
      });

      expect(onError).toHaveBeenCalledWith(error);
      expect(result.current.error).toEqual(error);
    });
  });

  describe('Auto refresh functionality', () => {
    it('should setup polling interval when autoRefresh is true', async () => {
      renderHook(() =>
        useRealTimeStandings({
          tournamentId: 1,
          autoRefresh: true,
          refreshInterval: 5000,
        })
      );

      // Clear the initial fetch call
      vi.clearAllMocks();

      // Fast forward time
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should poll when not connected via real-time events
      await waitFor(() => {
        expect(mockCommands.getRealtimeStandings).toHaveBeenCalled();
      });
    });

    it('should not poll when autoRefresh is false', () => {
      renderHook(() =>
        useRealTimeStandings({
          tournamentId: 1,
          autoRefresh: false,
        })
      );

      // Clear the initial fetch call
      vi.clearAllMocks();

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // Should not poll when autoRefresh is disabled
      expect(mockCommands.getRealtimeStandings).not.toHaveBeenCalled();
    });

    it('should not poll when connected via real-time events', async () => {
      const { result } = renderHook(() =>
        useRealTimeStandings({
          tournamentId: 1,
          autoRefresh: true,
          refreshInterval: 5000,
        })
      );

      // Wait for initial connection
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Clear the initial fetch calls
      vi.clearAllMocks();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should not poll when connected via real-time
      expect(mockCommands.getRealtimeStandings).not.toHaveBeenCalled();
    });
  });

  describe('Real-time event handling', () => {
    it('should process standings update events', async () => {
      let eventCallback: any;
      mockListen.mockImplementation(async (_event, callback) => {
        eventCallback = callback;
        return mockUnlisten;
      });

      const { result } = renderHook(() =>
        useRealTimeStandings({ tournamentId: 1 })
      );

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalled();
      });

      const updateEvent = {
        payload: {
          tournament_id: 1,
          standings: createMockStandingsResult(),
          timestamp: new Date().toISOString(),
        },
      };

      act(() => {
        eventCallback(updateEvent);
      });

      await waitFor(() => {
        expect(result.current.standings).toBeDefined();
        expect(result.current.lastUpdated).toBeInstanceOf(Date);
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('should ignore events for different tournaments', async () => {
      let eventCallback: any;
      mockListen.mockImplementation(async (_event, callback) => {
        eventCallback = callback;
        return mockUnlisten;
      });

      const { result } = renderHook(() =>
        useRealTimeStandings({ tournamentId: 1 })
      );

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalled();
      });

      const initialStandings = result.current.standings;

      const updateEvent = {
        payload: {
          tournament_id: 2, // Different tournament
          standings: createMockStandingsResult(),
          timestamp: new Date().toISOString(),
        },
      };

      act(() => {
        eventCallback(updateEvent);
      });

      // Standings should not change
      expect(result.current.standings).toBe(initialStandings);
    });

    it('should call onUpdate callback for real-time events', async () => {
      let eventCallback: any;
      const onUpdate = vi.fn();
      mockListen.mockImplementation(async (_event, callback) => {
        eventCallback = callback;
        return mockUnlisten;
      });

      renderHook(() => useRealTimeStandings({ tournamentId: 1, onUpdate }));

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalled();
      });

      const updateEvent = {
        payload: {
          tournament_id: 1,
          standings: createMockStandingsResult(),
          timestamp: new Date().toISOString(),
        },
      };

      act(() => {
        eventCallback(updateEvent);
      });

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('Retry connection functionality', () => {
    it('should retry connection and clear error', async () => {
      const error = new Error('Connection failed');
      mockCommands.getRealtimeStandings.mockRejectedValueOnce(error);
      mockCommands.getRealtimeStandings.mockResolvedValue(
        createMockStandingsResult()
      );

      const { result } = renderHook(() =>
        useRealTimeStandings({ tournamentId: 1 })
      );

      // Wait for initial error
      await waitFor(() => {
        expect(result.current.error).toEqual(error);
      });

      act(() => {
        result.current.retryConnection();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(mockCommands.getRealtimeStandings).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup intervals and listeners on unmount', async () => {
      const { unmount } = renderHook(() =>
        useRealTimeStandings({ tournamentId: 1 })
      );

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnlisten).toHaveBeenCalled();
    });

    it('should cleanup when tournamentId changes', async () => {
      let props = { tournamentId: 1 };
      const { rerender } = renderHook(p => useRealTimeStandings(p), {
        initialProps: props,
      });

      await waitFor(() => {
        expect(mockListen).toHaveBeenCalled();
      });

      props = { tournamentId: 2 };
      rerender(props);

      expect(mockUnlisten).toHaveBeenCalled();
      expect(mockListen).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle non-Error exceptions gracefully', async () => {
      mockCommands.getRealtimeStandings.mockRejectedValue('String error');

      const { result } = renderHook(() =>
        useRealTimeStandings({ tournamentId: 1 })
      );

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe('String error');
      });
    });

    it('should handle empty standings result', async () => {
      const emptyResult = createMockStandingsResult({ standings: [] });
      mockCommands.getRealtimeStandings.mockResolvedValue(emptyResult);

      const { result } = renderHook(() =>
        useRealTimeStandings({ tournamentId: 1 })
      );

      await waitFor(() => {
        expect(result.current.standings?.standings).toEqual([]);
      });
    });

    it('should handle event listener setup failure', async () => {
      mockListen.mockRejectedValue(new Error('Event listener setup failed'));
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const { result } = renderHook(() =>
        useRealTimeStandings({ tournamentId: 1 })
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to set up event listener:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });
});
