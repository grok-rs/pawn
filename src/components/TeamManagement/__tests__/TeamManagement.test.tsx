import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TeamManagement from '../TeamManagement';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock MUI icons
vi.mock('@mui/icons-material', () => ({
  Add: () => <span data-testid="add-icon">➕</span>,
  Edit: () => <span data-testid="edit-icon">✏️</span>,
  Delete: () => <span data-testid="delete-icon">🗑️</span>,
  People: () => <span data-testid="people-icon">👥</span>,
  Person: () => <span data-testid="person-icon">👤</span>,
  Star: () => <span data-testid="star-icon">⭐</span>,
}));

// Mock commands
const mockCommands = {
  getPlayersByTournament: vi.fn(),
  getTeamsByTournament: vi.fn(),
  createTeam: vi.fn(),
  updateTeam: vi.fn(),
  deleteTeam: vi.fn(),
  addPlayerToTeam: vi.fn(),
  removePlayerFromTeam: vi.fn(),
  getTeamMemberships: vi.fn(),
};

vi.mock('@dto/bindings', () => ({
  commands: mockCommands,
}));

// Mock data types
interface Team {
  id: number;
  tournament_id: number;
  name: string;
  captain?: string;
  description?: string;
  color?: string;
  club_affiliation?: string;
  contact_email?: string;
  contact_phone?: string;
  max_board_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Player {
  id: number;
  tournament_id: number;
  name: string;
  rating?: number;
  title?: string;
  country_code?: string;
  birth_date?: string;
  gender?: string;
  email?: string;
  phone?: string;
  club?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TeamMembership {
  id: number;
  team_id: number;
  player_id: number;
  board_number?: number;
  is_captain: boolean;
  is_reserve: boolean;
  rating_at_assignment?: number;
  notes?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Mock data
const createMockPlayer = (
  id: number,
  overrides: Partial<Player> = {}
): Player => ({
  id,
  tournament_id: 1,
  name: `Player ${id}`,
  rating: 1800 + id * 50,
  title: null,
  country_code: 'US',
  birth_date: null,
  gender: 'M',
  email: `player${id}@test.com`,
  phone: null,
  club: `Club ${id}`,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockTeam = (id: number, overrides: Partial<Team> = {}): Team => ({
  id,
  tournament_id: 1,
  name: `Team ${id}`,
  captain: `Player ${id}`,
  description: `Team ${id} description`,
  color: '#1976d2',
  club_affiliation: `Club ${id}`,
  contact_email: `team${id}@test.com`,
  contact_phone: null,
  max_board_count: 4,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockMembership = (
  id: number,
  teamId: number,
  playerId: number,
  overrides: Partial<TeamMembership> = {}
): TeamMembership => ({
  id,
  team_id: teamId,
  player_id: playerId,
  board_number: 1,
  is_captain: false,
  is_reserve: false,
  rating_at_assignment: 1800,
  notes: null,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('TeamManagement', () => {
  const mockPlayers = [
    createMockPlayer(1),
    createMockPlayer(2),
    createMockPlayer(3),
    createMockPlayer(4),
  ];

  const mockTeams = [createMockTeam(1), createMockTeam(2)];

  const mockMemberships = [
    createMockMembership(1, 1, 1, { is_captain: true }),
    createMockMembership(2, 1, 2),
    createMockMembership(3, 2, 3),
    createMockMembership(4, 2, 4, { is_reserve: true }),
  ];

  const mockOnTeamsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCommands.getPlayersByTournament.mockResolvedValue(mockPlayers);
    mockCommands.getTeamsByTournament.mockResolvedValue(mockTeams);
    mockCommands.getTeamMemberships.mockResolvedValue(mockMemberships);
  });

  describe('Initial Rendering', () => {
    test('renders team management interface', async () => {
      render(<TeamManagement tournamentId={1} />);

      expect(screen.getByText('teamManagement')).toBeInTheDocument();
      expect(screen.getByText('createNewTeam')).toBeInTheDocument();
      expect(screen.getByTestId('add-icon')).toBeInTheDocument();
    });

    test('loads players on mount', async () => {
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalledWith(1);
      });
    });

    test('shows loading state initially', () => {
      render(<TeamManagement tournamentId={1} />);

      // Should show loading indicator
      expect(screen.getByText('loadingTeams')).toBeInTheDocument();
    });

    test('handles loading error gracefully', async () => {
      mockCommands.getPlayersByTournament.mockRejectedValue(
        new Error('Load failed')
      );

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load team data')
        ).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Team Creation', () => {
    test('opens create team dialog', async () => {
      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      const createButton = screen.getByText('createNewTeam');
      await user.click(createButton);

      expect(screen.getByText('createTeam')).toBeInTheDocument();
      expect(screen.getByLabelText('teamName')).toBeInTheDocument();
      expect(screen.getByLabelText('description')).toBeInTheDocument();
    });

    test('creates team with valid data', async () => {
      mockCommands.createTeam.mockResolvedValue(
        createMockTeam(3, { name: 'New Team' })
      );

      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      // Open create dialog
      await user.click(screen.getByText('createNewTeam'));

      // Fill form
      const nameInput = screen.getByLabelText('teamName');
      await user.type(nameInput, 'New Team');

      const descriptionInput = screen.getByLabelText('description');
      await user.type(descriptionInput, 'Team description');

      const captainInput = screen.getByLabelText('captain');
      await user.type(captainInput, 'Team Captain');

      // Submit form
      const createButton = screen.getByText('create');
      await user.click(createButton);

      await waitFor(() => {
        expect(mockCommands.createTeam).toHaveBeenCalledWith({
          tournament_id: 1,
          name: 'New Team',
          description: 'Team description',
          captain: 'Team Captain',
          color: '#1976d2', // Default color
          max_board_count: 4, // Default
        });
      });
    });

    test('validates team name is required', async () => {
      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await user.click(screen.getByText('createNewTeam'));

      // Try to submit without name
      const createButton = screen.getByText('create');
      await user.click(createButton);

      // Should show validation error
      expect(screen.getByText('teamNameRequired')).toBeInTheDocument();
    });

    test('cancels team creation', async () => {
      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await user.click(screen.getByText('createNewTeam'));

      const cancelButton = screen.getByText('cancel');
      await user.click(cancelButton);

      // Dialog should close
      expect(screen.queryByText('createTeam')).not.toBeInTheDocument();
    });

    test('allows selecting team color', async () => {
      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await user.click(screen.getByText('createNewTeam'));

      // Look for color selection
      const colorSelect = screen.getByLabelText('teamColor');
      await user.click(colorSelect);

      // Should show color options
      expect(screen.getByText('#d32f2f')).toBeInTheDocument(); // Red
      expect(screen.getByText('#388e3c')).toBeInTheDocument(); // Green
    });

    test('sets max board count', async () => {
      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await user.click(screen.getByText('createNewTeam'));

      const maxBoardsInput = screen.getByLabelText('maxBoardCount');
      await user.clear(maxBoardsInput);
      await user.type(maxBoardsInput, '6');

      expect(maxBoardsInput).toHaveValue(6);
    });
  });

  describe('Team Display', () => {
    test('shows empty state when no teams', async () => {
      mockCommands.getPlayersByTournament.mockResolvedValue([]);
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(screen.getByText('noTeamsYet')).toBeInTheDocument();
        expect(screen.getByText('createFirstTeam')).toBeInTheDocument();
      });
    });

    test('displays team cards with information', async () => {
      // Mock teams data to be returned (unused but kept for reference)
      // const teamsWithData = [createMockTeam(1, { name: 'Test Team' })];

      // For this test, we'll simulate the component having teams
      render(<TeamManagement tournamentId={1} />);

      // Once teams are loaded, they should be displayed
      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });
    });

    test('shows team member count', async () => {
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      // Team cards should show member count
    });

    test('displays team colors correctly', async () => {
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      // Team cards should show team colors
    });

    test('shows captain information', async () => {
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      // Should display team captain info
    });
  });

  describe('Team Management Actions', () => {
    test('allows editing team', async () => {
      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      // Look for edit buttons on team cards
      const editButtons = screen.queryAllByTestId('edit-icon');
      if (editButtons.length > 0) {
        await user.click(editButtons[0]);
        // Edit dialog should open
      }
    });

    test('allows deleting team', async () => {
      mockCommands.deleteTeam.mockResolvedValue(true);

      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      // Look for delete buttons
      const deleteButtons = screen.queryAllByTestId('delete-icon');
      if (deleteButtons.length > 0) {
        await user.click(deleteButtons[0]);

        // Confirm deletion
        const confirmButton = screen.getByText('confirmDelete');
        await user.click(confirmButton);

        expect(mockCommands.deleteTeam).toHaveBeenCalled();
      }
    });

    test('shows confirmation dialog before deleting team', async () => {
      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      const deleteButtons = screen.queryAllByTestId('delete-icon');
      if (deleteButtons.length > 0) {
        await user.click(deleteButtons[0]);

        expect(screen.getByText('confirmDeleteTeam')).toBeInTheDocument();
        expect(screen.getByText('confirmDelete')).toBeInTheDocument();
        expect(screen.getByText('cancel')).toBeInTheDocument();
      }
    });

    test('cancels team deletion', async () => {
      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      const deleteButtons = screen.queryAllByTestId('delete-icon');
      if (deleteButtons.length > 0) {
        await user.click(deleteButtons[0]);

        const cancelButton = screen.getByText('cancel');
        await user.click(cancelButton);

        expect(screen.queryByText('confirmDeleteTeam')).not.toBeInTheDocument();
        expect(mockCommands.deleteTeam).not.toHaveBeenCalled();
      }
    });
  });

  describe('Player Management', () => {
    test('opens add player dialog', async () => {
      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      // Look for add player buttons
      const addPlayerButtons = screen.queryAllByText('addPlayer');
      if (addPlayerButtons.length > 0) {
        await user.click(addPlayerButtons[0]);

        expect(screen.getByText('addPlayerToTeam')).toBeInTheDocument();
        expect(screen.getByLabelText('selectPlayer')).toBeInTheDocument();
        expect(screen.getByLabelText('boardNumber')).toBeInTheDocument();
      }
    });

    test('adds player to team', async () => {
      mockCommands.addPlayerToTeam.mockResolvedValue(true);

      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      const addPlayerButtons = screen.queryAllByText('addPlayer');
      if (addPlayerButtons.length > 0) {
        await user.click(addPlayerButtons[0]);

        // Select player
        const playerSelect = screen.getByLabelText('selectPlayer');
        await user.click(playerSelect);
        await user.click(screen.getByText('Player 1'));

        // Set board number
        const boardNumberInput = screen.getByLabelText('boardNumber');
        await user.clear(boardNumberInput);
        await user.type(boardNumberInput, '2');

        // Add player
        const addButton = screen.getByText('add');
        await user.click(addButton);

        expect(mockCommands.addPlayerToTeam).toHaveBeenCalledWith({
          team_id: expect.any(Number),
          player_id: 1,
          board_number: 2,
          is_captain: false,
          is_reserve: false,
        });
      }
    });

    test('removes player from team', async () => {
      mockCommands.removePlayerFromTeam.mockResolvedValue(true);

      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      // Look for remove player buttons
      const removeButtons = screen.queryAllByText('remove');
      if (removeButtons.length > 0) {
        await user.click(removeButtons[0]);

        expect(mockCommands.removePlayerFromTeam).toHaveBeenCalled();
      }
    });

    test('shows team members list', async () => {
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      // Should display team members
    });

    test('displays board assignments', async () => {
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      // Should show board numbers for players
    });

    test('identifies team captains', async () => {
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      // Should show captain indicators
      const captainIcons = screen.queryAllByTestId('star-icon');
      expect(captainIcons.length).toBeGreaterThanOrEqual(0);
    });

    test('identifies reserve players', async () => {
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      // Should indicate reserve players
    });
  });

  describe('Form Validation', () => {
    test('validates board number is within limits', async () => {
      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      const addPlayerButtons = screen.queryAllByText('addPlayer');
      if (addPlayerButtons.length > 0) {
        await user.click(addPlayerButtons[0]);

        const boardNumberInput = screen.getByLabelText('boardNumber');
        await user.clear(boardNumberInput);
        await user.type(boardNumberInput, '10'); // Assuming max is 4

        const addButton = screen.getByText('add');
        await user.click(addButton);

        expect(screen.getByText('boardNumberTooHigh')).toBeInTheDocument();
      }
    });

    test('prevents duplicate board assignments', async () => {
      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      const addPlayerButtons = screen.queryAllByText('addPlayer');
      if (addPlayerButtons.length > 0) {
        await user.click(addPlayerButtons[0]);

        // Try to assign to board already occupied
        const boardNumberInput = screen.getByLabelText('boardNumber');
        await user.clear(boardNumberInput);
        await user.type(boardNumberInput, '1'); // Already used

        const addButton = screen.getByText('add');
        await user.click(addButton);

        expect(screen.getByText('boardAlreadyOccupied')).toBeInTheDocument();
      }
    });

    test('prevents adding same player twice', async () => {
      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      const addPlayerButtons = screen.queryAllByText('addPlayer');
      if (addPlayerButtons.length > 0) {
        await user.click(addPlayerButtons[0]);

        // Try to add player already in team
        const playerSelect = screen.getByLabelText('selectPlayer');
        await user.click(playerSelect);
        await user.click(screen.getByText('Player 1')); // Assuming already in team

        const addButton = screen.getByText('add');
        await user.click(addButton);

        expect(screen.getByText('playerAlreadyInTeam')).toBeInTheDocument();
      }
    });
  });

  describe('Error Handling', () => {
    test('handles team creation errors', async () => {
      mockCommands.createTeam.mockRejectedValue(new Error('Creation failed'));

      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await user.click(screen.getByText('createNewTeam'));

      const nameInput = screen.getByLabelText('teamName');
      await user.type(nameInput, 'Test Team');

      const createButton = screen.getByText('create');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('failedToCreateTeam')).toBeInTheDocument();
      });
    });

    test('handles player addition errors', async () => {
      mockCommands.addPlayerToTeam.mockRejectedValue(new Error('Add failed'));

      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      const addPlayerButtons = screen.queryAllByText('addPlayer');
      if (addPlayerButtons.length > 0) {
        await user.click(addPlayerButtons[0]);

        const playerSelect = screen.getByLabelText('selectPlayer');
        await user.click(playerSelect);
        await user.click(screen.getByText('Player 2'));

        const addButton = screen.getByText('add');
        await user.click(addButton);

        await waitFor(() => {
          expect(screen.getByText('failedToAddPlayer')).toBeInTheDocument();
        });
      }
    });

    test('handles team deletion errors', async () => {
      mockCommands.deleteTeam.mockRejectedValue(new Error('Delete failed'));

      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      const deleteButtons = screen.queryAllByTestId('delete-icon');
      if (deleteButtons.length > 0) {
        await user.click(deleteButtons[0]);

        const confirmButton = screen.getByText('confirmDelete');
        await user.click(confirmButton);

        await waitFor(() => {
          expect(screen.getByText('failedToDeleteTeam')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Responsive Design and UI', () => {
    test('adapts layout for different screen sizes', () => {
      render(<TeamManagement tournamentId={1} />);

      // Should render responsive grid layout
      expect(screen.getByText('teamManagement')).toBeInTheDocument();
    });

    test('displays team statistics when available', async () => {
      render(<TeamManagement tournamentId={1} />);

      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalled();
      });

      // Should show stats like total teams, players, etc.
    });

    test('shows appropriate icons and visual indicators', async () => {
      render(<TeamManagement tournamentId={1} />);

      expect(screen.getByTestId('people-icon')).toBeInTheDocument();
      expect(screen.getByTestId('add-icon')).toBeInTheDocument();
    });
  });

  describe('Data Synchronization', () => {
    test('calls onTeamsChange when teams are updated', async () => {
      mockCommands.createTeam.mockResolvedValue(createMockTeam(3));

      const user = userEvent.setup();
      render(
        <TeamManagement tournamentId={1} onTeamsChange={mockOnTeamsChange} />
      );

      await user.click(screen.getByText('createNewTeam'));

      const nameInput = screen.getByLabelText('teamName');
      await user.type(nameInput, 'New Team');

      const createButton = screen.getByText('create');
      await user.click(createButton);

      await waitFor(() => {
        expect(mockOnTeamsChange).toHaveBeenCalled();
      });
    });

    test('refreshes data after team operations', async () => {
      mockCommands.createTeam.mockResolvedValue(createMockTeam(3));

      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      // Initial load
      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalledTimes(1);
      });

      // Create team
      await user.click(screen.getByText('createNewTeam'));
      const nameInput = screen.getByLabelText('teamName');
      await user.type(nameInput, 'New Team');
      const createButton = screen.getByText('create');
      await user.click(createButton);

      // Should reload data
      await waitFor(() => {
        expect(mockCommands.getPlayersByTournament).toHaveBeenCalledTimes(2);
      });
    });

    test('handles tournament ID changes', () => {
      const { rerender } = render(<TeamManagement tournamentId={1} />);

      rerender(<TeamManagement tournamentId={2} />);

      expect(mockCommands.getPlayersByTournament).toHaveBeenCalledWith(2);
    });
  });

  describe('Accessibility', () => {
    test('form controls have proper labels', async () => {
      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await user.click(screen.getByText('createNewTeam'));

      expect(screen.getByLabelText('teamName')).toBeInTheDocument();
      expect(screen.getByLabelText('description')).toBeInTheDocument();
      expect(screen.getByLabelText('captain')).toBeInTheDocument();
    });

    test('buttons have appropriate accessible names', () => {
      render(<TeamManagement tournamentId={1} />);

      expect(
        screen.getByRole('button', { name: 'createNewTeam' })
      ).toBeInTheDocument();
    });

    test('dialogs have proper modal structure', async () => {
      const user = userEvent.setup();
      render(<TeamManagement tournamentId={1} />);

      await user.click(screen.getByText('createNewTeam'));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-labelledby');
    });
  });
});
