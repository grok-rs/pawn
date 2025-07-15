import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import TournamentList from '../TournamentList';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
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

const mockTournaments = [
  {
    id: 1,
    name: 'Test Tournament 1',
    location: 'Test Location',
    date: '2024-01-01T00:00:00Z',
    tournament_type: 'Swiss',
    max_players: 32,
    rounds: 5,
    time_control: '90+30',
    description: 'Test tournament description',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    pairing_method: 'Swiss',
    time_control_id: null,
  },
  {
    id: 2,
    name: 'Test Tournament 2',
    location: 'Test Location 2',
    date: '2024-02-01T00:00:00Z',
    tournament_type: 'Round Robin',
    max_players: 16,
    rounds: 15,
    time_control: '25+10',
    description: 'Another test tournament',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    pairing_method: 'Round Robin',
    time_control_id: null,
  },
];

describe('TournamentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders tournament list with correct data', () => {
    render(<TournamentList tournaments={mockTournaments} />);

    expect(screen.getByText('Test Tournament 1')).toBeInTheDocument();
    expect(screen.getByText('Test Tournament 2')).toBeInTheDocument();
    expect(screen.getByText('Test Location')).toBeInTheDocument();
    expect(screen.getByText('Test Location 2')).toBeInTheDocument();
  });

  test('displays tournament types correctly', () => {
    render(<TournamentList tournaments={mockTournaments} />);

    expect(screen.getByText('Swiss')).toBeInTheDocument();
    expect(screen.getByText('Round Robin')).toBeInTheDocument();
  });

  test('displays time controls correctly', () => {
    render(<TournamentList tournaments={mockTournaments} />);

    expect(screen.getByText('90+30')).toBeInTheDocument();
    expect(screen.getByText('25+10')).toBeInTheDocument();
  });

  test('displays player counts correctly', () => {
    render(<TournamentList tournaments={mockTournaments} />);

    expect(screen.getByText('32 players')).toBeInTheDocument();
    expect(screen.getByText('16 players')).toBeInTheDocument();
  });

  test('displays round counts correctly', () => {
    render(<TournamentList tournaments={mockTournaments} />);

    expect(screen.getByText('5 rounds')).toBeInTheDocument();
    expect(screen.getByText('15 rounds')).toBeInTheDocument();
  });

  test('renders empty state when no tournaments provided', () => {
    render(<TournamentList tournaments={[]} />);

    expect(screen.getByText('tournaments.empty')).toBeInTheDocument();
  });

  test('handles tournament click events', () => {
    const onTournamentClick = vi.fn();
    render(
      <TournamentList
        tournaments={mockTournaments}
        onTournamentClick={onTournamentClick}
      />
    );

    const firstTournament = screen.getByText('Test Tournament 1');
    fireEvent.click(firstTournament);

    expect(onTournamentClick).toHaveBeenCalledWith(mockTournaments[0]);
  });

  test('handles tournament deletion', async () => {
    const onTournamentDelete = vi.fn();
    render(
      <TournamentList
        tournaments={mockTournaments}
        onTournamentDelete={onTournamentDelete}
      />
    );

    const deleteButtons = screen.getAllByText('common.delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(onTournamentDelete).toHaveBeenCalledWith(mockTournaments[0].id);
    });
  });

  test('displays loading state correctly', () => {
    render(<TournamentList tournaments={[]} loading={true} />);

    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  test('displays error state correctly', () => {
    const errorMessage = 'Failed to load tournaments';
    render(<TournamentList tournaments={[]} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('filters tournaments by name', () => {
    render(<TournamentList tournaments={mockTournaments} searchable={true} />);

    const searchInput = screen.getByPlaceholderText('tournaments.search');
    fireEvent.change(searchInput, { target: { value: 'Test Tournament 1' } });

    expect(screen.getByText('Test Tournament 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Tournament 2')).not.toBeInTheDocument();
  });

  test('filters tournaments by type', () => {
    render(<TournamentList tournaments={mockTournaments} filterable={true} />);

    const typeFilter = screen.getByLabelText('tournaments.filter_by_type');
    fireEvent.change(typeFilter, { target: { value: 'Swiss' } });

    expect(screen.getByText('Test Tournament 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Tournament 2')).not.toBeInTheDocument();
  });

  test('sorts tournaments by name', () => {
    render(<TournamentList tournaments={mockTournaments} sortable={true} />);

    const sortButton = screen.getByLabelText('tournaments.sort_by_name');
    fireEvent.click(sortButton);

    const tournamentElements = screen.getAllByText(/Test Tournament/);
    expect(tournamentElements[0]).toHaveTextContent('Test Tournament 1');
    expect(tournamentElements[1]).toHaveTextContent('Test Tournament 2');
  });

  test('sorts tournaments by date', () => {
    render(<TournamentList tournaments={mockTournaments} sortable={true} />);

    const sortButton = screen.getByLabelText('tournaments.sort_by_date');
    fireEvent.click(sortButton);

    const tournamentElements = screen.getAllByText(/Test Tournament/);
    expect(tournamentElements[0]).toHaveTextContent('Test Tournament 1');
    expect(tournamentElements[1]).toHaveTextContent('Test Tournament 2');
  });

  test('handles pagination correctly', () => {
    const manyTournaments = Array.from({ length: 25 }, (_, i) => ({
      ...mockTournaments[0],
      id: i + 1,
      name: `Tournament ${i + 1}`,
    }));

    render(<TournamentList tournaments={manyTournaments} pageSize={10} />);

    // Should show first 10 tournaments
    expect(screen.getByText('Tournament 1')).toBeInTheDocument();
    expect(screen.getByText('Tournament 10')).toBeInTheDocument();
    expect(screen.queryByText('Tournament 11')).not.toBeInTheDocument();

    // Navigate to next page
    const nextButton = screen.getByText('common.next');
    fireEvent.click(nextButton);

    expect(screen.getByText('Tournament 11')).toBeInTheDocument();
    expect(screen.getByText('Tournament 20')).toBeInTheDocument();
  });

  test('displays tournament stats correctly', () => {
    render(<TournamentList tournaments={mockTournaments} showStats={true} />);

    expect(screen.getByText('tournaments.total_count')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('handles refresh action', () => {
    const onRefresh = vi.fn();
    render(
      <TournamentList tournaments={mockTournaments} onRefresh={onRefresh} />
    );

    const refreshButton = screen.getByText('common.refresh');
    fireEvent.click(refreshButton);

    expect(onRefresh).toHaveBeenCalled();
  });

  test('displays tournament status correctly', () => {
    const tournamentsWithStatus = mockTournaments.map(t => ({
      ...t,
      status: 'active',
    }));

    render(<TournamentList tournaments={tournamentsWithStatus} />);

    expect(screen.getAllByText('tournaments.status.active')).toHaveLength(2);
  });

  test('handles tournament export', () => {
    const onExport = vi.fn();
    render(
      <TournamentList tournaments={mockTournaments} onExport={onExport} />
    );

    const exportButton = screen.getByText('common.export');
    fireEvent.click(exportButton);

    expect(onExport).toHaveBeenCalledWith(mockTournaments);
  });

  test('displays tournament creation date correctly', () => {
    render(<TournamentList tournaments={mockTournaments} />);

    // Should display formatted dates
    expect(screen.getByText('2024-01-01')).toBeInTheDocument();
  });

  test('handles keyboard navigation', () => {
    render(<TournamentList tournaments={mockTournaments} />);

    const firstTournament = screen.getByText('Test Tournament 1');
    firstTournament.focus();

    fireEvent.keyDown(firstTournament, { key: 'Enter' });

    // Should trigger tournament selection
    expect(firstTournament).toBeInTheDocument();
  });

  test('displays tournament actions menu', () => {
    render(<TournamentList tournaments={mockTournaments} showActions={true} />);

    const actionsButtons = screen.getAllByText('common.actions');
    expect(actionsButtons).toHaveLength(2);

    fireEvent.click(actionsButtons[0]);

    expect(screen.getByText('tournaments.view')).toBeInTheDocument();
    expect(screen.getByText('tournaments.edit')).toBeInTheDocument();
    expect(screen.getByText('tournaments.delete')).toBeInTheDocument();
  });

  test('handles tournament duplication', () => {
    const onDuplicate = vi.fn();
    render(
      <TournamentList tournaments={mockTournaments} onDuplicate={onDuplicate} />
    );

    const duplicateButton = screen.getByText('tournaments.duplicate');
    fireEvent.click(duplicateButton);

    expect(onDuplicate).toHaveBeenCalledWith(mockTournaments[0]);
  });

  test('displays tournament player count badge', () => {
    const tournamentsWithPlayers = mockTournaments.map(t => ({
      ...t,
      current_players: 15,
    }));

    render(<TournamentList tournaments={tournamentsWithPlayers} />);

    expect(screen.getByText('15/32')).toBeInTheDocument();
    expect(screen.getByText('15/16')).toBeInTheDocument();
  });

  test('handles tournament archive', () => {
    const onArchive = vi.fn();
    render(
      <TournamentList tournaments={mockTournaments} onArchive={onArchive} />
    );

    const archiveButton = screen.getByText('tournaments.archive');
    fireEvent.click(archiveButton);

    expect(onArchive).toHaveBeenCalledWith(mockTournaments[0]);
  });

  test('displays tournament location with map link', () => {
    render(
      <TournamentList tournaments={mockTournaments} showMapLinks={true} />
    );

    const mapLinks = screen.getAllByText('tournaments.view_map');
    expect(mapLinks).toHaveLength(2);

    fireEvent.click(mapLinks[0]);

    // Should open map in new tab
    expect(window.open).toHaveBeenCalledWith(
      `https://maps.google.com/maps?q=Test Location`,
      '_blank'
    );
  });
});
