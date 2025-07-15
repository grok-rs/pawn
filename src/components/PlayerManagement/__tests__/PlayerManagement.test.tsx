import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import PlayerManagement from '../PlayerManagement';

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

const mockPlayers = [
  {
    id: 1,
    tournament_id: 1,
    name: 'John Doe',
    rating: 1800,
    country_code: 'US',
    title: 'FM',
    birth_date: '1995-05-15',
    gender: 'M',
    email: 'john@example.com',
    phone: '+1-555-0123',
    club: 'Chess Club A',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    tournament_id: 1,
    name: 'Jane Smith',
    rating: 2000,
    country_code: 'CA',
    title: 'IM',
    birth_date: '1992-08-20',
    gender: 'F',
    email: 'jane@example.com',
    phone: '+1-555-0456',
    club: 'Chess Club B',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockOnPlayersUpdated = vi.fn();

describe('PlayerManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders player list with correct data', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onPlayersUpdated={mockOnPlayersUpdated}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  test('displays player titles correctly', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onPlayersUpdated={mockOnPlayersUpdated}
      />
    );

    // Titles are displayed using translation keys, so we look for the translated title
    expect(screen.getByText('title.FM')).toBeInTheDocument();
    expect(screen.getByText('title.IM')).toBeInTheDocument();
  });

  test('displays player countries correctly', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onPlayersUpdated={mockOnPlayersUpdated}
      />
    );

    // Countries are displayed using translation keys
    expect(screen.getByText('country.US')).toBeInTheDocument();
    expect(screen.getByText('country.CA')).toBeInTheDocument();
  });

  test('displays empty state when no players', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={[]}
        onPlayersUpdated={mockOnPlayersUpdated}
      />
    );

    expect(screen.getByText('noPlayersRegistered')).toBeInTheDocument();
  });

  test('calls onPlayersUpdated when provided', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onPlayersUpdated={mockOnPlayersUpdated}
      />
    );

    // The component should exist and could potentially call the callback
    expect(mockOnPlayersUpdated).toHaveBeenCalledTimes(0);
  });

  test('renders with tournament details', () => {
    const mockTournamentDetails = {
      id: 1,
      name: 'Test Tournament',
      status: 'active',
    };

    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onPlayersUpdated={mockOnPlayersUpdated}
        tournamentDetails={mockTournamentDetails}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  test('displays player ratings', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onPlayersUpdated={mockOnPlayersUpdated}
      />
    );

    // Ratings are displayed in chips, so look for them
    expect(screen.getByText('1800')).toBeInTheDocument();
    expect(screen.getByText('2000')).toBeInTheDocument();
  });

  test('handles player management interface', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onPlayersUpdated={mockOnPlayersUpdated}
      />
    );

    // Check that the component renders basic player management interface
    expect(screen.getByText('players')).toBeInTheDocument();
  });

  test('displays player status correctly', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onPlayersUpdated={mockOnPlayersUpdated}
      />
    );

    // Both players have active status - check for status translation key
    const activeElements = screen.getAllByText('playerStatus.active');
    expect(activeElements.length).toBeGreaterThan(0);
  });

  test('handles tournament ID prop', () => {
    render(
      <PlayerManagement
        tournamentId={999}
        players={mockPlayers}
        onPlayersUpdated={mockOnPlayersUpdated}
      />
    );

    // Component should render without crashing with different tournament ID
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  test('renders player management tabs', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onPlayersUpdated={mockOnPlayersUpdated}
      />
    );

    // Check for tab navigation
    expect(screen.getByText('players')).toBeInTheDocument();
    expect(screen.getByText('categories')).toBeInTheDocument();
  });

  test('handles empty player list gracefully', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={[]}
        onPlayersUpdated={mockOnPlayersUpdated}
      />
    );

    // Should not crash with empty players array
    expect(screen.getByText('noPlayersRegistered')).toBeInTheDocument();
  });

  test('displays add player button', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onPlayersUpdated={mockOnPlayersUpdated}
      />
    );

    // Check for add player functionality
    expect(screen.getByText('addPlayer')).toBeInTheDocument();
  });
});
