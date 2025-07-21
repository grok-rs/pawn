import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import PlayerCategoryManagement from '../PlayerCategoryManagement';
import type { Player, PlayerCategory } from '@dto/bindings';

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

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: vi.fn(() => true),
  writable: true,
});

// Mock MUI icons
vi.mock('@mui/icons-material', () => ({
  Add: () => <span data-testid="add-icon">➕</span>,
  Edit: () => <span data-testid="edit-icon">✏️</span>,
  Delete: () => <span data-testid="delete-icon">🗑️</span>,
  ExpandMore: () => <span data-testid="expand-icon">⬇️</span>,
  Category: () => <span data-testid="category-icon">📁</span>,
  Person: () => <span data-testid="person-icon">👤</span>,
  Groups: () => <span data-testid="groups-icon">👥</span>,
  Flag: () => <span data-testid="flag-icon">🏁</span>,
}));

// Mock commands
const mockCommands = {
  getTournamentCategories: vi.fn(),
  createPlayerCategory: vi.fn(),
  deletePlayerCategory: vi.fn(),
  assignPlayerToCategory: vi.fn(),
};

vi.mock('@dto/bindings', () => ({
  commands: mockCommands,
}));

// Mock data factories
const createMockPlayer = (
  id: number,
  overrides: Partial<Player> = {}
): Player => ({
  id,
  tournament_id: 1,
  name: `Player ${id}`,
  rating: 1800 + id * 50,
  country_code: 'US',
  title: id === 1 ? 'FM' : null,
  birth_date: `199${id}-01-01`,
  gender: id % 2 === 1 ? 'M' : 'F',
  email: `player${id}@test.com`,
  phone: null,
  club: `Club ${id}`,
  status: 'active',
  seed_number: null,
  pairing_number: null,
  initial_rating: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockCategory = (
  id: number,
  overrides: Partial<PlayerCategory> = {}
): PlayerCategory => ({
  id,
  tournament_id: 1,
  name: `Category ${id}`,
  description: `Description for category ${id}`,
  min_rating: null,
  max_rating: null,
  min_age: null,
  max_age: null,
  gender_restriction: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('PlayerCategoryManagement', () => {
  const mockOnCategoriesUpdated = vi.fn();

  const mockPlayers = [
    createMockPlayer(1, {
      rating: 2000,
      gender: 'M',
      birth_date: '1990-01-01',
    }),
    createMockPlayer(2, {
      rating: 1800,
      gender: 'F',
      birth_date: '1995-01-01',
    }),
    createMockPlayer(3, {
      rating: 1600,
      gender: 'M',
      birth_date: '2000-01-01',
    }),
    createMockPlayer(4, {
      rating: 2200,
      gender: 'F',
      birth_date: '1985-01-01',
    }),
  ];

  const mockCategories = [
    createMockCategory(1, {
      name: 'Open Section',
      min_rating: 1800,
      description: 'For experienced players',
    }),
    createMockCategory(2, {
      name: 'Women Only',
      gender_restriction: 'F',
      description: 'Women players only',
    }),
    createMockCategory(3, {
      name: 'Youth Section',
      max_age: 18,
      description: 'For young players',
    }),
  ];

  const defaultProps = {
    tournamentId: 1,
    players: mockPlayers,
    onCategoriesUpdated: mockOnCategoriesUpdated,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCommands.getTournamentCategories.mockResolvedValue(mockCategories);
    mockCommands.createPlayerCategory.mockResolvedValue(createMockCategory(4));
    mockCommands.deletePlayerCategory.mockResolvedValue(true);
    mockCommands.assignPlayerToCategory.mockResolvedValue(true);
    (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  describe('Initial Rendering', () => {
    test('renders category management interface', () => {
      render(<PlayerCategoryManagement {...defaultProps} />);

      expect(
        screen.getByText('playerCategories (3 categories)')
      ).toBeInTheDocument();
      expect(screen.getByText('createCategory')).toBeInTheDocument();
    });

    test('loads categories on mount', async () => {
      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        expect(mockCommands.getTournamentCategories).toHaveBeenCalledWith(1);
      });
    });

    test('displays category list when categories exist', async () => {
      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Open Section')).toBeInTheDocument();
        expect(screen.getByText('Women Only')).toBeInTheDocument();
        expect(screen.getByText('Youth Section')).toBeInTheDocument();
      });
    });

    test('shows empty state when no categories', async () => {
      mockCommands.getTournamentCategories.mockResolvedValue([]);

      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('noCategoriesCreated')).toBeInTheDocument();
        expect(
          screen.getByText('createCategoriesDescription')
        ).toBeInTheDocument();
        expect(screen.getByText('createFirstCategory')).toBeInTheDocument();
      });
    });

    test('handles loading errors gracefully', async () => {
      mockCommands.getTournamentCategories.mockRejectedValue(
        new Error('Load failed')
      );

      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('failedToLoadCategories')).toBeInTheDocument();
      });
    });
  });

  describe('Category Display', () => {
    test('displays category information', async () => {
      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Open Section')).toBeInTheDocument();
        expect(screen.getByText('For experienced players')).toBeInTheDocument();
      });
    });

    test('displays category rules as chips', async () => {
      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rating: 1800+')).toBeInTheDocument();
        expect(screen.getByText('gender: gender.F')).toBeInTheDocument();
        expect(screen.getByText('Age: <18')).toBeInTheDocument();
      });
    });

    test('shows edit and delete buttons for each category', async () => {
      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        const editButtons = screen.getAllByTestId('edit-icon');
        const deleteButtons = screen.getAllByTestId('delete-icon');

        expect(editButtons).toHaveLength(3);
        expect(deleteButtons).toHaveLength(3);
      });
    });

    test('displays eligible players in accordion', async () => {
      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('eligiblePlayers (3)')).toBeInTheDocument(); // Open Section
      });

      // Expand first accordion
      const firstAccordion = screen.getAllByTestId('expand-icon')[0];
      await user.click(firstAccordion);

      await waitFor(() => {
        expect(screen.getByText('Player 1')).toBeInTheDocument();
        expect(screen.getByText('Player 2')).toBeInTheDocument();
      });
    });

    test('shows assign buttons for eligible players', async () => {
      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      // Expand first accordion
      await waitFor(() => {
        const firstAccordion = screen.getAllByTestId('expand-icon')[0];
        return user.click(firstAccordion);
      });

      await waitFor(() => {
        const assignButtons = screen.getAllByText('assign');
        expect(assignButtons.length).toBeGreaterThan(0);
      });
    });

    test('displays player information with ratings and titles', async () => {
      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      // Expand first accordion
      await waitFor(() => {
        const firstAccordion = screen.getAllByTestId('expand-icon')[0];
        return user.click(firstAccordion);
      });

      await waitFor(() => {
        expect(screen.getByText('2000')).toBeInTheDocument(); // Player 1's rating
        expect(screen.getByText('title.FM')).toBeInTheDocument(); // Player 1's title
      });
    });
  });

  describe('Category Creation', () => {
    test('opens create category dialog', async () => {
      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      const createButton = screen.getByText('createCategory');
      await user.click(createButton);

      expect(screen.getByText('createNewCategory')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('renders all form fields in create dialog', async () => {
      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      const createButton = screen.getByText('createCategory');
      await user.click(createButton);

      expect(screen.getByLabelText('categoryName')).toBeInTheDocument();
      expect(screen.getByLabelText('description')).toBeInTheDocument();
      expect(screen.getByLabelText('minimumRating')).toBeInTheDocument();
      expect(screen.getByLabelText('maximumRating')).toBeInTheDocument();
      expect(screen.getByLabelText('minimumAge')).toBeInTheDocument();
      expect(screen.getByLabelText('maximumAge')).toBeInTheDocument();
      expect(screen.getByLabelText('genderRestriction')).toBeInTheDocument();
    });

    test('creates category with valid data', async () => {
      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      const createButton = screen.getByText('createCategory');
      await user.click(createButton);

      // Fill form
      const nameInput = screen.getByLabelText('categoryName');
      await user.type(nameInput, 'Expert Section');

      const descriptionInput = screen.getByLabelText('description');
      await user.type(descriptionInput, 'For expert level players');

      const minRatingInput = screen.getByLabelText('minimumRating');
      await user.type(minRatingInput, '2000');

      const maxRatingInput = screen.getByLabelText('maximumRating');
      await user.type(maxRatingInput, '2400');

      const submitButton = screen.getByText('createCategory');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCommands.createPlayerCategory).toHaveBeenCalledWith({
          tournament_id: 1,
          name: 'Expert Section',
          description: 'For expert level players',
          min_rating: 2000,
          max_rating: 2400,
          min_age: null,
          max_age: null,
          gender_restriction: null,
        });
      });

      expect(mockOnCategoriesUpdated).toHaveBeenCalledTimes(1);
    });

    test('validates required category name', async () => {
      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      const createButton = screen.getByText('createCategory');
      await user.click(createButton);

      const submitButton = screen.getByText('createCategory');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Category name is required')
        ).toBeInTheDocument();
      });
    });

    test('validates rating ranges', async () => {
      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      const createButton = screen.getByText('createCategory');
      await user.click(createButton);

      const nameInput = screen.getByLabelText('categoryName');
      await user.type(nameInput, 'Test Category');

      const minRatingInput = screen.getByLabelText('minimumRating');
      await user.type(minRatingInput, '-100');

      const submitButton = screen.getByText('createCategory');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Minimum rating must be positive')
        ).toBeInTheDocument();
      });
    });

    test('validates age ranges', async () => {
      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      const createButton = screen.getByText('createCategory');
      await user.click(createButton);

      const nameInput = screen.getByLabelText('categoryName');
      await user.type(nameInput, 'Test Category');

      const minAgeInput = screen.getByLabelText('minimumAge');
      await user.type(minAgeInput, '-5');

      const submitButton = screen.getByText('createCategory');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Minimum age must be positive')
        ).toBeInTheDocument();
      });
    });

    test('handles gender restriction selection', async () => {
      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      const createButton = screen.getByText('createCategory');
      await user.click(createButton);

      const nameInput = screen.getByLabelText('categoryName');
      await user.type(nameInput, 'Women Section');

      const genderSelect = screen.getByLabelText('genderRestriction');
      await user.click(genderSelect);
      await user.click(screen.getByText('femaleOnly'));

      const submitButton = screen.getByText('createCategory');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCommands.createPlayerCategory).toHaveBeenCalledWith({
          tournament_id: 1,
          name: 'Women Section',
          description: null,
          min_rating: null,
          max_rating: null,
          min_age: null,
          max_age: null,
          gender_restriction: 'F',
        });
      });
    });

    test('handles creation errors gracefully', async () => {
      mockCommands.createPlayerCategory.mockRejectedValue(
        new Error('Creation failed')
      );

      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      const createButton = screen.getByText('createCategory');
      await user.click(createButton);

      const nameInput = screen.getByLabelText('categoryName');
      await user.type(nameInput, 'Test Category');

      const submitButton = screen.getByText('createCategory');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('failedToSaveCategory')).toBeInTheDocument();
      });
    });
  });

  describe('Category Editing', () => {
    test('opens edit dialog with pre-filled data', async () => {
      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        const editButtons = screen.getAllByTestId('edit-icon');
        return user.click(editButtons[0]);
      });

      expect(screen.getByText('editCategory')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Open Section')).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('For experienced players')
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue('1800')).toBeInTheDocument();
    });

    test('shows update button text in edit mode', async () => {
      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        const editButtons = screen.getAllByTestId('edit-icon');
        return user.click(editButtons[0]);
      });

      expect(screen.getByText('updateCategory')).toBeInTheDocument();
    });
  });

  describe('Category Deletion', () => {
    test('deletes category after confirmation', async () => {
      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('delete-icon');
        return user.click(deleteButtons[0]);
      });

      expect(window.confirm).toHaveBeenCalledWith('confirmDeleteCategory');

      await waitFor(() => {
        expect(mockCommands.deletePlayerCategory).toHaveBeenCalledWith(1);
      });

      expect(mockOnCategoriesUpdated).toHaveBeenCalledTimes(1);
    });

    test('cancels deletion when user declines confirmation', async () => {
      (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('delete-icon');
        return user.click(deleteButtons[0]);
      });

      expect(window.confirm).toHaveBeenCalled();
      expect(mockCommands.deletePlayerCategory).not.toHaveBeenCalled();
    });

    test('handles deletion errors gracefully', async () => {
      mockCommands.deletePlayerCategory.mockRejectedValue(
        new Error('Deletion failed')
      );

      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('delete-icon');
        return user.click(deleteButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText('failedToDeleteCategory')).toBeInTheDocument();
      });
    });
  });

  describe('Player Assignment', () => {
    test('assigns player to category', async () => {
      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      // Expand first accordion
      await waitFor(() => {
        const firstAccordion = screen.getAllByTestId('expand-icon')[0];
        return user.click(firstAccordion);
      });

      // Click assign button
      await waitFor(() => {
        const assignButtons = screen.getAllByText('assign');
        return user.click(assignButtons[0]);
      });

      expect(mockCommands.assignPlayerToCategory).toHaveBeenCalledWith({
        player_id: expect.any(Number),
        category_id: 1,
      });
    });

    test('handles assignment errors gracefully', async () => {
      mockCommands.assignPlayerToCategory.mockRejectedValue(
        new Error('Assignment failed')
      );

      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      // Expand first accordion
      await waitFor(() => {
        const firstAccordion = screen.getAllByTestId('expand-icon')[0];
        return user.click(firstAccordion);
      });

      // Click assign button
      await waitFor(() => {
        const assignButtons = screen.getAllByText('assign');
        return user.click(assignButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText('failedToAssignPlayer')).toBeInTheDocument();
      });
    });
  });

  describe('Player Eligibility', () => {
    test('filters players by rating range', async () => {
      const ratingCategory = createMockCategory(1, {
        name: 'Expert Section',
        min_rating: 1900,
        max_rating: 2100,
      });
      mockCommands.getTournamentCategories.mockResolvedValue([ratingCategory]);

      userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('eligiblePlayers (1)')).toBeInTheDocument(); // Only Player 1 (2000) qualifies
      });
    });

    test('filters players by gender restriction', async () => {
      const genderCategory = createMockCategory(1, {
        name: 'Women Section',
        gender_restriction: 'F',
      });
      mockCommands.getTournamentCategories.mockResolvedValue([genderCategory]);

      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('eligiblePlayers (2)')).toBeInTheDocument(); // Players 2 and 4 are female
      });
    });

    test('filters players by age range', async () => {
      const ageCategory = createMockCategory(1, {
        name: 'Youth Section',
        max_age: 25,
      });
      mockCommands.getTournamentCategories.mockResolvedValue([ageCategory]);

      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('eligiblePlayers')).toBeInTheDocument();
      });
    });

    test('shows no eligible players when none match criteria', async () => {
      const strictCategory = createMockCategory(1, {
        name: 'Strict Section',
        min_rating: 2500, // Too high for any test player
      });
      mockCommands.getTournamentCategories.mockResolvedValue([strictCategory]);

      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('eligiblePlayers (0)')).toBeInTheDocument();
      });

      // Expand accordion
      const accordion = screen.getByTestId('expand-icon');
      await user.click(accordion);

      await waitFor(() => {
        expect(screen.getByText('noEligiblePlayers')).toBeInTheDocument();
      });
    });
  });

  describe('Form Dialog Controls', () => {
    test('closes dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      const createButton = screen.getByText('createCategory');
      await user.click(createButton);

      const cancelButton = screen.getByText('cancel');
      await user.click(cancelButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('prevents form submission during loading', async () => {
      let resolveCreate: (value: PlayerCategory) => void;
      mockCommands.createPlayerCategory.mockImplementation(() => {
        return new Promise<PlayerCategory>(resolve => {
          resolveCreate = resolve;
        });
      });

      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      const createButton = screen.getByText('createCategory');
      await user.click(createButton);

      const nameInput = screen.getByLabelText('categoryName');
      await user.type(nameInput, 'Test Category');

      const submitButton = screen.getByText('createCategory');
      await user.click(submitButton);

      // Should show loading state
      expect(submitButton).toBeDisabled();

      // Complete the promise
      resolveCreate!(createMockCategory(4));

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Error Handling and Loading States', () => {
    test('shows loading indicator during operations', async () => {
      let resolveCategories: (value: PlayerCategory[]) => void;
      mockCommands.getTournamentCategories.mockImplementation(() => {
        return new Promise<PlayerCategory[]>(resolve => {
          resolveCategories = resolve;
        });
      });

      render(<PlayerCategoryManagement {...defaultProps} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      resolveCategories!(mockCategories);

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    test('displays error alert with close button', async () => {
      mockCommands.getTournamentCategories.mockRejectedValue(
        new Error('Load failed')
      );

      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('failedToLoadCategories')).toBeInTheDocument();
      });

      // Close error alert
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(
        screen.queryByText('failedToLoadCategories')
      ).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('form fields have proper labels', async () => {
      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      const createButton = screen.getByText('createCategory');
      await user.click(createButton);

      expect(screen.getByLabelText('categoryName')).toBeInTheDocument();
      expect(screen.getByLabelText('description')).toBeInTheDocument();
      expect(screen.getByLabelText('minimumRating')).toBeInTheDocument();
      expect(screen.getByLabelText('maximumRating')).toBeInTheDocument();
      expect(screen.getByLabelText('minimumAge')).toBeInTheDocument();
      expect(screen.getByLabelText('maximumAge')).toBeInTheDocument();
      expect(screen.getByLabelText('genderRestriction')).toBeInTheDocument();
    });

    test('dialog has proper modal attributes', async () => {
      const user = userEvent.setup();
      render(<PlayerCategoryManagement {...defaultProps} />);

      const createButton = screen.getByText('createCategory');
      await user.click(createButton);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    test('accordions have proper expand controls', async () => {
      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        const expandButtons = screen.getAllByTestId('expand-icon');
        expect(expandButtons.length).toBeGreaterThan(0);
      });
    });

    test('buttons have accessible names', async () => {
      render(<PlayerCategoryManagement {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'createCategory' })
        ).toBeInTheDocument();
      });
    });
  });
});
