import { FormHelperText } from '@mui/material';
import { FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';

type CustomFormHelperTextProps = {
  errorMessage?: string | FieldError | Merge<FieldError, FieldErrorsImpl>;
};

const CustomFormHelperText = ({ errorMessage }: CustomFormHelperTextProps) => {
  const message =
    typeof errorMessage === 'string'
      ? errorMessage
      : (errorMessage as FieldError)?.message;

  return message ? <FormHelperText error>{message}</FormHelperText> : null;
};

export default CustomFormHelperText;
