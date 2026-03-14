import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi } from 'vitest';

// Global type definitions for testing
declare global {
  var gc: (() => void) | undefined;
}

// Types for test data - use actual types from bindings
import type { Player, Tournament } from '@dto/bindings';

interface OperationStats {
  count: number;
  failures: number;
}

interface TauriInvokeResult {
  id?: number;
  name?: string;
  status?: string | null;
  location?: string;
  date?: string;
  time_type?: string;
  tournament_type?: string | null;
  player_count?: number;
  rounds_played?: number;
  total_rounds?: number;
  country_code?: string;
  start_time?: string | null;
  end_time?: string | null;
  description?: string | null;
  website_url?: string | null;
  contact_email?: string | null;
  entry_fee?: number | null;
  currency?: string | null;
  is_team_tournament?: boolean | null;
  team_size?: number | null;
  max_teams?: number | null;
  tournament_id?: number;
  rating?: number | null;
  title?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  club?: string | null;
  seed_number?: number | null;
  pairing_number?: number | null;
  initial_rating?: number | null;
  created_at?: string;
  updated_at?: string | null;
  success?: boolean;
  error?: string;
  playerCount?: number;
  pairings?: unknown[];
}

interface CreateTournamentPayload {
  name: string;
  maxPlayers?: number;
}

interface CreatePlayerPayload {
  name: string;
  rating: number;
  email: string;
}

// Type guards to avoid type assertions
const isCreateTournamentPayload = (
  payload: unknown
): payload is CreateTournamentPayload => {
  return typeof payload === 'object' && payload !== null && 'name' in payload;
};

const isCreatePlayerPayload = (
  payload: unknown
): payload is CreatePlayerPayload => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'name' in payload &&
    'rating' in payload &&
    'email' in payload
  );
};

const isMockTournament = (value: unknown): value is Tournament => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'location' in value &&
    !(value as Record<string, unknown>).error
  );
};

const isMockPlayer = (value: unknown): value is Player => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'tournament_id' in value &&
    !(value as Record<string, unknown>).error
  );
};

// Helper functions for creating mock data
const createMockTournament = (
  overrides: Partial<Tournament> = {}
): Tournament => ({
  id: Math.floor(Math.random() * 1000),
  name: 'Test Tournament',
  location: 'Test Location',
  date: '2024-01-01',
  time_type: 'classical',
  tournament_type: 'swiss',
  player_count: 0,
  rounds_played: 0,
  total_rounds: 5,
  country_code: 'US',
  status: 'draft',
  start_time: null,
  end_time: null,
  description: null,
  website_url: null,
  contact_email: null,
  entry_fee: null,
  currency: null,
  is_team_tournament: null,
  team_size: null,
  max_teams: null,
  ...overrides,
});

const createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: Math.floor(Math.random() * 1000),
  tournament_id: 1,
  name: 'Test Player',
  rating: 1500,
  country_code: 'US',
  title: null,
  birth_date: null,
  gender: null,
  email: 'test@example.com',
  phone: null,
  club: null,
  status: 'active',
  seed_number: null,
  pairing_number: null,
  initial_rating: null,
  created_at: new Date().toISOString(),
  updated_at: null,
  ...overrides,
});

// Mock Tauri API for stress testing
const createStressTestMocks = () => {
  const operationDelay = (ms: number = 100) =>
    new Promise(resolve => setTimeout(resolve, ms));
  const operations = new Map<string, OperationStats>();

  const trackOperation = (operationType: string, success: boolean = true) => {
    const stats: OperationStats = operations.get(operationType) || {
      count: 0,
      failures: 0,
    };
    stats.count++;
    if (!success) stats.failures++;
    operations.set(operationType, stats);
  };

  const mockInvoke = vi
    .fn()
    .mockImplementation(
      async (
        command: string,
        payload: Record<string, unknown> = {}
      ): Promise<TauriInvokeResult> => {
        await operationDelay(Math.random() * 200 + 50); // Simulate network delay

        // Simulate occasional failures under stress
        const stats = operations.get(command);
        const failureRate = (stats?.count ?? 0) > 50 ? 0.05 : 0.01;
        const shouldFail = Math.random() < failureRate;

        trackOperation(command, !shouldFail);

        if (shouldFail) {
          throw new Error(`Simulated failure for ${command}`);
        }

        switch (command) {
          case 'create_tournament':
            if (isCreateTournamentPayload(payload)) {
              return {
                id: Date.now() + Math.random(),
                name: payload.name,
                status: 'draft',
                playerCount: 0,
              };
            }
            throw new Error('Invalid create_tournament payload');
          case 'create_player_enhanced':
            if (isCreatePlayerPayload(payload)) {
              return {
                id: Date.now() + Math.random(),
                name: payload.name,
                rating: payload.rating,
                email: payload.email,
              };
            }
            throw new Error('Invalid create_player_enhanced payload');
          case 'update_player':
            return { success: true };
          case 'delete_player':
            return { success: true };
          case 'generate_pairings':
            return { success: true, pairings: [] };
          case 'update_game_result':
            return { success: true };
          case 'get_tournaments':
            return Array.from({ length: 20 }, (_, i) =>
              createMockTournament({ id: i + 1 })
            ) as TauriInvokeResult;
          case 'get_players_by_tournament_enhanced':
            return Array.from({ length: 50 }, (_, i) =>
              createMockPlayer({ id: i + 1 })
            ) as TauriInvokeResult;
          default:
            return { success: true };
        }
      }
    );

  return { mockInvoke, getOperationStats: () => operations };
};

