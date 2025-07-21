import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { vi } from 'vitest';
import CountryAutocomplete from '../CountryAutocomplete';
import { countries } from '../constants';
import { TournamentFormValues } from '../../NewTournamentForm/types';

// Mock the countries constants
vi.mock('../constants', () => ({
  countries: [
    { label: 'Ukraine', code: 'UA' },
    { label: 'United States', code: 'US' },
    { label: 'Canada', code: 'CA' },
    { label: 'Germany', code: 'DE' },
    { label: 'France', code: 'FR' },
  ],
}));

// Test wrapper with form context
const TestWrapper = ({
  children,
  defaultValues = {},
}: {
  children: React.ReactNode;
  defaultValues?: Partial<TournamentFormValues>;
}) => {
  const { control } = useForm<TournamentFormValues>({
    defaultValues: {
      name: '',
      country: '',
      city: '',
      ...defaultValues,
    },
  });

  return React.cloneElement(children as React.ReactElement, { control });
};

describe('CountryAutocomplete', () => {
  const mockProps = {
    name: 'country',
    label: 'Tournament Country',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders autocomplete with correct label', () => {
      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByLabelText('Tournament Country')).toBeInTheDocument();
    });

    test('renders as MUI Autocomplete component', () => {
      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const autocomplete = screen
        .getByRole('combobox')
        .closest('.MuiAutocomplete-root');
      expect(autocomplete).toBeInTheDocument();
    });

    test('is full width by default', () => {
      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const autocomplete = screen
        .getByRole('combobox')
        .closest('.MuiAutocomplete-root');
      expect(autocomplete).toHaveClass('MuiAutocomplete-fullWidth');
    });

    test('displays placeholder text', () => {
      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('placeholder', '');
    });
  });

  describe('Country Options', () => {
    test('displays all available countries when clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        countries.forEach(country => {
          expect(screen.getByText(country.label)).toBeInTheDocument();
        });
      });
    });

    test('filters countries based on input text', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'Ukr');

      await waitFor(() => {
        expect(screen.getByText('Ukraine')).toBeInTheDocument();
        expect(screen.queryByText('United States')).not.toBeInTheDocument();
        expect(screen.queryByText('Canada')).not.toBeInTheDocument();
      });
    });

    test('shows no options message when no matches', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'XYZ123');

      await waitFor(() => {
        expect(screen.getByText('No options')).toBeInTheDocument();
      });
    });

    test('displays countries in correct format', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        // Verify that the label is displayed, not the code
        expect(screen.getByText('Ukraine')).toBeInTheDocument();
        expect(screen.queryByText('UA')).not.toBeInTheDocument();
      });
    });
  });

  describe('Value Selection', () => {
    test('selects country when option is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('Ukraine')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Ukraine'));

      expect(input).toHaveValue('Ukraine');
    });

    test('clears selection when input is cleared', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper defaultValues={{ country: 'Ukraine' }}>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByRole('combobox');
      expect(input).toHaveValue('Ukraine');

      const clearButton = screen.getByTitle('Clear');
      await user.click(clearButton);

      expect(input).toHaveValue('');
    });

    test('maintains selection after blur', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('Canada')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Canada'));
      await user.tab(); // Blur the input

      expect(input).toHaveValue('Canada');
    });

    test('handles preset value correctly', () => {
      render(
        <TestWrapper defaultValues={{ country: 'Germany' }}>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByRole('combobox');
      expect(input).toHaveValue('Germany');
    });
  });

  describe('Error States', () => {
    test('displays error state when error prop is true', () => {
      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} error={true} />
        </TestWrapper>
      );

      const textField = screen
        .getByRole('combobox')
        .closest('.MuiFormControl-root');
      expect(textField).toHaveClass('Mui-error');
    });

    test('displays helper text when provided', () => {
      const helperText = 'Please select a valid country';

      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} helperText={helperText} />
        </TestWrapper>
      );

      expect(screen.getByText(helperText)).toBeInTheDocument();
    });

    test('displays both error state and helper text', () => {
      const helperText = 'Country is required';

      render(
        <TestWrapper>
          <CountryAutocomplete
            {...mockProps}
            error={true}
            helperText={helperText}
          />
        </TestWrapper>
      );

      const textField = screen
        .getByRole('combobox')
        .closest('.MuiFormControl-root');
      expect(textField).toHaveClass('Mui-error');
      expect(screen.getByText(helperText)).toBeInTheDocument();
    });

    test('helper text has error styling when error is true', () => {
      const helperText = 'Invalid country selection';

      render(
        <TestWrapper>
          <CountryAutocomplete
            {...mockProps}
            error={true}
            helperText={helperText}
          />
        </TestWrapper>
      );

      const helperTextElement = screen.getByText(helperText);
      expect(helperTextElement).toHaveClass('Mui-error');
    });
  });

  describe('React Hook Form Integration', () => {
    test('integrates with react-hook-form Controller', () => {
      // This test verifies the component renders without errors when wrapped in Controller
      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    test('handles form field name correctly', () => {
      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} name="venue.country" />
        </TestWrapper>
      );

      // Should render without errors even with nested field names
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    test('passes field value changes to form', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      await user.click(screen.getByText('France'));

      // Value should be updated in the form
      expect(input).toHaveValue('France');
    });
  });

  describe('Keyboard Navigation', () => {
    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByRole('combobox');

      // Open dropdown with keyboard
      await user.click(input);
      await user.keyboard('{ArrowDown}');

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // Navigate options with arrow keys
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      // First option should be selected
      expect(input).toHaveValue(countries[0].label);
    });

    test('closes dropdown with Escape key', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-expanded', 'false');
      expect(input).toHaveAttribute('autocomplete', 'off');
    });

    test('announces options to screen readers', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        const listbox = screen.getByRole('listbox');
        expect(listbox).toBeInTheDocument();

        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(countries.length);
      });
    });

    test('maintains focus management', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      expect(input).toHaveFocus();

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // Focus should remain on input
      expect(input).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    test('handles invalid preset values gracefully', () => {
      render(
        <TestWrapper defaultValues={{ country: 'NonExistentCountry' }}>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByRole('combobox');
      // Should display the invalid value as-is
      expect(input).toHaveValue('NonExistentCountry');
    });

    test('handles empty countries array', () => {
      // Mock empty countries array
      vi.mocked(countries).length = 0;

      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    test('handles special characters in country names', async () => {
      const user = userEvent.setup();

      // Mock countries with special characters
      const specialCountries = [
        { label: "Côte d'Ivoire", code: 'CI' },
        { label: 'São Tomé and Príncipe', code: 'ST' },
      ];

      vi.mocked(countries).splice(0, countries.length, ...specialCountries);

      render(
        <TestWrapper>
          <CountryAutocomplete {...mockProps} />
        </TestWrapper>
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'Côte');

      await waitFor(() => {
        expect(screen.getByText("Côte d'Ivoire")).toBeInTheDocument();
      });
    });
  });
});
