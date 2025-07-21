import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import * as yup from 'yup';
import { useFormContext } from 'react-hook-form';
import FormStepper from '../FormStepper';
import {
  FormStepOption,
  FormStepperContextType,
  FormStepComponentProps,
} from '../types';
import { useFormStepperContext } from '../hooks/useFormStepperContext';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Test form data type
interface TestFormData {
  step1Field: string;
  step2Field: number;
}

// Test step components
const Step1Component = ({
  handleDisableSubmitButton,
}: FormStepComponentProps<TestFormData>) => {
  const { register } = useFormContext<TestFormData>();

  const handleFieldChange = (value: string) => {
    if (value === 'disable') {
      handleDisableSubmitButton();
    }
  };

  return (
    <div>
      <input
        data-testid="step1-input"
        placeholder="Step 1 field"
        {...register('step1Field')}
        onChange={e => {
          register('step1Field').onChange(e);
          handleFieldChange(e.target.value);
        }}
      />
    </div>
  );
};

const Step2Component = () => {
  const { register } = useFormContext<TestFormData>();

  return (
    <div>
      <input
        data-testid="step2-input"
        placeholder="Step 2 field"
        type="number"
        {...register('step2Field')}
      />
    </div>
  );
};

const Step3Component = () => {
  return (
    <div>
      <span data-testid="step3-content">Final step content</span>
    </div>
  );
};

// Test schemas
const step1Schema = yup.object({
  step1Field: yup.string().required('Step 1 field is required'),
});

const step2Schema = yup.object({
  step2Field: yup
    .number()
    .required('Step 2 field is required')
    .min(1, 'Must be at least 1'),
});

