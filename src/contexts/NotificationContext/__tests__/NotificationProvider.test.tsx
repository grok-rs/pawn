import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationProvider } from '../NotificationProvider';
import { useNotification } from '../../hooks/useNotification';
import { renderWithTheme } from '../../../test/utils/test-utils';

// Test component that uses the notification context
const TestComponent = () => {
  const { showNotification, showSuccess, showError, showWarning, showInfo } =
    useNotification();

  return (
    <div>
      <button onClick={() => showNotification('General notification')}>
        Show Notification
      </button>
      <button onClick={() => showSuccess('Success message')}>
        Show Success
      </button>
      <button onClick={() => showError('Error message')}>Show Error</button>
      <button onClick={() => showWarning('Warning message')}>
        Show Warning
      </button>
      <button onClick={() => showInfo('Info message')}>Show Info</button>
      <button onClick={() => showNotification('Custom severity', 'warning')}>
        Show Custom
      </button>
    </div>
  );
};

describe('NotificationProvider', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Provider Setup', () => {
    it('should provide notification context to children', () => {
      renderWithTheme(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      expect(screen.getByText('Show Notification')).toBeInTheDocument();
      expect(screen.getByText('Show Success')).toBeInTheDocument();
      expect(screen.getByText('Show Error')).toBeInTheDocument();
      expect(screen.getByText('Show Warning')).toBeInTheDocument();
      expect(screen.getByText('Show Info')).toBeInTheDocument();
    });

    it('should render children without errors', () => {
      renderWithTheme(
        <NotificationProvider>
          <div data-testid="test-child">Test content</div>
        </NotificationProvider>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });
  });

  describe('Notification Display', () => {
    it('should show general notification with default severity', async () => {
      renderWithTheme(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Notification'));

      expect(screen.getByText('General notification')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledInfo');
    });

    it('should show success notification', async () => {
      renderWithTheme(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Success'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledSuccess');
    });

    it('should show error notification', async () => {
      renderWithTheme(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Error'));

      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledError');
    });

    it('should show warning notification', async () => {
      renderWithTheme(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Warning'));

      expect(screen.getByText('Warning message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledWarning');
    });

    it('should show info notification', async () => {
      renderWithTheme(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Info'));

      expect(screen.getByText('Info message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledInfo');
    });

    it('should show notification with custom severity', async () => {
      renderWithTheme(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Custom'));

      expect(screen.getByText('Custom severity')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledWarning');
    });
  });

  describe('Notification Behavior', () => {
    it('should not show notification initially', () => {
      renderWithTheme(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should update notification when multiple notifications are triggered', async () => {
      renderWithTheme(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Success'));
      expect(screen.getByText('Success message')).toBeInTheDocument();

      await user.click(screen.getByText('Show Error'));
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });

    it('should close notification when close button is clicked', async () => {
      renderWithTheme(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Success'));
      expect(screen.getByText('Success message')).toBeInTheDocument();

      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      });
    });

    it('should auto-hide notification after 6 seconds', async () => {
      renderWithTheme(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Success'));
      expect(screen.getByText('Success message')).toBeInTheDocument();

      // Fast forward time by 6 seconds
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      });
    });

    it('should not close notification on clickaway', async () => {
      renderWithTheme(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Success'));
      expect(screen.getByText('Success message')).toBeInTheDocument();

      // Try to click away by clicking on the document body
      await user.click(document.body);

      // Notification should still be visible (clickaway should be ignored)
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
  });

  describe('Snackbar Configuration', () => {
    it('should position notification at bottom right', async () => {
      renderWithTheme(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Success'));

      const snackbar = screen.getByRole('presentation');
      expect(snackbar).toHaveClass('MuiSnackbar-anchorOriginBottomRight');
    });

    it('should use filled variant for alerts', async () => {
      renderWithTheme(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Success'));

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('MuiAlert-filled');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', async () => {
      const TestEmptyMessage = () => {
        const { showSuccess } = useNotification();
        return <button onClick={() => showSuccess('')}>Show Empty</button>;
      };

      renderWithTheme(
        <NotificationProvider>
          <TestEmptyMessage />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Empty'));

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('');
    });

    it('should handle long messages', async () => {
      const longMessage = 'A'.repeat(500);
      const TestLongMessage = () => {
        const { showSuccess } = useNotification();
        return (
          <button onClick={() => showSuccess(longMessage)}>Show Long</button>
        );
      };

      renderWithTheme(
        <NotificationProvider>
          <TestLongMessage />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Long'));

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle special characters in messages', async () => {
      const specialMessage =
        'Message with <script>alert("xss")</script> & special chars';
      const TestSpecialMessage = () => {
        const { showSuccess } = useNotification();
        return (
          <button onClick={() => showSuccess(specialMessage)}>
            Show Special
          </button>
        );
      };

      renderWithTheme(
        <NotificationProvider>
          <TestSpecialMessage />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Special'));

      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });

    it('should handle rapid successive notifications', async () => {
      renderWithTheme(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      // Trigger multiple notifications rapidly
      await user.click(screen.getByText('Show Success'));
      await user.click(screen.getByText('Show Error'));
      await user.click(screen.getByText('Show Warning'));
      await user.click(screen.getByText('Show Info'));

      // Should show the last notification
      expect(screen.getByText('Info message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledInfo');
    });
  });

  describe('Context Integration', () => {
    it('should maintain context state across re-renders', async () => {
      let rerender: any;

      const result = renderWithTheme(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );
      rerender = result.rerender;

      await user.click(screen.getByText('Show Success'));
      expect(screen.getByText('Success message')).toBeInTheDocument();

      // Re-render the provider
      rerender(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      // Notification should still be visible
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
  });
});
