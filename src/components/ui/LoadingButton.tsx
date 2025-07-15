import { Button, ButtonProps, CircularProgress } from '@mui/material';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
}

const LoadingButton = ({
  loading = false,
  children,
  disabled,
  endIcon,
  ...props
}: LoadingButtonProps) => {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      endIcon={
        loading ? <CircularProgress size={20} color="inherit" /> : endIcon
      }
    >
      {children}
    </Button>
  );
};

export default LoadingButton;
