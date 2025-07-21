import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TournamentPreview from '../TournamentPreview';
import type { TournamentFormValues } from '../../NewTournamentForm/types';

// Mock useTranslation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'form.preview.title': 'Tournament Preview',
        'form.sections.basicInformation': 'Basic Information',
        'form.sections.tournamentFormat': 'Tournament Format',
        'form.sections.advancedRules': 'Advanced Rules',
        'form.preview.readyToCreate': 'Ready to Create',
        'form.preview.confirmMessage':
          'Please review the information above and click "Create Tournament" to proceed.',
        'tournament.configuration.name': 'Tournament Name',
        'tournament.configuration.location': 'Location',
        'tournament.configuration.dates': 'Dates',
        'tournament.configuration.mainReferee': 'Main Referee',
        'tournament.configuration.type': 'Type',
        'tournament.configuration.tournamentType': 'Tournament Type',
        'tournament.configuration.numberOfRounds': 'Number of Rounds',
        'tournament.configuration.timeControlTemplate': 'Time Control',
        'tournament.configuration.forfeitTime': 'Forfeit Time',
        'tournament.configuration.drawOffersPolicy': 'Draw Offers',
        'tournament.configuration.mobilePhonePolicy': 'Mobile Phone',
        'tournament.configuration.lateEntryPolicy': 'Late Entry',
        'tournament.configuration.organizerName': 'Organizer',
        'tournament.configuration.organizerEmail': 'Organizer Email',
        'tournament.configuration.arbiterNotes': 'Arbiter Notes',
        'tournament.types.rapid': 'Rapid',
        'tournament.types.classic': 'Classical',
        'tournament.types.blitz': 'Blitz',
        'tournament.types.swiss': 'Swiss System',
        'tournament.types.roundRobin': 'Round Robin',
        'tournament.types.knockout': 'Knockout',
        'tournament.types.elimination': 'Elimination',
        'tournament.drawOffers.allowed': 'Allowed',
        'tournament.drawOffers.restricted': 'Restricted',
        'tournament.drawOffers.prohibited': 'Prohibited',
        'tournament.mobilePhone.allowed': 'Allowed',
        'tournament.mobilePhone.silentOnly': 'Silent Only',
        'tournament.mobilePhone.prohibited': 'Prohibited',
        'tournament.lateEntry.allowed': 'Allowed',
        'tournament.lateEntry.restricted': 'Restricted',
        'tournament.lateEntry.prohibited': 'Prohibited',
        'tournament.timeUnits.minutes.short': 'min',
        'form.placeholders.notSet': 'Not Set',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock data factories
const createMockFormData = (
  overrides: Partial<TournamentFormValues> = {}
): TournamentFormValues => ({
  name: 'Test Tournament',
  country: 'United States',
  city: 'New York',
  startDate: new Date('2024-06-01'),
  endDate: new Date('2024-06-03'),
  mainReferee: 'John Arbiter',
  type: 'rapid',
  pairingSystem: 'swiss',
  rounds: 7,
  timeControlTemplate: 1,
  forfeitTimeMinutes: 30,
  drawOffersPolicy: 'allowed',
  mobilePhonePolicy: 'silent_only',
  lateEntryPolicy: 'restricted',
  organizerName: 'Chess Club',
  organizerEmail: 'organizer@chess.club',
  arbiterNotes: 'Tournament rules apply',
  ...overrides,
});

const createMockTimeControlTemplates = () => [
  {
    id: 1,
    name: 'Rapid 15+10',
    description: '15 minutes + 10 seconds increment',
  },
  {
    id: 2,
    name: 'Classical 90+30',
    description: '90 minutes + 30 seconds increment',
  },
  { id: 3, name: 'Blitz 5+3', description: '5 minutes + 3 seconds increment' },
];

