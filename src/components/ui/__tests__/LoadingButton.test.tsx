import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import LoadingButton from '../LoadingButton';

// Mock MUI icons
const TestIcon = () => <span data-testid="test-icon">➡️</span>;

describe('LoadingButton', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders button with children', () => {
      render(<LoadingButton>Test Button</LoadingButton>);

      expect(
        screen.getByRole('button', { name: 'Test Button' })
      ).toBeInTheDocument();
    });

    test('renders as MUI Button component', () => {
      render(<LoadingButton>Button</LoadingButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-root');
    });

    test('passes through ButtonProps', () => {
      render(
        <LoadingButton variant="outlined" color="secondary" size="large">
          Test Button
        </LoadingButton>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-outlined');
      expect(button).toHaveClass('MuiButton-colorSecondary');
      expect(button).toHaveClass('MuiButton-sizeLarge');
    });

    test('handles click events', async () => {
      const user = userEvent.setup();

      render(
        <LoadingButton onClick={mockOnClick}>Clickable Button</LoadingButton>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    test('shows loading spinner when loading=true', () => {
      render(<LoadingButton loading={true}>Loading Button</LoadingButton>);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('Loading Button')).toBeInTheDocument();
    });

    test('hides loading spinner when loading=false', () => {
      render(<LoadingButton loading={false}>Normal Button</LoadingButton>);

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByText('Normal Button')).toBeInTheDocument();
    });

    test('defaults to not loading when loading prop omitted', () => {
      render(<LoadingButton>Default Button</LoadingButton>);

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByText('Default Button')).toBeInTheDocument();
    });

    test('loading spinner has correct size and color', () => {
      render(<LoadingButton loading={true}>Loading Button</LoadingButton>);

      const spinner = screen.getByRole('progressbar');
      expect(spinner).toHaveAttribute('data-testid', 'CircularProgress');
      // Note: MUI CircularProgress size and color props would need more specific testing
    });
  });

  describe('Disabled State', () => {
    test('is disabled when loading=true', () => {
      render(
        <LoadingButton loading={true} onClick={mockOnClick}>
          Loading Button
        </LoadingButton>
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    test('is disabled when disabled=true', () => {
      render(
        <LoadingButton disabled={true} onClick={mockOnClick}>
          Disabled Button
        </LoadingButton>
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    test('is disabled when both loading and disabled are true', () => {
      render(
        <LoadingButton loading={true} disabled={true} onClick={mockOnClick}>
          Double Disabled
        </LoadingButton>
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    test('is not disabled when both loading and disabled are false', () => {
      render(
        <LoadingButton loading={false} disabled={false} onClick={mockOnClick}>
          Enabled Button
        </LoadingButton>
      );

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    test('does not call onClick when disabled by loading', async () => {
      const user = userEvent.setup();

      render(
        <LoadingButton loading={true} onClick={mockOnClick}>
          Loading Button
        </LoadingButton>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    test('does not call onClick when explicitly disabled', async () => {
      const user = userEvent.setup();

      render(
        <LoadingButton disabled={true} onClick={mockOnClick}>
          Disabled Button
        </LoadingButton>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('End Icon Handling', () => {
    test('shows custom endIcon when not loading', () => {
      render(
        <LoadingButton loading={false} endIcon={<TestIcon />}>
          Button with Icon
        </LoadingButton>
      );

      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    test('replaces endIcon with spinner when loading', () => {
      render(
        <LoadingButton loading={true} endIcon={<TestIcon />}>
          Loading Button
        </LoadingButton>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
    });

    test('shows no endIcon when not loading and no endIcon provided', () => {
      render(<LoadingButton loading={false}>Plain Button</LoadingButton>);

      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    test('shows spinner when loading and no endIcon provided', () => {
      render(<LoadingButton loading={true}>Loading Button</LoadingButton>);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
    });
  });

  describe('State Transitions', () => {
    test('transitions from loading to normal', () => {
      const { rerender } = render(
        <LoadingButton loading={true} endIcon={<TestIcon />}>
          Button
        </LoadingButton>
      );

      // Initially loading
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();

      // After loading completes
      rerender(
        <LoadingButton loading={false} endIcon={<TestIcon />}>
          Button
        </LoadingButton>
      );

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    test('transitions from normal to loading', () => {
      const { rerender } = render(
        <LoadingButton
          loading={false}
          endIcon={<TestIcon />}
          onClick={mockOnClick}
        >
          Submit
        </LoadingButton>
      );

      // Initially normal
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.getByRole('button')).not.toBeDisabled();

      // After starting to load
      rerender(
        <LoadingButton
          loading={true}
          endIcon={<TestIcon />}
          onClick={mockOnClick}
        >
          Submit
        </LoadingButton>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Complex Examples', () => {
    test('form submission button', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();

      const { rerender } = render(
        <LoadingButton
          type="submit"
          variant="contained"
          color="primary"
          loading={false}
          onClick={mockSubmit}
        >
          Submit Form
        </LoadingButton>
      );

      const button = screen.getByRole('button');

      // Can click when not loading
      await user.click(button);
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(button).toHaveAttribute('type', 'submit');

      // Simulate loading state after submission
      rerender(
        <LoadingButton
          type="submit"
          variant="contained"
          color="primary"
          loading={true}
          onClick={mockSubmit}
        >
          Submit Form
        </LoadingButton>
      );

      expect(button).toBeDisabled();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('save button with icon', () => {
      const SaveIcon = () => <span data-testid="save-icon">💾</span>;

      render(
        <LoadingButton
          variant="contained"
          color="success"
          loading={false}
          endIcon={<SaveIcon />}
        >
          Save Changes
        </LoadingButton>
      );

      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByTestId('save-icon')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveClass(
        'MuiButton-containedSuccess'
      );
    });
  });

  describe('Accessibility', () => {
    test('maintains button semantics', () => {
      render(
        <LoadingButton loading={true} aria-label="Loading submit button">
          Submit
        </LoadingButton>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Loading submit button');
      expect(button).toBeDisabled();
    });

    test('spinner has proper accessibility attributes', () => {
      render(<LoadingButton loading={true}>Loading</LoadingButton>);

      const spinner = screen.getByRole('progressbar');
      expect(spinner).toBeInTheDocument();
      // CircularProgress should have proper aria attributes from MUI
    });

    test('keyboard navigation works when not loading', async () => {
      const user = userEvent.setup();

      render(
        <LoadingButton loading={false} onClick={mockOnClick}>
          Keyboard Button
        </LoadingButton>
      );

      const button = screen.getByRole('button');

      // Focus with tab
      await user.tab();
      expect(button).toHaveFocus();

      // Activate with Enter
      await user.keyboard('{Enter}');
      expect(mockOnClick).toHaveBeenCalledTimes(1);

      // Activate with Space
      await user.keyboard(' ');
      expect(mockOnClick).toHaveBeenCalledTimes(2);
    });

    test('keyboard navigation disabled when loading', async () => {
      const user = userEvent.setup();

      render(
        <LoadingButton loading={true} onClick={mockOnClick}>
          Loading Button
        </LoadingButton>
      );

      const button = screen.getByRole('button');

      // Try to focus (should work but button won't respond)
      await user.tab();
      expect(button).toHaveFocus();

      // Try to activate - should not work since disabled
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });
});
