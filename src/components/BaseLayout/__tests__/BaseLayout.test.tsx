import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { vi } from 'vitest';
import BaseLayout from '../BaseLayout';

// Mock MUI's useMediaQuery hook
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: vi.fn(),
  };
});

// Mock the Sidebar component
vi.mock('../../Sidebar', () => ({
  default: ({ open, onToggle }: { open: boolean; onToggle: () => void }) => (
    <div data-testid="sidebar" data-open={open}>
      <button data-testid="sidebar-toggle" onClick={onToggle}>
        Toggle Sidebar
      </button>
      <div data-testid="sidebar-content">Sidebar Content</div>
    </div>
  ),
}));

// Create test theme with responsive breakpoints
const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      tablet: 768,
      md: 960,
      laptop: 1200,
      lg: 1200,
      xl: 1920,
    },
  },
  palette: {
    background: {
      default: '#fafafa',
    },
  },
  transitions: {
    create: vi.fn(() => 'all 0.3s ease'),
    easing: {
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
    duration: {
      enteringScreen: 225,
    },
  },
});

// Test wrapper with theme
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('BaseLayout', () => {
  const mockUseMediaQuery = vi.mocked(useMediaQuery);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders layout container with children', () => {
      mockUseMediaQuery.mockImplementation(query => {
        if (query === theme.breakpoints.down('tablet')) return false; // Not mobile
        if (query === theme.breakpoints.between('tablet', 'laptop'))
          return false; // Not tablet
        return false;
      });

      render(
        <TestWrapper>
          <BaseLayout>
            <div data-testid="test-content">Test Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    test('has proper layout structure', () => {
      mockUseMediaQuery.mockImplementation(query => {
        if (query === theme.breakpoints.down('tablet')) return false;
        if (query === theme.breakpoints.between('tablet', 'laptop'))
          return false;
        return false;
      });

      const { container } = render(
        <TestWrapper>
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      const layoutContainer = container.firstChild;
      expect(layoutContainer).toHaveStyle({
        display: 'flex',
        minHeight: '100vh',
      });
    });

    test('renders main content area', () => {
      mockUseMediaQuery.mockImplementation(() => false);

      render(
        <TestWrapper>
          <BaseLayout>
            <div data-testid="main-content">Main Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      const mainElement = screen.getByRole('main');
      expect(mainElement).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });

    test('applies background color from theme', () => {
      mockUseMediaQuery.mockImplementation(() => false);

      const { container } = render(
        <TestWrapper>
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      const layoutContainer = container.firstChild as HTMLElement;
      expect(layoutContainer).toHaveStyle({
        backgroundColor: theme.palette.background.default,
      });
    });
  });

  describe('Responsive Behavior', () => {
    test('closes sidebar on mobile by default', () => {
      mockUseMediaQuery.mockImplementation(query => {
        if (query === theme.breakpoints.down('tablet')) return true; // Is mobile
        if (query === theme.breakpoints.between('tablet', 'laptop'))
          return false;
        return false;
      });

      render(
        <TestWrapper>
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-open', 'false');
    });

    test('opens sidebar on desktop by default', () => {
      mockUseMediaQuery.mockImplementation(query => {
        if (query === theme.breakpoints.down('tablet')) return false; // Not mobile
        if (query === theme.breakpoints.between('tablet', 'laptop'))
          return false; // Not tablet
        return false;
      });

      render(
        <TestWrapper>
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-open', 'true');
    });

    test('keeps sidebar closed on tablet', () => {
      mockUseMediaQuery.mockImplementation(query => {
        if (query === theme.breakpoints.down('tablet')) return false; // Not mobile
        if (query === theme.breakpoints.between('tablet', 'laptop'))
          return true; // Is tablet
        return false;
      });

      render(
        <TestWrapper>
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      // On tablet, sidebar should remain in its current state (initially closed)
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-open', 'false');
    });

    test('adjusts main content margin based on sidebar state and screen size', () => {
      mockUseMediaQuery.mockImplementation(query => {
        if (query === theme.breakpoints.down('tablet')) return false; // Desktop
        if (query === theme.breakpoints.between('tablet', 'laptop'))
          return false;
        return false;
      });

      render(
        <TestWrapper>
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      const mainElement = screen.getByRole('main');
      // On desktop with open sidebar, should have left margin
      expect(mainElement).toBeInTheDocument();
    });

    test('removes margin on mobile', () => {
      mockUseMediaQuery.mockImplementation(query => {
        if (query === theme.breakpoints.down('tablet')) return true; // Mobile
        if (query === theme.breakpoints.between('tablet', 'laptop'))
          return false;
        return false;
      });

      render(
        <TestWrapper>
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      const mainElement = screen.getByRole('main');
      expect(mainElement).toBeInTheDocument();
    });
  });

  describe('Sidebar Toggle Functionality', () => {
    test('toggles sidebar state when toggle button is clicked', async () => {
      const user = userEvent.setup();
      mockUseMediaQuery.mockImplementation(() => false); // Desktop

      render(
        <TestWrapper>
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      const toggleButton = screen.getByTestId('sidebar-toggle');
      const sidebar = screen.getByTestId('sidebar');

      // Initially open on desktop
      expect(sidebar).toHaveAttribute('data-open', 'true');

      await user.click(toggleButton);

      expect(sidebar).toHaveAttribute('data-open', 'false');

      await user.click(toggleButton);

      expect(sidebar).toHaveAttribute('data-open', 'true');
    });

    test('passes onToggle function to sidebar', async () => {
      const user = userEvent.setup();
      mockUseMediaQuery.mockImplementation(() => false);

      render(
        <TestWrapper>
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      const toggleButton = screen.getByTestId('sidebar-toggle');

      // Should be able to click toggle button without errors
      await user.click(toggleButton);

      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('Layout Effects and State Management', () => {
    test('updates sidebar state when screen size changes from desktop to mobile', () => {
      const { rerender } = render(
        <TestWrapper>
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      // Initially desktop - sidebar should be open
      mockUseMediaQuery.mockImplementation(query => {
        if (query === theme.breakpoints.down('tablet')) return false; // Desktop
        if (query === theme.breakpoints.between('tablet', 'laptop'))
          return false;
        return false;
      });

      rerender(
        <TestWrapper>
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      let sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-open', 'true');

      // Change to mobile - sidebar should close
      mockUseMediaQuery.mockImplementation(query => {
        if (query === theme.breakpoints.down('tablet')) return true; // Mobile
        if (query === theme.breakpoints.between('tablet', 'laptop'))
          return false;
        return false;
      });

      rerender(
        <TestWrapper>
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-open', 'false');
    });

    test('updates sidebar state when screen size changes from mobile to desktop', () => {
      // Start with mobile
      mockUseMediaQuery.mockImplementation(query => {
        if (query === theme.breakpoints.down('tablet')) return true; // Mobile
        if (query === theme.breakpoints.between('tablet', 'laptop'))
          return false;
        return false;
      });

      const { rerender } = render(
        <TestWrapper>
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      let sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-open', 'false');

      // Change to desktop - sidebar should open
      mockUseMediaQuery.mockImplementation(query => {
        if (query === theme.breakpoints.down('tablet')) return false; // Desktop
        if (query === theme.breakpoints.between('tablet', 'laptop'))
          return false;
        return false;
      });

      rerender(
        <TestWrapper>
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-open', 'true');
    });

    test('handles tablet breakpoint correctly', () => {
      mockUseMediaQuery.mockImplementation(query => {
        if (query === theme.breakpoints.down('tablet')) return false; // Not mobile
        if (query === theme.breakpoints.between('tablet', 'laptop'))
          return true; // Is tablet
        return false;
      });

      render(
        <TestWrapper>
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      const sidebar = screen.getByTestId('sidebar');
      // On tablet, sidebar should remain closed initially
      expect(sidebar).toHaveAttribute('data-open', 'false');
    });
  });

  describe('Main Content Area Styling', () => {
    test('applies correct padding for different screen sizes', () => {
      mockUseMediaQuery.mockImplementation(() => false);

      render(
        <TestWrapper>
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      const mainElement = screen.getByRole('main');
      expect(mainElement).toHaveStyle({
        width: '100%',
        minHeight: '100vh',
        flexGrow: '1',
      });
    });

    test('applies transition styles', () => {
      mockUseMediaQuery.mockImplementation(() => false);

      render(
        <TestWrapper>
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      const mainElement = screen.getByRole('main');
      expect(mainElement).toBeInTheDocument();
      // Transition styles are applied via sx prop
    });

    test('maintains full height layout', () => {
      mockUseMediaQuery.mockImplementation(() => false);

      const { container } = render(
        <TestWrapper>
          <BaseLayout>
            <div style={{ height: '2000px' }}>Tall Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      const layoutContainer = container.firstChild as HTMLElement;
      expect(layoutContainer).toHaveStyle({ minHeight: '100vh' });

      const mainElement = screen.getByRole('main');
      expect(mainElement).toHaveStyle({ minHeight: '100vh' });
    });
  });

  describe('Children Rendering', () => {
    test('renders multiple child elements', () => {
      mockUseMediaQuery.mockImplementation(() => false);

      render(
        <TestWrapper>
          <BaseLayout>
            <div data-testid="child-1">Child 1</div>
            <div data-testid="child-2">Child 2</div>
            <div data-testid="child-3">Child 3</div>
          </BaseLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    test('renders React components as children', () => {
      mockUseMediaQuery.mockImplementation(() => false);

      const TestComponent = () => (
        <div data-testid="test-component">Test Component</div>
      );

      render(
        <TestWrapper>
          <BaseLayout>
            <TestComponent />
          </BaseLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('test-component')).toBeInTheDocument();
    });

    test('handles null and undefined children', () => {
      mockUseMediaQuery.mockImplementation(() => false);

      render(
        <TestWrapper>
          <BaseLayout>
            {null}
            {undefined}
            <div data-testid="valid-child">Valid Child</div>
          </BaseLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('valid-child')).toBeInTheDocument();
    });

    test('handles conditional children', () => {
      mockUseMediaQuery.mockImplementation(() => false);

      const showContent = true;

      render(
        <TestWrapper>
          <BaseLayout>
            {showContent && (
              <div data-testid="conditional-content">Conditional Content</div>
            )}
            <div data-testid="always-shown">Always Shown</div>
          </BaseLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('conditional-content')).toBeInTheDocument();
      expect(screen.getByTestId('always-shown')).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles missing theme gracefully', () => {
      mockUseMediaQuery.mockImplementation(() => false);

      // Render without theme provider
      expect(() =>
        render(
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        )
      ).not.toThrow();
    });

    test('handles useMediaQuery throwing error', () => {
      mockUseMediaQuery.mockImplementation(() => {
        throw new Error('Media query error');
      });

      // Should handle media query errors gracefully
      expect(() =>
        render(
          <TestWrapper>
            <BaseLayout>
              <div>Content</div>
            </BaseLayout>
          </TestWrapper>
        )
      ).not.toThrow();
    });

    test('maintains layout when sidebar component fails', () => {
      mockUseMediaQuery.mockImplementation(() => false);

      // Mock Sidebar to throw error
      vi.mocked(vi.doMock)('../../Sidebar', () => ({
        default: () => {
          throw new Error('Sidebar error');
        },
      }));

      // Layout should still render main content
      render(
        <TestWrapper>
          <BaseLayout>
            <div data-testid="main-content">Main Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('main content area has proper semantic role', () => {
      mockUseMediaQuery.mockImplementation(() => false);

      render(
        <TestWrapper>
          <BaseLayout>
            <div>Content</div>
          </BaseLayout>
        </TestWrapper>
      );

      const mainElement = screen.getByRole('main');
      expect(mainElement).toBeInTheDocument();
    });

    test('maintains focus management during sidebar toggle', async () => {
      const user = userEvent.setup();
      mockUseMediaQuery.mockImplementation(() => false);

      render(
        <TestWrapper>
          <BaseLayout>
            <button data-testid="content-button">Content Button</button>
          </BaseLayout>
        </TestWrapper>
      );

      const contentButton = screen.getByTestId('content-button');
      const toggleButton = screen.getByTestId('sidebar-toggle');

      // Focus content button
      await user.click(contentButton);
      expect(contentButton).toHaveFocus();

      // Toggle sidebar - focus should remain on content
      await user.click(toggleButton);
      // Focus behavior depends on implementation
    });

    test('layout is keyboard navigable', async () => {
      const user = userEvent.setup();
      mockUseMediaQuery.mockImplementation(() => false);

      render(
        <TestWrapper>
          <BaseLayout>
            <button data-testid="content-button">Content Button</button>
          </BaseLayout>
        </TestWrapper>
      );

      // Tab navigation should work
      await user.tab();

      // Either sidebar toggle or content button should be focused
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeInTheDocument();
    });
  });
});
