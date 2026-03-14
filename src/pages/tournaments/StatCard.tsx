import { Box, Card, CardContent, Typography } from '@mui/material';
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export const StatCard = React.memo(
  ({ title, value, icon, color }: StatCardProps) => {
    return (
      <Card
        sx={{
          transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
          height: '100%',
          '&:hover': {
            boxShadow: '0px 4px 20px rgba(0,0,0,0.08)',
            borderColor: 'rgba(0,0,0,0.1)',
          },
        }}
      >
        <CardContent
          sx={{
            p: { xs: 2, sm: 3 },
            height: '100%',
            display: 'flex',
            flexDirection: { xs: 'row', sm: 'column' },
            alignItems: { xs: 'center', sm: 'flex-start' },
            gap: { xs: 2, sm: 1.5 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: { xs: 40, sm: 48 },
              height: { xs: 40, sm: 48 },
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
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                mb: 0.5,
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 'bold',
                fontSize: { xs: '1.5rem', sm: '2rem' },
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
