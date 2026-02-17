import { Box, Grid, styled } from '@mui/material';

export const ContainerBox = styled(Box)(({ theme }) => ({
  maxWidth: '100%',
  width: '100%',
  margin: '0 auto',
  padding: theme.spacing(2),
  [theme.breakpoints.up('md')]: {
    maxWidth: '1200px',
  },
  [theme.breakpoints.down('lg')]: {
    padding: theme.spacing(1),
  },
}));

export const SidebarGrid = styled(Grid)(({ theme }) => ({
  width: '100%',
  [theme.breakpoints.up('md')]: {
    width: '250px',
  },
  flexShrink: 0,
}));

export const ContentGrid = styled(Grid)(({ theme }) => ({
  width: '850px',
  minWidth: '850px',
  [theme.breakpoints.down('lg')]: {
    width: '700px',
    minWidth: '700px',
  },
  [theme.breakpoints.down('md')]: {
    width: '100%',
    minWidth: '650px',
  },
  [theme.breakpoints.down('sm')]: {
    width: '100%',
  },
  [theme.breakpoints.down('xs')]: {
    width: '100%',
  },
}));
