import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import EmptyState from '../EmptyState';

// Mock MUI icons for testing
const TestIcon = () => <span data-testid="test-icon">📄</span>;
const ActionIcon = () => <span data-testid="action-icon">➕</span>;

describe('EmptyState', () => {
  const mockAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders with required props only', () => {
      render(<EmptyState icon={<TestIcon />} title="No items found" />);

      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    test('renders as Paper component with proper styling', () => {
      render(<EmptyState icon={<TestIcon />} title="Empty state" />);

      const paper = screen.getByRole('generic'); // Paper renders as div
      expect(paper).toHaveClass('MuiPaper-root');
    });

    test('displays icon with proper size and color', () => {
      render(<EmptyState icon={<TestIcon />} title="Empty state" />);

      const iconContainer = screen.getByTestId('test-icon').parentElement;
      expect(iconContainer).toHaveStyle({
        fontSize: '64px',
        color: 'text.secondary',
        marginBottom: '16px',
      });
    });

    test('displays title as h6 variant', () => {
      render(<EmptyState icon={<TestIcon />} title="Test Title" />);

      const titleElement = screen.getByText('Test Title');
      expect(titleElement).toHaveClass('MuiTypography-h6');
    });
  });

  describe('Optional Content', () => {
    test('displays subtitle when provided', () => {
      render(
        <EmptyState
          icon={<TestIcon />}
          title="No items found"
          subtitle="Try creating a new item to get started"
        />
      );

      const subtitle = screen.getByText(
        'Try creating a new item to get started'
      );
      expect(subtitle).toBeInTheDocument();
      expect(subtitle).toHaveClass('MuiTypography-body2');
    });

    test('hides subtitle when not provided', () => {
      render(<EmptyState icon={<TestIcon />} title="No items found" />);

      // Should not render any subtitle text
      expect(screen.queryByText(/Try creating/)).not.toBeInTheDocument();
    });

    test('displays action button when provided', () => {
      render(
        <EmptyState
          icon={<TestIcon />}
          title="No items found"
          action={{
            label: 'Create Item',
            onClick: mockAction,
          }}
        />
      );

      const actionButton = screen.getByRole('button', { name: 'Create Item' });
      expect(actionButton).toBeInTheDocument();
      expect(actionButton).toHaveClass('MuiButton-containedPrimary');
    });

    test('hides action button when not provided', () => {
      render(<EmptyState icon={<TestIcon />} title="No items found" />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('displays action button with start icon', () => {
      render(
        <EmptyState
          icon={<TestIcon />}
          title="No items found"
          action={{
            label: 'Create Item',
            onClick: mockAction,
            startIcon: <ActionIcon />,
          }}
        />
      );

      expect(screen.getByTestId('action-icon')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Create Item' })
      ).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('calls action onClick when button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <EmptyState
          icon={<TestIcon />}
          title="No items found"
          action={{
            label: 'Create Item',
            onClick: mockAction,
          }}
        />
      );

      const actionButton = screen.getByRole('button', { name: 'Create Item' });
      await user.click(actionButton);

      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    test('handles multiple button clicks', async () => {
      const user = userEvent.setup();

      render(
        <EmptyState
          icon={<TestIcon />}
          title="No items found"
          action={{
            label: 'Create Item',
            onClick: mockAction,
          }}
        />
      );

      const actionButton = screen.getByRole('button', { name: 'Create Item' });
      await user.click(actionButton);
      await user.click(actionButton);
      await user.click(actionButton);

      expect(mockAction).toHaveBeenCalledTimes(3);
    });
  });

  describe('Complete Examples', () => {
    test('renders complete empty state with all props', () => {
      render(
        <EmptyState
          icon={<TestIcon />}
          title="No tournaments found"
          subtitle="Get started by creating your first tournament"
          action={{
            label: 'Create Tournament',
            onClick: mockAction,
            startIcon: <ActionIcon />,
          }}
        />
      );

      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.getByText('No tournaments found')).toBeInTheDocument();
      expect(
        screen.getByText('Get started by creating your first tournament')
      ).toBeInTheDocument();
      expect(screen.getByTestId('action-icon')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Create Tournament' })
      ).toBeInTheDocument();
    });

    test('renders minimal empty state', () => {
      render(<EmptyState icon={<TestIcon />} title="Empty" />);

      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.getByText('Empty')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Different Icon Types', () => {
    test('renders with text icon', () => {
      render(<EmptyState icon="📂" title="No files" />);

      expect(screen.getByText('📂')).toBeInTheDocument();
      expect(screen.getByText('No files')).toBeInTheDocument();
    });

    test('renders with JSX icon component', () => {
      const CustomIcon = () => <span data-testid="custom-icon">Custom</span>;

      render(<EmptyState icon={<CustomIcon />} title="Custom empty state" />);

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
      expect(screen.getByText('Custom empty state')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper text hierarchy', () => {
      render(
        <EmptyState
          icon={<TestIcon />}
          title="Main Title"
          subtitle="Secondary description text"
        />
      );

      const title = screen.getByRole('heading', { level: 6 });
      expect(title).toHaveTextContent('Main Title');

      const subtitle = screen.getByText('Secondary description text');
      expect(subtitle).not.toHaveRole('heading');
    });

    test('action button is properly focusable', async () => {
      const user = userEvent.setup();

      render(
        <EmptyState
          icon={<TestIcon />}
          title="No items"
          action={{
            label: 'Add Item',
            onClick: mockAction,
          }}
        />
      );

      const actionButton = screen.getByRole('button', { name: 'Add Item' });

      // Focus the button
      await user.tab();
      expect(actionButton).toHaveFocus();

      // Activate with keyboard
      await user.keyboard('{Enter}');
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    test('has appropriate ARIA roles', () => {
      render(
        <EmptyState
          icon={<TestIcon />}
          title="Empty State"
          subtitle="Description"
          action={{
            label: 'Action',
            onClick: mockAction,
          }}
        />
      );

      // Title should be a heading
      expect(screen.getByRole('heading', { level: 6 })).toBeInTheDocument();

      // Action should be a button
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles missing onClick gracefully', () => {
      // This shouldn't be possible with TypeScript, but test defensive coding
      render(
        <EmptyState
          icon={<TestIcon />}
          title="Test"
          action={{
            label: 'Action',
            onClick: undefined as unknown as () => void,
          }}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      // Button renders but won't be functional
    });
  });
});
