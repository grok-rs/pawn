import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import TournamentList from '../TournamentList';
import type { Tournament } from '../../../dto/bindings';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
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
  },
];

const mockOnDelete = vi.fn();

describe('TournamentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders tournament list with correct data', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('Spring Championship')).toBeInTheDocument();
    expect(screen.getByText('Summer Open')).toBeInTheDocument();
  });

  test('displays tournament types correctly', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('Swiss')).toBeInTheDocument();
    expect(screen.getByText('Round Robin')).toBeInTheDocument();
  });

  test('displays tournament locations', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('New York')).toBeInTheDocument();
    expect(screen.getByText('California')).toBeInTheDocument();
  });

  test('displays tournament dates', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('2024-03-15')).toBeInTheDocument();
    expect(screen.getByText('2024-06-20')).toBeInTheDocument();
  });

  test('displays tournament time types', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('Classical')).toBeInTheDocument();
    expect(screen.getByText('Rapid')).toBeInTheDocument();
  });

  test('displays tournament status', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('upcoming')).toBeInTheDocument();
  });

  test('displays player count information', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('16')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  test('displays rounds information', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    // Check for total rounds
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
  });

  test('handles tournament selection', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    const firstTournament = screen.getByText('Spring Championship');
    fireEvent.click(firstTournament);

    expect(mockOnDelete).toHaveBeenCalledWith(mockTournaments[0]);
  });

  test('displays empty state when no tournaments', () => {
    render(<TournamentList tournaments={[]} onDelete={mockOnDelete} />);

    expect(screen.getByText('tournaments.empty')).toBeInTheDocument();
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
    expect(screen.getByText('Blitz')).toBeInTheDocument();
  });

  test('displays country codes', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    const countryElements = screen.getAllByText('US');
    expect(countryElements.length).toBeGreaterThan(0);
  });

  test('handles tournament with description', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('Annual spring tournament')).toBeInTheDocument();
    expect(screen.getByText('Open tournament for summer')).toBeInTheDocument();
  });

  test('handles tournament with entry fee', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
  });

  test('displays tournament progress', () => {
    render(
      <TournamentList tournaments={mockTournaments} onDelete={mockOnDelete} />
    );

    // First tournament has played 3 out of 9 rounds
    expect(screen.getByText('3')).toBeInTheDocument();

    // Second tournament has played 0 out of 11 rounds
    expect(screen.getByText('0')).toBeInTheDocument();
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
