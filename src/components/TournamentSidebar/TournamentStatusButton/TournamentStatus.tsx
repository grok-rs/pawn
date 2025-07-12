import { Box, Typography } from '@mui/material';

import { StatusButton } from './styled';

type TournamentStatusProps = {
  label: string;
  count: number;
  onClick: () => void;
};

const TournamentStatusButton = ({ label, count, onClick }: TournamentStatusProps) => (
  <StatusButton onClick={onClick} fullWidth>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
      <Typography variant="body1">{label}</Typography>
      <Typography variant="body2">{count}</Typography>
    </Box>
  </StatusButton>
);

export default TournamentStatusButton;
