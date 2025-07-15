import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('PlayerManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders player list with correct data', () => {
    render(<PlayerManagement tournamentId={1} players={mockPlayers} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('1800')).toBeInTheDocument();
    expect(screen.getByText('2000')).toBeInTheDocument();
  });

  test('displays player titles correctly', () => {
    render(<PlayerManagement tournamentId={1} players={mockPlayers} />);

    expect(screen.getByText('FM')).toBeInTheDocument();
    expect(screen.getByText('IM')).toBeInTheDocument();
  });

  test('displays player countries correctly', () => {
    render(<PlayerManagement tournamentId={1} players={mockPlayers} />);

    expect(screen.getByText('US')).toBeInTheDocument();
    expect(screen.getByText('CA')).toBeInTheDocument();
  });

  test('handles add player action', () => {
    const onAddPlayer = vi.fn();
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onAddPlayer={onAddPlayer}
      />
    );

    const addButton = screen.getByText('players.add_player');
    fireEvent.click(addButton);

    expect(onAddPlayer).toHaveBeenCalled();
  });

  test('handles player edit action', () => {
    const onEditPlayer = vi.fn();
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onEditPlayer={onEditPlayer}
      />
    );

    const editButtons = screen.getAllByText('common.edit');
    fireEvent.click(editButtons[0]);

    expect(onEditPlayer).toHaveBeenCalledWith(mockPlayers[0]);
  });

  test('handles player delete action', async () => {
    const onDeletePlayer = vi.fn();
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onDeletePlayer={onDeletePlayer}
      />
    );

    const deleteButtons = screen.getAllByText('common.delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(onDeletePlayer).toHaveBeenCalledWith(mockPlayers[0].id);
    });
  });

  test('displays empty state when no players', () => {
    render(<PlayerManagement tournamentId={1} players={[]} />);

    expect(screen.getByText('players.empty')).toBeInTheDocument();
  });

  test('handles player search', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        searchable={true}
      />
    );

    const searchInput = screen.getByPlaceholderText('players.search');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  test('filters players by rating range', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        filterable={true}
      />
    );

    const minRatingInput = screen.getByLabelText('players.min_rating');
    const maxRatingInput = screen.getByLabelText('players.max_rating');

    fireEvent.change(minRatingInput, { target: { value: '1900' } });
    fireEvent.change(maxRatingInput, { target: { value: '2100' } });

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  test('filters players by country', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        filterable={true}
      />
    );

    const countryFilter = screen.getByLabelText('players.filter_by_country');
    fireEvent.change(countryFilter, { target: { value: 'US' } });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  test('filters players by title', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        filterable={true}
      />
    );

    const titleFilter = screen.getByLabelText('players.filter_by_title');
    fireEvent.change(titleFilter, { target: { value: 'IM' } });

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  test('sorts players by name', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        sortable={true}
      />
    );

    const sortButton = screen.getByLabelText('players.sort_by_name');
    fireEvent.click(sortButton);

    const playerElements = screen.getAllByText(/\w+ \w+/);
    expect(playerElements[0]).toHaveTextContent('Jane Smith');
    expect(playerElements[1]).toHaveTextContent('John Doe');
  });

  test('sorts players by rating', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        sortable={true}
      />
    );

    const sortButton = screen.getByLabelText('players.sort_by_rating');
    fireEvent.click(sortButton);

    const ratingElements = screen.getAllByText(/\d{4}/);
    expect(ratingElements[0]).toHaveTextContent('2000');
    expect(ratingElements[1]).toHaveTextContent('1800');
  });

  test('handles bulk import', () => {
    const onBulkImport = vi.fn();
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onBulkImport={onBulkImport}
      />
    );

    const bulkImportButton = screen.getByText('players.bulk_import');
    fireEvent.click(bulkImportButton);

    expect(onBulkImport).toHaveBeenCalled();
  });

  test('handles player export', () => {
    const onExport = vi.fn();
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onExport={onExport}
      />
    );

    const exportButton = screen.getByText('common.export');
    fireEvent.click(exportButton);

    expect(onExport).toHaveBeenCalledWith(mockPlayers);
  });

  test('displays player statistics', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        showStats={true}
      />
    );

    expect(screen.getByText('players.total_count')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('players.average_rating')).toBeInTheDocument();
    expect(screen.getByText('1900')).toBeInTheDocument();
  });

  test('handles player status change', () => {
    const onStatusChange = vi.fn();
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onStatusChange={onStatusChange}
      />
    );

    const statusButtons = screen.getAllByText('players.change_status');
    fireEvent.click(statusButtons[0]);

    const withdrawButton = screen.getByText('players.withdraw');
    fireEvent.click(withdrawButton);

    expect(onStatusChange).toHaveBeenCalledWith(mockPlayers[0].id, 'withdrawn');
  });

  test('handles player bye request', () => {
    const onByeRequest = vi.fn();
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onByeRequest={onByeRequest}
      />
    );

    const byeButtons = screen.getAllByText('players.request_bye');
    fireEvent.click(byeButtons[0]);

    expect(onByeRequest).toHaveBeenCalledWith(mockPlayers[0].id);
  });

  test('displays player categories', () => {
    const playersWithCategories = mockPlayers.map(p => ({
      ...p,
      categories: ['Open', 'Under 2000'],
    }));

    render(
      <PlayerManagement tournamentId={1} players={playersWithCategories} />
    );

    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Under 2000')).toBeInTheDocument();
  });

  test('handles category assignment', () => {
    const onCategoryAssign = vi.fn();
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onCategoryAssign={onCategoryAssign}
      />
    );

    const assignButtons = screen.getAllByText('players.assign_category');
    fireEvent.click(assignButtons[0]);

    expect(onCategoryAssign).toHaveBeenCalledWith(mockPlayers[0].id);
  });

  test('displays player rating history', () => {
    const playersWithHistory = mockPlayers.map(p => ({
      ...p,
      rating_history: [
        { date: '2024-01-01', rating: 1750, type: 'FIDE' },
        { date: '2024-02-01', rating: 1800, type: 'FIDE' },
      ],
    }));

    render(<PlayerManagement tournamentId={1} players={playersWithHistory} />);

    const historyButtons = screen.getAllByText('players.rating_history');
    fireEvent.click(historyButtons[0]);

    expect(screen.getByText('1750')).toBeInTheDocument();
    expect(screen.getByText('1800')).toBeInTheDocument();
  });

  test('handles late entry', () => {
    const onLateEntry = vi.fn();
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onLateEntry={onLateEntry}
      />
    );

    const lateEntryButton = screen.getByText('players.late_entry');
    fireEvent.click(lateEntryButton);

    expect(onLateEntry).toHaveBeenCalled();
  });

  test('displays player contact information', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        showContactInfo={true}
      />
    );

    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1-555-0123')).toBeInTheDocument();
    expect(screen.getByText('+1-555-0456')).toBeInTheDocument();
  });

  test('handles pagination for large player lists', () => {
    const manyPlayers = Array.from({ length: 25 }, (_, i) => ({
      ...mockPlayers[0],
      id: i + 1,
      name: `Player ${i + 1}`,
    }));

    render(
      <PlayerManagement tournamentId={1} players={manyPlayers} pageSize={10} />
    );

    // Should show first 10 players
    expect(screen.getByText('Player 1')).toBeInTheDocument();
    expect(screen.getByText('Player 10')).toBeInTheDocument();
    expect(screen.queryByText('Player 11')).not.toBeInTheDocument();

    // Navigate to next page
    const nextButton = screen.getByText('common.next');
    fireEvent.click(nextButton);

    expect(screen.getByText('Player 11')).toBeInTheDocument();
    expect(screen.getByText('Player 20')).toBeInTheDocument();
  });

  test('validates player data before submission', () => {
    const onAddPlayer = vi.fn();
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onAddPlayer={onAddPlayer}
      />
    );

    const addButton = screen.getByText('players.add_player');
    fireEvent.click(addButton);

    // Try to submit with empty name
    const nameInput = screen.getByLabelText('players.name');
    const submitButton = screen.getByText('common.submit');

    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.click(submitButton);

    expect(screen.getByText('validation.name_required')).toBeInTheDocument();
    expect(onAddPlayer).not.toHaveBeenCalled();
  });

  test('handles player selection for bulk operations', () => {
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        selectable={true}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    expect(screen.getByText('players.selected_count')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('handles bulk player actions', () => {
    const onBulkAction = vi.fn();
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onBulkAction={onBulkAction}
        selectable={true}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    const bulkActionButton = screen.getByText('players.bulk_actions');
    fireEvent.click(bulkActionButton);

    const withdrawButton = screen.getByText('players.bulk_withdraw');
    fireEvent.click(withdrawButton);

    expect(onBulkAction).toHaveBeenCalledWith('withdraw', [
      mockPlayers[0].id,
      mockPlayers[1].id,
    ]);
  });

  test('displays loading state correctly', () => {
    render(<PlayerManagement tournamentId={1} players={[]} loading={true} />);

    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  test('displays error state correctly', () => {
    const errorMessage = 'Failed to load players';
    render(
      <PlayerManagement tournamentId={1} players={[]} error={errorMessage} />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('handles refresh action', () => {
    const onRefresh = vi.fn();
    render(
      <PlayerManagement
        tournamentId={1}
        players={mockPlayers}
        onRefresh={onRefresh}
      />
    );

    const refreshButton = screen.getByText('common.refresh');
    fireEvent.click(refreshButton);

    expect(onRefresh).toHaveBeenCalled();
  });
});
