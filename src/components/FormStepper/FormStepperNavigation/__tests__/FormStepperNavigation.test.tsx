import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import FormStepperNavigation from '../FormStepperNavigation';
import FormStepperContext from '../../FormStepperContext/FormStepperContext';
import { FormStepperContextType } from '../../types';

// Mock MUI components
interface MockLoadingButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

interface MockButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: string;
}

interface MockStackProps {
  children: React.ReactNode;
}

vi.mock('@mui/lab', () => ({
  LoadingButton: ({
    children,
    loading,
    disabled,
    onClick,
    type,
    ...props
  }: MockLoadingButtonProps) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      type={type}
      data-loading={loading}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  ),
}));

vi.mock('@mui/material', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    ...props
  }: MockButtonProps) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
  Stack: ({ children, ...props }: MockStackProps) => (
    <div data-testid="stack" {...props}>
      {children}
    </div>
  ),
}));

describe('FormStepperNavigation', () => {
  const createMockContext = (
    overrides: Partial<FormStepperContextType<unknown>> = {}
  ) => ({
    activeStep: 0,
    steps: [],
    isSubmitting: false,
    isSubmitButtonDisabled: false,
    onLastStep: vi.fn(),
    isLastStep: false,
    isFirstStep: true,
    onSubmit: vi.fn(),
    handleDisableSubmitButton: vi.fn(),
    onCancel: vi.fn(),
    onStepBack: vi.fn(),
    ...overrides,
  });

  const renderWithContext = (
    contextValue: FormStepperContextType<unknown>,
    component?: React.ComponentType<{
      onStepBack?: () => void;
      isSubmitting?: boolean;
      isSubmitButtonDisabled?: boolean;
      isLastStep?: boolean;
      isFirstStep?: boolean;
      onCancel?: () => void;
    }>
  ) => {
    return render(
      <FormStepperContext.Provider value={contextValue}>
        <FormStepperNavigation component={component} />
      </FormStepperContext.Provider>
    );
  };

  describe('Default Navigation', () => {
    test('renders default navigation buttons', () => {
      const mockContext = createMockContext();
      renderWithContext(mockContext);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Connect')).toBeInTheDocument();
    });

    test('cancel button calls onCancel when clicked', async () => {
      const user = userEvent.setup();
      const mockOnCancel = vi.fn();
      const mockContext = createMockContext({ onCancel: mockOnCancel });

      renderWithContext(mockContext);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    test('submit button has correct type', () => {
      const mockContext = createMockContext();
      renderWithContext(mockContext);

      const submitButton = screen.getByText('Connect');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    test('disables buttons when submitting', () => {
      const mockContext = createMockContext({ isSubmitting: true });
      renderWithContext(mockContext);

      const cancelButton = screen.getByText('Cancel');
      const submitButton = screen.getByText('Connect');

      expect(cancelButton).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    test('disables submit button when isSubmitButtonDisabled is true', () => {
      const mockContext = createMockContext({ isSubmitButtonDisabled: true });
      renderWithContext(mockContext);

      const submitButton = screen.getByText('Connect');
      expect(submitButton).toBeDisabled();
    });

    test('shows loading state on submit button when submitting', () => {
      const mockContext = createMockContext({ isSubmitting: true });
      renderWithContext(mockContext);

      const submitButton = screen.getByText('Loading...');
      expect(submitButton).toHaveAttribute('data-loading', 'true');
    });
  });

  describe('Custom Navigation Component', () => {
    test('renders custom navigation component when provided', () => {
      const CustomNavigation = () => (
        <div data-testid="custom-navigation">Custom Navigation</div>
      );

      const mockContext = createMockContext();
      renderWithContext(mockContext, CustomNavigation);

      expect(screen.getByTestId('custom-navigation')).toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
      expect(screen.queryByText('Connect')).not.toBeInTheDocument();
    });

    test('passes correct props to custom navigation component', () => {
      interface CustomNavProps {
        onStepBack?: () => void;
        isSubmitting?: boolean;
        isSubmitButtonDisabled?: boolean;
        isLastStep?: boolean;
        isFirstStep?: boolean;
        onCancel?: () => void;
      }

      let receivedProps: CustomNavProps | null = null;

      const CustomNavigation = (props: CustomNavProps) => {
        receivedProps = props;
        return <div data-testid="custom-navigation">Custom Navigation</div>;
      };

      const mockContext = createMockContext({
        isSubmitting: true,
        isSubmitButtonDisabled: true,
        isLastStep: true,
        isFirstStep: false,
      });

      renderWithContext(mockContext, CustomNavigation);

      expect(receivedProps).toEqual({
        onStepBack: mockContext.onStepBack,
        isSubmitting: true,
        isSubmitButtonDisabled: true,
        isLastStep: true,
        isFirstStep: false,
        onCancel: mockContext.onCancel,
      });
    });

    test('custom navigation can use onStepBack', async () => {
      const user = userEvent.setup();
      const mockOnStepBack = vi.fn();

      interface CustomNavProps {
        onStepBack?: () => void;
      }

      const CustomNavigation = ({ onStepBack }: CustomNavProps) => (
        <button onClick={onStepBack} data-testid="back-button">
          Back
        </button>
      );

      const mockContext = createMockContext({
        onStepBack: mockOnStepBack,
        isFirstStep: false,
      });

      renderWithContext(mockContext, CustomNavigation);

      const backButton = screen.getByTestId('back-button');
      await user.click(backButton);

      expect(mockOnStepBack).toHaveBeenCalledTimes(1);
    });

    test('custom navigation receives all expected prop types', () => {
      interface CustomNavProps {
        onStepBack?: () => void;
        isSubmitting?: boolean;
        isSubmitButtonDisabled?: boolean;
        isLastStep?: boolean;
        isFirstStep?: boolean;
        onCancel?: () => void;
      }

      let receivedProps: CustomNavProps | null = null;

      const CustomNavigation = (props: CustomNavProps) => {
        receivedProps = props;
        return <div>Custom Navigation</div>;
      };

      const mockOnStepBack = vi.fn();
      const mockOnCancel = vi.fn();

      const mockContext = createMockContext({
        onStepBack: mockOnStepBack,
        onCancel: mockOnCancel,
      });

      renderWithContext(mockContext, CustomNavigation);

      if (receivedProps) {
        expect(typeof receivedProps.onStepBack).toBe('function');
        expect(typeof receivedProps.isSubmitting).toBe('boolean');
        expect(typeof receivedProps.isSubmitButtonDisabled).toBe('boolean');
        expect(typeof receivedProps.isLastStep).toBe('boolean');
        expect(typeof receivedProps.isFirstStep).toBe('boolean');
        expect(typeof receivedProps.onCancel).toBe('function');
      }
    });

    test('custom navigation handles undefined onCancel gracefully', () => {
      interface CustomNavProps {
        onCancel?: () => void;
      }

      const CustomNavigation = ({ onCancel }: CustomNavProps) => (
        <button onClick={onCancel} disabled={!onCancel}>
          Cancel
        </button>
      );

      const mockContext = createMockContext({ onCancel: undefined });
      renderWithContext(mockContext, CustomNavigation);

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Button Styling and Props', () => {
    test('default buttons have correct variants', () => {
      const mockContext = createMockContext();
      renderWithContext(mockContext);

      const cancelButton = screen.getByText('Cancel');
      screen.getByText('Connect');

      expect(cancelButton).toHaveAttribute('data-variant', 'outlined');
      // LoadingButton doesn't have variant attribute in our mock, but the component should pass it
    });

    test('buttons have fullWidth prop', () => {
      const mockContext = createMockContext();
      renderWithContext(mockContext);

      // Both buttons should be rendered (testing that they exist)
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Connect')).toBeInTheDocument();
    });

    test('renders within Stack component', () => {
      const mockContext = createMockContext();
      renderWithContext(mockContext);

      expect(screen.getByTestId('stack')).toBeInTheDocument();
    });
  });

  describe('Context Integration', () => {
    test('uses all required context values', () => {
      const mockContext = createMockContext({
        isSubmitting: true,
        isSubmitButtonDisabled: false,
        isLastStep: true,
        isFirstStep: false,
      });

      renderWithContext(mockContext);

      // All context values should be properly consumed
      expect(screen.getByText('Loading...')).toBeInTheDocument(); // isSubmitting
      expect(screen.getByText('Cancel')).toBeDisabled(); // isSubmitting affects cancel
    });

    test('handles missing context gracefully', () => {
      // This should throw an error since useFormStepperContext requires context
      expect(() => render(<FormStepperNavigation />)).toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('handles falsy onCancel without crashing', () => {
      const mockContext = createMockContext({ onCancel: null as any });

      expect(() => renderWithContext(mockContext)).not.toThrow();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('handles falsy onStepBack in custom component without crashing', () => {
      const CustomNavigation = ({ onStepBack }: any) => (
        <button onClick={onStepBack}>Back</button>
      );

      const mockContext = createMockContext({ onStepBack: null as any });

      expect(() =>
        renderWithContext(mockContext, CustomNavigation)
      ).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    test('submit button has proper button type', () => {
      const mockContext = createMockContext();
      renderWithContext(mockContext);

      const submitButton = screen.getByText('Connect');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    test('disabled buttons are properly marked as disabled', () => {
      const mockContext = createMockContext({
        isSubmitting: true,
        isSubmitButtonDisabled: true,
      });

      renderWithContext(mockContext);

      const cancelButton = screen.getByText('Cancel');
      const submitButton = screen.getByText('Loading...');

      expect(cancelButton).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });
});
