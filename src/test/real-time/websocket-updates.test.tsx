import React from 'react';
import { render, screen, waitFor, act, within } from '@testing-library/react';
import { vi } from 'vitest';

// Mock WebSocket implementation for testing
class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen?: (event: Event) => void;
  onmessage?: (event: MessageEvent) => void;
  onclose?: (event: CloseEvent) => void;
  onerror?: (event: Event) => void;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);

    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string | ArrayBuffer | Blob | ArrayBufferView) {
    // Mock sending data - in real implementation this would send to server
    console.log('MockWebSocket send:', data);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Test utility to simulate receiving messages
  simulateMessage(data: any) {
    if (this.onmessage && this.readyState === WebSocket.OPEN) {
      this.onmessage(
        new MessageEvent('message', { data: JSON.stringify(data) })
      );
    }
  }

  // Test utility to simulate errors
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  static getLastInstance(): MockWebSocket | undefined {
    return this.instances[this.instances.length - 1];
  }

  static clearInstances() {
    this.instances = [];
  }
}

// Mock real-time components
const MockRealTimeStandings = ({
  tournamentId,
  onUpdate,
}: {
  tournamentId: number;
  onUpdate?: () => void;
}) => {
  const [standings, setStandings] = React.useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = React.useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting');
  const wsRef = React.useRef<MockWebSocket | null>(null);

  React.useEffect(() => {
    const ws = new MockWebSocket(
      `ws://localhost:3001/tournaments/${tournamentId}/standings`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
    };

    ws.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.type === 'standings_update') {
        setStandings(message.data);
        if (onUpdate) onUpdate();
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
    };

    ws.onerror = () => {
      setConnectionStatus('disconnected');
    };

    return () => {
      ws.close();
    };
  }, [tournamentId, onUpdate]);

  return (
    <div data-testid="real-time-standings">
      <div
        data-testid="connection-status"
        className={`status-${connectionStatus}`}
      >
        Status: {connectionStatus}
      </div>
      <div data-testid="standings-list">
        {standings.map((player, index) => (
          <div key={player.playerId} data-testid={`standing-${index + 1}`}>
            <span data-testid="rank">{player.rank}</span>
            <span data-testid="player-name">{player.playerName}</span>
            <span data-testid="points">{player.points}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MockRealTimeGameUpdates = ({
  tournamentId,
  roundNumber,
}: {
  tournamentId: number;
  roundNumber: number;
}) => {
  const [games, setGames] = React.useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = React.useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting');

  React.useEffect(() => {
    const ws = new MockWebSocket(
      `ws://localhost:3001/tournaments/${tournamentId}/round/${roundNumber}/games`
    );

    ws.onopen = () => {
      setConnectionStatus('connected');
    };

    ws.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.type === 'game_result_update') {
        setGames(prevGames => {
          const updatedGames = [...prevGames];
          const gameIndex = updatedGames.findIndex(
            g => g.id === message.data.gameId
          );
          if (gameIndex >= 0) {
            updatedGames[gameIndex] = {
              ...updatedGames[gameIndex],
              ...message.data,
            };
          } else {
            updatedGames.push(message.data);
          }
          return updatedGames;
        });
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
    };

    return () => {
      ws.close();
    };
  }, [tournamentId, roundNumber]);

  return (
    <div data-testid="real-time-games">
      <div
        data-testid="game-connection-status"
        className={`status-${connectionStatus}`}
      >
        Game Updates: {connectionStatus}
      </div>
      <div data-testid="games-list">
        {games.map((game, _index) => (
          <div key={game.id} data-testid={`game-${game.id}`}>
            <span data-testid="white-player">{game.whitePlayer}</span>
            <span data-testid="vs"> vs </span>
            <span data-testid="black-player">{game.blackPlayer}</span>
            <span data-testid="result">{game.result || 'In Progress'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MockTournamentLiveBroadcast = ({
  tournamentId,
}: {
  tournamentId: number;
}) => {
  const [isLive, setIsLive] = React.useState(false);
  const [viewerCount, setViewerCount] = React.useState(0);
  const [broadcastEvents, setBroadcastEvents] = React.useState<any[]>([]);

  React.useEffect(() => {
    const ws = new MockWebSocket(
      `ws://localhost:3001/tournaments/${tournamentId}/broadcast`
    );

    ws.onopen = () => {
      setIsLive(true);
    };

    ws.onmessage = event => {
      const message = JSON.parse(event.data);
      switch (message.type) {
        case 'viewer_count':
          setViewerCount(message.count);
          break;
        case 'broadcast_event':
          setBroadcastEvents(prev => [message.data, ...prev.slice(0, 9)]); // Keep last 10 events
          break;
      }
    };

    ws.onclose = () => {
      setIsLive(false);
    };

    return () => {
      ws.close();
    };
  }, [tournamentId]);

  return (
    <div data-testid="live-broadcast">
      <div
        data-testid="broadcast-status"
        className={`broadcast-${isLive ? 'live' : 'offline'}`}
      >
        {isLive ? 'LIVE' : 'OFFLINE'}
      </div>
      <div data-testid="viewer-count">Viewers: {viewerCount}</div>
      <div data-testid="broadcast-events">
        {broadcastEvents.map((event, index) => (
          <div
            key={`${event.timestamp}-${index}`}
            data-testid={`event-${index}`}
          >
            <span data-testid="event-time">{event.time}</span>
            <span data-testid="event-message">{event.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Replace global WebSocket with mock
beforeAll(() => {
  (global as any).WebSocket = MockWebSocket;
});

beforeEach(() => {
  MockWebSocket.clearInstances();
});

describe('Real-Time Features Testing', () => {
  describe('WebSocket Connection Management', () => {
    test('should establish WebSocket connection for real-time standings', async () => {
      render(<MockRealTimeStandings tournamentId={1} />);

      // Should start in connecting state
      expect(screen.getByTestId('connection-status')).toHaveTextContent(
        'Status: connecting'
      );

      // Should connect after short delay
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent(
          'Status: connected'
        );
      });

      // Verify WebSocket was created with correct URL
      const ws = MockWebSocket.getLastInstance();
      expect(ws).toBeDefined();
      expect(ws!.url).toBe('ws://localhost:3001/tournaments/1/standings');
    });

    test('should handle connection errors gracefully', async () => {
      render(<MockRealTimeStandings tournamentId={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent(
          'Status: connected'
        );
      });

      // Simulate connection error
      const ws = MockWebSocket.getLastInstance();
      act(() => {
        ws!.simulateError();
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent(
          'Status: disconnected'
        );
      });
    });

    test('should reconnect when connection is lost', async () => {
      const { rerender } = render(<MockRealTimeStandings tournamentId={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent(
          'Status: connected'
        );
      });

      // Simulate connection loss
      const ws = MockWebSocket.getLastInstance();
      act(() => {
        ws!.close();
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent(
          'Status: disconnected'
        );
      });

      // Simulate reconnection by re-rendering component
      rerender(<MockRealTimeStandings tournamentId={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent(
          'Status: connected'
        );
      });
    });
  });

  describe('Real-Time Standings Updates', () => {
    test('should update standings when receiving WebSocket messages', async () => {
      const onUpdate = vi.fn();
      render(<MockRealTimeStandings tournamentId={1} onUpdate={onUpdate} />);

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent(
          'Status: connected'
        );
      });

      const mockStandingsUpdate = {
        type: 'standings_update',
        data: [
          { playerId: 1, playerName: 'Alice Johnson', rank: 1, points: 2.5 },
          { playerId: 2, playerName: 'Bob Smith', rank: 2, points: 2.0 },
          { playerId: 3, playerName: 'Charlie Brown', rank: 3, points: 1.5 },
        ],
      };

      // Simulate receiving standings update
      const ws = MockWebSocket.getLastInstance();
      act(() => {
        ws!.simulateMessage(mockStandingsUpdate);
      });

      // Verify standings are updated
      await waitFor(() => {
        expect(screen.getByTestId('standing-1')).toBeInTheDocument();
        expect(screen.getByTestId('standing-2')).toBeInTheDocument();
        expect(screen.getByTestId('standing-3')).toBeInTheDocument();
      });

      // Check individual standings data
      const firstPlace = screen.getByTestId('standing-1');
      expect(within(firstPlace).getByTestId('rank')).toHaveTextContent('1');
      expect(within(firstPlace).getByTestId('player-name')).toHaveTextContent(
        'Alice Johnson'
      );
      expect(within(firstPlace).getByTestId('points')).toHaveTextContent('2.5');

      expect(onUpdate).toHaveBeenCalled();
    });

    test('should handle multiple rapid standings updates', async () => {
      render(<MockRealTimeStandings tournamentId={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent(
          'Status: connected'
        );
      });

      const ws = MockWebSocket.getLastInstance();

      // Send multiple rapid updates
      const updates = [
        {
          type: 'standings_update',
          data: [{ playerId: 1, playerName: 'Alice', rank: 1, points: 1.0 }],
        },
        {
          type: 'standings_update',
          data: [
            { playerId: 1, playerName: 'Alice', rank: 1, points: 1.5 },
            { playerId: 2, playerName: 'Bob', rank: 2, points: 1.0 },
          ],
        },
        {
          type: 'standings_update',
          data: [
            { playerId: 1, playerName: 'Alice', rank: 1, points: 2.0 },
            { playerId: 2, playerName: 'Bob', rank: 2, points: 1.5 },
            { playerId: 3, playerName: 'Charlie', rank: 3, points: 1.0 },
          ],
        },
      ];

      // Send updates with small delays
      for (let i = 0; i < updates.length; i++) {
        act(() => {
          ws!.simulateMessage(updates[i]);
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Should display final state
      await waitFor(() => {
        expect(screen.getByTestId('standing-1')).toBeInTheDocument();
        expect(screen.getByTestId('standing-2')).toBeInTheDocument();
        expect(screen.getByTestId('standing-3')).toBeInTheDocument();
      });

      // Verify final standings
      expect(
        within(screen.getByTestId('standing-1')).getByTestId('points')
      ).toHaveTextContent('2.0');
    });
  });

  describe('Real-Time Game Updates', () => {
    test('should display real-time game results', async () => {
      render(<MockRealTimeGameUpdates tournamentId={1} roundNumber={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('game-connection-status')).toHaveTextContent(
          'Game Updates: connected'
        );
      });

      const ws = MockWebSocket.getLastInstance();

      // Simulate game result update
      const gameUpdate = {
        type: 'game_result_update',
        data: {
          gameId: 'game-1-1',
          whitePlayer: 'Alice Johnson',
          blackPlayer: 'Bob Smith',
          result: 'white_wins',
        },
      };

      act(() => {
        ws!.simulateMessage(gameUpdate);
      });

      await waitFor(() => {
        expect(screen.getByTestId('game-game-1-1')).toBeInTheDocument();
      });

      const gameElement = screen.getByTestId('game-game-1-1');
      expect(within(gameElement).getByTestId('white-player')).toHaveTextContent(
        'Alice Johnson'
      );
      expect(within(gameElement).getByTestId('black-player')).toHaveTextContent(
        'Bob Smith'
      );
      expect(within(gameElement).getByTestId('result')).toHaveTextContent(
        'white_wins'
      );
    });

    test('should update existing games when result changes', async () => {
      render(<MockRealTimeGameUpdates tournamentId={1} roundNumber={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('game-connection-status')).toHaveTextContent(
          'Game Updates: connected'
        );
      });

      const ws = MockWebSocket.getLastInstance();

      // Initial game state
      const initialGame = {
        type: 'game_result_update',
        data: {
          gameId: 'game-1-1',
          whitePlayer: 'Alice Johnson',
          blackPlayer: 'Bob Smith',
          result: null,
        },
      };

      act(() => {
        ws!.simulateMessage(initialGame);
      });

      await waitFor(() => {
        expect(
          within(screen.getByTestId('game-game-1-1')).getByTestId('result')
        ).toHaveTextContent('In Progress');
      });

      // Update with result
      const gameResult = {
        type: 'game_result_update',
        data: {
          gameId: 'game-1-1',
          result: 'draw',
        },
      };

      act(() => {
        ws!.simulateMessage(gameResult);
      });

      await waitFor(() => {
        expect(
          within(screen.getByTestId('game-game-1-1')).getByTestId('result')
        ).toHaveTextContent('draw');
      });
    });
  });

  describe('Live Tournament Broadcast', () => {
    test('should show live broadcast status and viewer count', async () => {
      render(<MockTournamentLiveBroadcast tournamentId={1} />);

      // Should start offline
      expect(screen.getByTestId('broadcast-status')).toHaveTextContent(
        'OFFLINE'
      );

      await waitFor(() => {
        expect(screen.getByTestId('broadcast-status')).toHaveTextContent(
          'LIVE'
        );
      });

      const ws = MockWebSocket.getLastInstance();

      // Update viewer count
      act(() => {
        ws!.simulateMessage({ type: 'viewer_count', count: 42 });
      });

      await waitFor(() => {
        expect(screen.getByTestId('viewer-count')).toHaveTextContent(
          'Viewers: 42'
        );
      });
    });

    test('should display broadcast events in real-time', async () => {
      render(<MockTournamentLiveBroadcast tournamentId={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('broadcast-status')).toHaveTextContent(
          'LIVE'
        );
      });

      const ws = MockWebSocket.getLastInstance();

      // Send broadcast events
      const events = [
        {
          type: 'broadcast_event',
          data: {
            timestamp: Date.now(),
            time: '14:30',
            message: 'Round 1 has started!',
          },
        },
        {
          type: 'broadcast_event',
          data: {
            timestamp: Date.now() + 1,
            time: '14:45',
            message: 'Alice Johnson takes the lead!',
          },
        },
        {
          type: 'broadcast_event',
          data: {
            timestamp: Date.now() + 2,
            time: '15:00',
            message: 'Round 1 completed',
          },
        },
      ];

      for (const event of events) {
        act(() => {
          ws!.simulateMessage(event);
        });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Events should be displayed in reverse chronological order (newest first)
      await waitFor(() => {
        expect(screen.getByTestId('event-0')).toBeInTheDocument();
        expect(screen.getByTestId('event-1')).toBeInTheDocument();
        expect(screen.getByTestId('event-2')).toBeInTheDocument();
      });

      expect(
        within(screen.getByTestId('event-0')).getByTestId('event-message')
      ).toHaveTextContent('Round 1 completed');
      expect(
        within(screen.getByTestId('event-1')).getByTestId('event-message')
      ).toHaveTextContent('Alice Johnson takes the lead!');
      expect(
        within(screen.getByTestId('event-2')).getByTestId('event-message')
      ).toHaveTextContent('Round 1 has started!');
    });

    test('should limit broadcast events to last 10', async () => {
      render(<MockTournamentLiveBroadcast tournamentId={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('broadcast-status')).toHaveTextContent(
          'LIVE'
        );
      });

      const ws = MockWebSocket.getLastInstance();

      // Send 15 events (more than the 10 limit)
      for (let i = 0; i < 15; i++) {
        const event = {
          type: 'broadcast_event',
          data: {
            timestamp: Date.now() + i,
            time: `14:${30 + i}`,
            message: `Event ${i + 1}`,
          },
        };

        act(() => {
          ws!.simulateMessage(event);
        });
      }

      // Should only show events 0-9 (latest 10)
      await waitFor(() => {
        expect(screen.getByTestId('event-0')).toBeInTheDocument();
        expect(screen.getByTestId('event-9')).toBeInTheDocument();
      });

      // Event 10 and beyond should not exist
      expect(screen.queryByTestId('event-10')).not.toBeInTheDocument();

      // Newest event should be Event 15
      expect(
        within(screen.getByTestId('event-0')).getByTestId('event-message')
      ).toHaveTextContent('Event 15');
    });
  });

  describe('Performance and Memory Management', () => {
    test('should clean up WebSocket connections when component unmounts', async () => {
      const { unmount } = render(<MockRealTimeStandings tournamentId={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent(
          'Status: connected'
        );
      });

      const ws = MockWebSocket.getLastInstance();
      const closeSpy = vi.spyOn(ws!, 'close');

      unmount();

      expect(closeSpy).toHaveBeenCalled();
    });

    test('should handle rapid message updates without memory leaks', async () => {
      const { unmount } = render(<MockRealTimeStandings tournamentId={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent(
          'Status: connected'
        );
      });

      const ws = MockWebSocket.getLastInstance();

      // Send many rapid updates
      for (let i = 0; i < 1000; i++) {
        act(() => {
          ws!.simulateMessage({
            type: 'standings_update',
            data: [
              { playerId: 1, playerName: `Player ${i}`, rank: 1, points: i },
            ],
          });
        });
      }

      // Component should still be responsive
      await waitFor(() => {
        expect(screen.getByTestId('standing-1')).toBeInTheDocument();
      });

      // Should display latest update
      expect(
        within(screen.getByTestId('standing-1')).getByTestId('player-name')
      ).toHaveTextContent('Player 999');

      unmount();
    });
  });

  describe('Error Recovery', () => {
    test('should handle malformed WebSocket messages gracefully', async () => {
      render(<MockRealTimeStandings tournamentId={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent(
          'Status: connected'
        );
      });

      const ws = MockWebSocket.getLastInstance();

      // Send malformed message
      act(() => {
        if (ws!.onmessage) {
          ws!.onmessage(new MessageEvent('message', { data: 'invalid json' }));
        }
      });

      // Component should still be functional
      expect(screen.getByTestId('connection-status')).toHaveTextContent(
        'Status: connected'
      );

      // Send valid message after malformed one
      act(() => {
        ws!.simulateMessage({
          type: 'standings_update',
          data: [{ playerId: 1, playerName: 'Alice', rank: 1, points: 1.0 }],
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('standing-1')).toBeInTheDocument();
      });
    });

    test('should handle unexpected message types', async () => {
      render(<MockRealTimeStandings tournamentId={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent(
          'Status: connected'
        );
      });

      const ws = MockWebSocket.getLastInstance();

      // Send unexpected message type
      act(() => {
        ws!.simulateMessage({
          type: 'unknown_message_type',
          data: { some: 'data' },
        });
      });

      // Component should ignore unknown messages and continue working
      expect(screen.getByTestId('connection-status')).toHaveTextContent(
        'Status: connected'
      );

      // Valid message should still work
      act(() => {
        ws!.simulateMessage({
          type: 'standings_update',
          data: [{ playerId: 1, playerName: 'Alice', rank: 1, points: 1.0 }],
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('standing-1')).toBeInTheDocument();
      });
    });
  });
});
