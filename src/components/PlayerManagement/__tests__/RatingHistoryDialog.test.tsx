import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import RatingHistoryDialog from '../RatingHistoryDialog';
import type { Player, RatingHistory } from '@dto/bindings';

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
  Add: () => <span data-testid="add-icon">➕</span>,
  History: () => <span data-testid="history-icon">📜</span>,
  TrendingUp: () => <span data-testid="trending-up-icon">📈</span>,
  TrendingDown: () => <span data-testid="trending-down-icon">📉</span>,
  Person: () => <span data-testid="person-icon">👤</span>,
  EmojiEvents: () => <span data-testid="trophy-icon">🏆</span>,
  Speed: () => <span data-testid="speed-icon">⚡</span>,
  Schedule: () => <span data-testid="schedule-icon">📅</span>,
}));

// Mock MUI DatePicker components
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({
    label,
    onChange,
    value: _value,
    slotProps,
  }: {
    label: string;
    onChange: (date: unknown) => void;
    value: unknown;
    slotProps?: {
      textField?: { error?: boolean; helperText?: string; fullWidth?: boolean };
    };
  }) => (
    <div data-testid={`datepicker-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <input
        placeholder={label}
        onChange={e =>
          onChange(e.target.value ? new Date(e.target.value) : null)
        }
        data-error={slotProps?.textField?.error}
      />
      {slotProps?.textField?.helperText && (
        <span data-testid="date-error">{slotProps.textField.helperText}</span>
      )}
    </div>
  ),
}));

vi.mock('@mui/x-date-pickers/LocalizationProvider', () => ({
  LocalizationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="localization-provider">{children}</div>
  ),
}));

vi.mock('@mui/x-date-pickers/AdapterDayjs', () => ({
  AdapterDayjs: () => ({}),
}));

// Mock dayjs
vi.mock('dayjs', () => {
  const actualDayjs = vi.importActual('dayjs');
  const mockDayjs = (date?: string | Date | null) => {
    if (!date) {
      return {
        format: () => '2024-01-15',
        isBefore: () => true,
        isValid: () => true,
        valueOf: () => Date.now(),
      };
    }
    return {
      format: () =>
        typeof date === 'string' ? date : date.toISOString().split('T')[0],
      isBefore: () => true,
      isValid: () => true,
      valueOf: () => new Date(date).getTime(),
    };
  };
  mockDayjs.isDayjs = () => false;
  return { default: mockDayjs, ...actualDayjs };
});

// Mock commands
const mockCommands = {
  getPlayerRatingHistory: vi.fn(),
  addPlayerRatingHistory: vi.fn(),
};

vi.mock('@dto/bindings', () => ({
  commands: mockCommands,
}));

// Mock data factories
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

const createMockRatingHistory = (
  id: number,
  overrides: Partial<RatingHistory> = {}
): RatingHistory => ({
  id,
  player_id: 1,
  rating_type: 'fide_standard',
  rating: 1800 + id * 50,
  is_provisional: false,
  effective_date: `2024-01-${String(id).padStart(2, '0')}`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('RatingHistoryDialog', () => {
  const mockOnClose = vi.fn();
  const mockPlayer = createMockPlayer(1);

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    player: mockPlayer,
  };

  const mockRatingHistory = [
    createMockRatingHistory(1, { rating: 1900, effective_date: '2024-03-01' }),
    createMockRatingHistory(2, { rating: 1850, effective_date: '2024-02-01' }),
    createMockRatingHistory(3, { rating: 1800, effective_date: '2024-01-01' }),
    createMockRatingHistory(4, {
      rating_type: 'fide_rapid',
      rating: 1750,
      effective_date: '2024-02-15',
      is_provisional: true,
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockCommands.getPlayerRatingHistory.mockResolvedValue(mockRatingHistory);
    mockCommands.addPlayerRatingHistory.mockResolvedValue(true);
  });

  describe('Initial Rendering', () => {
    test('renders rating history dialog when open', () => {
      render(<RatingHistoryDialog {...defaultProps} />);

      expect(screen.getByText('ratingHistory - Player 1')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('history-icon')).toBeInTheDocument();
    });

    test('does not render when closed', () => {
      render(<RatingHistoryDialog {...defaultProps} open={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('loads rating history on mount', async () => {
      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(mockCommands.getPlayerRatingHistory).toHaveBeenCalledWith(1);
      });
    });

    test('handles null player gracefully', () => {
      render(<RatingHistoryDialog {...defaultProps} player={null} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.queryByText('Player 1')).not.toBeInTheDocument();
    });

    test('shows loading state initially', () => {
      render(<RatingHistoryDialog {...defaultProps} />);

      expect(screen.getByText('loadingRatingHistory')).toBeInTheDocument();
    });
  });

  describe('Current Ratings Display', () => {
    test('displays current ratings overview', async () => {
      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('currentRatings')).toBeInTheDocument();
        expect(screen.getByText('FIDE Standard')).toBeInTheDocument();
        expect(screen.getByText('1900')).toBeInTheDocument(); // Latest rating
        expect(screen.getByText('FIDE Rapid')).toBeInTheDocument();
        expect(screen.getByText('1750')).toBeInTheDocument();
      });
    });

    test('shows provisional rating badges', async () => {
      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('provisional')).toBeInTheDocument();
      });
    });

    test('displays rating trends with arrows', async () => {
      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument(); // Rating increased
      });
    });

    test('shows no ratings message when empty', async () => {
      mockCommands.getPlayerRatingHistory.mockResolvedValue([]);

      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('noRatingHistory')).toBeInTheDocument();
      });
    });

    test('calculates rating changes correctly', async () => {
      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('+50')).toBeInTheDocument(); // Change from 1850 to 1900
      });
    });

    test('formats dates correctly', async () => {
      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('asOf 3/1/2024')).toBeInTheDocument();
      });
    });
  });

  describe('History Tab', () => {
    test('displays history tab by default', async () => {
      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('history')).toBeInTheDocument();
      });
    });

    test('groups ratings by type', async () => {
      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('FIDE Standard')).toBeInTheDocument();
        expect(screen.getByText('FIDE Rapid')).toBeInTheDocument();
      });
    });

    test('shows entry counts for each rating type', async () => {
      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('3 entries')).toBeInTheDocument(); // FIDE Standard
        expect(screen.getByText('1 entries')).toBeInTheDocument(); // FIDE Rapid
      });
    });

    test('displays rating history table', async () => {
      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('rating')).toBeInTheDocument();
        expect(screen.getByText('date')).toBeInTheDocument();
        expect(screen.getByText('status')).toBeInTheDocument();
        expect(screen.getByText('change')).toBeInTheDocument();
      });
    });

    test('shows established vs provisional status', async () => {
      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('established')).toBeInTheDocument();
        expect(screen.getByText('provisional')).toBeInTheDocument();
      });
    });

    test('calculates and displays rating changes', async () => {
      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('+50')).toBeInTheDocument(); // Latest increase
        expect(screen.getByText('+50')).toBeInTheDocument(); // Previous increase
      });
    });

    test('shows trending icons for rating changes', async () => {
      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getAllByTestId('trending-up-icon').length
        ).toBeGreaterThan(0);
      });
    });

    test('shows no history message when empty', async () => {
      mockCommands.getPlayerRatingHistory.mockResolvedValue([]);

      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('noRatingHistoryFound')).toBeInTheDocument();
      });
    });
  });

  describe('Add Rating Tab', () => {
    test('switches to add rating tab', async () => {
      const user = userEvent.setup();
      render(<RatingHistoryDialog {...defaultProps} />);

      const addRatingTab = screen.getByText('addRating');
      await user.click(addRatingTab);

      expect(screen.getByText('addNewRating')).toBeInTheDocument();
    });

    test('renders all form fields', async () => {
      const user = userEvent.setup();
      render(<RatingHistoryDialog {...defaultProps} />);

      const addRatingTab = screen.getByText('addRating');
      await user.click(addRatingTab);

      expect(screen.getByLabelText('ratingType')).toBeInTheDocument();
      expect(screen.getByLabelText('rating')).toBeInTheDocument();
      expect(
        screen.getByTestId('datepicker-effective-date')
      ).toBeInTheDocument();
      expect(screen.getByLabelText('provisionalRating')).toBeInTheDocument();
    });

    test('shows all rating type options', async () => {
      const user = userEvent.setup();
      render(<RatingHistoryDialog {...defaultProps} />);

      const addRatingTab = screen.getByText('addRating');
      await user.click(addRatingTab);

      const ratingTypeSelect = screen.getByLabelText('ratingType');
      await user.click(ratingTypeSelect);

      expect(screen.getByText('FIDE Standard')).toBeInTheDocument();
      expect(screen.getByText('FIDE Rapid')).toBeInTheDocument();
      expect(screen.getByText('FIDE Blitz')).toBeInTheDocument();
      expect(screen.getByText('National Rating')).toBeInTheDocument();
      expect(screen.getByText('Club Rating')).toBeInTheDocument();
      expect(screen.getByText('USCF Rating')).toBeInTheDocument();
      expect(screen.getByText('ELO Rating')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('validates required rating type', async () => {
      const user = userEvent.setup();
      render(<RatingHistoryDialog {...defaultProps} />);

      const addRatingTab = screen.getByText('addRating');
      await user.click(addRatingTab);

      const submitButton = screen.getByText('addRating');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Rating type is required')).toBeInTheDocument();
      });
    });

    test('validates required rating', async () => {
      const user = userEvent.setup();
      render(<RatingHistoryDialog {...defaultProps} />);

      const addRatingTab = screen.getByText('addRating');
      await user.click(addRatingTab);

      const ratingTypeSelect = screen.getByLabelText('ratingType');
      await user.click(ratingTypeSelect);
      await user.click(screen.getByText('FIDE Standard'));

      const submitButton = screen.getByText('addRating');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Rating is required')).toBeInTheDocument();
      });
    });

    test('validates rating minimum value', async () => {
      const user = userEvent.setup();
      render(<RatingHistoryDialog {...defaultProps} />);

      const addRatingTab = screen.getByText('addRating');
      await user.click(addRatingTab);

      const ratingTypeSelect = screen.getByLabelText('ratingType');
      await user.click(ratingTypeSelect);
      await user.click(screen.getByText('FIDE Standard'));

      const ratingInput = screen.getByLabelText('rating');
      await user.type(ratingInput, '-100');

      const submitButton = screen.getByText('addRating');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Rating must be positive')).toBeInTheDocument();
      });
    });

    test('validates rating maximum value', async () => {
      const user = userEvent.setup();
      render(<RatingHistoryDialog {...defaultProps} />);

      const addRatingTab = screen.getByText('addRating');
      await user.click(addRatingTab);

      const ratingTypeSelect = screen.getByLabelText('ratingType');
      await user.click(ratingTypeSelect);
      await user.click(screen.getByText('FIDE Standard'));

      const ratingInput = screen.getByLabelText('rating');
      await user.type(ratingInput, '5000');

      const submitButton = screen.getByText('addRating');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Rating must be realistic')
        ).toBeInTheDocument();
      });
    });

    test('validates required effective date', async () => {
      const user = userEvent.setup();
      render(<RatingHistoryDialog {...defaultProps} />);

      const addRatingTab = screen.getByText('addRating');
      await user.click(addRatingTab);

      const ratingTypeSelect = screen.getByLabelText('ratingType');
      await user.click(ratingTypeSelect);
      await user.click(screen.getByText('FIDE Standard'));

      const ratingInput = screen.getByLabelText('rating');
      await user.type(ratingInput, '2000');

      // Clear the date field somehow (implementation dependent)
      const submitButton = screen.getByText('addRating');
      await user.click(submitButton);

      // Note: This test might need adjustment based on how DatePicker validation works
    });
  });

  describe('Form Submission', () => {
    test('adds rating with valid data', async () => {
      const user = userEvent.setup();
      render(<RatingHistoryDialog {...defaultProps} />);

      const addRatingTab = screen.getByText('addRating');
      await user.click(addRatingTab);

      // Fill form
      const ratingTypeSelect = screen.getByLabelText('ratingType');
      await user.click(ratingTypeSelect);
      await user.click(screen.getByText('FIDE Standard'));

      const ratingInput = screen.getByLabelText('rating');
      await user.type(ratingInput, '2000');

      const provisionalCheckbox = screen.getByLabelText('provisionalRating');
      await user.click(provisionalCheckbox);

      // Submit
      const submitButton = screen.getByText('addRating');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCommands.addPlayerRatingHistory).toHaveBeenCalledWith({
          player_id: 1,
          rating_type: 'fide_standard',
          rating: 2000,
          is_provisional: true,
          effective_date: expect.any(String),
        });
      });

      // Should refresh data and reset form
      expect(mockCommands.getPlayerRatingHistory).toHaveBeenCalledTimes(2);
    });

    test('handles submission errors gracefully', async () => {
      mockCommands.addPlayerRatingHistory.mockRejectedValue(
        new Error('Add failed')
      );

      const user = userEvent.setup();
      render(<RatingHistoryDialog {...defaultProps} />);

      const addRatingTab = screen.getByText('addRating');
      await user.click(addRatingTab);

      const ratingTypeSelect = screen.getByLabelText('ratingType');
      await user.click(ratingTypeSelect);
      await user.click(screen.getByText('FIDE Standard'));

      const ratingInput = screen.getByLabelText('rating');
      await user.type(ratingInput, '2000');

      const submitButton = screen.getByText('addRating');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('failedToAddRating')).toBeInTheDocument();
      });
    });

    test('shows loading state during submission', async () => {
      let resolveAdd: (value: boolean) => void;
      mockCommands.addPlayerRatingHistory.mockImplementation(() => {
        return new Promise<boolean>(resolve => {
          resolveAdd = resolve;
        });
      });

      const user = userEvent.setup();
      render(<RatingHistoryDialog {...defaultProps} />);

      const addRatingTab = screen.getByText('addRating');
      await user.click(addRatingTab);

      const ratingTypeSelect = screen.getByLabelText('ratingType');
      await user.click(ratingTypeSelect);
      await user.click(screen.getByText('FIDE Standard'));

      const ratingInput = screen.getByLabelText('rating');
      await user.type(ratingInput, '2000');

      const submitButton = screen.getByText('addRating');
      await user.click(submitButton);

      // Should show loading
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Complete the promise
      resolveAdd!(true);

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles rating history loading errors', async () => {
      mockCommands.getPlayerRatingHistory.mockRejectedValue(
        new Error('Load failed')
      );

      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText('failedToLoadRatingHistory')
        ).toBeInTheDocument();
      });
    });

    test('shows error alert at top of dialog', async () => {
      mockCommands.getPlayerRatingHistory.mockRejectedValue(
        new Error('Load failed')
      );

      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveClass('MuiAlert-standardError');
      });
    });
  });

  describe('Dialog Controls', () => {
    test('closes dialog when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<RatingHistoryDialog {...defaultProps} />);

      const closeButton = screen.getByText('close');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('prevents closing during loading', async () => {
      let resolveHistory: (value: RatingHistory[]) => void;
      mockCommands.getPlayerRatingHistory.mockImplementation(() => {
        return new Promise<RatingHistory[]>(resolve => {
          resolveHistory = resolve;
        });
      });

      userEvent.setup();
      render(<RatingHistoryDialog {...defaultProps} />);

      const closeButton = screen.getByText('close');
      expect(closeButton).toBeDisabled();

      // Complete the promise
      resolveHistory!(mockRatingHistory);

      await waitFor(() => {
        expect(closeButton).not.toBeDisabled();
      });
    });

    test('resets form state when dialog closes', async () => {
      const { rerender } = render(<RatingHistoryDialog {...defaultProps} />);

      // Close and reopen
      rerender(<RatingHistoryDialog {...defaultProps} open={false} />);
      rerender(<RatingHistoryDialog {...defaultProps} open={true} />);

      // Should be back on history tab
      expect(screen.getByText('currentRatings')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    test('switches between tabs correctly', async () => {
      const user = userEvent.setup();
      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('currentRatings')).toBeInTheDocument();
      });

      const addRatingTab = screen.getByText('addRating');
      await user.click(addRatingTab);

      expect(screen.getByText('addNewRating')).toBeInTheDocument();
      expect(screen.queryByText('currentRatings')).not.toBeInTheDocument();

      const historyTab = screen.getByText('history');
      await user.click(historyTab);

      expect(screen.getByText('currentRatings')).toBeInTheDocument();
      expect(screen.queryByText('addNewRating')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('form fields have proper labels', async () => {
      const user = userEvent.setup();
      render(<RatingHistoryDialog {...defaultProps} />);

      const addRatingTab = screen.getByText('addRating');
      await user.click(addRatingTab);

      expect(screen.getByLabelText('ratingType')).toBeInTheDocument();
      expect(screen.getByLabelText('rating')).toBeInTheDocument();
      expect(screen.getByLabelText('provisionalRating')).toBeInTheDocument();
    });

    test('dialog has proper modal attributes', () => {
      render(<RatingHistoryDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    test('tabs have proper aria labels', () => {
      render(<RatingHistoryDialog {...defaultProps} />);

      expect(
        screen.getByRole('tablist', { name: 'rating management tabs' })
      ).toBeInTheDocument();
    });

    test('error messages are accessible', async () => {
      const user = userEvent.setup();
      render(<RatingHistoryDialog {...defaultProps} />);

      const addRatingTab = screen.getByText('addRating');
      await user.click(addRatingTab);

      const submitButton = screen.getByText('addRating');
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText('Rating type is required');
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  describe('Rating Type Information', () => {
    test('displays icons for different rating types', async () => {
      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('trophy-icon')).toBeInTheDocument(); // FIDE Standard
        expect(screen.getByTestId('speed-icon')).toBeInTheDocument(); // FIDE Rapid
      });
    });

    test('handles unknown rating types gracefully', async () => {
      const customRatingHistory = [
        createMockRatingHistory(1, {
          rating_type: 'custom_rating',
          rating: 1900,
        }),
      ];
      mockCommands.getPlayerRatingHistory.mockResolvedValue(
        customRatingHistory
      );

      render(<RatingHistoryDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('CUSTOM_RATING')).toBeInTheDocument();
      });
    });
  });
});
