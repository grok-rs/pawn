import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import PlayerWithdrawalDialog from '../PlayerWithdrawalDialog';
import type { Player } from '@dto/bindings';

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
  Person: () => <span data-testid="person-icon">👤</span>,
  Info: () => <span data-testid="info-icon">ℹ️</span>,
  ExitToApp: () => <span data-testid="exit-icon">🚪</span>,
  Pause: () => <span data-testid="pause-icon">⏸️</span>,
}));

// Mock commands
const mockCommands = {
  withdrawPlayer: vi.fn(),
  requestPlayerBye: vi.fn(),
  updatePlayerStatus: vi.fn(),
};

vi.mock('@dto/bindings', () => ({
  commands: mockCommands,
}));

// Mock data factory
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
  club: 'Chess Club',
  status: 'active',
  seed_number: null,
  pairing_number: null,
  initial_rating: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('PlayerWithdrawalDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockPlayer = createMockPlayer(1);

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
    player: mockPlayer,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCommands.withdrawPlayer.mockResolvedValue(true);
    mockCommands.requestPlayerBye.mockResolvedValue(true);
    mockCommands.updatePlayerStatus.mockResolvedValue(true);
  });

  describe('Initial Rendering', () => {
    test('renders withdrawal dialog when open', () => {
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      expect(screen.getByText('managePlayerStatus')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('person-icon')).toBeInTheDocument();
    });

    test('does not render when closed', () => {
      render(<PlayerWithdrawalDialog {...defaultProps} open={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('displays player information', () => {
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      expect(screen.getByText('Player 1')).toBeInTheDocument();
      expect(screen.getByText('rating: 1800')).toBeInTheDocument();
      expect(screen.getByText('country: US')).toBeInTheDocument();
      expect(screen.getByText('currentStatus: active')).toBeInTheDocument();
    });

    test('handles player with minimal information', () => {
      const minimalPlayer = createMockPlayer(1, {
        rating: null,
        country_code: null,
      });

      render(
        <PlayerWithdrawalDialog {...defaultProps} player={minimalPlayer} />
      );

      expect(screen.getByText('Player 1')).toBeInTheDocument();
      expect(screen.queryByText('rating:')).not.toBeInTheDocument();
      expect(screen.queryByText('country:')).not.toBeInTheDocument();
    });

    test('handles null player gracefully', () => {
      render(<PlayerWithdrawalDialog {...defaultProps} player={null} />);

      expect(screen.getByText('managePlayerStatus')).toBeInTheDocument();
      expect(screen.queryByText('Player 1')).not.toBeInTheDocument();
    });
  });

  describe('Action Selection', () => {
    test('shows withdraw option', () => {
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      expect(screen.getByText('withdrawFromTournament')).toBeInTheDocument();
      expect(screen.getByTestId('exit-icon')).toBeInTheDocument();
    });

    test('shows bye request option', () => {
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      expect(screen.getByText('requestByeNextRound')).toBeInTheDocument();
      expect(screen.getByTestId('pause-icon')).toBeInTheDocument();
    });

    test('shows reactivate option for withdrawn player', () => {
      const withdrawnPlayer = createMockPlayer(1, { status: 'withdrawn' });
      render(
        <PlayerWithdrawalDialog {...defaultProps} player={withdrawnPlayer} />
      );

      expect(screen.getByText('reactivatePlayer')).toBeInTheDocument();
      expect(screen.getAllByTestId('person-icon')).toHaveLength(2); // One in title, one for reactivate
    });

    test('shows reactivate option for player with bye requested', () => {
      const byePlayer = createMockPlayer(1, { status: 'bye_requested' });
      render(<PlayerWithdrawalDialog {...defaultProps} player={byePlayer} />);

      expect(screen.getByText('reactivatePlayer')).toBeInTheDocument();
    });

    test('hides reactivate option for active player', () => {
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      expect(screen.queryByText('reactivatePlayer')).not.toBeInTheDocument();
    });
  });

  describe('Action Information Display', () => {
    test('shows withdrawal information when selected', async () => {
      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const withdrawOption = screen.getByLabelText(/withdrawFromTournament/);
      await user.click(withdrawOption);

      await waitFor(() => {
        expect(screen.getByText('withdrawPlayer')).toBeInTheDocument();
        expect(
          screen.getByText('withdrawPlayerDescription')
        ).toBeInTheDocument();
        expect(
          screen.getByText('playerRemovedFromPairings')
        ).toBeInTheDocument();
        expect(screen.getByText('noFutureRounds')).toBeInTheDocument();
        expect(screen.getByText('currentResultsKept')).toBeInTheDocument();
        expect(screen.getByText('cannotReenter')).toBeInTheDocument();
      });
    });

    test('shows bye information when selected', async () => {
      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const byeOption = screen.getByLabelText(/requestByeNextRound/);
      await user.click(byeOption);

      await waitFor(() => {
        expect(screen.getByText('requestBye')).toBeInTheDocument();
        expect(screen.getByText('requestByeDescription')).toBeInTheDocument();
        expect(screen.getByText('skipNextRound')).toBeInTheDocument();
        expect(screen.getByText('temporaryRemoval')).toBeInTheDocument();
        expect(screen.getByText('canReturnLater')).toBeInTheDocument();
        expect(screen.getByText('zeroPointsForRound')).toBeInTheDocument();
      });
    });

    test('shows reactivate information when selected', async () => {
      const withdrawnPlayer = createMockPlayer(1, { status: 'withdrawn' });
      const user = userEvent.setup();
      render(
        <PlayerWithdrawalDialog {...defaultProps} player={withdrawnPlayer} />
      );

      const reactivateOption = screen.getByLabelText(/reactivatePlayer/);
      await user.click(reactivateOption);

      await waitFor(() => {
        expect(
          screen.getByText('reactivatePlayerDescription')
        ).toBeInTheDocument();
        expect(screen.getByText('returnToActivePlayers')).toBeInTheDocument();
        expect(screen.getByText('includedInPairings')).toBeInTheDocument();
        expect(screen.getByText('previousResultsKept')).toBeInTheDocument();
      });
    });

    test('hides information when no action selected', () => {
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      expect(
        screen.queryByText('withdrawPlayerDescription')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('requestByeDescription')
      ).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('requires action selection', async () => {
      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const confirmButton = screen.getByText('confirm');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Please select an action')).toBeInTheDocument();
      });
    });

    test('requires reason for withdrawal', async () => {
      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const withdrawOption = screen.getByLabelText(/withdrawFromTournament/);
      await user.click(withdrawOption);

      const confirmButton = await screen.findByText('withdrawPlayer');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(
          screen.getByText('Reason is required for withdrawal')
        ).toBeInTheDocument();
      });
    });

    test('shows reason field for withdrawal', async () => {
      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const withdrawOption = screen.getByLabelText(/withdrawFromTournament/);
      await user.click(withdrawOption);

      await waitFor(() => {
        expect(
          screen.getByLabelText('reasonForWithdrawal')
        ).toBeInTheDocument();
      });
    });

    test('does not require reason for bye or reactivate', async () => {
      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const byeOption = screen.getByLabelText(/requestByeNextRound/);
      await user.click(byeOption);

      expect(
        screen.queryByLabelText('reasonForWithdrawal')
      ).not.toBeInTheDocument();
    });

    test('allows optional notes for all actions', async () => {
      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const byeOption = screen.getByLabelText(/requestByeNextRound/);
      await user.click(byeOption);

      expect(screen.getByLabelText('additionalNotes')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    test('withdraws player successfully', async () => {
      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const withdrawOption = screen.getByLabelText(/withdrawFromTournament/);
      await user.click(withdrawOption);

      const reasonField = await screen.findByLabelText('reasonForWithdrawal');
      await user.type(reasonField, 'Personal emergency');

      const notesField = screen.getByLabelText('additionalNotes');
      await user.type(notesField, 'Will rejoin next tournament');

      const confirmButton = screen.getByText('withdrawPlayer');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockCommands.withdrawPlayer).toHaveBeenCalledWith(1);
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    test('requests bye successfully', async () => {
      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const byeOption = screen.getByLabelText(/requestByeNextRound/);
      await user.click(byeOption);

      const notesField = screen.getByLabelText('additionalNotes');
      await user.type(notesField, 'Medical appointment');

      const confirmButton = await screen.findByText('requestBye');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockCommands.requestPlayerBye).toHaveBeenCalledWith(1);
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    test('reactivates player successfully', async () => {
      const withdrawnPlayer = createMockPlayer(1, { status: 'withdrawn' });
      const user = userEvent.setup();
      render(
        <PlayerWithdrawalDialog {...defaultProps} player={withdrawnPlayer} />
      );

      const reactivateOption = screen.getByLabelText(/reactivatePlayer/);
      await user.click(reactivateOption);

      const confirmButton = await screen.findByText('reactivatePlayer');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockCommands.updatePlayerStatus).toHaveBeenCalledWith(
          1,
          'active'
        );
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    test('handles withdrawal errors gracefully', async () => {
      mockCommands.withdrawPlayer.mockRejectedValue(
        new Error('Withdrawal failed')
      );

      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const withdrawOption = screen.getByLabelText(/withdrawFromTournament/);
      await user.click(withdrawOption);

      const reasonField = await screen.findByLabelText('reasonForWithdrawal');
      await user.type(reasonField, 'Test reason');

      const confirmButton = screen.getByText('withdrawPlayer');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(
          screen.getByText('failedToUpdatePlayerStatus')
        ).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    test('handles bye request errors gracefully', async () => {
      mockCommands.requestPlayerBye.mockRejectedValue(
        new Error('Bye request failed')
      );

      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const byeOption = screen.getByLabelText(/requestByeNextRound/);
      await user.click(byeOption);

      const confirmButton = await screen.findByText('requestBye');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(
          screen.getByText('failedToUpdatePlayerStatus')
        ).toBeInTheDocument();
      });
    });

    test('handles reactivation errors gracefully', async () => {
      mockCommands.updatePlayerStatus.mockRejectedValue(
        new Error('Reactivation failed')
      );

      const withdrawnPlayer = createMockPlayer(1, { status: 'withdrawn' });
      const user = userEvent.setup();
      render(
        <PlayerWithdrawalDialog {...defaultProps} player={withdrawnPlayer} />
      );

      const reactivateOption = screen.getByLabelText(/reactivatePlayer/);
      await user.click(reactivateOption);

      const confirmButton = await screen.findByText('reactivatePlayer');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(
          screen.getByText('failedToUpdatePlayerStatus')
        ).toBeInTheDocument();
      });
    });

    test('shows loading state during submission', async () => {
      let resolveWithdrawal: (value: boolean) => void;
      mockCommands.withdrawPlayer.mockImplementation(() => {
        return new Promise<boolean>(resolve => {
          resolveWithdrawal = resolve;
        });
      });

      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const withdrawOption = screen.getByLabelText(/withdrawFromTournament/);
      await user.click(withdrawOption);

      const reasonField = await screen.findByLabelText('reasonForWithdrawal');
      await user.type(reasonField, 'Test reason');

      const confirmButton = screen.getByText('withdrawPlayer');
      await user.click(confirmButton);

      // Should show loading state
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(confirmButton).toBeDisabled();

      // Complete the promise
      resolveWithdrawal!(true);

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dialog Controls', () => {
    test('closes dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const cancelButton = screen.getByText('cancel');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('prevents closing during loading', async () => {
      let resolveWithdrawal: (value: boolean) => void;
      mockCommands.withdrawPlayer.mockImplementation(() => {
        return new Promise<boolean>(resolve => {
          resolveWithdrawal = resolve;
        });
      });

      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const withdrawOption = screen.getByLabelText(/withdrawFromTournament/);
      await user.click(withdrawOption);

      const reasonField = await screen.findByLabelText('reasonForWithdrawal');
      await user.type(reasonField, 'Test reason');

      const confirmButton = screen.getByText('withdrawPlayer');
      await user.click(confirmButton);

      // Try to cancel while loading
      const cancelButton = screen.getByText('cancel');
      expect(cancelButton).toBeDisabled();

      // Complete the promise
      resolveWithdrawal!(true);

      await waitFor(() => {
        expect(cancelButton).not.toBeDisabled();
      });
    });

    test('disables confirm button when no action selected', () => {
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const confirmButton = screen.getByText('confirm');
      expect(confirmButton).toBeDisabled();
    });

    test('enables confirm button when action is selected', async () => {
      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const byeOption = screen.getByLabelText(/requestByeNextRound/);
      await user.click(byeOption);

      await waitFor(() => {
        const confirmButton = screen.getByText('requestBye');
        expect(confirmButton).not.toBeDisabled();
      });
    });

    test('updates button text based on selected action', async () => {
      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      // Initial state
      expect(screen.getByText('confirm')).toBeInTheDocument();

      // Select withdrawal
      const withdrawOption = screen.getByLabelText(/withdrawFromTournament/);
      await user.click(withdrawOption);

      await waitFor(() => {
        expect(screen.getByText('withdrawPlayer')).toBeInTheDocument();
        expect(screen.queryByText('confirm')).not.toBeInTheDocument();
      });

      // Select bye
      const byeOption = screen.getByLabelText(/requestByeNextRound/);
      await user.click(byeOption);

      await waitFor(() => {
        expect(screen.getByText('requestBye')).toBeInTheDocument();
      });
    });

    test('resets form when dialog closes and reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<PlayerWithdrawalDialog {...defaultProps} />);

      const withdrawOption = screen.getByLabelText(/withdrawFromTournament/);
      await user.click(withdrawOption);

      // Close and reopen
      rerender(<PlayerWithdrawalDialog {...defaultProps} open={false} />);
      rerender(<PlayerWithdrawalDialog {...defaultProps} open={true} />);

      // Should be back to initial state
      expect(screen.getByText('confirm')).toBeInTheDocument();
      expect(
        screen.queryByLabelText('reasonForWithdrawal')
      ).not.toBeInTheDocument();
    });
  });

  describe('Button Color Variations', () => {
    test('shows error color for withdrawal button', async () => {
      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const withdrawOption = screen.getByLabelText(/withdrawFromTournament/);
      await user.click(withdrawOption);

      await waitFor(() => {
        const confirmButton = screen.getByText('withdrawPlayer');
        expect(confirmButton).toHaveClass('MuiButton-containedError');
      });
    });

    test('shows warning color for bye button', async () => {
      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const byeOption = screen.getByLabelText(/requestByeNextRound/);
      await user.click(byeOption);

      await waitFor(() => {
        const confirmButton = screen.getByText('requestBye');
        expect(confirmButton).toHaveClass('MuiButton-containedWarning');
      });
    });

    test('shows success color for reactivate button', async () => {
      const withdrawnPlayer = createMockPlayer(1, { status: 'withdrawn' });
      const user = userEvent.setup();
      render(
        <PlayerWithdrawalDialog {...defaultProps} player={withdrawnPlayer} />
      );

      const reactivateOption = screen.getByLabelText(/reactivatePlayer/);
      await user.click(reactivateOption);

      await waitFor(() => {
        const confirmButton = screen.getByText('reactivatePlayer');
        expect(confirmButton).toHaveClass('MuiButton-containedSuccess');
      });
    });
  });

  describe('Accessibility', () => {
    test('radio buttons have proper labels', () => {
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      expect(
        screen.getByLabelText(/withdrawFromTournament/)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/requestByeNextRound/)).toBeInTheDocument();
    });

    test('dialog has proper modal attributes', () => {
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    test('error messages are accessible', async () => {
      const user = userEvent.setup();
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      const confirmButton = screen.getByText('confirm');
      await user.click(confirmButton);

      await waitFor(() => {
        const errorMessage = screen.getByText('Please select an action');
        expect(errorMessage).toBeInTheDocument();
      });
    });

    test('form control has proper legend', () => {
      render(<PlayerWithdrawalDialog {...defaultProps} />);

      expect(screen.getByText('selectAction')).toBeInTheDocument();
    });
  });
});
