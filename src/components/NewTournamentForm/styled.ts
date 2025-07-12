import { Box, Grid2, styled, Typography } from '@mui/material';

export const FormContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: '1200px',
}));

export const StyledGrid = styled(Grid2)(() => ({
  width: '100%',
}));

export const ButtonContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
}));

export const HeaderTypography = styled(Typography)(() => ({
  color: 'black',
}));

import { Divider } from '@mui/material';

export const StyledBox = styled(Box)(({ theme }) => ({
  borderRadius: '8px',
  borderTopRightRadius: 0,
  borderTopLeftRadius: 0,
  padding: theme.spacing(3),
  paddingTop: theme.spacing(0),
  boxShadow: theme.shadows[2],
  backgroundColor: theme.palette.common.white,
  width: '100%',
  clipPath: 'inset(0px -5px -5px -5px)',
}));

export const StyledDivider = styled(Divider)(({ theme }) => ({
  borderColor: theme.palette.grey[300],
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(1),
}));


