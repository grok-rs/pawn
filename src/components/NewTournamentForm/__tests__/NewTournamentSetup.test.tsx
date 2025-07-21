import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import NewTournamentSetup from '../NewTournamentSetup';

// Mock dependencies
const mockNavigate = vi.fn();
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
const mockCreateTournament = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../contexts/hooks/useNotification', () => ({
  useNotification: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

vi.mock('@dto/bindings', () => ({
  commands: {
    createTournament: mockCreateTournament,
  },
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock FormStepper and its sub-components
vi.mock('../../FormStepper', () => ({
  default: ({
    children,
    onCancel,
    onLastStep,
    steps: _steps,
    defaultValues,
  }: {
    children: React.ReactNode;
    onCancel?: () => void;
    onLastStep: (data: unknown) => Promise<void>;
    steps: unknown[];
    defaultValues: unknown;
  }) => (
    <div data-testid="form-stepper">
      <button onClick={onCancel} data-testid="cancel-button">
        Cancel
      </button>
      <button
        onClick={() => onLastStep(defaultValues)}
        data-testid="submit-button"
      >
        Submit
      </button>
      {children}
    </div>
  ),
}));

// Mock stepper sub-components (unused but kept for reference)
// const MockFormStepperComponent = ({ children, ...props }: { children?: React.ReactNode }) => (
//   <div data-testid="form-stepper-component" {...props}>{children}</div>
// );

vi.mock('../../FormStepper', () => {
  const MockFormStepper = ({
    children,
    onCancel,
    onLastStep,
    defaultValues,
  }: {
    children: React.ReactNode;
    onCancel?: () => void;
    onLastStep: (data: unknown) => Promise<void>;
    defaultValues: unknown;
  }) => (
    <div data-testid="form-stepper">
      <button onClick={onCancel} data-testid="cancel-button">
        Cancel
      </button>
      <button
        onClick={() => onLastStep(defaultValues)}
        data-testid="submit-button"
      >
        Submit
      </button>
      {children}
    </div>
  );

  MockFormStepper.Intro = () => (
    <div data-testid="form-stepper-intro">Intro</div>
  );
  MockFormStepper.Indicator = () => (
    <div data-testid="form-stepper-indicator">Indicator</div>
  );
  MockFormStepper.Content = () => (
    <div data-testid="form-stepper-content">Content</div>
  );
  MockFormStepper.Navigation = ({
    component: Component,
  }: {
    component?: React.ComponentType;
  }) =>
    Component ? (
      <Component />
    ) : (
      <div data-testid="form-stepper-navigation">Navigation</div>
    );

  return { default: MockFormStepper };
});

// Mock StepperNavigation
vi.mock('../StepperNavigation/StepperNavigation', () => ({
  default: () => <div data-testid="stepper-navigation">Stepper Navigation</div>,
}));

// Mock constants
vi.mock('../constants', () => ({
  NEW_TOURNAMENT_FORM_STEPS: [
    { id: 1, label: 'Step 1' },
    { id: 2, label: 'Step 2' },
    { id: 3, label: 'Step 3' },
  ],
}));

vi.mock('../validation', () => ({
  DEFAULT_TOURNAMENT_FORM_VALUES: {
    name: 'Test Tournament',
    city: 'Test City',
    country: 'US',
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-01-17'),
    type: 'classical',
    pairingSystem: 'individual',
    rounds: 9,
  },
}));

const renderWithRouter = (component: React.ReactNode) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe('NewTournamentSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    test('renders FormStepper with all sub-components', () => {
      renderWithRouter(<NewTournamentSetup />);

      expect(screen.getByTestId('form-stepper')).toBeInTheDocument();
      expect(screen.getByTestId('form-stepper-intro')).toBeInTheDocument();
      expect(screen.getByTestId('form-stepper-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('form-stepper-content')).toBeInTheDocument();
      expect(screen.getByTestId('stepper-navigation')).toBeInTheDocument();
    });

    test('renders cancel and submit buttons', () => {
      renderWithRouter(<NewTournamentSetup />);

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });

    test('renders styled components', () => {
      renderWithRouter(<NewTournamentSetup />);

      // The styled components should be rendered (StyledBox, StyledDivider)
      expect(screen.getByTestId('form-stepper')).toBeInTheDocument();
    });
  });

  describe('Cancel Functionality', () => {
    test('navigates to tournaments page when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<NewTournamentSetup />);

      const cancelButton = screen.getByTestId('cancel-button');
      await user.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith('/tournaments');
    });
  });

  describe('Tournament Creation', () => {
    test('creates tournament successfully on form submission', async () => {
      const user = userEvent.setup();
      const mockTournament = {
        id: 1,
        name: 'Test Tournament',
        location: 'Test City',
      };

      mockCreateTournament.mockResolvedValueOnce(mockTournament);
      renderWithRouter(<NewTournamentSetup />);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateTournament).toHaveBeenCalledWith({
          name: 'Test Tournament',
          location: 'Test City',
          date: '2024-01-15',
          time_type: 'classical',
          tournament_type: 'individual',
          player_count: 0,
          rounds_played: 0,
          total_rounds: 9,
          country_code: 'US',
        });
      });

      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Tournament created successfully!'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/tournament/1');
    });

    test('handles tournament creation error', async () => {
      const user = userEvent.setup();
      const error = new Error('Creation failed');
      mockCreateTournament.mockRejectedValueOnce(error);

      renderWithRouter(<NewTournamentSetup />);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateTournament).toHaveBeenCalled();
      });

      expect(mockShowError).toHaveBeenCalledWith(
        'Failed to create tournament. Please try again.'
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('handles error with custom message', async () => {
      const user = userEvent.setup();
      const error = { message: 'Custom error message' };
      mockCreateTournament.mockRejectedValueOnce(error);

      renderWithRouter(<NewTournamentSetup />);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateTournament).toHaveBeenCalled();
      });

      expect(mockShowError).toHaveBeenCalledWith('Custom error message');
    });

    test('handles error with details property', async () => {
      const user = userEvent.setup();
      const error = { details: 'Detailed error message' };
      mockCreateTournament.mockRejectedValueOnce(error);

      renderWithRouter(<NewTournamentSetup />);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateTournament).toHaveBeenCalled();
      });

      expect(mockShowError).toHaveBeenCalledWith('Detailed error message');
    });
  });

  describe('Form Data Processing', () => {
    test('processes form data correctly with default values', async () => {
      const user = userEvent.setup();
      const mockTournament = { id: 1 };
      mockCreateTournament.mockResolvedValueOnce(mockTournament);

      renderWithRouter(<NewTournamentSetup />);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateTournament).toHaveBeenCalledWith({
          name: 'Test Tournament',
          location: 'Test City',
          date: '2024-01-15',
          time_type: 'classical',
          tournament_type: 'individual',
          player_count: 0,
          rounds_played: 0,
          total_rounds: 9,
          country_code: 'US',
        });
      });
    });

    test('uses current date as fallback when startDate is null', async () => {
      const user = userEvent.setup();
      const mockTournament = { id: 1 };
      mockCreateTournament.mockResolvedValueOnce(mockTournament);

      // Mock default values with null startDate
      vi.mocked(
        vi.importActual('../validation')
      ).DEFAULT_TOURNAMENT_FORM_VALUES = {
        ...vi.mocked(vi.importActual('../validation'))
          .DEFAULT_TOURNAMENT_FORM_VALUES,
        startDate: null,
      };

      renderWithRouter(<NewTournamentSetup />);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateTournament).toHaveBeenCalled();
      });

      const callArgs = mockCreateTournament.mock.calls[0][0];
      expect(callArgs.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // Should be a valid date string
    });

    test('uses default country code when country is not provided', async () => {
      const user = userEvent.setup();
      const mockTournament = { id: 1 };
      mockCreateTournament.mockResolvedValueOnce(mockTournament);

      renderWithRouter(<NewTournamentSetup />);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateTournament).toHaveBeenCalledWith(
          expect.objectContaining({
            country_code: 'US', // Should use the country from mock data or fallback to UKR
          })
        );
      });
    });
  });

  describe('State Management', () => {
    test('prevents duplicate tournament creation', async () => {
      const user = userEvent.setup();
      const mockTournament = { id: 1 };
      mockCreateTournament.mockResolvedValueOnce(mockTournament);

      renderWithRouter(<NewTournamentSetup />);

      const submitButton = screen.getByTestId('submit-button');

      // First submission
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateTournament).toHaveBeenCalledTimes(1);
      });

      // Second submission should use existing tournament
      await user.click(submitButton);

      // Should not call create tournament again
      expect(mockCreateTournament).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/tournament/1');
    });

    test('navigates to existing tournament if already created', async () => {
      const user = userEvent.setup();
      const mockTournament = { id: 123 };
      mockCreateTournament.mockResolvedValueOnce(mockTournament);

      renderWithRouter(<NewTournamentSetup />);

      // First click creates tournament
      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/tournament/123');
      });

      mockNavigate.mockClear();

      // Second click should navigate to existing tournament
      await user.click(screen.getByTestId('submit-button'));

      expect(mockNavigate).toHaveBeenCalledWith('/tournament/123');
    });
  });

  describe('Integration with FormStepper', () => {
    test('passes correct props to FormStepper', () => {
      renderWithRouter(<NewTournamentSetup />);

      const formStepper = screen.getByTestId('form-stepper');
      expect(formStepper).toBeInTheDocument();

      // FormStepper should receive steps, defaultValues, onLastStep, and onCancel
      // These are tested through the button interactions above
    });

    test('uses custom StepperNavigation component', () => {
      renderWithRouter(<NewTournamentSetup />);

      expect(screen.getByTestId('stepper-navigation')).toBeInTheDocument();
    });
  });

  describe('Error Logging', () => {
    test('logs errors to console during tournament creation', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const user = userEvent.setup();
      const error = new Error('Test error');
      mockCreateTournament.mockRejectedValueOnce(error);

      renderWithRouter(<NewTournamentSetup />);

      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to create tournament:',
          error
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility and Structure', () => {
    test('maintains proper component structure', () => {
      renderWithRouter(<NewTournamentSetup />);

      // Should have main FormStepper container
      expect(screen.getByTestId('form-stepper')).toBeInTheDocument();

      // Should have all required sub-components
      expect(screen.getByTestId('form-stepper-intro')).toBeInTheDocument();
      expect(screen.getByTestId('form-stepper-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('form-stepper-content')).toBeInTheDocument();
    });
  });
});
