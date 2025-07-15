import {
  Card,
  CardContent,
  Box,
  Typography,
  Avatar,
  useTheme,
  Skeleton,
} from '@mui/material';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
  gradient?: boolean;
  loading?: boolean;
}

const StatCard = ({
  title,
  value,
  icon,
  color,
  gradient = false,
  loading = false,
}: StatCardProps) => {
  const theme = useTheme();
  const displayColor = color || theme.palette.primary.main;

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="rounded" height={100} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[4],
        },
        ...(gradient && {
          background: `linear-gradient(135deg, ${displayColor}20 0%, ${displayColor}10 100%)`,
          border: `1px solid ${displayColor}30`,
        }),
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: gradient ? displayColor : displayColor + '20',
              color: displayColor,
              width: 48,
              height: 48,
            }}
          >
            {icon}
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
