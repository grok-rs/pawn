import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

export const StyledBox = styled(Box)(({ theme }) => ({
  borderRadius: '8px',
  boxShadow: theme.shadows[2],
  backgroundColor: theme.palette.common.white,
  width: '100%',
  padding: theme.spacing(3),
  paddingBottom: theme.spacing(0),
  borderBottomRightRadius: 0,
  borderBottomLeftRadius: 0,
  marginBottom: '-1px',
  clipPath: 'inset(-5px -5px 0px -5px)',
}));
