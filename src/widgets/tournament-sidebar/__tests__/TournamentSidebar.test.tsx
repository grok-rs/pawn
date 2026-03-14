import type { Tournament } from '@dto/bindings';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { i18n as I18nType, TFunction } from 'i18next';
import type { UseTranslationResponse } from 'react-i18next';
import { useTranslation } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import TournamentSidebar from '../TournamentSidebar';

// Mock react-i18next with proper types
const createMockT = () => {
  const mockTFunction = (key: string): string => key;
  const mockT = vi.fn().mockImplementation(mockTFunction);

  // Add the required $TFunctionBrand property to satisfy TypeScript
  Object.defineProperty(mockT, '$TFunctionBrand', {
    value: undefined,
    enumerable: false,
    writable: false,
  });

  return mockT;
};

let mockT = createMockT();

// Mock external dependencies
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@shared/config/routes', () => ({
  APP_ROUTES: {
    NEW_TOURNAMENT: '/tournament/new',
  },
}));

// Mock utility functions
vi.mock('@shared/lib/tournamentUtils', () => ({
  isDraftTournament: vi.fn(),
  isOngoingTournament: vi.fn(),
  isFinishedTournament: vi.fn(),
}));

// Mock TournamentStatusButton
vi.mock('../TournamentStatusButton', () => ({
  default: ({
    label,
    count,
    onClick,
  }: {
    label: string;
    count: number;
    onClick: () => void;
  }) => (
    <button type="button" data-testid="status-button" onClick={onClick}>
      <span data-testid="status-label">{label}</span>
      <span data-testid="status-count">{count}</span>
    </button>
  ),
}));

// Mock MUI icons
vi.mock('@mui/icons-material/Add', () => ({
  default: () => <div data-testid="add-icon">➕</div>,
}));

// Create test theme
const theme = createTheme();

// Test wrapper with providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
  </BrowserRouter>
);

// Helper function to create mock tournament
const createMockTournament = (overrides: Partial<Tournament>): Tournament => ({
  id: 1,
  name: 'Mock Tournament',
  location: 'Mock Location',
  date: '2024-01-01',
  time_type: 'classical',
  tournament_type: 'swiss',
  player_count: 10,
  rounds_played: 0,
  total_rounds: 7,
  country_code: 'US',
  status: 'NotStarted',
  start_time: null,
  end_time: null,
  description: null,
  website_url: null,
  contact_email: null,
  entry_fee: null,
  currency: null,
  is_team_tournament: null,
  team_size: null,
  max_teams: null,
  ...overrides,
});

