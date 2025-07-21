import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  renderWithAllProviders,
  createMockPlayer,
  createMockTournament,
} from '../utils/test-utils';
import DataTable from '../../components/common/DataTable';
import TournamentStandings from '../../components/tournaments/TournamentStandings';

// Performance testing utilities
const measureRenderTime = async (
  component: React.ReactElement
): Promise<number> => {
  const startTime = performance.now();
  render(component);
  await waitFor(
    () => expect(document.querySelector('[data-testid]')).toBeInTheDocument(),
    { timeout: 5000 }
  );
  const endTime = performance.now();
  return endTime - startTime;
};

const measureMemoryUsage = (): number => {
  if ('memory' in performance) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0;
};

// Generate large datasets for testing
const generateLargePlayers = (count: number) => {
  const players = [];
  for (let i = 1; i <= count; i++) {
    players.push(
      createMockPlayer({
        id: i,
        name: `Player ${i.toString().padStart(4, '0')}`,
        rating: 1200 + Math.floor(Math.random() * 800),
        email: `player${i}@example.com`,
        countryCode: ['US', 'CA', 'UK', 'DE', 'FR', 'ES', 'IT', 'RU'][i % 8],
        title:
          i % 10 === 0 ? 'FM' : i % 20 === 0 ? 'IM' : i % 50 === 0 ? 'GM' : '',
        birthDate: `${1950 + (i % 50)}-${(i % 12) + 1}-${(i % 28) + 1}`,
        phone: `+1${(1000000000 + i).toString()}`,
        address: `${i} Test Street`,
        city: `City ${i % 100}`,
        state: `State ${i % 50}`,
        zipCode: `${(10000 + (i % 90000)).toString()}`,
      })
    );
  }
  return players;
};

const generateLargeStandings = (count: number) => {
  const standings = [];
  for (let i = 1; i <= count; i++) {
    standings.push({
      playerId: i,
      playerName: `Player ${i.toString().padStart(4, '0')}`,
      rank: i,
      points: Math.max(0, Math.floor(Math.random() * 10) / 2),
      gamesPlayed: Math.floor(Math.random() * 9) + 1,
      wins: Math.floor(Math.random() * 5),
      draws: Math.floor(Math.random() * 3),
      losses: Math.floor(Math.random() * 4),
      tiebreaks: [
        Math.floor(Math.random() * 20) + 10,
        Math.floor(Math.random() * 15) + 5,
        Math.floor(Math.random() * 10) + 2,
      ],
      performance: 1200 + Math.floor(Math.random() * 800),
      color: i % 2 === 0 ? 'white' : 'black',
    });
  }
  return standings.sort(
    (a, b) => b.points - a.points || b.tiebreaks[0] - a.tiebreaks[0]
  );
};

