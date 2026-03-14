import { FormHelperText } from '@mui/material';
import type { FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';

type CustomFormHelperTextProps = {
  errorMessage?: string | FieldError | Merge<FieldError, FieldErrorsImpl>;
};

const CustomFormHelperText = ({ errorMessage }: CustomFormHelperTextProps) => {
  const message =
    typeof errorMessage === 'string'
      ? errorMessage
      : errorMessage &&
          typeof errorMessage === 'object' &&
          'message' in errorMessage
        ? errorMessage.message
        : undefined;

  // Ensure message is a valid React child (string) before rendering
  const displayMessage =
    typeof message === 'string' && message.trim() !== '' ? message : null;

  return displayMessage ? (
    <FormHelperText error>{displayMessage}</FormHelperText>
  ) : null;
};

export default CustomFormHelperText;