describe('TournamentPreview', () => {
  const theme = createTheme();

  const renderWithTheme = (ui: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
  };

  const defaultProps = {
    formData: createMockFormData(),
    timeControlTemplates: createMockTimeControlTemplates(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render tournament preview with title', () => {
      renderWithTheme(<TournamentPreview {...defaultProps} />);

      expect(screen.getByText('Tournament Preview')).toBeInTheDocument();
    });

    it('should render all main sections', () => {
      renderWithTheme(<TournamentPreview {...defaultProps} />);

      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Tournament Format')).toBeInTheDocument();
      expect(screen.getByText('Advanced Rules')).toBeInTheDocument();
      expect(screen.getByText('Ready to Create')).toBeInTheDocument();
    });
  });

  describe('Basic Information Section', () => {
    it('should display tournament name', () => {
      renderWithTheme(<TournamentPreview {...defaultProps} />);

      expect(screen.getByText('Test Tournament')).toBeInTheDocument();
    });

    it('should display location correctly', () => {
      renderWithTheme(<TournamentPreview {...defaultProps} />);

      expect(screen.getByText('New York, United States')).toBeInTheDocument();
    });

    it('should display formatted dates', () => {
      renderWithTheme(<TournamentPreview {...defaultProps} />);

      // Dates are formatted using toLocaleDateString()
      const startDate = new Date('2024-06-01').toLocaleDateString();
      const endDate = new Date('2024-06-03').toLocaleDateString();
      expect(screen.getByText(`${startDate} - ${endDate}`)).toBeInTheDocument();
    });

    it('should display main referee', () => {
      renderWithTheme(<TournamentPreview {...defaultProps} />);

      expect(screen.getByText('John Arbiter')).toBeInTheDocument();
    });

    it('should handle missing basic information gracefully', () => {
      const formDataWithMissing = createMockFormData({
        name: '',
        city: '',
        country: '',
        startDate: null,
        endDate: null,
        mainReferee: '',
      });

      renderWithTheme(
        <TournamentPreview {...defaultProps} formData={formDataWithMissing} />
      );

      // Should show placeholder text for missing fields
      // Name shows "Not Set", dates shows "Not Set - Not Set", referee shows "Not Set"
      expect(screen.getAllByText('Not Set')).toHaveLength(2); // name, main referee (dates are combined)
      expect(screen.getByText('Not Set - Not Set')).toBeInTheDocument(); // dates combined
      // Location should show empty city and country as comma and space
      expect(
        screen.getByText((content, element) => element?.textContent === ', ')
      ).toBeInTheDocument();
    });
  });

  describe('Tournament Format Section', () => {
    it('should display tournament type with chip', () => {
      renderWithTheme(<TournamentPreview {...defaultProps} />);

      expect(screen.getByText('Rapid')).toBeInTheDocument();
    });

    it('should display pairing system with chip', () => {
      renderWithTheme(<TournamentPreview {...defaultProps} />);

      expect(screen.getByText('Swiss System')).toBeInTheDocument();
    });

    it('should display number of rounds', () => {
      renderWithTheme(<TournamentPreview {...defaultProps} />);

      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('should display time control template name', () => {
      renderWithTheme(<TournamentPreview {...defaultProps} />);

      expect(screen.getByText('Rapid 15+10')).toBeInTheDocument();
    });

    it('should handle unknown tournament types', () => {
      const formDataWithUnknownType = createMockFormData({
        type: 'unknown_type' as any,
        pairingSystem: 'unknown_system' as any,
      });

      renderWithTheme(
        <TournamentPreview
          {...defaultProps}
          formData={formDataWithUnknownType}
        />
      );

      expect(screen.getByText('unknown_type')).toBeInTheDocument();
      expect(screen.getByText('unknown_system')).toBeInTheDocument();
    });

    it('should show "Not Set" when time control template is not found', () => {
      const formDataWithUnknownTemplate = createMockFormData({
        timeControlTemplate: 999,
      });

      renderWithTheme(
        <TournamentPreview
          {...defaultProps}
          formData={formDataWithUnknownTemplate}
        />
      );

      expect(screen.getByText('Not Set')).toBeInTheDocument();
    });
  });

  describe('Advanced Rules Section', () => {
    it('should display forfeit time in minutes', () => {
      renderWithTheme(<TournamentPreview {...defaultProps} />);

      expect(screen.getByText('30 min')).toBeInTheDocument();
    });

    it('should display all policy types', () => {
      renderWithTheme(<TournamentPreview {...defaultProps} />);

      expect(screen.getByText('Allowed')).toBeInTheDocument(); // draw offers
      expect(screen.getByText('Silent Only')).toBeInTheDocument(); // mobile phone
      expect(screen.getByText('Restricted')).toBeInTheDocument(); // late entry
    });

    it('should display organizer information when provided', () => {
      renderWithTheme(<TournamentPreview {...defaultProps} />);

      expect(screen.getByText('Chess Club')).toBeInTheDocument();
      expect(screen.getByText('organizer@chess.club')).toBeInTheDocument();
    });

    it('should display arbiter notes when provided', () => {
      renderWithTheme(<TournamentPreview {...defaultProps} />);

      expect(screen.getByText('Tournament rules apply')).toBeInTheDocument();
    });

    it('should hide organizer section when no organizer info provided', () => {
      const formDataWithoutOrganizer = createMockFormData({
        organizerName: '',
        organizerEmail: '',
        arbiterNotes: '',
      });

      renderWithTheme(
        <TournamentPreview
          {...defaultProps}
          formData={formDataWithoutOrganizer}
        />
      );

      // Should not show the organizer section
      expect(screen.queryByText('Chess Club')).not.toBeInTheDocument();
      expect(
        screen.queryByText('organizer@chess.club')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('Tournament rules apply')
      ).not.toBeInTheDocument();
    });
  });

  describe('Policy Label Mapping', () => {
    it('should map draw offer policies correctly', () => {
      const testCases = [
        { policy: 'allowed', label: 'Allowed' },
        { policy: 'restricted', label: 'Restricted' },
        { policy: 'prohibited', label: 'Prohibited' },
      ];

      testCases.forEach(({ policy, label }) => {
        const formData = createMockFormData({
          drawOffersPolicy: policy as any,
        });
        const { unmount } = renderWithTheme(
          <TournamentPreview {...defaultProps} formData={formData} />
        );

        expect(screen.getAllByText(label).length).toBeGreaterThan(0);
        unmount();
      });
    });

    it('should map mobile phone policies correctly', () => {
      const testCases = [
        { policy: 'allowed', label: 'Allowed' },
        { policy: 'silent_only', label: 'Silent Only' },
        { policy: 'prohibited', label: 'Prohibited' },
      ];

      testCases.forEach(({ policy, label }) => {
        const formData = createMockFormData({
          mobilePhonePolicy: policy as any,
        });
        const { unmount } = renderWithTheme(
          <TournamentPreview {...defaultProps} formData={formData} />
        );

        expect(screen.getAllByText(label).length).toBeGreaterThan(0);
        unmount();
      });
    });

    it('should map late entry policies correctly', () => {
      const testCases = [
        { policy: 'allowed', label: 'Allowed' },
        { policy: 'restricted', label: 'Restricted' },
        { policy: 'prohibited', label: 'Prohibited' },
      ];

      testCases.forEach(({ policy, label }) => {
        const formData = createMockFormData({ lateEntryPolicy: policy as any });
        const { unmount } = renderWithTheme(
          <TournamentPreview {...defaultProps} formData={formData} />
        );

        expect(screen.getAllByText(label).length).toBeGreaterThan(0);
        unmount();
      });
    });

    it('should handle unknown policy values gracefully', () => {
      const formDataWithUnknownPolicies = createMockFormData({
        drawOffersPolicy: 'unknown_draw' as any,
        mobilePhonePolicy: 'unknown_phone' as any,
        lateEntryPolicy: 'unknown_entry' as any,
      });

      renderWithTheme(
        <TournamentPreview
          {...defaultProps}
          formData={formDataWithUnknownPolicies}
        />
      );

      expect(screen.getByText('unknown_draw')).toBeInTheDocument();
      expect(screen.getByText('unknown_phone')).toBeInTheDocument();
      expect(screen.getByText('unknown_entry')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should handle null dates gracefully', () => {
      const formDataWithNullDates = createMockFormData({
        startDate: null,
        endDate: null,
      });

      renderWithTheme(
        <TournamentPreview {...defaultProps} formData={formDataWithNullDates} />
      );

      expect(screen.getByText('Not Set - Not Set')).toBeInTheDocument();
    });

    it('should format valid dates correctly', () => {
      const testDate = new Date('2024-12-25');
      const formDataWithDates = createMockFormData({
        startDate: testDate,
        endDate: testDate,
      });

      renderWithTheme(
        <TournamentPreview {...defaultProps} formData={formDataWithDates} />
      );

      const expectedDateString = testDate.toLocaleDateString();
      expect(
        screen.getByText(`${expectedDateString} - ${expectedDateString}`)
      ).toBeInTheDocument();
    });
  });

  describe('Time Control Templates', () => {
    it('should work without time control templates provided', () => {
      renderWithTheme(<TournamentPreview formData={defaultProps.formData} />);

      expect(screen.getByText('Not Set')).toBeInTheDocument();
    });

    it('should work with empty time control templates array', () => {
      renderWithTheme(
        <TournamentPreview {...defaultProps} timeControlTemplates={[]} />
      );

      expect(screen.getByText('Not Set')).toBeInTheDocument();
    });

    it('should find and display correct time control template', () => {
      const customTemplates = [
        { id: 5, name: 'Custom Control', description: 'Custom time control' },
      ];
      const formDataWithCustomTemplate = createMockFormData({
        timeControlTemplate: 5,
      });

      renderWithTheme(
        <TournamentPreview
          formData={formDataWithCustomTemplate}
          timeControlTemplates={customTemplates}
        />
      );

      expect(screen.getByText('Custom Control')).toBeInTheDocument();
    });
  });

  describe('Summary Section', () => {
    it('should always display the ready to create section', () => {
      renderWithTheme(<TournamentPreview {...defaultProps} />);

      expect(screen.getByText('Ready to Create')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Please review the information above and click "Create Tournament" to proceed.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimal form data', () => {
      const minimalFormData: TournamentFormValues = {
        name: '',
        country: '',
        city: '',
        startDate: null,
        endDate: null,
        mainReferee: '',
        type: 'rapid',
        pairingSystem: 'swiss',
        rounds: 0,
        timeControlTemplate: 0,
        forfeitTimeMinutes: 0,
        drawOffersPolicy: 'allowed',
        mobilePhonePolicy: 'allowed',
        lateEntryPolicy: 'allowed',
        organizerName: '',
        organizerEmail: '',
        arbiterNotes: '',
      };

      renderWithTheme(
        <TournamentPreview
          formData={minimalFormData}
          timeControlTemplates={[]}
        />
      );

      expect(screen.getByText('Tournament Preview')).toBeInTheDocument();
      expect(screen.getAllByText('Not Set')).toHaveLength(3); // dates, referee, time control (name shows empty string)
    });

    it('should handle very long text values', () => {
      const longTextFormData = createMockFormData({
        name: 'This is a very long tournament name that might exceed normal expectations for tournament names and should still be displayed correctly',
        organizerName:
          'A very long organizer name that spans multiple words and contains special characters & numbers 123',
        arbiterNotes:
          'These are very detailed arbiter notes that contain multiple sentences. They might include special rules, exceptions, and other important information that organizers want to communicate to participants.',
      });

      renderWithTheme(
        <TournamentPreview {...defaultProps} formData={longTextFormData} />
      );

      expect(screen.getByText(longTextFormData.name)).toBeInTheDocument();
      expect(
        screen.getByText(longTextFormData.organizerName!)
      ).toBeInTheDocument();
      expect(
        screen.getByText(longTextFormData.arbiterNotes!)
      ).toBeInTheDocument();
    });
  });
});
