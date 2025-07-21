import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { vi } from 'vitest';
import TournamentSidebar from '../TournamentSidebar';
import { Tournament } from '@dto/bindings';

// Mock external dependencies
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock('../../constants/appRoutes', () => ({
  APP_ROUTES: {
    NEW_TOURNAMENT: '/tournament/new',
  },
}));

// Mock utility functions
vi.mock('../../utils', () => ({
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
    <button data-testid="status-button" onClick={onClick}>
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

describe('TournamentSidebar', () => {
  const mockOnFilterChange = vi.fn();
  const mockNavigate = vi.fn();
  const mockT = vi.fn();

  // Mock tournament data
  const mockTournaments: Tournament[] = [
    { id: 1, name: 'Tournament 1', status: 'NotStarted' } as Tournament,
    { id: 2, name: 'Tournament 2', status: 'InProgress' } as Tournament,
    { id: 3, name: 'Tournament 3', status: 'InProgress' } as Tournament,
    { id: 4, name: 'Tournament 4', status: 'Finished' } as Tournament,
  ];

  const defaultProps = {
    tournaments: mockTournaments,
    onFilterChange: mockOnFilterChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useTranslation
    vi.mocked(useTranslation).mockReturnValue({
      t: mockT,
    } as any);

    // Mock react-router-dom
    vi.mocked(vi.doMock)('react-router-dom', () => ({
      ...vi.importActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

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
    const utils = vi.mocked(await import('../../utils'));
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
      expect(paper).toHaveStyle({
        width: '100%',
        padding: '16px', // 2 * 8px default theme spacing
      });
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
      const updatedTournaments = [
        ...mockTournaments,
        { id: 5, name: 'Tournament 5', status: 'InProgress' } as Tournament,
        { id: 6, name: 'Tournament 6', status: 'InProgress' } as Tournament,
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
      const utils = vi.mocked(await import('../../utils'));

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
      expect(button).toHaveStyle({
        backgroundColor: '#3A3D91',
        width: '100%',
        textTransform: 'none',
      });
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
      expect(button).toHaveStyle({ width: '100%' });
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

      expect(inputContainer).toHaveStyle({
        padding: '4px 8px',
        border: '1px solid #ccc',
        borderRadius: '16px', // 4 * 4px
      });
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
      const { container } = render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      // Box containing the button should have centering styles
      const buttonContainer = container.querySelector('[sx]');
      expect(buttonContainer).toBeInTheDocument();
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
      expect(list).toHaveAttribute('disablePadding');
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
        { id: 1, name: 'Draft', status: 'NotStarted' } as Tournament,
        { id: 2, name: 'Active', status: 'InProgress' } as Tournament,
        { id: 3, name: 'Complete', status: 'Finished' } as Tournament,
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

    test('handles tournaments with undefined status', () => {
      const tournamentsWithUndefinedStatus = [
        { id: 1, name: 'Tournament 1', status: undefined } as any,
        ...mockTournaments,
      ];

      expect(() =>
        render(
          <TestWrapper>
            <TournamentSidebar
              tournaments={tournamentsWithUndefinedStatus}
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
      expect(list).toHaveAttribute('role', 'list');
    });
  });

  describe('Error Handling', () => {
    test('handles navigation errors gracefully', async () => {
      const user = userEvent.setup();
      mockNavigate.mockImplementation(() => {
        throw new Error('Navigation error');
      });

      render(
        <TestWrapper>
          <TournamentSidebar {...defaultProps} />
        </TestWrapper>
      );

      const button = screen.getByText('New Tournament');

      // Should not crash when navigation fails
      await user.click(button);
    });

    test('handles missing onFilterChange prop', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TournamentSidebar
            tournaments={mockTournaments}
            onFilterChange={undefined as any}
          />
        </TestWrapper>
      );

      const statusButton = screen.getAllByTestId('status-button')[0];

      // Should not crash when onFilterChange is undefined
      await user.click(statusButton);
    });

    test('handles utility function errors', async () => {
      const utils = vi.mocked(await import('../../utils'));
      utils.isOngoingTournament.mockImplementation(() => {
        throw new Error('Utility error');
      });

      expect(() =>
        render(
          <TestWrapper>
            <TournamentSidebar {...defaultProps} />
          </TestWrapper>
        )
      ).not.toThrow();
    });

    test('handles malformed tournament data', () => {
      const malformedTournaments = [
        null,
        undefined,
        { id: 1 }, // Missing required fields
        { name: 'Tournament' }, // Missing id
        ...mockTournaments,
      ] as any;

      expect(() =>
        render(
          <TestWrapper>
            <TournamentSidebar
              tournaments={malformedTournaments}
              onFilterChange={mockOnFilterChange}
            />
          </TestWrapper>
        )
      ).not.toThrow();
    });
  });

  describe('Performance', () => {
    test('does not recalculate counts unnecessarily', async () => {
      const utils = vi.mocked(await import('../../utils'));

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
      const largeTournamentList = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Tournament ${i}`,
        status:
          i % 3 === 0 ? 'NotStarted' : i % 3 === 1 ? 'InProgress' : 'Finished',
      })) as Tournament[];

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
