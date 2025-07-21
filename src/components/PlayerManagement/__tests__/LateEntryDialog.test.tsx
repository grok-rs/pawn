import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import LateEntryDialog from '../LateEntryDialog';
import type {
  TournamentDetails,
  Tournament,
  Player,
  Round,
} from '@dto/bindings';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => {
      if (values) {
        return key.replace(/\{\{(\w+)\}\}/g, (match, prop) =>
          String(values[prop] || match)
        );
      }
      return key;
    },
  }),
}));

// Mock MUI icons
vi.mock('@mui/icons-material', () => ({
  Warning: () => <span data-testid="warning-icon">⚠️</span>,
  Info: () => <span data-testid="info-icon">ℹ️</span>,
  Person: () => <span data-testid="person-icon">👤</span>,
  Schedule: () => <span data-testid="schedule-icon">📅</span>,
  EmojiEvents: () => <span data-testid="events-icon">🏆</span>,
}));

// Mock commands
const mockCommands = {
  createPlayerEnhanced: vi.fn(),
  updatePlayerStatus: vi.fn(),
  getRoundsByTournament: vi.fn(),
};

vi.mock('@dto/bindings', () => ({
  commands: mockCommands,
}));

// Mock data factories
const createMockTournament = (
  overrides: Partial<Tournament> = {}
): Tournament => ({
  id: 1,
  name: 'Test Tournament',
  location: 'Test Location',
  start_date: '2024-01-01',
  end_date: '2024-01-02',
  time_control: '90+30',
  total_rounds: 5,
  rounds_played: 2,
  pairing_system: 'swiss',
  status: 'in_progress',
  description: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockPlayer = (
  id: number,
  overrides: Partial<Player> = {}
): Player => ({
  id,
  tournament_id: 1,
  name: `Player ${id}`,
  rating: 1800,
  country_code: 'US',
  title: 'FM',
  birth_date: null,
  gender: 'M',
  email: `player${id}@test.com`,
  phone: null,
  club: null,
  status: 'active',
  seed_number: null,
  pairing_number: null,
  initial_rating: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockRound = (roundNumber: number, status: string): Round => ({
  id: roundNumber,
  tournament_id: 1,
  round_number: roundNumber,
  status,
  start_date: '2024-01-01',
  end_date: null,
  name: `Round ${roundNumber}`,
  description: null,
  is_published: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const createMockTournamentDetails = (
  overrides: Partial<TournamentDetails> = {}
): TournamentDetails => ({
  tournament: createMockTournament(),
  players: [createMockPlayer(1), createMockPlayer(2)],
  rounds: [
    createMockRound(1, 'Completed'),
    createMockRound(2, 'Completed'),
    createMockRound(3, 'Upcoming'),
    createMockRound(4, 'Upcoming'),
    createMockRound(5, 'Upcoming'),
  ],
  teams: [],
  pairings: [],
  ...overrides,
});

describe('LateEntryDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockTournamentDetails = createMockTournamentDetails();

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
    tournamentId: 1,
    tournamentDetails: mockTournamentDetails,
  };

  const mockRounds = [
    createMockRound(1, 'Completed'),
    createMockRound(2, 'Completed'),
    createMockRound(3, 'Upcoming'),
    createMockRound(4, 'Upcoming'),
    createMockRound(5, 'Upcoming'),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockCommands.getRoundsByTournament.mockResolvedValue(mockRounds);
    mockCommands.createPlayerEnhanced.mockResolvedValue(createMockPlayer(3));
    mockCommands.updatePlayerStatus.mockResolvedValue(true);
  });

  describe('Initial Rendering', () => {
    test('renders late entry dialog when open', () => {
      render(<LateEntryDialog {...defaultProps} />);

      expect(screen.getByText('addLateEntry')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('person-icon')).toBeInTheDocument();
    });

    test('does not render when closed', () => {
      render(<LateEntryDialog {...defaultProps} open={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('loads rounds on mount', async () => {
      render(<LateEntryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(mockCommands.getRoundsByTournament).toHaveBeenCalledWith(1);
      });
    });

    test('shows tournament information', () => {
      render(<LateEntryDialog {...defaultProps} />);

      expect(screen.getByText('Test Tournament')).toBeInTheDocument();
      expect(screen.getByText('rounds: 2/5')).toBeInTheDocument();
      expect(screen.getByText('players: 2')).toBeInTheDocument();
    });

    test('displays warning when tournament is in progress', () => {
      render(<LateEntryDialog {...defaultProps} />);

      expect(screen.getByText('lateEntryWarning')).toBeInTheDocument();
      expect(screen.getByText('tournamentInProgress')).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    test('renders all player information fields', () => {
      render(<LateEntryDialog {...defaultProps} />);

      expect(screen.getByLabelText('fullName')).toBeInTheDocument();
      expect(screen.getByLabelText('rating')).toBeInTheDocument();
      expect(screen.getByLabelText('chessTitle')).toBeInTheDocument();
      expect(screen.getByLabelText('countryCode')).toBeInTheDocument();
      expect(screen.getByLabelText('email')).toBeInTheDocument();
      expect(screen.getByLabelText('phone')).toBeInTheDocument();
      expect(screen.getByLabelText('clubOrFederation')).toBeInTheDocument();
    });

    test('renders late entry options', () => {
      render(<LateEntryDialog {...defaultProps} />);

      expect(screen.getByLabelText('startFromRound')).toBeInTheDocument();
      expect(
        screen.getByLabelText('applyStandardPenalties')
      ).toBeInTheDocument();
    });

    test('sets default start from round to next upcoming round', async () => {
      render(<LateEntryDialog {...defaultProps} />);

      await waitFor(() => {
        const startRoundInput = screen.getByLabelText('startFromRound');
        expect(startRoundInput).toHaveValue(3); // Next upcoming round
      });
    });

    test('pre-checks apply penalties checkbox', () => {
      render(<LateEntryDialog {...defaultProps} />);

      const penaltiesCheckbox = screen.getByLabelText('applyStandardPenalties');
      expect(penaltiesCheckbox).toBeChecked();
    });
  });

  describe('Form Validation', () => {
    test('validates required name field', async () => {
      const user = userEvent.setup();
      render(<LateEntryDialog {...defaultProps} />);

      const submitButton = screen.getByText('addLateEntry');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
    });

    test('validates minimum name length', async () => {
      const user = userEvent.setup();
      render(<LateEntryDialog {...defaultProps} />);

      const nameField = screen.getByLabelText('fullName');
      await user.type(nameField, 'A');

      const submitButton = screen.getByText('addLateEntry');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Name must be at least 2 characters')
        ).toBeInTheDocument();
      });
    });

    test('validates rating range', async () => {
      const user = userEvent.setup();
      render(<LateEntryDialog {...defaultProps} />);

      const nameField = screen.getByLabelText('fullName');
      await user.type(nameField, 'Test Player');

      const ratingField = screen.getByLabelText('rating');
      await user.type(ratingField, '5000');

      const submitButton = screen.getByText('addLateEntry');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Rating must be realistic')
        ).toBeInTheDocument();
      });
    });

    test('validates negative rating', async () => {
      const user = userEvent.setup();
      render(<LateEntryDialog {...defaultProps} />);

      const nameField = screen.getByLabelText('fullName');
      await user.type(nameField, 'Test Player');

      const ratingField = screen.getByLabelText('rating');
      await user.type(ratingField, '-100');

      const submitButton = screen.getByText('addLateEntry');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Rating must be positive')).toBeInTheDocument();
      });
    });

    test('validates email format', async () => {
      const user = userEvent.setup();
      render(<LateEntryDialog {...defaultProps} />);

      const nameField = screen.getByLabelText('fullName');
      await user.type(nameField, 'Test Player');

      const emailField = screen.getByLabelText('email');
      await user.type(emailField, 'invalid-email');

      const submitButton = screen.getByText('addLateEntry');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      });
    });

    test('validates start from round minimum', async () => {
      const user = userEvent.setup();
      render(<LateEntryDialog {...defaultProps} />);

      const nameField = screen.getByLabelText('fullName');
      await user.type(nameField, 'Test Player');

      const startRoundField = screen.getByLabelText('startFromRound');
      await user.clear(startRoundField);
      await user.type(startRoundField, '0');

      const submitButton = screen.getByText('addLateEntry');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Starting round must be at least 1')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Missed Rounds Impact', () => {
    test('shows missed rounds when start round is greater than 1', async () => {
      const user = userEvent.setup();
      render(<LateEntryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(mockCommands.getRoundsByTournament).toHaveBeenCalled();
      });

      const startRoundField = screen.getByLabelText('startFromRound');
      await user.clear(startRoundField);
      await user.type(startRoundField, '3');

      await waitFor(() => {
        expect(screen.getByText('lateEntryImpact')).toBeInTheDocument();
        expect(screen.getByText('Round 1, Round 2')).toBeInTheDocument();
      });
    });

    test('shows points penalty information', async () => {
      const user = userEvent.setup();
      render(<LateEntryDialog {...defaultProps} />);

      const startRoundField = screen.getByLabelText('startFromRound');
      await user.clear(startRoundField);
      await user.type(startRoundField, '2');

      await waitFor(() => {
        expect(screen.getByText('pointsPenalty')).toBeInTheDocument();
      });
    });

    test('updates penalty when penalties checkbox is toggled', async () => {
      const user = userEvent.setup();
      render(<LateEntryDialog {...defaultProps} />);

      const startRoundField = screen.getByLabelText('startFromRound');
      await user.clear(startRoundField);
      await user.type(startRoundField, '2');

      const penaltiesCheckbox = screen.getByLabelText('applyStandardPenalties');
      await user.click(penaltiesCheckbox);

      await waitFor(() => {
        expect(screen.getByText('noPenaltyApplied')).toBeInTheDocument();
      });

      await user.click(penaltiesCheckbox);

      await waitFor(() => {
        expect(screen.getByText('standardPenaltyApplied')).toBeInTheDocument();
      });
    });

    test('hides impact section when no rounds are missed', async () => {
      const user = userEvent.setup();
      render(<LateEntryDialog {...defaultProps} />);

      const startRoundField = screen.getByLabelText('startFromRound');
      await user.clear(startRoundField);
      await user.type(startRoundField, '1');

      expect(screen.queryByText('lateEntryImpact')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    test('creates late entry player with valid data', async () => {
      const user = userEvent.setup();
      render(<LateEntryDialog {...defaultProps} />);

      // Fill form
      const nameField = screen.getByLabelText('fullName');
      await user.type(nameField, 'Late Entry Player');

      const ratingField = screen.getByLabelText('rating');
      await user.type(ratingField, '1900');

      const titleField = screen.getByLabelText('chessTitle');
      await user.type(titleField, 'IM');

      const countryField = screen.getByLabelText('countryCode');
      await user.type(countryField, 'FR');

      const emailField = screen.getByLabelText('email');
      await user.type(emailField, 'late@test.com');

      const phoneField = screen.getByLabelText('phone');
      await user.type(phoneField, '+33-123-456789');

      const clubField = screen.getByLabelText('clubOrFederation');
      await user.type(clubField, 'Paris Chess Club');

      // Submit
      const submitButton = screen.getByText('addLateEntry');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCommands.createPlayerEnhanced).toHaveBeenCalledWith({
          tournament_id: 1,
          name: 'Late Entry Player',
          rating: 1900,
          country_code: 'FR',
          title: 'IM',
          birth_date: null,
          gender: null,
          email: 'late@test.com',
          phone: '+33-123-456789',
          club: 'Paris Chess Club',
        });
      });

      expect(mockCommands.updatePlayerStatus).toHaveBeenCalledWith(
        3,
        'late_entry'
      );
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    test('creates player with minimal data', async () => {
      const user = userEvent.setup();
      render(<LateEntryDialog {...defaultProps} />);

      const nameField = screen.getByLabelText('fullName');
      await user.type(nameField, 'Minimal Player');

      const submitButton = screen.getByText('addLateEntry');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCommands.createPlayerEnhanced).toHaveBeenCalledWith({
          tournament_id: 1,
          name: 'Minimal Player',
          rating: null,
          country_code: null,
          title: null,
          birth_date: null,
          gender: null,
          email: null,
          phone: null,
          club: null,
        });
      });
    });

    test('handles creation errors gracefully', async () => {
      mockCommands.createPlayerEnhanced.mockRejectedValue(
        new Error('Creation failed')
      );

      const user = userEvent.setup();
      render(<LateEntryDialog {...defaultProps} />);

      const nameField = screen.getByLabelText('fullName');
      await user.type(nameField, 'Test Player');

      const submitButton = screen.getByText('addLateEntry');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('failedToAddLateEntry')).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    test('handles status update errors', async () => {
      mockCommands.updatePlayerStatus.mockRejectedValue(
        new Error('Status update failed')
      );

      const user = userEvent.setup();
      render(<LateEntryDialog {...defaultProps} />);

      const nameField = screen.getByLabelText('fullName');
      await user.type(nameField, 'Test Player');

      const submitButton = screen.getByText('addLateEntry');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('failedToAddLateEntry')).toBeInTheDocument();
      });
    });

    test('shows loading state during submission', async () => {
      let resolveCreate: (value: Player) => void;
      mockCommands.createPlayerEnhanced.mockImplementation(() => {
        return new Promise<Player>(resolve => {
          resolveCreate = resolve;
        });
      });

      const user = userEvent.setup();
      render(<LateEntryDialog {...defaultProps} />);

      const nameField = screen.getByLabelText('fullName');
      await user.type(nameField, 'Test Player');

      const submitButton = screen.getByText('addLateEntry');
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Complete the promise
      resolveCreate!(createMockPlayer(3));

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dialog Controls', () => {
    test('closes dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<LateEntryDialog {...defaultProps} />);

      const cancelButton = screen.getByText('cancel');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('prevents closing during loading', async () => {
      let resolveCreate: (value: Player) => void;
      mockCommands.createPlayerEnhanced.mockImplementation(() => {
        return new Promise<Player>(resolve => {
          resolveCreate = resolve;
        });
      });

      const user = userEvent.setup();
      render(<LateEntryDialog {...defaultProps} />);

      const nameField = screen.getByLabelText('fullName');
      await user.type(nameField, 'Test Player');

      const submitButton = screen.getByText('addLateEntry');
      await user.click(submitButton);

      // Try to cancel while loading
      const cancelButton = screen.getByText('cancel');
      expect(cancelButton).toBeDisabled();

      // Complete the promise
      resolveCreate!(createMockPlayer(3));

      await waitFor(() => {
        expect(cancelButton).not.toBeDisabled();
      });
    });

    test('resets form when dialog opens', () => {
      const { rerender } = render(
        <LateEntryDialog {...defaultProps} open={false} />
      );

      rerender(<LateEntryDialog {...defaultProps} open={true} />);

      const nameField = screen.getByLabelText('fullName');
      expect(nameField).toHaveValue('');
    });

    test('clears error when dialog closes and reopens', async () => {
      mockCommands.getRoundsByTournament.mockRejectedValue(
        new Error('Load failed')
      );

      const { rerender } = render(<LateEntryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('failedToLoadRounds')).toBeInTheDocument();
      });

      // Close and reopen
      rerender(<LateEntryDialog {...defaultProps} open={false} />);
      mockCommands.getRoundsByTournament.mockResolvedValue(mockRounds);
      rerender(<LateEntryDialog {...defaultProps} open={true} />);

      expect(screen.queryByText('failedToLoadRounds')).not.toBeInTheDocument();
    });
  });

  describe('Rounds Loading', () => {
    test('handles rounds loading errors', async () => {
      mockCommands.getRoundsByTournament.mockRejectedValue(
        new Error('Failed to load')
      );

      render(<LateEntryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('failedToLoadRounds')).toBeInTheDocument();
      });
    });

    test('sets start round to first upcoming round when available', async () => {
      const customRounds = [
        createMockRound(1, 'Completed'),
        createMockRound(2, 'In Progress'),
        createMockRound(3, 'Upcoming'),
        createMockRound(4, 'Upcoming'),
      ];
      mockCommands.getRoundsByTournament.mockResolvedValue(customRounds);

      render(<LateEntryDialog {...defaultProps} />);

      await waitFor(() => {
        const startRoundInput = screen.getByLabelText('startFromRound');
        expect(startRoundInput).toHaveValue(3);
      });
    });

    test('sets start round to last round when no upcoming rounds', async () => {
      const customRounds = [
        createMockRound(1, 'Completed'),
        createMockRound(2, 'Completed'),
        createMockRound(3, 'Completed'),
      ];
      mockCommands.getRoundsByTournament.mockResolvedValue(customRounds);

      render(<LateEntryDialog {...defaultProps} />);

      await waitFor(() => {
        const startRoundInput = screen.getByLabelText('startFromRound');
        expect(startRoundInput).toHaveValue(3);
      });
    });
  });

  describe('No Tournament Warning', () => {
    test('handles missing tournament details gracefully', () => {
      render(<LateEntryDialog {...defaultProps} tournamentDetails={null} />);

      expect(screen.getByText('addLateEntry')).toBeInTheDocument();
      expect(screen.queryByText('Test Tournament')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('form fields have proper labels', () => {
      render(<LateEntryDialog {...defaultProps} />);

      expect(screen.getByLabelText('fullName')).toBeInTheDocument();
      expect(screen.getByLabelText('rating')).toBeInTheDocument();
      expect(screen.getByLabelText('email')).toBeInTheDocument();
      expect(screen.getByLabelText('startFromRound')).toBeInTheDocument();
      expect(
        screen.getByLabelText('applyStandardPenalties')
      ).toBeInTheDocument();
    });

    test('dialog has proper modal attributes', () => {
      render(<LateEntryDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    test('error messages are accessible', async () => {
      const user = userEvent.setup();
      render(<LateEntryDialog {...defaultProps} />);

      const submitButton = screen.getByText('addLateEntry');
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText('Name is required');
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });
});
