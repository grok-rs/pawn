import { Box, Grid2, styled } from '@mui/material';

export const ContainerBox = styled(Box)(({ theme }) => ({
  maxWidth: '100%',
  width: '100%',
  margin: '0 auto',
  padding: theme.spacing(2),
  [theme.breakpoints.up('laptop')]: {
    maxWidth: '1200px',
  },
  [theme.breakpoints.down('desktop')]: {
    padding: theme.spacing(1),
  },
}));

export const SidebarGrid = styled(Grid2)(({ theme }) => ({
  width: '100%',
  [theme.breakpoints.up('laptop')]: {
    width: '250px',
  },
  flexShrink: 0,
}));

export const ContentGrid = styled(Grid2)(({ theme }) => ({
  width: '850px',
  minWidth: '850px',
  [theme.breakpoints.down('desktop')]: {
    width: '700px',
    minWidth: '700px',
  },
  [theme.breakpoints.down('laptop')]: {
    width: '100%',
    minWidth: '650px',
  },
  [theme.breakpoints.down('tablet')]: {
    width: '100%',
  },
  [theme.breakpoints.down('mobile')]: {
    width: '100%',
  },
}));
