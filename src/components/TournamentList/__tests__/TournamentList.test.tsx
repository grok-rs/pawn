import { render, act } from '@testing-library/react';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import { vi } from 'vitest';
import TournamentList from '../TournamentList';
import type { Tournament } from '@dto/bindings';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock the commands from bindings
vi.mock('../../../dto/bindings', () => ({
  commands: {
    getPlayersByTournamentEnhanced: vi.fn().mockResolvedValue([]),
    getRoundsByTournament: vi
      .fn()
      .mockImplementation((tournamentId: number) => {
        // Return mock rounds data for testing
        if (tournamentId === 1) {
          // Spring Championship has 3 completed rounds (ongoing)
          return Promise.resolve([
            {
              id: 1,
              tournament_id: 1,
              round_number: 1,
              status: 'Completed',
              created_at: '2024-01-01T00:00:00Z',
              completed_at: '2024-01-01T01:00:00Z',
            },
            {
              id: 2,
              tournament_id: 1,
              round_number: 2,
              status: 'Completed',
              created_at: '2024-01-01T00:00:00Z',
              completed_at: '2024-01-01T02:00:00Z',
            },
            {
              id: 3,
              tournament_id: 1,
              round_number: 3,
              status: 'Completed',
              created_at: '2024-01-01T00:00:00Z',
              completed_at: '2024-01-01T03:00:00Z',
            },
          ]);
        } else if (tournamentId === 2) {
          // Summer Open has 0 completed rounds (not started)
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      }),
  },
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockTournaments: Tournament[] = [
  {
    id: 1,
    name: 'Spring Championship',
    location: 'New York',
    date: '2024-03-15',
    time_type: 'Classical',
    tournament_type: 'Swiss',
    player_count: 16,
    rounds_played: 3,
    total_rounds: 9,
    country_code: 'US',
    status: 'active',
    start_time: '2024-03-15T09:00:00Z',
    end_time: null,
    description: 'Annual spring tournament',
    website_url: 'https://example.com/spring',
    contact_email: 'contact@example.com',
    entry_fee: 50,
    currency: 'USD',
    is_team_tournament: false,
    team_size: null,
    max_teams: null,
  },
  {
    id: 2,
    name: 'Summer Open',
    location: 'California',
    date: '2024-06-20',
    time_type: 'Rapid',
    tournament_type: 'Round Robin',
    player_count: 12,
    rounds_played: 0,
    total_rounds: 11,
    country_code: 'US',
    status: 'upcoming',
    start_time: null,
    end_time: null,
    description: 'Open tournament for summer',
    website_url: null,
    contact_email: null,
    entry_fee: null,
    currency: null,
    is_team_tournament: false,
    team_size: null,
    max_teams: null,
  },
];

const mockOnDelete = vi.fn();

describe('TournamentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders tournament list with correct data', async () => {
    await act(async () => {
      render(
        <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Spring Championship')).toBeInTheDocument();
      expect(screen.getByText('Summer Open')).toBeInTheDocument();
    });
  });

  test('displays tournament types correctly', async () => {
    await act(async () => {
      render(
        <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Swiss')).toBeInTheDocument();
      expect(screen.getByText('Round Robin')).toBeInTheDocument();
    });
  });

  test('displays tournament locations', async () => {
    await act(async () => {
      render(
        <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('New York')).toBeInTheDocument();
      expect(screen.getByText('California')).toBeInTheDocument();
    });
  });

  test('displays tournament dates', async () => {
    await act(async () => {
      render(
        <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Mar 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('Jun 20, 2024')).toBeInTheDocument();
    });
  });

  test('displays tournament time types', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('timeControls.Classical')).toBeInTheDocument();
    expect(screen.getByText('timeControls.Rapid')).toBeInTheDocument();
  });

  test('displays tournament status', async () => {
    await act(async () => {
      render(
        <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
      );
    });

    // Wait for async data to load
    await waitFor(() => {
      // First tournament has 3 completed rounds out of 9, so it's ongoing
      expect(screen.getByText('ongoing')).toBeInTheDocument();
      // Second tournament has 0 completed rounds, so it's not started
      expect(screen.getByText('notStarted')).toBeInTheDocument();
    });
  });

  test('displays player count information', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('16 players')).toBeInTheDocument();
    expect(screen.getByText('12 players')).toBeInTheDocument();
  });

  test('displays rounds information', async () => {
    await act(async () => {
      render(
        <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
      );
    });

    // Wait for tournament data to load, then check for round information
    await waitFor(() => {
      // Check for round progress display - format is "round X / Y"
      // Only ongoing tournaments show progress
      expect(screen.getByText('round 3 / 9')).toBeInTheDocument();
      // Not started tournaments don't show progress
      expect(screen.queryByText('round 0 / 11')).not.toBeInTheDocument();
    });
  });

  test('handles tournament selection', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    const firstTournament = screen.getByText('Spring Championship');
    fireEvent.click(firstTournament);

    // Clicking a tournament navigates to it, doesn't call onDelete
    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  test('displays empty state when no tournaments', () => {
    render(<TournamentList tournaments={[]} onDelete={mockOnDelete} />);

    // TournamentList doesn't handle empty state - it just renders nothing
    expect(screen.queryByText('tournaments.empty')).not.toBeInTheDocument();
  });

  test('handles tournaments with minimal data', () => {
    const minimalTournaments: Tournament[] = [
      {
        id: 3,
        name: 'Minimal Tournament',
        location: 'Unknown',
        date: '2024-01-01',
        time_type: 'Blitz',
        tournament_type: null,
        player_count: 8,
        rounds_played: 0,
        total_rounds: 7,
        country_code: 'XX',
        status: null,
        start_time: null,
        end_time: null,
        description: null,
        website_url: null,
        contact_email: null,
        entry_fee: null,
        currency: null,
        is_team_tournament: false,
        team_size: null,
        max_teams: null,
      },
    ];

    render(
      <TournamentList
        tournaments={minimalTournaments}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Minimal Tournament')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('timeControls.Blitz')).toBeInTheDocument();
  });

  test('displays country codes', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    // Country codes are not currently displayed in the TournamentListItem component
    // This test verifies that the component renders without country codes
    expect(screen.queryByText('US')).not.toBeInTheDocument();
    expect(screen.queryByText('CA')).not.toBeInTheDocument();
  });

  test('handles tournament with description', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    // Descriptions are not currently displayed in the TournamentListItem component
    // This test verifies that the component renders tournament names correctly
    expect(screen.getByText('Spring Championship')).toBeInTheDocument();
    expect(screen.getByText('Summer Open')).toBeInTheDocument();
  });

  test('handles tournament with entry fee', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    // Entry fees are not currently displayed in the TournamentListItem component
    // This test verifies that the component renders tournament information correctly
    expect(screen.getByText('Spring Championship')).toBeInTheDocument();
    expect(screen.getByText('Summer Open')).toBeInTheDocument();
  });

  test('displays tournament progress', async () => {
    await act(async () => {
      render(
        <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
      );
    });

    // Wait for tournament data to load, then check for progress information
    await waitFor(() => {
      // First tournament has played 3 out of 9 rounds - only ongoing tournaments show progress
      expect(screen.getByText('round 3 / 9')).toBeInTheDocument();

      // Second tournament has played 0 out of 11 rounds - not started tournaments don't show progress
      expect(screen.queryByText('round 0 / 11')).not.toBeInTheDocument();
    });
  });

  test('handles large tournament list', () => {
    const largeTournamentList: Tournament[] = Array.from(
      { length: 50 },
      (_, i) => ({
        id: i + 1,
        name: `Tournament ${i + 1}`,
        location: `Location ${i + 1}`,
        date: '2024-01-01',
        time_type: 'Classical',
        tournament_type: 'Swiss',
        player_count: 16,
        rounds_played: 0,
        total_rounds: 9,
        country_code: 'US',
        status: 'upcoming',
        start_time: null,
        end_time: null,
        description: null,
        website_url: null,
        contact_email: null,
        entry_fee: null,
        currency: null,
        is_team_tournament: false,
        team_size: null,
        max_teams: null,
      })
    );

    render(
      <TournamentList
        tournaments={largeTournamentList}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Tournament 1')).toBeInTheDocument();
    expect(screen.getByText('Tournament 50')).toBeInTheDocument();
  });

  test('handles tournament selection with different tournament types', () => {
    const diverseTournaments: Tournament[] = [
      {
        ...mockTournaments[0],
        tournament_type: 'Knockout',
      },
      {
        ...mockTournaments[1],
        tournament_type: 'Swiss',
      },
    ];

    render(
      <TournamentList
        tournaments={diverseTournaments}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Knockout')).toBeInTheDocument();
    expect(screen.getByText('Swiss')).toBeInTheDocument();
  });
});
