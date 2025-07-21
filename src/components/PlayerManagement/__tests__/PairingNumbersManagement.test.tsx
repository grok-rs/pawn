import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import PairingNumbersManagement from '../PairingNumbersManagement';
import type { Player } from '@dto/bindings';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => {
      if (values) {
        let result = key;
        Object.entries(values).forEach(([k, v]) => {
          result = result.replace(`{{${k}}}`, String(v));
        });
        return result;
      }
      return key;
    },
  }),
}));

// Mock commands
const mockCommands = {
  generatePairingNumbers: vi.fn(),
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
  rating: 1800 + id * 50,
  country_code: 'US',
  title: null,
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

describe('PairingNumbersManagement', () => {
  const mockOnClose = vi.fn();
  const mockOnUpdate = vi.fn();

  const playersWithoutNumbers = [
    createMockPlayer(1),
    createMockPlayer(2),
    createMockPlayer(3),
  ];

  const playersWithSomeNumbers = [
    createMockPlayer(1, { pairing_number: 1 }),
    createMockPlayer(2, { pairing_number: 2 }),
    createMockPlayer(3), // No pairing number
    createMockPlayer(4), // No pairing number
  ];

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    tournamentId: 1,
    players: playersWithoutNumbers,
    onUpdate: mockOnUpdate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCommands.generatePairingNumbers.mockResolvedValue(true);
  });

  describe('Initial Rendering', () => {
    test('renders pairing numbers dialog when open', () => {
      render(<PairingNumbersManagement {...defaultProps} />);

      expect(screen.getByText('pairingNumbers.title')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('does not render when closed', () => {
      render(<PairingNumbersManagement {...defaultProps} open={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('shows description text', () => {
      render(<PairingNumbersManagement {...defaultProps} />);

      expect(
        screen.getByText('pairingNumbers.description')
      ).toBeInTheDocument();
    });

    test('renders all form controls', () => {
      render(<PairingNumbersManagement {...defaultProps} />);

      expect(
        screen.getByLabelText('pairingNumbers.method')
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('pairingNumbers.startNumber')
      ).toBeInTheDocument();
    });

    test('shows help text for start number', () => {
      render(<PairingNumbersManagement {...defaultProps} />);

      expect(
        screen.getByText('pairingNumbers.startNumberHelp')
      ).toBeInTheDocument();
    });
  });

  describe('Generation Methods', () => {
    test('shows all generation methods', async () => {
      const user = userEvent.setup();
      render(<PairingNumbersManagement {...defaultProps} />);

      const methodSelect = screen.getByLabelText('pairingNumbers.method');
      await user.click(methodSelect);

      expect(
        screen.getByText('pairingNumbers.methods.sequential')
      ).toBeInTheDocument();
      expect(
        screen.getByText('pairingNumbers.methods.random')
      ).toBeInTheDocument();
      expect(
        screen.getByText('pairingNumbers.methods.bySeed')
      ).toBeInTheDocument();
    });

    test('defaults to sequential method', () => {
      render(<PairingNumbersManagement {...defaultProps} />);

      const methodSelect = screen.getByDisplayValue('sequential');
      expect(methodSelect).toBeInTheDocument();
    });

    test('allows changing generation method', async () => {
      const user = userEvent.setup();
      render(<PairingNumbersManagement {...defaultProps} />);

      const methodSelect = screen.getByLabelText('pairingNumbers.method');
      await user.click(methodSelect);

      const randomOption = screen.getByText('pairingNumbers.methods.random');
      await user.click(randomOption);

      await waitFor(() => {
        expect(screen.getByDisplayValue('random')).toBeInTheDocument();
      });
    });

    test('shows warning for by_seed method', async () => {
      const user = userEvent.setup();
      render(<PairingNumbersManagement {...defaultProps} />);

      const methodSelect = screen.getByLabelText('pairingNumbers.method');
      await user.click(methodSelect);

      const bySeedOption = screen.getByText('pairingNumbers.methods.bySeed');
      await user.click(bySeedOption);

      await waitFor(() => {
        expect(
          screen.getByText('pairingNumbers.seedMethodWarning')
        ).toBeInTheDocument();
      });
    });

    test('hides warning for other methods', async () => {
      const user = userEvent.setup();
      render(<PairingNumbersManagement {...defaultProps} />);

      // Initially no warning (sequential is default)
      expect(
        screen.queryByText('pairingNumbers.seedMethodWarning')
      ).not.toBeInTheDocument();

      // Switch to by_seed to show warning
      const methodSelect = screen.getByLabelText('pairingNumbers.method');
      await user.click(methodSelect);
      const bySeedOption = screen.getByText('pairingNumbers.methods.bySeed');
      await user.click(bySeedOption);

      await waitFor(() => {
        expect(
          screen.getByText('pairingNumbers.seedMethodWarning')
        ).toBeInTheDocument();
      });

      // Switch back to sequential to hide warning
      await user.click(methodSelect);
      const sequentialOption = screen.getByText(
        'pairingNumbers.methods.sequential'
      );
      await user.click(sequentialOption);

      await waitFor(() => {
        expect(
          screen.queryByText('pairingNumbers.seedMethodWarning')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Start Number Configuration', () => {
    test('defaults to start number 1', () => {
      render(<PairingNumbersManagement {...defaultProps} />);

      const startNumberInput = screen.getByLabelText(
        'pairingNumbers.startNumber'
      );
      expect(startNumberInput).toHaveValue(1);
    });

    test('allows changing start number', async () => {
      const user = userEvent.setup();
      render(<PairingNumbersManagement {...defaultProps} />);

      const startNumberInput = screen.getByLabelText(
        'pairingNumbers.startNumber'
      );
      await user.clear(startNumberInput);
      await user.type(startNumberInput, '10');

      expect(startNumberInput).toHaveValue(10);
    });

    test('handles invalid start number input', async () => {
      const user = userEvent.setup();
      render(<PairingNumbersManagement {...defaultProps} />);

      const startNumberInput = screen.getByLabelText(
        'pairingNumbers.startNumber'
      );
      await user.clear(startNumberInput);
      await user.type(startNumberInput, 'abc');

      // Should fall back to 1
      expect(startNumberInput).toHaveValue(1);
    });

    test('enforces minimum value of 1', () => {
      render(<PairingNumbersManagement {...defaultProps} />);

      const startNumberInput = screen.getByLabelText(
        'pairingNumbers.startNumber'
      );
      expect(startNumberInput).toHaveAttribute('min', '1');
    });
  });

  describe('Existing Numbers Handling', () => {
    test('shows warning when players have existing numbers', () => {
      render(
        <PairingNumbersManagement
          {...defaultProps}
          players={playersWithSomeNumbers}
        />
      );

      expect(
        screen.getByText('pairingNumbers.existingWarning')
      ).toBeInTheDocument();
      expect(screen.getByText(/2.*4/)).toBeInTheDocument(); // 2 existing out of 4 total
    });

    test('hides warning when no existing numbers', () => {
      render(<PairingNumbersManagement {...defaultProps} />);

      expect(
        screen.queryByText('pairingNumbers.existingWarning')
      ).not.toBeInTheDocument();
    });

    test('shows preserve existing switch when there are existing numbers', () => {
      render(
        <PairingNumbersManagement
          {...defaultProps}
          players={playersWithSomeNumbers}
        />
      );

      expect(
        screen.getByLabelText('pairingNumbers.preserveExisting')
      ).toBeInTheDocument();
    });

    test('hides preserve existing switch when no existing numbers', () => {
      render(<PairingNumbersManagement {...defaultProps} />);

      expect(
        screen.queryByLabelText('pairingNumbers.preserveExisting')
      ).not.toBeInTheDocument();
    });

    test('allows toggling preserve existing option', async () => {
      const user = userEvent.setup();
      render(
        <PairingNumbersManagement
          {...defaultProps}
          players={playersWithSomeNumbers}
        />
      );

      const preserveSwitch = screen.getByLabelText(
        'pairingNumbers.preserveExisting'
      );
      expect(preserveSwitch).not.toBeChecked();

      await user.click(preserveSwitch);
      expect(preserveSwitch).toBeChecked();

      await user.click(preserveSwitch);
      expect(preserveSwitch).not.toBeChecked();
    });
  });

  describe('Form Submission', () => {
    test('generates pairing numbers with default settings', async () => {
      const user = userEvent.setup();
      render(<PairingNumbersManagement {...defaultProps} />);

      const generateButton = screen.getByText('pairingNumbers.generate');
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockCommands.generatePairingNumbers).toHaveBeenCalledWith({
          tournament_id: 1,
          method: 'sequential',
          start_number: 1,
          preserve_existing: false,
        });
      });

      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('generates pairing numbers with custom settings', async () => {
      const user = userEvent.setup();
      render(
        <PairingNumbersManagement
          {...defaultProps}
          players={playersWithSomeNumbers}
        />
      );

      // Change method
      const methodSelect = screen.getByLabelText('pairingNumbers.method');
      await user.click(methodSelect);
      await user.click(screen.getByText('pairingNumbers.methods.random'));

      // Change start number
      const startNumberInput = screen.getByLabelText(
        'pairingNumbers.startNumber'
      );
      await user.clear(startNumberInput);
      await user.type(startNumberInput, '5');

      // Enable preserve existing
      const preserveSwitch = screen.getByLabelText(
        'pairingNumbers.preserveExisting'
      );
      await user.click(preserveSwitch);

      const generateButton = screen.getByText('pairingNumbers.generate');
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockCommands.generatePairingNumbers).toHaveBeenCalledWith({
          tournament_id: 1,
          method: 'random',
          start_number: 5,
          preserve_existing: true,
        });
      });
    });

    test('handles generation errors gracefully', async () => {
      mockCommands.generatePairingNumbers.mockRejectedValue(
        new Error('Generation failed')
      );

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const user = userEvent.setup();
      render(<PairingNumbersManagement {...defaultProps} />);

      const generateButton = screen.getByText('pairingNumbers.generate');
      await user.click(generateButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to generate pairing numbers:',
          expect.any(Error)
        );
      });

      // Should not call callbacks on error
      expect(mockOnUpdate).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('shows loading state during generation', async () => {
      let resolveGeneration: (value: boolean) => void;
      mockCommands.generatePairingNumbers.mockImplementation(() => {
        return new Promise<boolean>(resolve => {
          resolveGeneration = resolve;
        });
      });

      const user = userEvent.setup();
      render(<PairingNumbersManagement {...defaultProps} />);

      const generateButton = screen.getByText('pairingNumbers.generate');
      await user.click(generateButton);

      // Should show loading state
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(generateButton).toBeDisabled();

      // Complete the promise
      resolveGeneration!(true);

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dialog Controls', () => {
    test('closes dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<PairingNumbersManagement {...defaultProps} />);

      const cancelButton = screen.getByText('common.cancel');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('prevents closing during loading', async () => {
      let resolveGeneration: (value: boolean) => void;
      mockCommands.generatePairingNumbers.mockImplementation(() => {
        return new Promise<boolean>(resolve => {
          resolveGeneration = resolve;
        });
      });

      const user = userEvent.setup();
      render(<PairingNumbersManagement {...defaultProps} />);

      const generateButton = screen.getByText('pairingNumbers.generate');
      await user.click(generateButton);

      // Try to cancel while loading
      const cancelButton = screen.getByText('common.cancel');
      expect(cancelButton).toBeDisabled();

      // Complete the promise
      resolveGeneration!(true);

      await waitFor(() => {
        expect(cancelButton).not.toBeDisabled();
      });
    });

    test('disables generate button during loading', async () => {
      let resolveGeneration: (value: boolean) => void;
      mockCommands.generatePairingNumbers.mockImplementation(() => {
        return new Promise<boolean>(resolve => {
          resolveGeneration = resolve;
        });
      });

      const user = userEvent.setup();
      render(<PairingNumbersManagement {...defaultProps} />);

      const generateButton = screen.getByText('pairingNumbers.generate');
      expect(generateButton).not.toBeDisabled();

      await user.click(generateButton);

      expect(generateButton).toBeDisabled();

      // Complete the promise
      resolveGeneration!(true);

      await waitFor(() => {
        expect(generateButton).not.toBeDisabled();
      });
    });
  });

  describe('Edge Cases', () => {
    test('handles empty players list', () => {
      render(<PairingNumbersManagement {...defaultProps} players={[]} />);

      expect(screen.getByText('pairingNumbers.title')).toBeInTheDocument();
      expect(
        screen.queryByText('pairingNumbers.existingWarning')
      ).not.toBeInTheDocument();
    });

    test('handles all players having pairing numbers', () => {
      const allWithNumbers = [
        createMockPlayer(1, { pairing_number: 1 }),
        createMockPlayer(2, { pairing_number: 2 }),
        createMockPlayer(3, { pairing_number: 3 }),
      ];

      render(
        <PairingNumbersManagement {...defaultProps} players={allWithNumbers} />
      );

      expect(
        screen.getByText('pairingNumbers.existingWarning')
      ).toBeInTheDocument();
      expect(screen.getByText(/3.*3/)).toBeInTheDocument(); // 3 existing out of 3 total
    });

    test('calculates existing numbers correctly with mixed data', () => {
      const mixedPlayers = [
        createMockPlayer(1, { pairing_number: 1 }),
        createMockPlayer(2), // null pairing_number
        createMockPlayer(3, { pairing_number: 3 }),
        createMockPlayer(4, { pairing_number: 0 }), // 0 is truthy, should count
        createMockPlayer(5), // null pairing_number
      ];

      render(
        <PairingNumbersManagement {...defaultProps} players={mixedPlayers} />
      );

      expect(screen.getByText(/3.*5/)).toBeInTheDocument(); // 3 existing out of 5 total
    });
  });

  describe('Accessibility', () => {
    test('form controls have proper labels', () => {
      render(
        <PairingNumbersManagement
          {...defaultProps}
          players={playersWithSomeNumbers}
        />
      );

      expect(
        screen.getByLabelText('pairingNumbers.method')
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('pairingNumbers.startNumber')
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('pairingNumbers.preserveExisting')
      ).toBeInTheDocument();
    });

    test('dialog has proper modal attributes', () => {
      render(<PairingNumbersManagement {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    test('buttons have accessible names', () => {
      render(<PairingNumbersManagement {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: 'common.cancel' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'pairingNumbers.generate' })
      ).toBeInTheDocument();
    });

    test('number input has proper constraints', () => {
      render(<PairingNumbersManagement {...defaultProps} />);

      const startNumberInput = screen.getByLabelText(
        'pairingNumbers.startNumber'
      );
      expect(startNumberInput).toHaveAttribute('type', 'number');
      expect(startNumberInput).toHaveAttribute('min', '1');
    });

    test('loading button shows progress indicator', async () => {
      let resolveGeneration: (value: boolean) => void;
      mockCommands.generatePairingNumbers.mockImplementation(() => {
        return new Promise<boolean>(resolve => {
          resolveGeneration = resolve;
        });
      });

      const user = userEvent.setup();
      render(<PairingNumbersManagement {...defaultProps} />);

      const generateButton = screen.getByText('pairingNumbers.generate');
      await user.click(generateButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      resolveGeneration!(true);

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });

  describe('Tournament Context', () => {
    test('passes correct tournament ID in request', async () => {
      const user = userEvent.setup();
      render(<PairingNumbersManagement {...defaultProps} tournamentId={42} />);

      const generateButton = screen.getByText('pairingNumbers.generate');
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockCommands.generatePairingNumbers).toHaveBeenCalledWith({
          tournament_id: 42,
          method: 'sequential',
          start_number: 1,
          preserve_existing: false,
        });
      });
    });
  });
});
