import { Box, Grid2, styled, Divider } from '@mui/material';

export const StyledGrid = styled(Grid2)(() => ({
  width: '100%',
}));

export const ButtonContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  [theme.breakpoints.down('tablet')]: {
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  [theme.breakpoints.up('tablet')]: {
    gap: theme.spacing(3),
  },
}));

export const StyledBox = styled(Box)(({ theme }) => ({
  borderRadius: '8px',
  borderTopRightRadius: 0,
  borderTopLeftRadius: 0,
  padding: theme.spacing(2),
  paddingTop: theme.spacing(0),
  boxShadow: theme.shadows[2],
  backgroundColor: theme.palette.common.white,
  width: '100%',
  clipPath: 'inset(0px -5px -5px -5px)',
  [theme.breakpoints.up('tablet')]: {
    padding: theme.spacing(3),
    paddingTop: theme.spacing(0),
  },
  [theme.breakpoints.up('laptop')]: {
    padding: theme.spacing(4),
    paddingTop: theme.spacing(0),
  },
}));

export const StyledDivider = styled(Divider)(({ theme }) => ({
  borderColor: theme.palette.grey[300],
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(1),
}));
