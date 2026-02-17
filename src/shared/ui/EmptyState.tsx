import { Box, Typography, Button, Paper } from '@mui/material';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
    startIcon?: ReactNode;
  };
}

const EmptyState = ({ icon, title, subtitle, action }: EmptyStateProps) => {
  return (
    <Paper
      sx={{
        p: 8,
        textAlign: 'center',
        backgroundColor: 'background.paper',
      }}
    >
      <Box sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}>{icon}</Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {subtitle}
        </Typography>
      )}
      {action && (
        <Button
          variant="contained"
          startIcon={action.startIcon}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </Paper>
  );
};

export default EmptyState;
