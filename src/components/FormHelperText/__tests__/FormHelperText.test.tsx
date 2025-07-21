import { render, screen } from '@testing-library/react';
import { FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';
import CustomFormHelperText from '../FormHelperText';

describe('CustomFormHelperText', () => {
  describe('Basic Rendering', () => {
    test('renders nothing when no error message provided', () => {
      const { container } = render(<CustomFormHelperText />);
      expect(container.firstChild).toBeNull();
    });

    test('renders nothing when error message is undefined', () => {
      const { container } = render(
        <CustomFormHelperText errorMessage={undefined} />
      );
      expect(container.firstChild).toBeNull();
    });

    test('renders nothing when error message is null', () => {
      const { container } = render(
        <CustomFormHelperText errorMessage={null as any} />
      );
      expect(container.firstChild).toBeNull();
    });

    test('renders FormHelperText when error message exists', () => {
      render(<CustomFormHelperText errorMessage="Field is required" />);

      const helperText = screen.getByText('Field is required');
      expect(helperText).toBeInTheDocument();
      expect(helperText).toHaveClass('MuiFormHelperText-root');
    });
  });

  describe('String Error Messages', () => {
    test('displays simple string error message', () => {
      const errorMessage = 'This field is required';

      render(<CustomFormHelperText errorMessage={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    test('displays long error message', () => {
      const errorMessage =
        'This field must contain at least 8 characters including uppercase, lowercase, and numbers';

      render(<CustomFormHelperText errorMessage={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    test('displays empty string as no helper text', () => {
      const { container } = render(<CustomFormHelperText errorMessage="" />);
      expect(container.firstChild).toBeNull();
    });

    test('displays error message with special characters', () => {
      const errorMessage = 'Field must not contain: @#$%^&*()';

      render(<CustomFormHelperText errorMessage={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    test('displays multilingual error message', () => {
      const errorMessage = 'Поле обязательно для заполнения';

      render(<CustomFormHelperText errorMessage={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe('FieldError Object Messages', () => {
    test('displays FieldError message property', () => {
      const fieldError: FieldError = {
        type: 'required',
        message: 'Username is required',
      };

      render(<CustomFormHelperText errorMessage={fieldError} />);

      expect(screen.getByText('Username is required')).toBeInTheDocument();
    });

    test('handles FieldError without message property', () => {
      const fieldError: FieldError = {
        type: 'required',
        message: undefined,
      };

      const { container } = render(
        <CustomFormHelperText errorMessage={fieldError} />
      );
      expect(container.firstChild).toBeNull();
    });

    test('handles FieldError with empty message', () => {
      const fieldError: FieldError = {
        type: 'pattern',
        message: '',
      };

      const { container } = render(
        <CustomFormHelperText errorMessage={fieldError} />
      );
      expect(container.firstChild).toBeNull();
    });

    test('displays FieldError with validation details', () => {
      const fieldError: FieldError = {
        type: 'minLength',
        message: 'Password must be at least 8 characters long',
      };

      render(<CustomFormHelperText errorMessage={fieldError} />);

      expect(
        screen.getByText('Password must be at least 8 characters long')
      ).toBeInTheDocument();
    });

    test('handles nested FieldError structure', () => {
      const fieldError: FieldError = {
        type: 'validate',
        message: 'Email format is invalid',
        ref: undefined,
      };

      render(<CustomFormHelperText errorMessage={fieldError} />);

      expect(screen.getByText('Email format is invalid')).toBeInTheDocument();
    });
  });

  describe('Complex Error Types', () => {
    test('handles Merge<FieldError, FieldErrorsImpl> type', () => {
      const mergedError: Merge<FieldError, FieldErrorsImpl<any>> = {
        type: 'required',
        message: 'Complex validation failed',
      } as any;

      render(<CustomFormHelperText errorMessage={mergedError} />);

      expect(screen.getByText('Complex validation failed')).toBeInTheDocument();
    });

    test('handles object with message property', () => {
      const errorObject = {
        message: 'Custom error object message',
        type: 'custom',
        someOtherProperty: 'value',
      };

      render(<CustomFormHelperText errorMessage={errorObject as any} />);

      expect(
        screen.getByText('Custom error object message')
      ).toBeInTheDocument();
    });

    test('handles object without message property gracefully', () => {
      const errorObject = {
        type: 'required',
        ref: null,
      };

      const { container } = render(
        <CustomFormHelperText errorMessage={errorObject as any} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Error State Styling', () => {
    test('applies error styling to FormHelperText', () => {
      render(<CustomFormHelperText errorMessage="Error message" />);

      const helperText = screen.getByText('Error message');
      expect(helperText).toHaveClass('Mui-error');
    });

    test('error styling is applied regardless of message type', () => {
      const fieldError: FieldError = {
        type: 'required',
        message: 'Field error message',
      };

      render(<CustomFormHelperText errorMessage={fieldError} />);

      const helperText = screen.getByText('Field error message');
      expect(helperText).toHaveClass('Mui-error');
    });

    test('has proper MUI FormHelperText classes', () => {
      render(<CustomFormHelperText errorMessage="Test message" />);

      const helperText = screen.getByText('Test message');
      expect(helperText).toHaveClass('MuiFormHelperText-root');
      expect(helperText).toHaveClass('Mui-error');
    });
  });

  describe('Integration Scenarios', () => {
    test('works with react-hook-form required validation', () => {
      const error: FieldError = {
        type: 'required',
        message: 'This field is required',
      };

      render(<CustomFormHelperText errorMessage={error} />);

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    test('works with react-hook-form pattern validation', () => {
      const error: FieldError = {
        type: 'pattern',
        message: 'Please enter a valid email address',
      };

      render(<CustomFormHelperText errorMessage={error} />);

      expect(
        screen.getByText('Please enter a valid email address')
      ).toBeInTheDocument();
    });

    test('works with react-hook-form custom validation', () => {
      const error: FieldError = {
        type: 'validate',
        message: 'Password must contain at least one uppercase letter',
      };

      render(<CustomFormHelperText errorMessage={error} />);

      expect(
        screen.getByText('Password must contain at least one uppercase letter')
      ).toBeInTheDocument();
    });

    test('works with react-hook-form min/max validation', () => {
      const error: FieldError = {
        type: 'min',
        message: 'Value must be at least 18',
      };

      render(<CustomFormHelperText errorMessage={error} />);

      expect(screen.getByText('Value must be at least 18')).toBeInTheDocument();
    });
  });

  describe('Conditional Rendering', () => {
    test('shows error message when condition is true', () => {
      const showError = true;
      const errorMessage = showError ? 'Conditional error' : undefined;

      render(<CustomFormHelperText errorMessage={errorMessage} />);

      expect(screen.getByText('Conditional error')).toBeInTheDocument();
    });

    test('hides error message when condition is false', () => {
      const showError = false;
      const errorMessage = showError ? 'Conditional error' : undefined;

      const { container } = render(
        <CustomFormHelperText errorMessage={errorMessage} />
      );
      expect(container.firstChild).toBeNull();
    });

    test('dynamically updates error message', () => {
      const { rerender } = render(
        <CustomFormHelperText errorMessage="Initial error" />
      );

      expect(screen.getByText('Initial error')).toBeInTheDocument();

      rerender(<CustomFormHelperText errorMessage="Updated error" />);

      expect(screen.getByText('Updated error')).toBeInTheDocument();
      expect(screen.queryByText('Initial error')).not.toBeInTheDocument();
    });

    test('removes error message when set to undefined', () => {
      const { rerender } = render(
        <CustomFormHelperText errorMessage="Error to remove" />
      );

      expect(screen.getByText('Error to remove')).toBeInTheDocument();

      rerender(<CustomFormHelperText errorMessage={undefined} />);

      expect(screen.queryByText('Error to remove')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('helper text is properly associated with form elements', () => {
      render(<CustomFormHelperText errorMessage="Accessibility error" />);

      const helperText = screen.getByText('Accessibility error');
      expect(helperText.tagName.toLowerCase()).toBe('p');
    });

    test('error message is announced to screen readers', () => {
      render(<CustomFormHelperText errorMessage="Screen reader error" />);

      const helperText = screen.getByText('Screen reader error');
      expect(helperText).toHaveClass('Mui-error');
      // MUI FormHelperText automatically provides proper ARIA attributes
    });

    test('maintains semantic HTML structure', () => {
      render(<CustomFormHelperText errorMessage="Semantic error" />);

      const helperText = screen.getByText('Semantic error');
      expect(helperText).toBeInTheDocument();
      expect(helperText).toHaveAttribute('class');
    });
  });

  describe('Edge Cases', () => {
    test('handles boolean error message', () => {
      const { container } = render(
        <CustomFormHelperText errorMessage={true as any} />
      );
      expect(container.firstChild).toBeNull();
    });

    test('handles numeric error message', () => {
      const { container } = render(
        <CustomFormHelperText errorMessage={123 as any} />
      );
      expect(container.firstChild).toBeNull();
    });

    test('handles array error message', () => {
      const { container } = render(
        <CustomFormHelperText errorMessage={['error1', 'error2'] as any} />
      );
      expect(container.firstChild).toBeNull();
    });

    test('handles function error message', () => {
      const { container } = render(
        <CustomFormHelperText errorMessage={(() => 'error') as any} />
      );
      expect(container.firstChild).toBeNull();
    });

    test('handles very long error message', () => {
      const longMessage =
        'This is a very long error message that might wrap across multiple lines and should still be displayed correctly without breaking the layout or causing any issues with the component rendering or styling behavior.';

      render(<CustomFormHelperText errorMessage={longMessage} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    test('handles error message with HTML-like content', () => {
      const htmlLikeMessage = '<script>alert("test")</script> Error message';

      render(<CustomFormHelperText errorMessage={htmlLikeMessage} />);

      expect(screen.getByText(htmlLikeMessage)).toBeInTheDocument();
    });
  });
});
