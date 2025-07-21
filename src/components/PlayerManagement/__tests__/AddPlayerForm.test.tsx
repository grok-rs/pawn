import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AddPlayerForm from '../AddPlayerForm';
import type { Player } from '@dto/bindings';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
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
    onChange: (date: Date | null) => void;
    value: unknown;
    slotProps?: {
      textField?: { error?: boolean; helperText?: string };
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
vi.mock('dayjs', () => ({
  default: (date?: string | Date) => ({
    format: () => date?.toString() || '',
    isValid: () => true,
    isBefore: () => true,
  }),
}));

// Mock commands
const mockCommands = {
  createPlayerEnhanced: vi.fn(),
  updatePlayer: vi.fn(),
};

vi.mock('@dto/bindings', () => ({
  commands: mockCommands,
}));

// Mock player data
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
  birth_date: '1990-01-01',
  gender: 'M',
  email: `player${id}@test.com`,
  phone: '+1-555-0123',
  club: 'Chess Club',
  status: 'active',
  seed_number: null,
  pairing_number: null,
  initial_rating: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('AddPlayerForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockPlayer = createMockPlayer(1);

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
    tournamentId: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCommands.createPlayerEnhanced.mockResolvedValue(mockPlayer);
    mockCommands.updatePlayer.mockResolvedValue(mockPlayer);
  });

  describe('Initial Rendering', () => {
    test('renders add player dialog when open', () => {
      render(<AddPlayerForm {...defaultProps} />);

      expect(screen.getByText('addPlayer')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('does not render when closed', () => {
      render(<AddPlayerForm {...defaultProps} open={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('renders all form fields', () => {
      render(<AddPlayerForm {...defaultProps} />);

      expect(screen.getByLabelText('playerName')).toBeInTheDocument();
      expect(screen.getByLabelText('rating')).toBeInTheDocument();
      expect(screen.getByLabelText('country')).toBeInTheDocument();
      expect(screen.getByLabelText('title')).toBeInTheDocument();
      expect(screen.getByLabelText('gender')).toBeInTheDocument();
      expect(screen.getByLabelText('email')).toBeInTheDocument();
      expect(screen.getByLabelText('phone')).toBeInTheDocument();
      expect(screen.getByLabelText('club')).toBeInTheDocument();
    });

    test('renders birth date picker', () => {
      render(<AddPlayerForm {...defaultProps} />);

      expect(screen.getByTestId('datepicker-birth-date')).toBeInTheDocument();
    });

    test('shows create mode title by default', () => {
      render(<AddPlayerForm {...defaultProps} />);

      expect(screen.getByText('addPlayer')).toBeInTheDocument();
    });

    test('shows edit mode title when editing player', () => {
      render(<AddPlayerForm {...defaultProps} editingPlayer={mockPlayer} />);

      expect(screen.getByText('editPlayer')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('validates required name field', async () => {
      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} />);

      const submitButton = screen.getByText('addPlayer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
    });

    test('validates minimum name length', async () => {
      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} />);

      const nameField = screen.getByLabelText('playerName');
      await user.type(nameField, 'A');

      const submitButton = screen.getByText('addPlayer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Name must be at least 2 characters')
        ).toBeInTheDocument();
      });
    });

    test('validates rating range', async () => {
      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} />);

      const nameField = screen.getByLabelText('playerName');
      await user.type(nameField, 'Test Player');

      const ratingField = screen.getByLabelText('rating');
      await user.type(ratingField, '5000');

      const submitButton = screen.getByText('addPlayer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Rating must be realistic')
        ).toBeInTheDocument();
      });
    });

    test('validates negative rating', async () => {
      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} />);

      const nameField = screen.getByLabelText('playerName');
      await user.type(nameField, 'Test Player');

      const ratingField = screen.getByLabelText('rating');
      await user.type(ratingField, '-100');

      const submitButton = screen.getByText('addPlayer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Rating must be positive')).toBeInTheDocument();
      });
    });

    test('validates birth date not in future', async () => {
      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} />);

      const nameField = screen.getByLabelText('playerName');
      await user.type(nameField, 'Test Player');

      const birthDatePicker = screen
        .getByTestId('datepicker-birth-date')
        .querySelector('input');
      if (birthDatePicker) {
        await user.type(birthDatePicker, '2030-01-01');
      }

      const submitButton = screen.getByText('addPlayer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Birth date cannot be in the future')
        ).toBeInTheDocument();
      });
    });

    test('validates email format', async () => {
      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} />);

      const nameField = screen.getByLabelText('playerName');
      await user.type(nameField, 'Test Player');

      const emailField = screen.getByLabelText('email');
      await user.type(emailField, 'invalid-email');

      const submitButton = screen.getByText('addPlayer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Must be a valid email')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission - Create Mode', () => {
    test('creates player with valid data', async () => {
      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} />);

      // Fill required fields
      const nameField = screen.getByLabelText('playerName');
      await user.type(nameField, 'John Doe');

      const ratingField = screen.getByLabelText('rating');
      await user.type(ratingField, '1800');

      const emailField = screen.getByLabelText('email');
      await user.type(emailField, 'john@test.com');

      // Submit form
      const submitButton = screen.getByText('addPlayer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCommands.createPlayerEnhanced).toHaveBeenCalledWith({
          tournament_id: 1,
          name: 'John Doe',
          rating: 1800,
          country_code: null,
          title: null,
          birth_date: null,
          gender: null,
          email: 'john@test.com',
          phone: null,
          club: null,
        });
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('creates player with all optional fields', async () => {
      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} />);

      // Fill all fields
      await user.type(screen.getByLabelText('playerName'), 'Jane Smith');
      await user.type(screen.getByLabelText('rating'), '2000');
      await user.type(screen.getByLabelText('email'), 'jane@test.com');
      await user.type(screen.getByLabelText('phone'), '+1-555-0123');
      await user.type(screen.getByLabelText('club'), 'Chess Club');

      // Select country
      const countrySelect = screen.getByLabelText('country');
      await user.click(countrySelect);
      await user.click(screen.getByText('United States'));

      // Select title
      const titleSelect = screen.getByLabelText('title');
      await user.click(titleSelect);
      await user.click(screen.getByText('FM'));

      // Select gender
      const genderSelect = screen.getByLabelText('gender');
      await user.click(genderSelect);
      await user.click(screen.getByText('female'));

      // Submit form
      const submitButton = screen.getByText('addPlayer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCommands.createPlayerEnhanced).toHaveBeenCalledWith({
          tournament_id: 1,
          name: 'Jane Smith',
          rating: 2000,
          country_code: 'US',
          title: 'FM',
          birth_date: null,
          gender: 'F',
          email: 'jane@test.com',
          phone: '+1-555-0123',
          club: 'Chess Club',
        });
      });
    });

    test('handles creation errors gracefully', async () => {
      mockCommands.createPlayerEnhanced.mockRejectedValue(
        new Error('Creation failed')
      );

      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} />);

      const nameField = screen.getByLabelText('playerName');
      await user.type(nameField, 'Test Player');

      const submitButton = screen.getByText('addPlayer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create player')).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    test('shows loading state during submission', async () => {
      let resolvePromise: (value: Player) => void;
      mockCommands.createPlayerEnhanced.mockImplementation(() => {
        return new Promise<Player>(resolve => {
          resolvePromise = resolve;
        });
      });

      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} />);

      const nameField = screen.getByLabelText('playerName');
      await user.type(nameField, 'Test Player');

      const submitButton = screen.getByText('addPlayer');
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Complete the promise
      resolvePromise!(mockPlayer);

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission - Edit Mode', () => {
    test('updates existing player', async () => {
      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} editingPlayer={mockPlayer} />);

      // Modify name
      const nameField = screen.getByLabelText('playerName');
      await user.clear(nameField);
      await user.type(nameField, 'Updated Name');

      const submitButton = screen.getByText('updatePlayer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCommands.updatePlayer).toHaveBeenCalledWith({
          id: 1,
          tournament_id: 1,
          name: 'Updated Name',
          rating: 1800,
          country_code: 'US',
          title: 'FM',
          birth_date: '1990-01-01',
          gender: 'M',
          email: 'player1@test.com',
          phone: '+1-555-0123',
          club: 'Chess Club',
        });
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('pre-fills form with existing player data', () => {
      render(<AddPlayerForm {...defaultProps} editingPlayer={mockPlayer} />);

      expect(screen.getByDisplayValue('Player 1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1800')).toBeInTheDocument();
      expect(screen.getByDisplayValue('player1@test.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+1-555-0123')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Chess Club')).toBeInTheDocument();
    });

    test('handles update errors gracefully', async () => {
      mockCommands.updatePlayer.mockRejectedValue(new Error('Update failed'));

      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} editingPlayer={mockPlayer} />);

      const submitButton = screen.getByText('updatePlayer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to update player')).toBeInTheDocument();
      });
    });
  });

  describe('Form Controls', () => {
    test('country dropdown shows all countries', async () => {
      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} />);

      const countrySelect = screen.getByLabelText('country');
      await user.click(countrySelect);

      // Should show common countries
      expect(screen.getByText('United States')).toBeInTheDocument();
      expect(screen.getByText('Germany')).toBeInTheDocument();
      expect(screen.getByText('France')).toBeInTheDocument();
    });

    test('title dropdown shows chess titles', async () => {
      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} />);

      const titleSelect = screen.getByLabelText('title');
      await user.click(titleSelect);

      // Should show chess titles
      expect(screen.getByText('GM')).toBeInTheDocument();
      expect(screen.getByText('IM')).toBeInTheDocument();
      expect(screen.getByText('FM')).toBeInTheDocument();
    });

    test('gender dropdown shows options', async () => {
      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} />);

      const genderSelect = screen.getByLabelText('gender');
      await user.click(genderSelect);

      expect(screen.getByText('male')).toBeInTheDocument();
      expect(screen.getByText('female')).toBeInTheDocument();
      expect(screen.getByText('other')).toBeInTheDocument();
    });

    test('allows clearing optional fields', async () => {
      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} editingPlayer={mockPlayer} />);

      const ratingField = screen.getByLabelText('rating');
      await user.clear(ratingField);

      const emailField = screen.getByLabelText('email');
      await user.clear(emailField);

      expect(ratingField).toHaveValue(null);
      expect(emailField).toHaveValue('');
    });
  });

  describe('Dialog Controls', () => {
    test('closes dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} />);

      const cancelButton = screen.getByText('cancel');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('closes dialog on successful submission', async () => {
      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} />);

      const nameField = screen.getByLabelText('playerName');
      await user.type(nameField, 'Test Player');

      const submitButton = screen.getByText('addPlayer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    test('resets form when dialog closes', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<AddPlayerForm {...defaultProps} />);

      const nameField = screen.getByLabelText('playerName');
      await user.type(nameField, 'Test Input');

      // Close and reopen dialog
      rerender(<AddPlayerForm {...defaultProps} open={false} />);
      rerender(<AddPlayerForm {...defaultProps} open={true} />);

      const newNameField = screen.getByLabelText('playerName');
      expect(newNameField).toHaveValue('');
    });

    test('clears errors when dialog reopens', async () => {
      mockCommands.createPlayerEnhanced.mockRejectedValue(
        new Error('Test error')
      );

      const user = userEvent.setup();
      const { rerender } = render(<AddPlayerForm {...defaultProps} />);

      const nameField = screen.getByLabelText('playerName');
      await user.type(nameField, 'Test Player');

      const submitButton = screen.getByText('addPlayer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create player')).toBeInTheDocument();
      });

      // Close and reopen
      rerender(<AddPlayerForm {...defaultProps} open={false} />);
      rerender(<AddPlayerForm {...defaultProps} open={true} />);

      expect(
        screen.queryByText('Failed to create player')
      ).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('form fields have proper labels', () => {
      render(<AddPlayerForm {...defaultProps} />);

      expect(screen.getByLabelText('playerName')).toBeInTheDocument();
      expect(screen.getByLabelText('rating')).toBeInTheDocument();
      expect(screen.getByLabelText('email')).toBeInTheDocument();
    });

    test('dialog has proper modal attributes', () => {
      render(<AddPlayerForm {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    test('error messages are accessible', async () => {
      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} />);

      const submitButton = screen.getByText('addPlayer');
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText('Name is required');
        expect(errorMessage).toBeInTheDocument();
      });
    });

    test('loading state is announced', async () => {
      let resolvePromise: (value: Player) => void;
      mockCommands.createPlayerEnhanced.mockImplementation(() => {
        return new Promise<Player>(resolve => {
          resolvePromise = resolve;
        });
      });

      const user = userEvent.setup();
      render(<AddPlayerForm {...defaultProps} />);

      const nameField = screen.getByLabelText('playerName');
      await user.type(nameField, 'Test Player');

      const submitButton = screen.getByText('addPlayer');
      await user.click(submitButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      resolvePromise!(mockPlayer);
    });
  });

  describe('Data Handling', () => {
    test('handles null values correctly', () => {
      const playerWithNulls = createMockPlayer(1, {
        rating: null as unknown as number,
        country_code: null,
        title: null,
        birth_date: null,
        phone: null,
      });

      render(
        <AddPlayerForm {...defaultProps} editingPlayer={playerWithNulls} />
      );

      // Form should handle null values without crashing
      expect(screen.getByDisplayValue('Player 1')).toBeInTheDocument();
    });

    test('preserves original data when editing', () => {
      render(<AddPlayerForm {...defaultProps} editingPlayer={mockPlayer} />);

      // All original data should be preserved in form
      expect(screen.getByDisplayValue('Player 1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1800')).toBeInTheDocument();
      expect(screen.getByDisplayValue('player1@test.com')).toBeInTheDocument();
    });

    test('handles tournament ID changes', () => {
      const { rerender } = render(<AddPlayerForm {...defaultProps} />);

      rerender(<AddPlayerForm {...defaultProps} tournamentId={2} />);

      // Form should work with different tournament IDs
      expect(screen.getByLabelText('playerName')).toBeInTheDocument();
    });
  });
});
