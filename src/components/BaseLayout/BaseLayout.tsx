import { Box, useTheme, useMediaQuery } from '@mui/material';
import { ReactNode, useState, useEffect } from 'react';
import Sidebar from '../Sidebar';

type BaseLayoutProps = {
  children: ReactNode;
};

const BaseLayout = ({ children }: BaseLayoutProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('tablet'));
  const isTablet = useMediaQuery(theme.breakpoints.between('tablet', 'laptop'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Handle orientation changes and responsive behavior
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else if (!isMobile && !isTablet) {
      setSidebarOpen(true);
    }
  }, [isMobile, isTablet]);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
      }}
    >
      <Sidebar open={sidebarOpen} onToggle={handleSidebarToggle} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { mobile: 2, tablet: 3 },
          ml: sidebarOpen && !isMobile ? '280px' : !isMobile ? '72px' : 0,
          transition: theme.transitions.create(['margin', 'padding'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          width: '100%',
          minHeight: '100vh',
          // Better container max-width for large tablets
          maxWidth: { tablet: '100%', laptop: '100%' },
          mx: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default BaseLayout;
