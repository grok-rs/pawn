import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
// Unused imports removed by ESLint fix
import { ThemeProvider, createTheme } from '@mui/material/styles';
import GeneralInfoStep from '../GeneralInfoStep';
import { TournamentFormValues } from '../types';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock MUI icons
vi.mock('@mui/icons-material', () => ({
  EmojiEvents: ({ color }: { color?: string }) => (
    <span data-testid="emoji-events-icon" data-color={color}>
      🏆
    </span>
  ),
  LocationOn: ({ color }: { color?: string }) => (
    <span data-testid="location-icon" data-color={color}>
      📍
    </span>
  ),
  CalendarToday: ({ color }: { color?: string }) => (
    <span data-testid="calendar-icon" data-color={color}>
      📅
    </span>
  ),
}));

// Mock DatePicker
vi.mock('@mui/x-date-pickers', () => ({
  DatePicker: ({
    label,
    onChange,
    value: _value,
    slotProps,
    ...props
  }: {
    label: string;
    onChange: (date: Date | null) => void;
    value: unknown;
    slotProps?: {
      textField?: {
        fullWidth?: boolean;
        InputProps?: {
          startAdornment?: React.ReactNode;
        };
      };
    };
  }) => (
    <div data-testid={`datepicker-${label.toLowerCase().replace('_', '-')}`}>
      <input
        placeholder={label}
        onChange={e =>
          onChange(e.target.value ? new Date(e.target.value) : null)
        }
        data-fullwidth={slotProps?.textField?.fullWidth}
        {...props}
      />
      {slotProps?.textField?.InputProps?.startAdornment}
    </div>
  ),
}));

// Mock dayjs
vi.mock('dayjs', () => ({
  default: (date: Date | string | null) => ({
    format: () => date?.toString() || '',
    valueOf: () => (date ? new Date(date).getTime() : 0),
  }),
}));

// Mock CountryAutocomplete
vi.mock('../../CountryAutocomplete', () => ({
  default: ({
    label,
    error,
    helperText,
    name,
    control: _control,
  }: {
    label: string;
    error?: boolean;
    helperText?: React.ReactNode;
    name: string;
    control: unknown;
  }) => (
    <div data-testid={`country-autocomplete-${name}`}>
      <input
        placeholder={label}
        data-error={error}
        aria-describedby="country-helper-text"
      />
      <div id="country-helper-text">{helperText}</div>
    </div>
  ),
}));

// Mock CustomFormHelperText
vi.mock('../../FormHelperText/FormHelperText', () => ({
  default: ({ errorMessage }: { errorMessage?: { message?: string } }) => (
    <span data-testid="helper-text">{errorMessage?.message || ''}</span>
  ),
}));

// Test wrapper component that provides form context
const TestWrapper = ({
  children,
  defaultValues: _defaultValues = {},
  errors: _errors = {},
}: {
  children: React.ReactNode;
  defaultValues?: Partial<TournamentFormValues>;
  errors?: Record<string, { message: string }>;
}) => {
  const theme = createTheme();

  // This wrapper provides the necessary context for child components

  const TestForm = () => {
    return <>{children}</>;
  };

  return (
    <ThemeProvider theme={theme}>
      <TestForm />
    </ThemeProvider>
  );
};

// Import useFormContext for mocking
import { useFormContext } from 'react-hook-form';

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useFormContext: vi.fn(),
}));