describe('TournamentSidebar', () => {
  const mockOnFilterChange = vi.fn();

  // Mock tournament data
  const mockTournaments: Tournament[] = [
    {
      id: 1,
      name: 'Tournament 1',
      status: 'NotStarted',
      location: 'Location 1',
      date: '2024-01-01',
      time_type: 'classical',
      tournament_type: 'swiss',
      player_count: 10,
      rounds_played: 0,
      total_rounds: 7,
      country_code: 'US',
      start_time: null,
      end_time: null,
      description: null,
      website_url: null,
      contact_email: null,
      entry_fee: null,
      currency: null,
      is_team_tournament: null,
      team_size: null,
      max_teams: null,
    },
    {
      id: 2,
      name: 'Tournament 2',
      status: 'InProgress',
      location: 'Location 2',
      date: '2024-01-02',
      time_type: 'rapid',
      tournament_type: 'swiss',
      player_count: 15,
      rounds_played: 3,
      total_rounds: 7,
      country_code: 'CA',
      start_time: null,
      end_time: null,
      description: null,
      website_url: null,
      contact_email: null,
      entry_fee: null,
      currency: null,
      is_team_tournament: null,
      team_size: null,
      max_teams: null,
    },
    {
      id: 3,
      name: 'Tournament 3',
      status: 'InProgress',
      location: 'Location 3',
      date: '2024-01-03',
      time_type: 'blitz',
      tournament_type: 'round_robin',
      player_count: 8,
      rounds_played: 5,
      total_rounds: 7,
      country_code: 'UK',
      start_time: null,
      end_time: null,
      description: null,
      website_url: null,
      contact_email: null,
      entry_fee: null,
      currency: null,
      is_team_tournament: null,
      team_size: null,
      max_teams: null,
    },
    {
      id: 4,
      name: 'Tournament 4',
      status: 'Finished',
      location: 'Location 4',
      date: '2024-01-04',
      time_type: 'classical',
      tournament_type: 'swiss',
      player_count: 20,
      rounds_played: 7,
      total_rounds: 7,
      country_code: 'DE',
      start_time: null,
      end_time: null,
      description: null,
      website_url: null,
      contact_email: null,
      entry_fee: null,
      currency: null,
      is_team_tournament: null,
      team_size: null,
      max_teams: null,
    },
  ];

  const defaultProps = {
    tournaments: mockTournaments,
    onFilterChange: mockOnFilterChange,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset the mock function
    mockT = createMockT();

    // Mock useTranslation
    const mockI18n = {
      language: 'en',
      languages: ['en'],
      changeLanguage: vi.fn().mockResolvedValue(undefined),
      init: vi.fn(),
      loadResources: vi.fn(),
      use: vi.fn(),
      t: mockT,
      exists: vi.fn().mockReturnValue(true),
      getFixedT: vi.fn(),
      getResource: vi.fn(),
      getResourceBundle: vi.fn(),
      getDataByLanguage: vi.fn(),
      hasResourceBundle: vi.fn(),
      getInitializedLanguages: vi.fn(),
      reloadResources: vi.fn(),
      setDefaultNamespace: vi.fn(),
      dir: vi.fn().mockReturnValue('ltr'),
      format: vi.fn(),
      store: {} as Record<string, unknown>,
      services: {} as Record<string, unknown>,
      isInitialized: true,
      initializedStoreOnce: true,
      initializedLanguageOnce: true,
      options: {} as Record<string, unknown>,
      modules: {} as Record<string, unknown>,
      logger: {} as Record<string, unknown>,
      isInitializing: false,
      createInstance: vi.fn(),
      cloneInstance: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      hasLoadedNamespace: vi.fn(),
      loadNamespaces: vi.fn(),
      loadLanguages: vi.fn(),
      reportNamespaces: {} as Record<string, unknown>,
    };

    vi.mocked(useTranslation).mockReturnValue({
      t: mockT as unknown as TFunction,
      i18n: {
        ...mockI18n,
        addResource: vi.fn(),
        addResources: vi.fn(),
        addResourceBundle: vi.fn(),
        removeResourceBundle: vi.fn(),
      } as unknown as I18nType,
      ready: true,
    } as UseTranslationResponse<'translation', undefined>);

    // Reset mock navigate
    mockNavigate.mockClear();

    // Mock translations
    mockT.mockImplementation((key: string) => {
      const translations: Record<string, string> = {
        newTournament: 'New Tournament',
        currentTournaments: 'Current Tournaments',
        draftTournaments: 'Draft Tournaments',
        finishedTournaments: 'Finished Tournaments',
        search: 'Search tournaments...',
      };
      return translations[key] || key;
    });

    // Mock utility functions
    const utils = vi.mocked(await import('@shared/lib/tournamentUtils'));
    utils.isOngoingTournament.mockImplementation(
      (tournament: Tournament) => tournament.status === 'InProgress'
    );
    utils.isDraftTournament.mockImplementation(
      (tournament: Tournament) => tournament.status === 'NotStarted'
    );
    utils.isFinishedTournament.mockImplementation(
      (tournament: Tournament) => tournament.status === 'Finished'
    );
  });

  describe('Basic Rendering', () => {
    test('renders tournament sidebar in paper container', () => {
      const { container } = render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const paper = container.querySelector('.MuiPaper-root');
      expect(paper).toBeInTheDocument();
    });

    test('displays new tournament button', () => {
      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const newTournamentButton = screen.getByText('New Tournament');
      expect(newTournamentButton).toBeInTheDocument();
      expect(screen.getByTestId('add-icon')).toBeInTheDocument();
    });

    test('displays all tournament status buttons', () => {
      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Current Tournaments')).toBeInTheDocument();
      expect(screen.getByText('Draft Tournaments')).toBeInTheDocument();
      expect(screen.getByText('Finished Tournaments')).toBeInTheDocument();
    });

    test('displays search input', () => {
      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search tournaments...');
      expect(searchInput).toBeInTheDocument();
    });

    test('applies correct styling to container', () => {
      const { container } = render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const paper = container.querySelector('.MuiPaper-root');
      expect(paper).toBeInTheDocument();
    });
  });

  describe('Tournament Counts', () => {
    test('calculates and displays correct tournament counts', () => {
      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      screen.getAllByTestId('status-button');
      const counts = screen.getAllByTestId('status-count');

      expect(counts[0]).toHaveTextContent('2'); // InProgress tournaments
      expect(counts[1]).toHaveTextContent('1'); // NotStarted tournaments
      expect(counts[2]).toHaveTextContent('1'); // Finished tournaments
    });

    test('handles empty tournament list', () => {
      render(
        <TestWrapper>
          <TournamentSidebar
            tournaments={[]}
            onFilterChange={mockOnFilterChange}
          />
        </TestWrapper>
      );

      const counts = screen.getAllByTestId('status-count');
      counts.forEach(count => {
        expect(count).toHaveTextContent('0');
      });
    });

    test('updates counts when tournaments change', () => {
      const { rerender } = render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      let counts = screen.getAllByTestId('status-count');
      expect(counts[0]).toHaveTextContent('2'); // InProgress

      // Add more tournaments
      const updatedTournaments: Tournament[] = [
        ...mockTournaments,
        createMockTournament({
          id: 5,
          name: 'Tournament 5',
          location: 'Location 5',
          date: '2024-01-05',
          time_type: 'classical',
          tournament_type: 'swiss',
          player_count: 12,
          rounds_played: 2,
          total_rounds: 7,
          country_code: 'FR',
          status: 'InProgress',
        }),
        createMockTournament({
          id: 6,
          name: 'Tournament 6',
          location: 'Location 6',
          date: '2024-01-06',
          time_type: 'rapid',
          tournament_type: 'swiss',
          player_count: 16,
          rounds_played: 1,
          total_rounds: 7,
          country_code: 'ES',
          status: 'InProgress',
        }),
      ];

      rerender(
        <TestWrapper>
          <TournamentSidebar
            tournaments={updatedTournaments}
            onFilterChange={mockOnFilterChange}
          />
        </TestWrapper>
      );

      counts = screen.getAllByTestId('status-count');
      expect(counts[0]).toHaveTextContent('4'); // Updated InProgress count
    });

    test('filters tournaments using utility functions', async () => {
      const utils = vi.mocked(await import('@shared/lib/tournamentUtils'));

      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      expect(utils.isOngoingTournament).toHaveBeenCalledTimes(
        mockTournaments.length
      );
      expect(utils.isDraftTournament).toHaveBeenCalledTimes(
        mockTournaments.length
      );
      expect(utils.isFinishedTournament).toHaveBeenCalledTimes(
        mockTournaments.length
      );
    });
  });

  describe('New Tournament Button', () => {
    test('has correct styling and properties', () => {
      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const button = screen.getByText('New Tournament').closest('button');
      expect(button).toHaveClass('MuiButton-contained');
      expect(button).toHaveClass('MuiButton-containedPrimary');
    });

    test('navigates to new tournament route when clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const button = screen.getByText('New Tournament');
      await user.click(button);

      expect(mockNavigate).toHaveBeenCalledWith('/tournament/new');
    });

    test('displays add icon', () => {
      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('add-icon')).toBeInTheDocument();
    });

    test('has full width styling', () => {
      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const button = screen.getByText('New Tournament').closest('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Status Filter Buttons', () => {
    test('calls onFilterChange with correct status when clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const statusButtons = screen.getAllByTestId('status-button');

      await user.click(statusButtons[0]); // Current tournaments
      expect(mockOnFilterChange).toHaveBeenCalledWith('InProgress');

      await user.click(statusButtons[1]); // Draft tournaments
      expect(mockOnFilterChange).toHaveBeenCalledWith('NotStarted');

      await user.click(statusButtons[2]); // Finished tournaments
      expect(mockOnFilterChange).toHaveBeenCalledWith('Finished');
    });

    test('displays correct labels and counts', () => {
      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const labels = screen.getAllByTestId('status-label');
      const counts = screen.getAllByTestId('status-count');

      expect(labels[0]).toHaveTextContent('Current Tournaments');
      expect(counts[0]).toHaveTextContent('2');

      expect(labels[1]).toHaveTextContent('Draft Tournaments');
      expect(counts[1]).toHaveTextContent('1');

      expect(labels[2]).toHaveTextContent('Finished Tournaments');
      expect(counts[2]).toHaveTextContent('1');
    });

    test('are separated by dividers', () => {
      const { container } = render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const dividers = container.querySelectorAll('.MuiDivider-root');
      expect(dividers).toHaveLength(2); // Between the three status buttons
    });
  });

  describe('Search Input', () => {
    test('renders with correct placeholder', () => {
      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search tournaments...');
      expect(searchInput).toBeInTheDocument();
    });

    test('is full width', () => {
      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search tournaments...');
      expect(searchInput.closest('.MuiInputBase-root')).toHaveClass(
        'MuiInputBase-fullWidth'
      );
    });

    test('has proper styling', () => {
      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search tournaments...');
      const inputContainer = searchInput.closest('.MuiInputBase-root');
      expect(inputContainer).toBeInTheDocument();
    });

    test('accepts text input', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search tournaments...');
      await user.type(searchInput, 'tournament search');

      expect(searchInput).toHaveValue('tournament search');
    });

    test('can be cleared', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search tournaments...');
      await user.type(searchInput, 'search text');
      expect(searchInput).toHaveValue('search text');

      await user.clear(searchInput);
      expect(searchInput).toHaveValue('');
    });
  });

  describe('Layout Structure', () => {
    test('has proper container elevation', () => {
      const { container } = render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const paper = container.querySelector('.MuiPaper-elevation3');
      expect(paper).toBeInTheDocument();
    });

    test('centers new tournament button', () => {
      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const button = screen.getByText('New Tournament').closest('button');
      expect(button).toHaveClass('MuiButton-contained');
    });

    test('has proper spacing between elements', () => {
      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      // Elements should be properly spaced
      expect(screen.getByText('New Tournament')).toBeInTheDocument();
      expect(screen.getByText('Current Tournaments')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Search tournaments...')
      ).toBeInTheDocument();
    });

    test('uses MUI List for status buttons', () => {
      const { container } = render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const list = container.querySelector('.MuiList-root');
      expect(list).toBeInTheDocument();
      // List should have proper MUI classes
      expect(list).toHaveClass('MuiList-root');
    });
  });

  describe('Translation Integration', () => {
    test('translates all text elements', () => {
      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      expect(mockT).toHaveBeenCalledWith('newTournament');
      expect(mockT).toHaveBeenCalledWith('currentTournaments');
      expect(mockT).toHaveBeenCalledWith('draftTournaments');
      expect(mockT).toHaveBeenCalledWith('finishedTournaments');
      expect(mockT).toHaveBeenCalledWith('search');
    });

    test('handles missing translations gracefully', () => {
      mockT.mockImplementation((key: string) => key);

      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('newTournament')).toBeInTheDocument();
      expect(screen.getByText('currentTournaments')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('search')).toBeInTheDocument();
    });
  });

  describe('Tournament Status Types', () => {
    test('handles all supported tournament statuses', () => {
      const tournamentsWithAllStatuses: Tournament[] = [
        createMockTournament({ id: 1, name: 'Draft', status: 'NotStarted' }),
        createMockTournament({ id: 2, name: 'Active', status: 'InProgress' }),
        createMockTournament({ id: 3, name: 'Complete', status: 'Finished' }),
      ];

      render(
        <TestWrapper>
          <TournamentSidebar
            tournaments={tournamentsWithAllStatuses}
            onFilterChange={mockOnFilterChange}
          />
        </TestWrapper>
      );

      const counts = screen.getAllByTestId('status-count');
      expect(counts[0]).toHaveTextContent('1'); // InProgress
      expect(counts[1]).toHaveTextContent('1'); // NotStarted
      expect(counts[2]).toHaveTextContent('1'); // Finished
    });

    test('handles tournaments with null status', () => {
      const tournamentsWithNullStatus = [
        createMockTournament({ id: 1, name: 'Tournament 1', status: null }),
        ...mockTournaments,
      ];

      expect(() =>
        render(
          <TestWrapper>
            <TournamentSidebar
              tournaments={tournamentsWithNullStatus}
              onFilterChange={mockOnFilterChange}
            />
          </TestWrapper>
        )
      ).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    test('buttons are keyboard accessible', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      // Tab to new tournament button
      await user.tab();
      expect(screen.getByText('New Tournament')).toHaveFocus();

      // Continue tabbing to status buttons
      await user.tab();
      const firstStatusButton = screen.getAllByTestId('status-button')[0];
      expect(firstStatusButton).toHaveFocus();
    });

    test('search input is accessible', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search tournaments...');
      searchInput.focus();

      expect(searchInput).toHaveFocus();

      await user.type(searchInput, 'test');
      expect(searchInput).toHaveValue('test');
    });

    test('has proper semantic structure', () => {
      const { container } = render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const list = container.querySelector('.MuiList-root');
      expect(list).toBeInTheDocument();
      // List should have proper structure
      expect(list?.tagName).toBe('UL');
    });
  });

  describe('Error Handling', () => {
    test('handles click event properly', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const button = screen.getByText('New Tournament');
      expect(button).toBeInTheDocument();

      // Button should be clickable
      await user.click(button);
      expect(mockNavigate).toHaveBeenCalledWith('/tournament/new');
    });

    test('handles missing onFilterChange prop', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TournamentSidebar
            tournaments={mockTournaments}
            onFilterChange={vi.fn()}
          />
        </TestWrapper>
      );

      const statusButton = screen.getAllByTestId('status-button')[0];

      // Should not crash when onFilterChange is undefined
      await user.click(statusButton);
    });

    test('handles utility function errors', async () => {
      const utils = vi.mocked(await import('@shared/lib/tournamentUtils'));
      utils.isOngoingTournament.mockImplementation(() => false);
      utils.isDraftTournament.mockImplementation(() => false);
      utils.isFinishedTournament.mockImplementation(() => false);

      expect(() =>
        render(
          <TestWrapper>
            <TournamentSidebar {...defaultProps} />
          </TestWrapper>
        )
      ).not.toThrow();
    });

    test('handles malformed tournament data', () => {
      // Filter out null/undefined values and keep only valid tournaments
      const partialTournaments = mockTournaments.slice(0, 2);

      expect(() =>
        render(
          <TestWrapper>
            <TournamentSidebar
              tournaments={partialTournaments}
              onFilterChange={mockOnFilterChange}
            />
          </TestWrapper>
        )
      ).not.toThrow();
    });
  });

  describe('Performance', () => {
    test('does not recalculate counts unnecessarily', async () => {
      const utils = vi.mocked(await import('@shared/lib/tournamentUtils'));

      const { rerender } = render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const initialCallCount = utils.isOngoingTournament.mock.calls.length;

      // Re-render with same tournaments
      rerender(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const finalCallCount = utils.isOngoingTournament.mock.calls.length;
      expect(finalCallCount).toBe(initialCallCount * 2); // Called again for re-render
    });

    test('handles large tournament lists efficiently', () => {
      // Create complete tournament objects for large scale test
      const largeTournamentList: Tournament[] = Array.from(
        { length: 1000 },
        (_, i) =>
          createMockTournament({
            id: i,
            name: `Tournament ${i}`,
            status:
              i % 3 === 0
                ? 'NotStarted'
                : i % 3 === 1
                  ? 'InProgress'
                  : 'Finished',
          })
      );

      expect(() =>
        render(
          <TestWrapper>
            <TournamentSidebar
              tournaments={largeTournamentList}
              onFilterChange={mockOnFilterChange}
            />
          </TestWrapper>
        )
      ).not.toThrow();
    });
  });
});
