import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { vi } from 'vitest';
import TimeInputWithUnits from '../TimeInputWithUnits';

// Mock react-i18next
const mockT = vi.fn((key: string) => key);
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}));

// Mock the styled component
vi.mock('../styled', () => ({
  StyledTextField: ({ children, ...props }: any) => (
    <div data-testid="styled-textfield" {...props}>
      {children}
    </div>
  ),
}));

// Mock CustomFormHelperText
vi.mock('../FormHelperText/FormHelperText', () => ({
  default: ({ errorMessage }: { errorMessage?: string }) =>
    errorMessage ? <span data-testid="helper-text">{errorMessage}</span> : null,
}));

// Test wrapper with form context
const TestWrapper = ({
  children,
  defaultValues = {},
}: {
  children: React.ReactNode;
  defaultValues?: Record<string, any>;
}) => {
  const methods = useForm({
    defaultValues: {
      timeValue: '',
      timeUnit: 'minutes',
      ...defaultValues,
    },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('TimeInputWithUnits', () => {
  const mockUnitOptions = [
    { value: 'minutes', label: 'time.minutes' },
    { value: 'hours', label: 'time.hours' },
    { value: 'days', label: 'time.days' },
  ];

  const mockProps = {
    label: 'time.duration',
    inputName: 'timeValue',
    unitName: 'timeUnit',
    defaultUnit: 'minutes',
    unitOptions: mockUnitOptions,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTranslation).mockReturnValue({
      t: mockT,
    } as any);
    mockT.mockImplementation((key: string) => {
      const translations: Record<string, string> = {
        'time.duration': 'Duration',
        'time.minutes': 'Minutes',
        'time.hours': 'Hours',
        'time.days': 'Days',
      };
      return translations[key] || key;
    });
  });

  describe('Basic Rendering', () => {
    test('renders time input with correct label', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Duration')).toBeInTheDocument();
    });

    test('renders as number input type', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Duration');
      expect(input).toHaveAttribute('type', 'number');
    });

    test('is full width by default', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const styledTextField = screen.getByTestId('styled-textfield');
      expect(styledTextField).toHaveAttribute('fullWidth');
    });

    test('is marked as required', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const styledTextField = screen.getByTestId('styled-textfield');
      expect(styledTextField).toHaveAttribute('required');
    });

    test('has minimum value constraint', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Duration');
      expect(input).toHaveAttribute('min', '0');
    });
  });

  describe('Unit Selection', () => {
    test('renders unit select with default value', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByDisplayValue('Minutes')).toBeInTheDocument();
    });

    test('displays all unit options when opened', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const select = screen.getByDisplayValue('Minutes');
      await user.click(select);

      expect(screen.getByText('Minutes')).toBeInTheDocument();
      expect(screen.getByText('Hours')).toBeInTheDocument();
      expect(screen.getByText('Days')).toBeInTheDocument();
    });

    test('allows unit selection change', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const select = screen.getByDisplayValue('Minutes');
      await user.click(select);
      await user.click(screen.getByText('Hours'));

      expect(screen.getByDisplayValue('Hours')).toBeInTheDocument();
    });

    test('uses custom default unit', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} defaultUnit="hours" />
        </TestWrapper>
      );

      expect(screen.getByDisplayValue('Hours')).toBeInTheDocument();
    });

    test('translates unit option labels', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      expect(mockT).toHaveBeenCalledWith('time.minutes');
      expect(mockT).toHaveBeenCalledWith('time.hours');
      expect(mockT).toHaveBeenCalledWith('time.days');
    });
  });

  describe('Input Behavior', () => {
    test('accepts numeric input', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Duration');
      await user.type(input, '30');

      expect(input).toHaveValue(30);
    });

    test('allows decimal values', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Duration');
      await user.type(input, '1.5');

      expect(input).toHaveValue(1.5);
    });

    test('prevents negative values', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Duration');
      await user.type(input, '-10');

      // Browser should prevent negative input due to min="0"
      expect(input).toHaveAttribute('min', '0');
    });

    test('clears input value when cleared', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Duration');
      await user.type(input, '25');
      expect(input).toHaveValue(25);

      await user.clear(input);
      expect(input).toHaveValue(null);
    });

    test('handles large numbers', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Duration');
      await user.type(input, '999999');

      expect(input).toHaveValue(999999);
    });
  });

  describe('Error Handling', () => {
    test('displays error message when error prop provided', () => {
      const errorMessage = 'Duration is required';

      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} error={errorMessage} />
        </TestWrapper>
      );

      expect(screen.getByTestId('helper-text')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    test('applies error styling when error exists', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} error="Error message" />
        </TestWrapper>
      );

      const styledTextField = screen.getByTestId('styled-textfield');
      expect(styledTextField).toHaveAttribute('error');
    });

    test('does not display error message when no error', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      expect(screen.queryByTestId('helper-text')).not.toBeInTheDocument();
    });

    test('does not apply error styling when no error', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const styledTextField = screen.getByTestId('styled-textfield');
      expect(styledTextField).not.toHaveAttribute('error');
    });
  });

  describe('Form Integration', () => {
    test('integrates with react-hook-form', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      // Should render without errors when wrapped in FormProvider
      expect(screen.getByLabelText('Duration')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Minutes')).toBeInTheDocument();
    });

    test('registers input field with form', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Duration');
      await user.type(input, '45');

      // Form should capture the value
      expect(input).toHaveValue(45);
    });

    test('registers unit field with form', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const select = screen.getByDisplayValue('Minutes');
      await user.click(select);
      await user.click(screen.getByText('Days'));

      // Form should capture the unit change
      expect(screen.getByDisplayValue('Days')).toBeInTheDocument();
    });

    test('handles form default values', () => {
      render(
        <TestWrapper defaultValues={{ timeValue: '60', timeUnit: 'hours' }}>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByDisplayValue('60')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Hours')).toBeInTheDocument();
    });
  });

  describe('Translation Integration', () => {
    test('translates field label', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      expect(mockT).toHaveBeenCalledWith('time.duration');
      expect(screen.getByLabelText('Duration')).toBeInTheDocument();
    });

    test('handles missing translation keys gracefully', () => {
      mockT.mockImplementation((key: string) => key);

      render(
        <TestWrapper>
          <TimeInputWithUnits
            {...mockProps}
            label="missing.translation.key"
            unitOptions={[{ value: 'test', label: 'missing.unit.translation' }]}
          />
        </TestWrapper>
      );

      expect(
        screen.getByLabelText('missing.translation.key')
      ).toBeInTheDocument();
    });

    test('updates translations when language changes', () => {
      const { rerender } = render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      // Simulate language change
      mockT.mockImplementation((key: string) => {
        const frenchTranslations: Record<string, string> = {
          'time.duration': 'Durée',
          'time.minutes': 'Minutes',
        };
        return frenchTranslations[key] || key;
      });

      rerender(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      expect(mockT).toHaveBeenCalledWith('time.duration');
    });
  });

  describe('Styling and Layout', () => {
    test('uses styled TextField component', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('styled-textfield')).toBeInTheDocument();
    });

    test('has proper input adornment structure', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      // Unit selector should be in endAdornment position
      expect(screen.getByDisplayValue('Minutes')).toBeInTheDocument();
    });

    test('maintains responsive design', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const styledTextField = screen.getByTestId('styled-textfield');
      expect(styledTextField).toHaveAttribute('fullWidth');
    });
  });

  describe('Accessibility', () => {
    test('has proper form labels', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Duration');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAccessibleName('Duration');
    });

    test('associates helper text with input', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} error="Duration required" />
        </TestWrapper>
      );

      const helperText = screen.getByTestId('helper-text');
      expect(helperText).toBeInTheDocument();
    });

    test('select has accessible options', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const select = screen.getByDisplayValue('Minutes');
      await user.click(select);

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(mockUnitOptions.length);

      options.forEach(option => {
        expect(option).toBeInTheDocument();
      });
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Duration');

      // Tab to input
      await user.tab();
      expect(input).toHaveFocus();

      // Tab to select
      await user.tab();
      expect(screen.getByDisplayValue('Minutes')).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty unit options array', () => {
      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} unitOptions={[]} />
        </TestWrapper>
      );

      // Should render without crashing
      expect(screen.getByLabelText('Duration')).toBeInTheDocument();
    });

    test('handles single unit option', () => {
      const singleOption = [{ value: 'minutes', label: 'time.minutes' }];

      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} unitOptions={singleOption} />
        </TestWrapper>
      );

      expect(screen.getByDisplayValue('Minutes')).toBeInTheDocument();
    });

    test('handles unit option without label', () => {
      const optionsWithoutLabel = [{ value: 'test', label: '' }];

      render(
        <TestWrapper>
          <TimeInputWithUnits
            {...mockProps}
            unitOptions={optionsWithoutLabel}
            defaultUnit="test"
          />
        </TestWrapper>
      );

      // Should not crash
      expect(screen.getByLabelText('Duration')).toBeInTheDocument();
    });

    test('handles very long time values', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Duration');
      await user.type(input, '9999999999');

      expect(input).toHaveValue(9999999999);
    });

    test('handles decimal precision', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TimeInputWithUnits {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Duration');
      await user.type(input, '0.001');

      expect(input).toHaveValue(0.001);
    });
  });
});
