import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { vi } from 'vitest';
import StatCard from '../StatCard';

// Mock MUI icons
const TestIcon = () => <span data-testid="test-icon">📊</span>;
const UserIcon = () => <span data-testid="user-icon">👤</span>;
const TrophyIcon = () => <span data-testid="trophy-icon">🏆</span>;

// Create test theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Test wrapper with theme
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('StatCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders with required props', () => {
      render(
        <TestWrapper>
          <StatCard title="Total Players" value={42} icon={<TestIcon />} />
        </TestWrapper>
      );

      expect(screen.getByText('Total Players')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    test('renders as MUI Card component', () => {
      render(
        <TestWrapper>
          <StatCard title="Test Stat" value="100" icon={<TestIcon />} />
        </TestWrapper>
      );

      const card = screen.getByRole('generic'); // Card renders as div
      expect(card).toHaveClass('MuiCard-root');
    });

    test('displays value as h4 variant with bold font', () => {
      render(
        <TestWrapper>
          <StatCard title="Score" value="95.5" icon={<TestIcon />} />
        </TestWrapper>
      );

      const valueElement = screen.getByText('95.5');
      expect(valueElement).toHaveClass('MuiTypography-h4');
    });

    test('displays title as body2 variant with secondary color', () => {
      render(
        <TestWrapper>
          <StatCard
            title="Performance Rating"
            value={1850}
            icon={<TestIcon />}
          />
        </TestWrapper>
      );

      const titleElement = screen.getByText('Performance Rating');
      expect(titleElement).toHaveClass('MuiTypography-body2');
    });
  });

  describe('Icon Display', () => {
    test('displays icon in Avatar component', () => {
      render(
        <TestWrapper>
          <StatCard title="Tournaments" value={12} icon={<TrophyIcon />} />
        </TestWrapper>
      );

      expect(screen.getByTestId('trophy-icon')).toBeInTheDocument();
      const avatar = screen
        .getByTestId('trophy-icon')
        .closest('.MuiAvatar-root');
      expect(avatar).toBeInTheDocument();
    });

    test('avatar has correct size', () => {
      render(
        <TestWrapper>
          <StatCard title="Users" value={156} icon={<UserIcon />} />
        </TestWrapper>
      );

      const avatar = screen.getByTestId('user-icon').closest('.MuiAvatar-root');
      expect(avatar).toHaveStyle({
        width: '48px',
        height: '48px',
      });
    });
  });

  describe('Color Theming', () => {
    test('uses primary color by default', () => {
      render(
        <TestWrapper>
          <StatCard title="Default Color" value={10} icon={<TestIcon />} />
        </TestWrapper>
      );

      const avatar = screen.getByTestId('test-icon').closest('.MuiAvatar-root');
      expect(avatar).toHaveStyle({
        color: theme.palette.primary.main,
      });
    });

    test('uses custom color when provided', () => {
      const customColor = '#ff5722';

      render(
        <TestWrapper>
          <StatCard
            title="Custom Color"
            value={25}
            icon={<TestIcon />}
            color={customColor}
          />
        </TestWrapper>
      );

      const avatar = screen.getByTestId('test-icon').closest('.MuiAvatar-root');
      expect(avatar).toHaveStyle({
        color: customColor,
      });
    });

    test('applies color with opacity for background', () => {
      const customColor = '#4caf50';

      render(
        <TestWrapper>
          <StatCard
            title="Green Stat"
            value={88}
            icon={<TestIcon />}
            color={customColor}
          />
        </TestWrapper>
      );

      const avatar = screen.getByTestId('test-icon').closest('.MuiAvatar-root');
      expect(avatar).toHaveStyle({
        backgroundColor: `${customColor}20`,
      });
    });
  });

  describe('Gradient Mode', () => {
    test('applies gradient background when gradient=true', () => {
      render(
        <TestWrapper>
          <StatCard
            title="Gradient Card"
            value={75}
            icon={<TestIcon />}
            gradient={true}
            color="#9c27b0"
          />
        </TestWrapper>
      );

      const card = screen.getByRole('generic');
      // Check if gradient styles are applied (this is approximate since style computation is complex)
      expect(card).toHaveStyle({
        background: expect.stringContaining('linear-gradient'),
      });
    });

    test('does not apply gradient by default', () => {
      render(
        <TestWrapper>
          <StatCard title="Regular Card" value={50} icon={<TestIcon />} />
        </TestWrapper>
      );

      const card = screen.getByRole('generic');
      expect(card).not.toHaveStyle({
        background: expect.stringContaining('linear-gradient'),
      });
    });

    test('avatar uses solid color in gradient mode', () => {
      const testColor = '#e91e63';

      render(
        <TestWrapper>
          <StatCard
            title="Gradient Avatar"
            value={33}
            icon={<TestIcon />}
            gradient={true}
            color={testColor}
          />
        </TestWrapper>
      );

      const avatar = screen.getByTestId('test-icon').closest('.MuiAvatar-root');
      expect(avatar).toHaveStyle({
        backgroundColor: testColor,
      });
    });
  });

  describe('Loading State', () => {
    test('shows skeleton when loading=true', () => {
      render(
        <TestWrapper>
          <StatCard
            title="Loading Stat"
            value={0}
            icon={<TestIcon />}
            loading={true}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Loading Stat')).not.toBeInTheDocument();
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
    });

    test('shows content when loading=false', () => {
      render(
        <TestWrapper>
          <StatCard
            title="Loaded Stat"
            value={123}
            icon={<TestIcon />}
            loading={false}
          />
        </TestWrapper>
      );

      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
      expect(screen.getByText('Loaded Stat')).toBeInTheDocument();
      expect(screen.getByText('123')).toBeInTheDocument();
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    test('shows content by default (loading not specified)', () => {
      render(
        <TestWrapper>
          <StatCard title="Default Loading" value={456} icon={<TestIcon />} />
        </TestWrapper>
      );

      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
      expect(screen.getByText('Default Loading')).toBeInTheDocument();
      expect(screen.getByText('456')).toBeInTheDocument();
    });

    test('skeleton has correct height', () => {
      render(
        <TestWrapper>
          <StatCard
            title="Skeleton Test"
            value={0}
            icon={<TestIcon />}
            loading={true}
          />
        </TestWrapper>
      );

      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveAttribute('data-height', '100');
    });
  });

  describe('Value Types', () => {
    test('displays string values', () => {
      render(
        <TestWrapper>
          <StatCard title="String Value" value="Active" icon={<TestIcon />} />
        </TestWrapper>
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    test('displays numeric values', () => {
      render(
        <TestWrapper>
          <StatCard title="Numeric Value" value={999} icon={<TestIcon />} />
        </TestWrapper>
      );

      expect(screen.getByText('999')).toBeInTheDocument();
    });

    test('displays formatted values', () => {
      render(
        <TestWrapper>
          <StatCard
            title="Formatted Value"
            value="$1,234.56"
            icon={<TestIcon />}
          />
        </TestWrapper>
      );

      expect(screen.getByText('$1,234.56')).toBeInTheDocument();
    });

    test('displays zero values correctly', () => {
      render(
        <TestWrapper>
          <StatCard title="Zero Value" value={0} icon={<TestIcon />} />
        </TestWrapper>
      );

      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Hover Effects', () => {
    test('has hover transition styles', () => {
      render(
        <TestWrapper>
          <StatCard title="Hoverable Card" value={42} icon={<TestIcon />} />
        </TestWrapper>
      );

      const card = screen.getByRole('generic');
      expect(card).toHaveStyle({
        transition: 'all 0.3s ease',
      });
    });

    test('hover effects work with user interaction', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <StatCard title="Interactive Card" value={100} icon={<TestIcon />} />
        </TestWrapper>
      );

      const card = screen.getByRole('generic');

      // Hover over card
      await user.hover(card);
      // Note: Testing actual transform/boxShadow changes requires more complex setup
      // This just ensures the component renders without errors during interaction

      await user.unhover(card);
    });
  });

  describe('Complex Examples', () => {
    test('renders tournament statistics card', () => {
      render(
        <TestWrapper>
          <StatCard
            title="Active Tournaments"
            value={7}
            icon={<TrophyIcon />}
            color="#ff9800"
            gradient={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Active Tournaments')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByTestId('trophy-icon')).toBeInTheDocument();
    });

    test('renders player statistics card', () => {
      render(
        <TestWrapper>
          <StatCard
            title="Registered Players"
            value="1,247"
            icon={<UserIcon />}
            color="#4caf50"
            gradient={false}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Registered Players')).toBeInTheDocument();
      expect(screen.getByText('1,247')).toBeInTheDocument();
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });

    test('renders loading statistics placeholder', () => {
      render(
        <TestWrapper>
          <StatCard
            title="Loading Stats"
            value={0}
            icon={<TestIcon />}
            loading={true}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper text hierarchy', () => {
      render(
        <TestWrapper>
          <StatCard title="Accessible Card" value={250} icon={<TestIcon />} />
        </TestWrapper>
      );

      // Value should be prominently displayed
      const valueElement = screen.getByText('250');
      expect(valueElement).toHaveClass('MuiTypography-h4');

      // Title should be secondary
      const titleElement = screen.getByText('Accessible Card');
      expect(titleElement).toHaveClass('MuiTypography-body2');
    });

    test('icon is contained within avatar for semantics', () => {
      render(
        <TestWrapper>
          <StatCard title="Icon Test" value={99} icon={<TestIcon />} />
        </TestWrapper>
      );

      const icon = screen.getByTestId('test-icon');
      const avatar = icon.closest('.MuiAvatar-root');
      expect(avatar).toBeInTheDocument();
    });

    test('loading state maintains card structure', () => {
      render(
        <TestWrapper>
          <StatCard
            title="Loading Card"
            value={0}
            icon={<TestIcon />}
            loading={true}
          />
        </TestWrapper>
      );

      // Should still be a card even when loading
      const card = screen.getByRole('generic');
      expect(card).toHaveClass('MuiCard-root');
    });
  });
});
