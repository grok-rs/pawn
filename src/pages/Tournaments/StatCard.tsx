import React from 'react';
import { Card, CardContent, Box, Typography, useTheme } from '@mui/material';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export const StatCard = React.memo(
  ({ title, value, icon, color }: StatCardProps) => {
    const theme = useTheme();

    return (
      <Card
        sx={{
          transition: 'all 0.3s ease',
          height: '100%',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[4],
          },
        }}
      >
        <CardContent
          sx={{
            p: { mobile: 2, tablet: 3 },
            height: '100%',
            display: 'flex',
            flexDirection: { mobile: 'row', tablet: 'column' },
            alignItems: { mobile: 'center', tablet: 'flex-start' },
            gap: { mobile: 2, tablet: 1.5 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: { mobile: 40, tablet: 48 },
              height: { mobile: 40, tablet: 48 },
              borderRadius: 2,
              bgcolor: `${color}.light`,
              color: `${color}.main`,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: { mobile: '0.75rem', tablet: '0.875rem' },
                mb: 0.5,
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 'bold',
                fontSize: { mobile: '1.5rem', tablet: '2rem' },
              }}
            >
              {value}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }
);

StatCard.displayName = 'StatCard';