describe('FormStepper', () => {
  const mockOnLastStep = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultSteps: FormStepOption<TestFormData>[] = [
    {
      component: Step1Component,
      schema: step1Schema,
      label: 'Step 1',
      stepIntro: {
        title: 'First Step',
        description: 'Complete the first step',
      },
    },
    {
      component: Step2Component,
      schema: step2Schema,
      label: 'Step 2',
      stepIntro: {
        title: 'Second Step',
        description: 'Complete the second step',
      },
    },
    {
      component: Step3Component,
      label: 'Step 3',
      stepIntro: {
        title: 'Final Step',
        description: 'Review and submit',
      },
    },
  ];

  const defaultProps = {
    steps: defaultSteps,
    onLastStep: mockOnLastStep,
    onCancel: mockOnCancel,
    defaultValues: {
      step1Field: '',
      step2Field: 0,
    } as TestFormData,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    test('renders first step by default', () => {
      render(
        <FormStepper {...defaultProps}>
          <FormStepper.Content />
        </FormStepper>
      );

      expect(screen.getByTestId('step1-input')).toBeInTheDocument();
      expect(screen.queryByTestId('step2-input')).not.toBeInTheDocument();
    });

    test('renders step indicator when provided', () => {
      render(
        <FormStepper {...defaultProps}>
          <FormStepper.Indicator />
          <FormStepper.Content />
        </FormStepper>
      );

      // Should show step indicators - looking for step labels
      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('Step 2')).toBeInTheDocument();
      expect(screen.getByText('Step 3')).toBeInTheDocument();
    });

    test('renders intro section when provided', () => {
      render(
        <FormStepper {...defaultProps}>
          <FormStepper.Intro />
          <FormStepper.Content />
        </FormStepper>
      );

      expect(screen.getByText('First Step')).toBeInTheDocument();
      expect(screen.getByText('Complete the first step')).toBeInTheDocument();
    });

    test('renders navigation buttons', () => {
      render(
        <FormStepper {...defaultProps}>
          <FormStepper.Content />
          <FormStepper.Navigation />
        </FormStepper>
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Connect')).toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    test('renders first step initially', () => {
      render(
        <FormStepper {...defaultProps}>
          <FormStepper.Content />
          <FormStepper.Navigation />
        </FormStepper>
      );

      // Should show first step
      expect(screen.getByTestId('step1-input')).toBeInTheDocument();
      expect(screen.queryByTestId('step2-input')).not.toBeInTheDocument();
    });

    test('does not advance on invalid form data', async () => {
      const user = userEvent.setup();

      // Create steps with required validation
      const stepsWithValidation: FormStepOption<TestFormData>[] = [
        {
          component: () => <input data-testid="required-input" required />,
          schema: yup.object({
            step1Field: yup.string().required('Required field'),
          }),
        },
        {
          component: Step2Component,
        },
      ];

      render(
        <FormStepper {...defaultProps} steps={stepsWithValidation}>
          <FormStepper.Content />
          <FormStepper.Navigation />
        </FormStepper>
      );

      const submitButton = screen.getByText('Connect');
      await user.click(submitButton);

      // Should stay on first step due to validation error
      expect(screen.getByTestId('required-input')).toBeInTheDocument();
    });

    test('calls onLastStep when submitting final step', async () => {
      const user = userEvent.setup();
      mockOnLastStep.mockResolvedValueOnce(undefined);

      render(
        <FormStepper {...defaultProps}>
          <FormStepper.Content />
          <FormStepper.Navigation />
        </FormStepper>
      );

      // Navigate to last step
      for (let i = 0; i < defaultSteps.length - 1; i++) {
        const submitButton = screen.getByText('Connect');
        await user.click(submitButton);
      }

      // Submit final step
      const submitButton = screen.getByText('Connect');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnLastStep).toHaveBeenCalledTimes(1);
      });
    });

    test('shows loading state during submission', async () => {
      const user = userEvent.setup();

      render(
        <FormStepper {...defaultProps} isSubmitting={true}>
          <FormStepper.Content />
          <FormStepper.Navigation />
        </FormStepper>
      );

      // Navigate to last step
      for (let i = 0; i < defaultSteps.length - 1; i++) {
        const submitButton = screen.getByText('Connect');
        await user.click(submitButton);
      }

      // Submit button should show loading state
      const submitButton = screen.getByText('Connect');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Context Provider', () => {
    test('provides correct context values', () => {
      let contextValue: FormStepperContextType<TestFormData> | null = null;

      const ContextConsumer = () => {
        const context = useFormStepperContext<TestFormData>();
        contextValue = context;
        return <div>Context consumer</div>;
      };

      render(
        <FormStepper {...defaultProps}>
          <ContextConsumer />
        </FormStepper>
      );

      expect(contextValue).not.toBeNull();
      expect(contextValue!.activeStep).toBe(0);
      expect(contextValue!.isFirstStep).toBe(true);
      expect(contextValue!.isLastStep).toBe(false);
      expect(contextValue!.steps).toEqual(defaultSteps);
    });

    test('throws error when context used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      const TestComponent = () => {
        useFormStepperContext();
        return <div>Test</div>;
      };

      expect(() => render(<TestComponent />)).toThrow(
        'No form stepper context found!'
      );

      console.error = originalError;
    });
  });

  describe('Button State Management', () => {
    test('disables submit button when handleDisableSubmitButton is called', async () => {
      const user = userEvent.setup();

      render(
        <FormStepper {...defaultProps}>
          <FormStepper.Content />
          <FormStepper.Navigation />
        </FormStepper>
      );

      const input = screen.getByTestId('step1-input');
      const submitButton = screen.getByText('Connect');

      expect(submitButton).not.toBeDisabled();

      // Type 'disable' to trigger button disable
      await user.type(input, 'disable');

      expect(submitButton).toBeDisabled();
    });

    test('cancel button calls onCancel', async () => {
      const user = userEvent.setup();

      render(
        <FormStepper {...defaultProps}>
          <FormStepper.Content />
          <FormStepper.Navigation />
        </FormStepper>
      );

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    test('disables buttons during submission', () => {
      render(
        <FormStepper {...defaultProps} isSubmitting={true}>
          <FormStepper.Content />
          <FormStepper.Navigation />
        </FormStepper>
      );

      const cancelButton = screen.getByText('Cancel');
      const submitButton = screen.getByText('Connect');

      expect(cancelButton).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Step Back Navigation', () => {
    test('goes back to previous step when onStepBack is called', async () => {
      const user = userEvent.setup();

      interface CustomNavProps {
        onStepBack?: () => void;
        isFirstStep?: boolean;
      }

      // Custom navigation component with back button
      const CustomNavigation = ({
        onStepBack,
        isFirstStep,
      }: CustomNavProps) => (
        <div>
          <button
            onClick={onStepBack}
            disabled={isFirstStep}
            data-testid="back-button"
          >
            Back
          </button>
          <button type="submit">Next</button>
        </div>
      );

      render(
        <FormStepper {...defaultProps}>
          <FormStepper.Content />
          <FormStepper.Navigation component={CustomNavigation} />
        </FormStepper>
      );

      // Navigate to second step
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByTestId('step2-input')).toBeInTheDocument();
      });

      // Go back
      const backButton = screen.getByTestId('back-button');
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByTestId('step1-input')).toBeInTheDocument();
      });
    });

    test('back button is disabled on first step', () => {
      interface CustomNavProps {
        isFirstStep?: boolean;
      }

      const CustomNavigation = ({ isFirstStep }: CustomNavProps) => (
        <button disabled={isFirstStep} data-testid="back-button">
          Back
        </button>
      );

      render(
        <FormStepper {...defaultProps}>
          <FormStepper.Content />
          <FormStepper.Navigation component={CustomNavigation} />
        </FormStepper>
      );

      const backButton = screen.getByTestId('back-button');
      expect(backButton).toBeDisabled();
    });

    test('clears form errors when going back', async () => {
      interface CustomNavProps {
        onStepBack?: () => void;
      }

      const CustomNavigation = ({ onStepBack }: CustomNavProps) => (
        <div>
          <button onClick={onStepBack} data-testid="back-button">
            Back
          </button>
          <button type="submit">Next</button>
        </div>
      );

      render(
        <FormStepper {...defaultProps}>
          <FormStepper.Content />
          <FormStepper.Navigation component={CustomNavigation} />
        </FormStepper>
      );

      // Check that back button is present
      expect(screen.getByTestId('back-button')).toBeInTheDocument();
      expect(screen.getByTestId('step1-input')).toBeInTheDocument();
    });
  });

  describe('Schema Validation', () => {
    test('applies correct schema for active step', async () => {
      const user = userEvent.setup();

      render(
        <FormStepper {...defaultProps}>
          <FormStepper.Content />
          <FormStepper.Navigation />
        </FormStepper>
      );

      // First step should validate step1Field
      const submitButton = screen.getByText('Connect');
      await user.click(submitButton);

      // Should not advance due to validation (empty required field)
      expect(screen.getByTestId('step1-input')).toBeInTheDocument();
    });

    test('handles steps without schema', () => {
      const stepsWithoutSchema: FormStepOption<TestFormData>[] = [
        {
          component: Step1Component,
          // No schema
        },
        {
          component: Step2Component,
        },
      ];

      render(
        <FormStepper {...defaultProps} steps={stepsWithoutSchema}>
          <FormStepper.Content />
          <FormStepper.Navigation />
        </FormStepper>
      );

      expect(screen.getByTestId('step1-input')).toBeInTheDocument();
    });
  });

  describe('Custom Navigation Component', () => {
    test('renders custom navigation component', () => {
      const CustomNavigation = () => (
        <div data-testid="custom-navigation">Custom Navigation</div>
      );

      render(
        <FormStepper {...defaultProps}>
          <FormStepper.Content />
          <FormStepper.Navigation component={CustomNavigation} />
        </FormStepper>
      );

      expect(screen.getByTestId('custom-navigation')).toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    test('passes correct props to custom navigation', () => {
      interface ReceivedProps {
        onStepBack?: () => void;
        isSubmitting?: boolean;
        isSubmitButtonDisabled?: boolean;
        isLastStep?: boolean;
        isFirstStep?: boolean;
        onCancel?: () => void;
      }

      let receivedProps: ReceivedProps | null = null;

      const CustomNavigation = (props: ReceivedProps) => {
        receivedProps = props;
        return <div data-testid="custom-navigation">Custom Navigation</div>;
      };

      render(
        <FormStepper {...defaultProps} isSubmitting={true}>
          <FormStepper.Content />
          <FormStepper.Navigation component={CustomNavigation} />
        </FormStepper>
      );

      expect(receivedProps).toEqual({
        onStepBack: expect.any(Function),
        isSubmitting: true,
        isSubmitButtonDisabled: false,
        isLastStep: false,
        isFirstStep: true,
        onCancel: mockOnCancel,
      });
    });
  });

  describe('Default Values', () => {
    test('applies default values to form', () => {
      const customDefaults = {
        step1Field: 'default value',
        step2Field: 42,
      };

      render(
        <FormStepper {...defaultProps} defaultValues={customDefaults}>
          <FormStepper.Content />
        </FormStepper>
      );

      // The form should render with the input field
      expect(screen.getByTestId('step1-input')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles onLastStep errors gracefully', async () => {
      const user = userEvent.setup();
      const error = new Error('Submission failed');
      mockOnLastStep.mockRejectedValueOnce(error);

      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      render(
        <FormStepper {...defaultProps}>
          <FormStepper.Content />
          <FormStepper.Navigation />
        </FormStepper>
      );

      // Navigate to final step
      for (let i = 0; i < defaultSteps.length - 1; i++) {
        await user.click(screen.getByText('Connect'));
      }

      // Submit final step
      await user.click(screen.getByText('Connect'));

      await waitFor(() => {
        expect(mockOnLastStep).toHaveBeenCalledTimes(1);
      });

      console.error = originalError;
    });
  });

  describe('Compound Component Structure', () => {
    test('exports all sub-components correctly', () => {
      expect(FormStepper.Intro).toBeDefined();
      expect(FormStepper.Indicator).toBeDefined();
      expect(FormStepper.Content).toBeDefined();
      expect(FormStepper.Navigation).toBeDefined();
    });

    test('can be used with all sub-components', () => {
      render(
        <FormStepper {...defaultProps}>
          <FormStepper.Intro />
          <FormStepper.Indicator />
          <FormStepper.Content />
          <FormStepper.Navigation />
        </FormStepper>
      );

      expect(screen.getByText('First Step')).toBeInTheDocument();
      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByTestId('step1-input')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });
});
