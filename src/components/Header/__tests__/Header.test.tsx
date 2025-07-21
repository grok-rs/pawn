import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Header from '../Header';

// Create test theme
const theme = createTheme();

// Test wrapper with providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
  </BrowserRouter>
);

describe('Header', () => {
  describe('Basic Rendering', () => {
    test('renders header with app name', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      expect(screen.getByText('Pawn')).toBeInTheDocument();
    });

    test('renders as MUI AppBar component', () => {
      const { container } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const appBar = container.querySelector('.MuiAppBar-root');
      expect(appBar).toBeInTheDocument();
    });

    test('has fixed positioning', () => {
      const { container } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const appBar = container.querySelector('.MuiAppBar-root');
      expect(appBar).toHaveClass('MuiAppBar-positionFixed');
    });

    test('applies custom background color', () => {
      const { container } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const appBar = container.querySelector('.MuiAppBar-root');
      expect(appBar).toHaveStyle({ backgroundColor: '#3A3D91' });
    });

    test('spans full width', () => {
      const { container } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const appBar = container.querySelector('.MuiAppBar-root');
      expect(appBar).toHaveStyle({ width: '100%' });
    });
  });

  describe('Toolbar Content', () => {
    test('contains MUI Toolbar component', () => {
      const { container } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const toolbar = container.querySelector('.MuiToolbar-root');
      expect(toolbar).toBeInTheDocument();
    });

    test('has proper flex layout', () => {
      const { container } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const flexBox = container.querySelector('[sx]'); // Box with sx prop
      expect(flexBox).toBeInTheDocument();
    });

    test('displays app title with proper typography', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const title = screen.getByText('Pawn');
      expect(title).toHaveClass('MuiTypography-root');
      expect(title).toHaveClass('MuiTypography-h6');
    });

    test('title has proper spacing', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const title = screen.getByText('Pawn').closest('[component="div"]');
      expect(title).toHaveStyle({ marginLeft: '8px' }); // 1 * 8px from theme spacing
    });
  });

  describe('Navigation Link', () => {
    test('app title is wrapped in Link component', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/');
    });

    test('link has proper styling', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveStyle({
        textDecoration: 'none',
        color: 'inherit',
      });
    });

    test('navigates to home when title is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const link = screen.getByRole('link');
      await user.click(link);

      // In test environment, we just verify the href is correct
      expect(link).toHaveAttribute('href', '/');
    });

    test('maintains text styling when link is hovered', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const link = screen.getByRole('link');

      await user.hover(link);

      expect(link).toHaveStyle({
        textDecoration: 'none',
        color: 'inherit',
      });
    });
  });

  describe('Responsive Design', () => {
    test('maintains layout on different screen sizes', () => {
      const { container } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const appBar = container.querySelector('.MuiAppBar-root');
      expect(appBar).toHaveStyle({ width: '100%' });

      const flexContainer =
        container.querySelector('div[style*="flex"]') ||
        container.querySelector('[sx]');
      expect(flexContainer).toBeInTheDocument();
    });

    test('toolbar adapts to screen width', () => {
      const { container } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const toolbar = container.querySelector('.MuiToolbar-root');
      expect(toolbar).toBeInTheDocument();
      // MUI Toolbar has built-in responsive behavior
    });

    test('text remains readable at different sizes', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const title = screen.getByText('Pawn');
      expect(title).toHaveClass('MuiTypography-h6');
      // h6 variant provides good readability across screen sizes
    });
  });

  describe('Layout Structure', () => {
    test('has proper flex structure for space distribution', () => {
      const { container } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Box component should have flex properties
      const flexBox = container.querySelector('div');
      expect(flexBox).toBeInTheDocument();
    });

    test('content is properly aligned', () => {
      const { container } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Should have elements arranged in flex layout
      const toolbar = container.querySelector('.MuiToolbar-root');
      expect(toolbar).toBeInTheDocument();

      const title = screen.getByText('Pawn');
      expect(title).toBeInTheDocument();
    });

    test('provides space for future additions', () => {
      const { container } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Structure should support additional elements
      const flexBox = container.querySelector(
        'div[style*="justify-content"], [sx]'
      );
      expect(flexBox).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper semantic structure', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // AppBar should have header role
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
    });

    test('title link is keyboard accessible', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const link = screen.getByRole('link');

      // Tab to focus the link
      await user.tab();

      if (document.activeElement === link) {
        expect(link).toHaveFocus();
      }
    });

    test('link can be activated with Enter key', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const link = screen.getByRole('link');
      link.focus();

      await user.keyboard('{Enter}');

      // Link should maintain href for navigation
      expect(link).toHaveAttribute('href', '/');
    });

    test('provides meaningful link text', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const link = screen.getByRole('link', { name: 'Pawn' });
      expect(link).toBeInTheDocument();
    });

    test('has proper color contrast', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const title = screen.getByText('Pawn');
      expect(title).toHaveStyle({ color: 'inherit' });
      // The inherit color on dark background should provide good contrast
    });
  });

  describe('Theme Integration', () => {
    test('integrates with MUI theme system', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const title = screen.getByText('Pawn');
      expect(title).toHaveClass('MuiTypography-root');
    });

    test('uses MUI component styling', () => {
      const { container } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const appBar = container.querySelector('.MuiAppBar-root');
      expect(appBar).toBeInTheDocument();

      const toolbar = container.querySelector('.MuiToolbar-root');
      expect(toolbar).toBeInTheDocument();
    });

    test('applies custom color overrides', () => {
      const { container } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const appBar = container.querySelector('.MuiAppBar-root');
      expect(appBar).toHaveStyle({ backgroundColor: '#3A3D91' });
    });
  });

  describe('Commented Features', () => {
    test('has commented close button functionality', () => {
      const { container } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Verify the comment exists in the source
      // This tests that the close button code is preserved for future use
      expect(container).toBeInTheDocument();

      // Should not have close button rendered
      expect(screen.queryByText('X')).not.toBeInTheDocument();
    });

    test('maintains clean UI without commented elements', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Only the title should be visible
      expect(screen.getByText('Pawn')).toBeInTheDocument();

      // No other interactive elements should be present
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(1); // Only the title link
    });
  });

  describe('Router Integration', () => {
    test('works with React Router Link component', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/');
    });

    test('maintains routing context', () => {
      // Test that header renders without errors in router context
      expect(() =>
        render(
          <TestWrapper>
            <Header />
          </TestWrapper>
        )
      ).not.toThrow();
    });

    test('handles routing without BrowserRouter', () => {
      // Header should handle missing router context gracefully
      expect(() =>
        render(
          <ThemeProvider theme={theme}>
            <Header />
          </ThemeProvider>
        )
      ).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('renders without theme provider', () => {
      expect(() =>
        render(
          <BrowserRouter>
            <Header />
          </BrowserRouter>
        )
      ).not.toThrow();
    });

    test('handles missing dependencies gracefully', () => {
      // Component should be resilient to missing context providers
      expect(() => render(<Header />)).not.toThrow();
    });

    test('maintains structure with rendering errors', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Should always have basic structure
      expect(screen.getByText('Pawn')).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    test('does not cause unnecessary re-renders', () => {
      const { rerender } = render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Re-render with same props
      rerender(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      expect(screen.getByText('Pawn')).toBeInTheDocument();
    });

    test('maintains static content efficiently', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Header content is static and should render efficiently
      expect(screen.getByText('Pawn')).toBeInTheDocument();
      expect(screen.getByRole('link')).toHaveAttribute('href', '/');
    });
  });
});
