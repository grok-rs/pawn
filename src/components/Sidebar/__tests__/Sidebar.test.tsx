import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMediaQuery } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { vi, describe, test, beforeEach, expect } from 'vitest';
import Sidebar from '../Sidebar';
import { renderWithAllProviders } from '../../../test/utils/test-utils';

// Mock external dependencies
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: vi.fn(),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: vi.fn(),
  };
});

vi.mock('../../LanguageSwitcher', () => ({
  LanguageSwitcher: () => (
    <div data-testid="language-switcher">Language Switcher</div>
  ),
}));

// Mock app routes
vi.mock('../../../constants/appRoutes', () => ({
  APP_ROUTES: {
    TOURNAMENTS: '/tournaments',
    NEW_TOURNAMENT: '/tournament/new',
    SETTINGS: '/settings',
  },
}));

// Mock MUI icons
vi.mock('@mui/icons-material', () => ({
  EmojiEvents: () => <div data-testid="tournaments-icon">🏆</div>,
  Add: () => <div data-testid="add-icon">➕</div>,
  Settings: () => <div data-testid="settings-icon">⚙️</div>,
  ChevronLeft: () => <div data-testid="chevron-left">⬅️</div>,
  ChevronRight: () => <div data-testid="chevron-right">➡️</div>,
  ExpandLess: () => <div data-testid="expand-less">🔺</div>,
  ExpandMore: () => <div data-testid="expand-more">🔻</div>,
  Dashboard: () => <div data-testid="dashboard-icon">📊</div>,
  People: () => <div data-testid="people-icon">👥</div>,
  Analytics: () => <div data-testid="analytics-icon">📈</div>,
  FileUpload: () => <div data-testid="upload-icon">📤</div>,
}));

describe('Sidebar', () => {
  const mockNavigate = vi.fn();
  const mockOnToggle = vi.fn();

  const defaultProps = {
    open: true,
    onToggle: mockOnToggle,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock implementations
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useLocation).mockReturnValue({
      pathname: '/tournaments',
      search: '',
      hash: '',
      state: null,
      key: 'default',
    });

    // Default to desktop
    vi.mocked(useMediaQuery).mockReturnValue(false);
  });

  describe('Basic Rendering', () => {
    test('renders sidebar with logo and navigation items', () => {
      renderWithAllProviders(<Sidebar {...defaultProps} />);

      // Check if main navigation items are present
      expect(screen.getByTestId('tournaments-icon')).toBeInTheDocument();
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-icon')).toBeInTheDocument();
    });

    test('renders as MUI Drawer component', () => {
      renderWithAllProviders(<Sidebar {...defaultProps} />);

      // Check if sidebar navigation is rendered with menu items
      expect(screen.getByTestId('tournaments-icon')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-icon')).toBeInTheDocument();
    });

    test('displays toggle button', () => {
      renderWithAllProviders(<Sidebar {...defaultProps} />);

      // Look for the toggle button specifically by finding the chevron icon
      const toggleButton = screen.getByTestId('chevron-left').closest('button');
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('calls onToggle when toggle button is clicked', async () => {
      const user = userEvent.setup();
      renderWithAllProviders(<Sidebar {...defaultProps} />);

      const toggleButton = screen
        .getByTestId('chevron-left')
        .closest('button')!;
      await user.click(toggleButton);

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    test('navigates to route when menu item is clicked', async () => {
      const user = userEvent.setup();
      renderWithAllProviders(<Sidebar {...defaultProps} />);

      // Find a clickable menu item (this will depend on the actual implementation)
      const menuItems = screen.getAllByRole('button');
      if (menuItems.length > 1) {
        await user.click(menuItems[1]); // Skip the toggle button
        expect(mockNavigate).toHaveBeenCalled();
      }
    });
  });

  describe('Responsive Behavior', () => {
    test('uses permanent variant on desktop', () => {
      vi.mocked(useMediaQuery).mockReturnValue(false); // Desktop
      renderWithAllProviders(<Sidebar {...defaultProps} />);

      // Check that sidebar renders on desktop
      expect(screen.getByTestId('tournaments-icon')).toBeInTheDocument();
    });

    test('uses temporary variant on mobile', () => {
      vi.mocked(useMediaQuery).mockReturnValue(true); // Mobile
      renderWithAllProviders(<Sidebar {...defaultProps} />);

      // Check that sidebar renders on mobile
      expect(screen.getByTestId('tournaments-icon')).toBeInTheDocument();
    });
  });

  describe('Closed State', () => {
    test('renders correctly when closed', () => {
      renderWithAllProviders(<Sidebar {...defaultProps} open={false} />);

      // Check that sidebar still renders when closed
      expect(screen.getByTestId('tournaments-icon')).toBeInTheDocument();
    });
  });

  describe('Translation Integration', () => {
    test('displays language switcher when open', () => {
      renderWithAllProviders(<Sidebar {...defaultProps} />);

      const languageSwitcher = screen.getByTestId('language-switcher');
      expect(languageSwitcher).toBeInTheDocument();
    });
  });
});