describe('Performance Tests for Large Datasets', () => {
  // Performance benchmarks
  const PERFORMANCE_THRESHOLDS = {
    RENDER_TIME_MS: {
      SMALL: 100, // < 100 players
      MEDIUM: 300, // 100-500 players
      LARGE: 1000, // 500-1000 players
      XLARGE: 2000, // > 1000 players
    },
    MEMORY_USAGE_MB: {
      BASELINE: 50,
      SMALL: 100,
      MEDIUM: 200,
      LARGE: 400,
      XLARGE: 800,
    },
  };

  beforeEach(() => {
    // Clear any existing performance marks
    if (performance.clearMarks) {
      performance.clearMarks();
    }
    if (performance.clearMeasures) {
      performance.clearMeasures();
    }
  });

  describe('DataTable Performance with Large Datasets', () => {
    test('should render 100 players within performance threshold', async () => {
      const players = generateLargePlayers(100);
      const columns = [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'rating', label: 'Rating', sortable: true },
        { key: 'countryCode', label: 'Country', sortable: true },
        { key: 'email', label: 'Email', sortable: false },
      ];

      const initialMemory = measureMemoryUsage();
      const renderTime = await measureRenderTime(
        <DataTable
          data={players}
          columns={columns}
          pagination={{ pageSize: 25, currentPage: 1 }}
          loading={false}
          data-testid="players-table"
        />
      );
      const finalMemory = measureMemoryUsage();

      console.log(
        `100 players - Render time: ${renderTime.toFixed(2)}ms, Memory: ${((finalMemory - initialMemory) / 1024 / 1024).toFixed(2)}MB`
      );

      expect(renderTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.RENDER_TIME_MS.SMALL
      );

      // Verify table is rendered
      expect(screen.getByTestId('players-table')).toBeInTheDocument();
    });

    test('should render 500 players within performance threshold', async () => {
      const players = generateLargePlayers(500);
      const columns = [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'rating', label: 'Rating', sortable: true },
        { key: 'countryCode', label: 'Country', sortable: true },
        { key: 'title', label: 'Title', sortable: true },
        { key: 'email', label: 'Email', sortable: false },
        { key: 'phone', label: 'Phone', sortable: false },
      ];

      const initialMemory = measureMemoryUsage();
      const renderTime = await measureRenderTime(
        <DataTable
          data={players}
          columns={columns}
          pagination={{ pageSize: 50, currentPage: 1 }}
          loading={false}
          data-testid="players-table-500"
        />
      );
      const finalMemory = measureMemoryUsage();

      console.log(
        `500 players - Render time: ${renderTime.toFixed(2)}ms, Memory: ${((finalMemory - initialMemory) / 1024 / 1024).toFixed(2)}MB`
      );

      expect(renderTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.RENDER_TIME_MS.MEDIUM
      );
      expect(screen.getByTestId('players-table-500')).toBeInTheDocument();
    });

    test('should render 1000 players within performance threshold', async () => {
      const players = generateLargePlayers(1000);
      const columns = [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'rating', label: 'Rating', sortable: true },
        { key: 'countryCode', label: 'Country', sortable: true },
        { key: 'title', label: 'Title', sortable: true },
        { key: 'email', label: 'Email', sortable: false },
      ];

      const initialMemory = measureMemoryUsage();
      const renderTime = await measureRenderTime(
        <DataTable
          data={players}
          columns={columns}
          pagination={{ pageSize: 100, currentPage: 1 }}
          loading={false}
          data-testid="players-table-1000"
        />
      );
      const finalMemory = measureMemoryUsage();

      console.log(
        `1000 players - Render time: ${renderTime.toFixed(2)}ms, Memory: ${((finalMemory - initialMemory) / 1024 / 1024).toFixed(2)}MB`
      );

      expect(renderTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.RENDER_TIME_MS.LARGE
      );
      expect(screen.getByTestId('players-table-1000')).toBeInTheDocument();
    });

    test('should handle sorting 1000 players efficiently', async () => {
      const players = generateLargePlayers(1000);
      const columns = [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'rating', label: 'Rating', sortable: true },
        { key: 'countryCode', label: 'Country', sortable: true },
      ];

      render(
        <DataTable
          data={players}
          columns={columns}
          pagination={{ pageSize: 100, currentPage: 1 }}
          loading={false}
          data-testid="sortable-table"
        />
      );

      const startTime = performance.now();

      // Simulate sorting by rating
      const ratingHeader = screen.getByText('Rating');
      ratingHeader.click();

      await waitFor(() => {
        expect(screen.getByTestId('sortable-table')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const sortTime = endTime - startTime;

      console.log(`Sorting 1000 players by rating: ${sortTime.toFixed(2)}ms`);

      // Sorting should be fast (< 100ms for 1000 records)
      expect(sortTime).toBeLessThan(100);
    });
  });

  describe('Tournament Standings Performance', () => {
    test('should render large standings efficiently', async () => {
      const standings = generateLargeStandings(500);
      const tournament = createMockTournament({
        id: 1,
        name: 'Large Tournament',
      });

      const mockInvoke = jest.fn().mockResolvedValue(standings);
      Object.defineProperty(window, '__TAURI_INTERNALS__', {
        value: { invoke: mockInvoke },
        configurable: true,
      });

      const initialMemory = measureMemoryUsage();
      const renderTime = await measureRenderTime(
        renderWithAllProviders(
          <TournamentStandings
            tournamentId={1}
            tournament={tournament}
            data-testid="standings-large"
          />
        )
      );
      const finalMemory = measureMemoryUsage();

      console.log(
        `500 standings - Render time: ${renderTime.toFixed(2)}ms, Memory: ${((finalMemory - initialMemory) / 1024 / 1024).toFixed(2)}MB`
      );

      expect(renderTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.RENDER_TIME_MS.MEDIUM
      );
      expect(screen.getByTestId('standings-large')).toBeInTheDocument();
    });

    test('should update standings efficiently with real-time data', async () => {
      let standings = generateLargeStandings(200);

      const mockInvoke = jest.fn().mockResolvedValue(standings);
      Object.defineProperty(window, '__TAURI_INTERNALS__', {
        value: { invoke: mockInvoke },
        configurable: true,
      });

      const tournament = createMockTournament({
        id: 1,
        name: 'Real-time Tournament',
      });

      const { rerender } = render(
        renderWithAllProviders(
          <TournamentStandings
            tournamentId={1}
            tournament={tournament}
            data-testid="standings-realtime"
          />
        )
      );

      // Simulate standings update
      const startTime = performance.now();

      standings = generateLargeStandings(200); // Generate new standings
      mockInvoke.mockResolvedValue(standings);

      rerender(
        renderWithAllProviders(
          <TournamentStandings
            tournamentId={1}
            tournament={tournament}
            data-testid="standings-realtime"
          />
        )
      );

      await waitFor(() => {
        expect(screen.getByTestId('standings-realtime')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const updateTime = endTime - startTime;

      console.log(`Standings update time: ${updateTime.toFixed(2)}ms`);

      // Real-time updates should be very fast
      expect(updateTime).toBeLessThan(50);
    });
  });

  describe('Memory Leak Detection', () => {
    test('should not leak memory when unmounting large components', async () => {
      const players = generateLargePlayers(1000);
      const columns = [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'rating', label: 'Rating', sortable: true },
        { key: 'email', label: 'Email', sortable: false },
      ];

      const initialMemory = measureMemoryUsage();

      const { unmount } = render(
        <DataTable
          data={players}
          columns={columns}
          pagination={{ pageSize: 100, currentPage: 1 }}
          loading={false}
          data-testid="memory-test-table"
        />
      );

      // Wait for component to fully render
      await waitFor(() => {
        expect(screen.getByTestId('memory-test-table')).toBeInTheDocument();
      });

      const peakMemory = measureMemoryUsage();

      // Unmount component
      unmount();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalMemory = measureMemoryUsage();

      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
      const peakIncrease = (peakMemory - initialMemory) / 1024 / 1024;

      console.log(
        `Memory - Initial: ${(initialMemory / 1024 / 1024).toFixed(2)}MB, Peak: ${(peakMemory / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`
      );
      console.log(
        `Memory increase after unmount: ${memoryIncrease.toFixed(2)}MB`
      );

      // Memory increase after unmount should be minimal (< 10MB)
      expect(memoryIncrease).toBeLessThan(10);
      expect(peakIncrease).toBeLessThan(
        PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MB.LARGE
      );
    });

    test('should handle multiple mount/unmount cycles without memory leaks', async () => {
      const players = generateLargePlayers(100);
      const columns = [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'rating', label: 'Rating', sortable: true },
      ];

      const initialMemory = measureMemoryUsage();

      // Mount and unmount component multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <DataTable
            data={players}
            columns={columns}
            pagination={{ pageSize: 25, currentPage: 1 }}
            loading={false}
            data-testid={`cycle-test-${i}`}
          />
        );

        await waitFor(() => {
          expect(screen.getByTestId(`cycle-test-${i}`)).toBeInTheDocument();
        });

        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const finalMemory = measureMemoryUsage();
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;

      console.log(
        `Memory increase after 10 mount/unmount cycles: ${memoryIncrease.toFixed(2)}MB`
      );

      // Should not accumulate significant memory over multiple cycles
      expect(memoryIncrease).toBeLessThan(20);
    });
  });

  describe('Virtual Scrolling Performance', () => {
    test('should handle virtual scrolling with large datasets', async () => {
      const players = generateLargePlayers(10000);

      // Mock virtual scrolling behavior
      const VirtualizedDataTable = ({ data }: { data: any[] }) => {
        const [visibleRange] = React.useState({
          start: 0,
          end: 50,
        });
        const visibleData = data.slice(visibleRange.start, visibleRange.end);

        return (
          <div data-testid="virtualized-table">
            <div style={{ height: '400px', overflowY: 'auto' }}>
              {visibleData.map(item => (
                <div key={item.id} style={{ height: '40px', padding: '8px' }}>
                  {item.name} - {item.rating}
                </div>
              ))}
            </div>
          </div>
        );
      };

      const initialMemory = measureMemoryUsage();
      const renderTime = await measureRenderTime(
        <VirtualizedDataTable data={players} />
      );
      const finalMemory = measureMemoryUsage();

      const memoryUsed = (finalMemory - initialMemory) / 1024 / 1024;

      console.log(
        `10000 players (virtualized) - Render time: ${renderTime.toFixed(2)}ms, Memory: ${memoryUsed.toFixed(2)}MB`
      );

      // Virtualized rendering should be very fast and use minimal memory
      expect(renderTime).toBeLessThan(200);
      expect(memoryUsed).toBeLessThan(50); // Much less memory than rendering all items
      expect(screen.getByTestId('virtualized-table')).toBeInTheDocument();
    });
  });

  describe('Search and Filter Performance', () => {
    test('should handle search across large datasets efficiently', async () => {
      const players = generateLargePlayers(1000);
      const searchTerm = 'Player 0500';

      const startTime = performance.now();

      const filteredPlayers = players.filter(
        player =>
          player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          player.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          player.rating.toString().includes(searchTerm)
      );

      const endTime = performance.now();
      const searchTime = endTime - startTime;

      console.log(
        `Search across 1000 players: ${searchTime.toFixed(2)}ms, Results: ${filteredPlayers.length}`
      );

      // Search should be very fast (< 10ms for 1000 records)
      expect(searchTime).toBeLessThan(10);
      expect(filteredPlayers.length).toBeGreaterThan(0);
    });

    test('should handle multiple filters efficiently', async () => {
      const players = generateLargePlayers(2000);

      const startTime = performance.now();

      const filteredPlayers = players.filter(
        player =>
          player.rating > 1500 &&
          ['US', 'CA', 'UK'].includes(player.countryCode) &&
          player.name.includes('0') &&
          player.title !== ''
      );

      const endTime = performance.now();
      const filterTime = endTime - startTime;

      console.log(
        `Multi-filter across 2000 players: ${filterTime.toFixed(2)}ms, Results: ${filteredPlayers.length}`
      );

      // Complex filtering should still be fast (< 20ms for 2000 records)
      expect(filterTime).toBeLessThan(20);
    });
  });
});