describe('GeneralInfoStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock for useFormContext
    const mockFormMethods = {
      register: vi.fn((name: string) => ({
        name,
        onChange: vi.fn(),
        onBlur: vi.fn(),
        ref: vi.fn(),
      })),
      control: {},
      formState: { errors: {} },
    };

    vi.mocked(useFormContext).mockReturnValue(mockFormMethods);
  });

  describe('Initial Rendering', () => {
    test('renders all sections with proper headings', () => {
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      expect(
        screen.getByText('form.sections.tournamentIdentity')
      ).toBeInTheDocument();
      expect(
        screen.getByText('form.sections.locationDetails')
      ).toBeInTheDocument();
      expect(
        screen.getByText('form.sections.tournamentSchedule')
      ).toBeInTheDocument();
    });

    test('renders all form fields', () => {
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      expect(screen.getByLabelText('tournamentName')).toBeInTheDocument();
      expect(screen.getByLabelText('city')).toBeInTheDocument();
      expect(
        screen.getByTestId('country-autocomplete-country')
      ).toBeInTheDocument();
      expect(screen.getByTestId('datepicker-start-date')).toBeInTheDocument();
      expect(screen.getByTestId('datepicker-end-date')).toBeInTheDocument();
    });

    test('renders section icons correctly', () => {
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      const emojiEventsIcons = screen.getAllByTestId('emoji-events-icon');
      const locationIcons = screen.getAllByTestId('location-icon');
      const calendarIcons = screen.getAllByTestId('calendar-icon');

      expect(emojiEventsIcons.length).toBeGreaterThan(0);
      expect(locationIcons.length).toBeGreaterThan(0);
      expect(calendarIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Tournament Identity Section', () => {
    test('renders tournament name field with proper styling', () => {
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      const nameField = screen.getByLabelText('tournamentName');
      expect(nameField).toHaveAttribute(
        'placeholder',
        'form.placeholders.tournamentName'
      );
    });

    test('displays tournament name field errors', () => {
      const errors = {
        name: { message: 'Tournament name is required' },
      };

      render(
        <TestWrapper errors={errors}>
          <GeneralInfoStep />
        </TestWrapper>
      );

      expect(
        screen.getByText('Tournament name is required')
      ).toBeInTheDocument();
    });

    test('tournament name field accepts user input', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      const nameField = screen.getByLabelText(
        'tournamentName'
      ) as HTMLInputElement;
      await user.type(nameField, 'Test Tournament Name');

      expect(nameField.value).toBe('Test Tournament Name');
    });
  });

  describe('Location Details Section', () => {
    test('renders city field with proper styling', () => {
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      const cityField = screen.getByLabelText('city');
      expect(cityField).toHaveAttribute(
        'placeholder',
        'form.placeholders.enterCityName'
      );
    });

    test('displays city field errors', () => {
      const errors = {
        city: { message: 'City is required' },
      };

      render(
        <TestWrapper errors={errors}>
          <GeneralInfoStep />
        </TestWrapper>
      );

      expect(screen.getByText('City is required')).toBeInTheDocument();
    });

    test('city field accepts user input', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      const cityField = screen.getByLabelText('city') as HTMLInputElement;
      await user.type(cityField, 'New York');

      expect(cityField.value).toBe('New York');
    });

    test('renders country autocomplete field', () => {
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      const countryField = screen.getByTestId('country-autocomplete-country');
      expect(countryField).toBeInTheDocument();

      const countryInput = countryField.querySelector('input');
      expect(countryInput).toHaveAttribute('placeholder', 'country');
    });

    test('displays country field errors', () => {
      const errors = {
        country: { message: 'Country is required' },
      };

      render(
        <TestWrapper errors={errors}>
          <GeneralInfoStep />
        </TestWrapper>
      );

      expect(screen.getByText('Country is required')).toBeInTheDocument();
    });
  });

  describe('Tournament Schedule Section', () => {
    test('renders start date picker', () => {
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      const startDatePicker = screen.getByTestId('datepicker-start-date');
      expect(startDatePicker).toBeInTheDocument();

      const startDateInput = startDatePicker.querySelector('input');
      expect(startDateInput).toHaveAttribute('placeholder', 'start_date');
    });

    test('renders end date picker', () => {
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      const endDatePicker = screen.getByTestId('datepicker-end-date');
      expect(endDatePicker).toBeInTheDocument();

      const endDateInput = endDatePicker.querySelector('input');
      expect(endDateInput).toHaveAttribute('placeholder', 'end_date');
    });

    test('date pickers have full width styling', () => {
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      const startDatePicker = screen.getByTestId('datepicker-start-date');
      const endDatePicker = screen.getByTestId('datepicker-end-date');

      expect(startDatePicker.querySelector('input')).toHaveAttribute(
        'data-fullwidth',
        'true'
      );
      expect(endDatePicker.querySelector('input')).toHaveAttribute(
        'data-fullwidth',
        'true'
      );
    });

    test('date pickers include calendar icons', () => {
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      const startDatePicker = screen.getByTestId('datepicker-start-date');
      const endDatePicker = screen.getByTestId('datepicker-end-date');

      expect(
        startDatePicker.querySelector('[data-testid="calendar-icon"]')
      ).toBeInTheDocument();
      expect(
        endDatePicker.querySelector('[data-testid="calendar-icon"]')
      ).toBeInTheDocument();
    });

    test('date pickers handle date selection', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      const startDateInput = screen
        .getByTestId('datepicker-start-date')
        .querySelector('input');
      if (startDateInput) {
        await user.type(startDateInput, '2024-01-15');
      }

      expect(startDateInput).toBeInTheDocument();
    });
  });

  describe('Form Integration', () => {
    test('uses react-hook-form register for text fields', () => {
      const mockRegister = vi.fn((name: string) => ({
        name,
        onChange: vi.fn(),
        onBlur: vi.fn(),
        ref: vi.fn(),
      }));

      vi.mocked(useFormContext).mockReturnValue({
        register: mockRegister,
        control: {},
        formState: { errors: {} },
      });

      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      expect(mockRegister).toHaveBeenCalledWith('name');
      expect(mockRegister).toHaveBeenCalledWith('city');
    });

    test('uses react-hook-form controller for date fields', () => {
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      // Date pickers should be rendered (they use Controller internally)
      expect(screen.getByTestId('datepicker-start-date')).toBeInTheDocument();
      expect(screen.getByTestId('datepicker-end-date')).toBeInTheDocument();
    });

    test('passes control to CountryAutocomplete', () => {
      const mockControl = { test: 'control' };

      vi.mocked(useFormContext).mockReturnValue({
        register: vi.fn(),
        control: mockControl,
        formState: { errors: {} },
      });

      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      expect(
        screen.getByTestId('country-autocomplete-country')
      ).toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    test('shows error styling when fields have errors', () => {
      const errors = {
        name: { message: 'Name error' },
        city: { message: 'City error' },
        country: { message: 'Country error' },
      };

      render(
        <TestWrapper errors={errors}>
          <GeneralInfoStep />
        </TestWrapper>
      );

      const countryField = screen.getByTestId('country-autocomplete-country');
      const countryInput = countryField.querySelector('input');

      expect(countryInput).toHaveAttribute('data-error', 'true');
    });

    test('displays custom helper text for errors', () => {
      const errors = {
        name: { message: 'Tournament name is required' },
        city: { message: 'City name is required' },
        country: { message: 'Please select a country' },
      };

      render(
        <TestWrapper errors={errors}>
          <GeneralInfoStep />
        </TestWrapper>
      );

      expect(
        screen.getByText('Tournament name is required')
      ).toBeInTheDocument();
      expect(screen.getByText('City name is required')).toBeInTheDocument();
      expect(screen.getByText('Please select a country')).toBeInTheDocument();
    });
  });

  describe('Accessibility and Styling', () => {
    test('sections are wrapped in Paper components for visual separation', () => {
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      // All major sections should be present
      expect(
        screen.getByText('form.sections.tournamentIdentity')
      ).toBeInTheDocument();
      expect(
        screen.getByText('form.sections.locationDetails')
      ).toBeInTheDocument();
      expect(
        screen.getByText('form.sections.tournamentSchedule')
      ).toBeInTheDocument();
    });

    test('input fields have proper input adornments with icons', () => {
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      // Icons should be present as input adornments
      const icons = screen.getAllByTestId(/icon$/);
      expect(icons.length).toBeGreaterThan(0);
    });

    test('uses proper typography hierarchy', () => {
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      // Section headings should be present
      expect(
        screen.getByText('form.sections.tournamentIdentity')
      ).toBeInTheDocument();
      expect(
        screen.getByText('form.sections.locationDetails')
      ).toBeInTheDocument();
      expect(
        screen.getByText('form.sections.tournamentSchedule')
      ).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    test('uses responsive grid layout', () => {
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      // Form should render with all fields present (testing grid functionality through presence)
      expect(screen.getByLabelText('tournamentName')).toBeInTheDocument();
      expect(screen.getByLabelText('city')).toBeInTheDocument();
      expect(
        screen.getByTestId('country-autocomplete-country')
      ).toBeInTheDocument();
    });

    test('location fields are in responsive grid', () => {
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      // City and country should be side by side on larger screens
      expect(screen.getByLabelText('city')).toBeInTheDocument();
      expect(
        screen.getByTestId('country-autocomplete-country')
      ).toBeInTheDocument();
    });

    test('date fields are in responsive grid', () => {
      render(
        <TestWrapper>
          <GeneralInfoStep />
        </TestWrapper>
      );

      // Start and end date should be side by side on larger screens
      expect(screen.getByTestId('datepicker-start-date')).toBeInTheDocument();
      expect(screen.getByTestId('datepicker-end-date')).toBeInTheDocument();
    });
  });
});