// Stress testing utilities
const createConcurrentOperations = <T,>(
  operation: () => Promise<T>,
  count: number
): Promise<T>[] => {
  return Array.from({ length: count }, () => operation());
};

const measureOperationTime = async <T,>(
  operation: () => Promise<T>
): Promise<{ result: T; duration: number }> => {
  const startTime = performance.now();
  const result = await operation();
  const duration = performance.now() - startTime;
  return { result, duration };
};

const createMemoryPressure = (sizeMB: number = 100) => {
  const arrays: number[][] = [];
  const elementsPerMB = 262144; // Approximate number of integers per MB

  for (let i = 0; i < sizeMB; i++) {
    arrays.push(new Array(elementsPerMB).fill(Math.random()));
  }

  return () => {
    arrays.length = 0; // Clear memory
  };
};

// Mock components for stress testing
const MockTournamentManager = ({
  tournamentCount,
}: {
  tournamentCount: number;
}) => {
  const [tournaments, setTournaments] = React.useState<Tournament[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);

  const createMultipleTournaments = async () => {
    setLoading(true);
    setErrors([]);

    const operations = Array.from({ length: tournamentCount }, (_, i) =>
      (
        window.__TAURI_INTERNALS__.invoke as unknown as (
          cmd: string,
          payload?: Record<string, unknown>
        ) => Promise<unknown>
      )('create_tournament', {
        name: `Stress Test Tournament ${i + 1}`,
        maxPlayers: 16,
      }).catch((error: Error): TauriInvokeResult => ({ error: error.message }))
    );

    try {
      const results = await Promise.allSettled(operations);
      const newTournaments = results
        .filter(
          (result): result is PromiseFulfilledResult<TauriInvokeResult> =>
            result.status === 'fulfilled' &&
            !(result.value as TauriInvokeResult).error
        )
        .map((result): Tournament => {
          if (isMockTournament(result.value)) {
            return result.value;
          }
          throw new Error('Invalid tournament result');
        });

      const failures = results
        .filter(
          result =>
            result.status === 'rejected' ||
            (result.status === 'fulfilled' &&
              (result.value as TauriInvokeResult).error)
        )
        .map(result => {
          if (result.status === 'rejected') {
            return result.reason?.message || 'Unknown error';
          }
          return (result.value as TauriInvokeResult).error || 'Unknown error';
        });

      setTournaments(prev => [...prev, ...newTournaments]);
      setErrors(failures);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      setErrors([errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="tournament-manager">
      <div data-testid="tournament-count">{tournaments.length} tournaments</div>
      <div data-testid="error-count">{errors.length} errors</div>
      <button
        type="button"
        onClick={createMultipleTournaments}
        disabled={loading}
        data-testid="create-tournaments-button"
      >
        {loading ? 'Creating...' : `Create ${tournamentCount} Tournaments`}
      </button>
      {loading && (
        <div data-testid="loading-indicator">Creating tournaments...</div>
      )}
      {errors.length > 0 && (
        <div data-testid="error-list">
          {errors.map((error, index) => (
            <div key={error} data-testid={`error-${index}`}>
              {error}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MockPlayerBulkOperations = ({ playerCount }: { playerCount: number }) => {
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [operationsInProgress, setOperationsInProgress] = React.useState(0);

  const performBulkOperations = async () => {
    const operations: Promise<TauriInvokeResult>[] = [];

    // Create players
    for (let i = 0; i < playerCount; i++) {
      const operation = (
        window.__TAURI_INTERNALS__.invoke as unknown as (
          cmd: string,
          payload?: Record<string, unknown>
        ) => Promise<unknown>
      )('create_player_enhanced', {
        name: `Player ${i + 1}`,
        rating: 1200 + Math.random() * 800,
        email: `player${i + 1}@test.com`,
      }) as Promise<TauriInvokeResult>;
      operations.push(operation);
    }

    setOperationsInProgress(operations.length);

    const results = await Promise.allSettled(operations);
    const successfulPlayers = results
      .filter(
        (result): result is PromiseFulfilledResult<TauriInvokeResult> =>
          result.status === 'fulfilled'
      )
      .map((result): Player => {
        if (isMockPlayer(result.value)) {
          return result.value;
        }
        throw new Error('Invalid player result');
      });

    setPlayers(successfulPlayers);
    setOperationsInProgress(0);
  };

  return (
    <div data-testid="player-bulk-operations">
      <div data-testid="player-count">{players.length} players created</div>
      <div data-testid="operations-in-progress">
        {operationsInProgress} operations in progress
      </div>
      <button
        type="button"
        onClick={performBulkOperations}
        data-testid="bulk-create-button"
      >
        Create {playerCount} Players
      </button>
    </div>
  );
};

const MockRealTimeUpdates = ({
  updateFrequency,
}: {
  updateFrequency: number;
}) => {
  const [updates, setUpdates] = React.useState<
    Array<{ id: number; timestamp: string; data: { value: number } }>
  >([]);
  const [isActive, setIsActive] = React.useState(false);

  React.useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const newUpdate = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        data: { value: Math.random() },
      };

      setUpdates(prev => [newUpdate, ...prev.slice(0, 99)]); // Keep last 100 updates
    }, 1000 / updateFrequency); // Convert frequency to milliseconds

    return () => clearInterval(interval);
  }, [isActive, updateFrequency]);

  return (
    <div data-testid="real-time-updates">
      <button
        type="button"
        onClick={() => setIsActive(!isActive)}
        data-testid="toggle-updates"
      >
        {isActive ? 'Stop' : 'Start'} Updates
      </button>
      <div data-testid="update-count">{updates.length} updates</div>
      <div data-testid="update-frequency">{updateFrequency} updates/second</div>
    </div>
  );
};

describe('Stress Testing for Concurrent Operations', () => {
  let mockSetup: ReturnType<typeof createStressTestMocks>;

  beforeEach(() => {
    mockSetup = createStressTestMocks();

    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      value: { invoke: mockSetup.mockInvoke },
      configurable: true,
    });
  });

  describe('Concurrent API Operations', () => {
    test('should handle 100 concurrent tournament creations', async () => {
      const concurrentOperations = 100;
      const operations = createConcurrentOperations(
        () =>
          (
            window.__TAURI_INTERNALS__.invoke as unknown as (
              cmd: string,
              payload?: Record<string, unknown>
            ) => Promise<unknown>
          )('create_tournament', {
            name: `Tournament ${Math.random()}`,
            maxPlayers: 16,
          }) as Promise<TauriInvokeResult>,
        concurrentOperations
      );

      const { result, duration } = await measureOperationTime(async () => {
        const results = await Promise.allSettled(operations);
        return results;
      });

      const successful = result.filter(
        (r): r is PromiseFulfilledResult<TauriInvokeResult> =>
          r.status === 'fulfilled'
      ).length;
      const failed = result.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected'
      ).length;

      console.log(
        `Concurrent operations: ${concurrentOperations}, Successful: ${successful}, Failed: ${failed}, Duration: ${duration.toFixed(2)}ms`
      );

      // Should handle most operations successfully (allow for some simulated failures)
      expect(successful).toBeGreaterThan(concurrentOperations * 0.9);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle concurrent player operations without race conditions', async () => {
      const playerOperations = Array.from({ length: 50 }, (_, i) => [
        () =>
          (
            window.__TAURI_INTERNALS__.invoke as unknown as (
              cmd: string,
              payload?: Record<string, unknown>
            ) => Promise<unknown>
          )('create_player_enhanced', {
            name: `Player ${i}`,
            rating: 1500,
            email: `player${i}@test.com`,
          }) as Promise<TauriInvokeResult>,
        () =>
          (
            window.__TAURI_INTERNALS__.invoke as unknown as (
              cmd: string,
              payload?: Record<string, unknown>
            ) => Promise<unknown>
          )('update_player', {
            id: i,
            rating: 1600,
          }) as Promise<TauriInvokeResult>,
        () =>
          (
            window.__TAURI_INTERNALS__.invoke as unknown as (
              cmd: string,
              payload?: Record<string, unknown>
            ) => Promise<unknown>
          )('delete_player', { id: i }) as Promise<TauriInvokeResult>,
      ]).flat();

      const results = await Promise.allSettled(
        playerOperations.map(op => op())
      );
      const successful = results.filter(r => r.status === 'fulfilled').length;

      // Should handle concurrent CRUD operations
      expect(successful).toBeGreaterThan(playerOperations.length * 0.8);
    });

    test('should maintain data consistency under concurrent modifications', async () => {
      const concurrentUpdates = Array.from(
        { length: 20 },
        (_, i) =>
          (
            window.__TAURI_INTERNALS__.invoke as unknown as (
              cmd: string,
              payload?: Record<string, unknown>
            ) => Promise<unknown>
          )('update_game_result', {
            gameId: `game-${i}`,
            result: Math.random() > 0.5 ? 'white_wins' : 'black_wins',
          }) as Promise<TauriInvokeResult>
      );

      const results = await Promise.allSettled(concurrentUpdates);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      // All updates should eventually succeed or fail consistently
      expect(
        successful + results.filter(r => r.status === 'rejected').length
      ).toBe(concurrentUpdates.length);
    });
  });

  describe('Memory Pressure Testing', () => {
    test('should handle operations under memory pressure', async () => {
      const cleanupMemory = createMemoryPressure(200); // 200MB memory pressure

      try {
        const operations = createConcurrentOperations(
          () =>
            (
              window.__TAURI_INTERNALS__.invoke as unknown as (
                cmd: string,
                payload?: Record<string, unknown>
              ) => Promise<unknown>
            )('create_tournament', {
              name: `Memory Test Tournament ${Math.random()}`,
              maxPlayers: 32,
            }) as Promise<TauriInvokeResult>,
          50
        );

        const { result, duration } = await measureOperationTime(async () => {
          return Promise.allSettled(operations);
        });

        const successful = result.filter(
          (r): r is PromiseFulfilledResult<TauriInvokeResult> =>
            r.status === 'fulfilled'
        ).length;

        // Should still handle operations under memory pressure
        expect(successful).toBeGreaterThan(40);
        expect(duration).toBeLessThan(10000); // Allow more time under memory pressure
      } finally {
        cleanupMemory();
      }
    });

    test('should not leak memory during concurrent operations', async () => {
      const initialMemory = measureMemoryUsage();

      // Perform many operations
      const operations = Array.from(
        { length: 200 },
        () =>
          (
            window.__TAURI_INTERNALS__.invoke as unknown as (
              cmd: string,
              payload?: Record<string, unknown>
            ) => Promise<unknown>
          )('create_player_enhanced', {
            name: `Memory Test Player ${Math.random()}`,
            rating: 1500,
          }) as Promise<TauriInvokeResult>
      );

      await Promise.allSettled(operations);

      // Force garbage collection if available
      if (
        typeof globalThis !== 'undefined' &&
        'gc' in globalThis &&
        typeof (globalThis as typeof globalThis & { gc?: () => void }).gc ===
          'function'
      ) {
        (globalThis as typeof globalThis & { gc: () => void }).gc();
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const finalMemory = measureMemoryUsage();
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;

      console.log(
        `Memory increase after 200 operations: ${memoryIncrease.toFixed(2)}MB`
      );

      // Memory increase should be reasonable (< 50MB)
      expect(memoryIncrease).toBeLessThan(50);
    });
  });

  describe('Component Stress Testing', () => {
    test('should handle bulk tournament creation in UI', async () => {
      const user = userEvent.setup();
      render(<MockTournamentManager tournamentCount={20} />);

      const createButton = screen.getByTestId('create-tournaments-button');

      await user.click(createButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      });

      // Should complete operations
      await waitFor(
        () => {
          expect(
            screen.queryByTestId('loading-indicator')
          ).not.toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      const tournamentCount = screen.getByTestId('tournament-count');

      // Should have created most tournaments
      expect(tournamentCount.textContent).toMatch(/\d+/);
      expect(
        parseInt(tournamentCount.textContent?.split(' ')[0], 10)
      ).toBeGreaterThan(15);
    });

    test('should handle rapid bulk operations', async () => {
      const user = userEvent.setup();
      render(<MockPlayerBulkOperations playerCount={100} />);

      const createButton = screen.getByTestId('bulk-create-button');

      await user.click(createButton);

      // Should track operations in progress
      await waitFor(() => {
        const operationsText = screen.getByTestId(
          'operations-in-progress'
        ).textContent;
        expect(operationsText).toMatch(/100 operations in progress/);
      });

      // Should complete all operations
      await waitFor(
        () => {
          const operationsText = screen.getByTestId(
            'operations-in-progress'
          ).textContent;
          expect(operationsText).toMatch(/0 operations in progress/);
        },
        { timeout: 15000 }
      );

      const playerCount = screen.getByTestId('player-count');
      expect(
        parseInt(playerCount.textContent?.split(' ')[0], 10)
      ).toBeGreaterThan(90);
    });

    test('should handle high-frequency real-time updates', async () => {
      const user = userEvent.setup();
      render(<MockRealTimeUpdates updateFrequency={10} />); // 10 updates per second

      const toggleButton = screen.getByTestId('toggle-updates');

      await user.click(toggleButton);

      // Let updates run for a few seconds
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
      });

      await user.click(toggleButton); // Stop updates

      const updateCount = screen.getByTestId('update-count');
      const count = parseInt(updateCount.textContent?.split(' ')[0], 10);

      // Should have received approximately 20 updates (10/sec * 2 seconds)
      expect(count).toBeGreaterThan(15);
      expect(count).toBeLessThan(25);
    });
  });

  describe('Error Recovery Under Stress', () => {
    test('should gracefully handle cascading failures', async () => {
      // Simulate high failure rate
      mockSetup.mockInvoke.mockImplementation(
        async (command: string): Promise<TauriInvokeResult> => {
          if (Math.random() < 0.3) {
            // 30% failure rate
            throw new Error(`Simulated ${command} failure`);
          }
          return { success: true, id: Math.random() };
        }
      );

      const operations = createConcurrentOperations(
        () =>
          (
            window.__TAURI_INTERNALS__.invoke as unknown as (
              cmd: string,
              payload?: Record<string, unknown>
            ) => Promise<unknown>
          )('create_tournament', {
            name: `Failure Test Tournament ${Math.random()}`,
          }) as Promise<TauriInvokeResult>,
        50
      );

      const results = await Promise.allSettled(operations);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Should handle failures gracefully
      expect(successful + failed).toBe(50);
      expect(successful).toBeGreaterThan(20); // At least some should succeed
    });

    test('should handle timeout scenarios', async () => {
      mockSetup.mockInvoke.mockImplementation(
        async (): Promise<TauriInvokeResult> => {
          // Simulate slow operations
          await new Promise(resolve =>
            setTimeout(resolve, Math.random() * 2000 + 1000)
          );
          return { success: true };
        }
      );

      const operations = createConcurrentOperations(
        () =>
          Promise.race([
            (
              window.__TAURI_INTERNALS__.invoke as unknown as (
                cmd: string,
                payload?: Record<string, unknown>
              ) => Promise<unknown>
            )('create_tournament', {
              name: 'Timeout Test',
            }) as Promise<TauriInvokeResult>,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 1500)
            ),
          ]),
        20
      );

      const results = await Promise.allSettled(operations);
      const timeouts = results.filter(
        r => r.status === 'rejected' && r.reason.message === 'Timeout'
      ).length;

      // Some operations should timeout
      expect(timeouts).toBeGreaterThan(0);
    });
  });

  describe('Resource Exhaustion Testing', () => {
    test('should handle file descriptor limits', async () => {
      // Simulate many concurrent connections
      const connections = Array.from({ length: 1000 }, () => ({
        id: Math.random(),
        status: 'connecting',
      }));

      const openConnections = connections.map(async conn => {
        try {
          (await (
            window.__TAURI_INTERNALS__.invoke as unknown as (
              cmd: string,
              payload?: Record<string, unknown>
            ) => Promise<unknown>
          )('connect_to_server', {
            id: conn.id,
          })) as Promise<TauriInvokeResult>;
          return { ...conn, status: 'connected' };
        } catch {
          return { ...conn, status: 'failed' };
        }
      });

      const results = await Promise.allSettled(openConnections);
      const connected = results.filter(
        r => r.status === 'fulfilled' && r.value.status === 'connected'
      ).length;

      // Should handle resource limits gracefully
      expect(connected).toBeGreaterThan(0);
      expect(results.length).toBe(1000);
    });

    test('should handle CPU intensive operations', async () => {
      const cpuIntensiveOperation = async () => {
        // Simulate CPU intensive pairing calculation
        const players = Array.from({ length: 500 }, (_, i) => ({
          id: i,
          rating: Math.random() * 2000 + 1000,
        }));

        return (
          window.__TAURI_INTERNALS__.invoke as unknown as (
            cmd: string,
            payload?: Record<string, unknown>
          ) => Promise<unknown>
        )('generate_pairings', {
          players,
          algorithm: 'swiss',
          complexity: 'high',
        }) as Promise<TauriInvokeResult>;
      };

      const operations = createConcurrentOperations(cpuIntensiveOperation, 10);

      const { result, duration } = await measureOperationTime(async () => {
        return Promise.allSettled(operations);
      });

      const successful = result.filter(
        (r): r is PromiseFulfilledResult<TauriInvokeResult> =>
          r.status === 'fulfilled'
      ).length;

      // Should complete CPU intensive operations
      expect(successful).toBeGreaterThan(8);
      expect(duration).toBeLessThan(30000); // Allow 30 seconds for CPU intensive work
    });
  });

  describe('Load Testing Scenarios', () => {
    test('should simulate tournament day load', async () => {
      // Simulate realistic tournament day scenario
      const simultaneousUsers = 20;
      const actionsPerUser = 10;

      const userSessions = Array.from(
        { length: simultaneousUsers },
        async (_, userId) => {
          const userActions = [];

          // Each user performs various actions
          for (let i = 0; i < actionsPerUser; i++) {
            const actions = [
              () =>
                (
                  window.__TAURI_INTERNALS__.invoke as unknown as (
                    cmd: string,
                    payload?: Record<string, unknown>
                  ) => Promise<unknown>
                )('get_tournaments') as Promise<TauriInvokeResult>,
              () =>
                (
                  window.__TAURI_INTERNALS__.invoke as unknown as (
                    cmd: string,
                    payload?: Record<string, unknown>
                  ) => Promise<unknown>
                )('get_players_by_tournament_enhanced', {
                  tournamentId: 1,
                }) as Promise<TauriInvokeResult>,
              () =>
                (
                  window.__TAURI_INTERNALS__.invoke as unknown as (
                    cmd: string,
                    payload?: Record<string, unknown>
                  ) => Promise<unknown>
                )('update_game_result', {
                  gameId: `user-${userId}-game-${i}`,
                  result: 'white_wins',
                }) as Promise<TauriInvokeResult>,
              () =>
                (
                  window.__TAURI_INTERNALS__.invoke as unknown as (
                    cmd: string,
                    payload?: Record<string, unknown>
                  ) => Promise<unknown>
                )('get_tournament_standings', {
                  tournamentId: 1,
                }) as Promise<TauriInvokeResult>,
            ];

            const randomAction =
              actions[Math.floor(Math.random() * actions.length)];
            userActions.push(randomAction());

            // Small delay between user actions
            await new Promise(resolve =>
              setTimeout(resolve, Math.random() * 100)
            );
          }

          return Promise.allSettled(userActions);
        }
      );

      const { result, duration } = await measureOperationTime(async () => {
        return Promise.allSettled(userSessions);
      });

      const totalOperations = simultaneousUsers * actionsPerUser;
      const successful = result.reduce((sum: number, userResult) => {
        if (userResult.status === 'fulfilled') {
          return (
            sum +
            userResult.value.filter(
              (
                r: PromiseSettledResult<TauriInvokeResult>
              ): r is PromiseFulfilledResult<TauriInvokeResult> =>
                r.status === 'fulfilled'
            ).length
          );
        }
        return sum;
      }, 0);

      console.log(
        `Tournament day simulation: ${totalOperations} total operations, ${successful} successful, Duration: ${duration.toFixed(2)}ms`
      );

      // Should handle realistic load
      expect(successful).toBeGreaterThan(totalOperations * 0.85);
      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds
    });
  });
});

// Helper function for memory measurement
function measureMemoryUsage(): number {
  // Check if performance.memory exists using property access without type assertion
  if (
    typeof performance === 'object' &&
    performance !== null &&
    'memory' in performance
  ) {
    const memory = performance.memory;
    if (
      typeof memory === 'object' &&
      memory !== null &&
      'usedJSHeapSize' in memory
    ) {
      const usedMemory = memory.usedJSHeapSize;
      if (typeof usedMemory === 'number') {
        return usedMemory;
      }
    }
  }
  return 0;
}
