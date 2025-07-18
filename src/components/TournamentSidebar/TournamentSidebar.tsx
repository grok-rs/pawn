import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Divider, InputBase, List, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { APP_ROUTES } from '../../constants/appRoutes';
import {
  isDraftTournament,
  isFinishedTournament,
  isOngoingTournament,
} from '../../utils';
import TournamentStatusButton from './TournamentStatusButton';
import { Tournament } from '@dto/bindings';

type TournamentStatus = 'NotStarted' | 'InProgress' | 'Finished';

type TournamentSidebarProps = {
  tournaments: Tournament[];
  onFilterChange: (filter: TournamentStatus) => void;
};

const TournamentSidebar = ({
  tournaments,
  onFilterChange,
}: TournamentSidebarProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleNewTournament = () => {
    navigate(APP_ROUTES.NEW_TOURNAMENT);
  };

  // Calculate the counts for each tournament status using utility functions
  const currentTournamentsCount =
    tournaments.filter(isOngoingTournament).length;
  const draftTournamentsCount = tournaments.filter(isDraftTournament).length;
  const finishedTournamentsCount =
    tournaments.filter(isFinishedTournament).length;

  return (
    <Paper elevation={3} sx={{ width: '100%', padding: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleNewTournament}
          sx={{
            width: '100%',
            backgroundColor: '#3A3D91',
            textTransform: 'none',
          }}
        >
          {t('newTournament')}
        </Button>
      </Box>
      <List disablePadding>
        <TournamentStatusButton
          label={t('currentTournaments')}
          count={currentTournamentsCount}
          onClick={() => onFilterChange('InProgress')}
        />
        <Divider />
        <TournamentStatusButton
          label={t('draftTournaments')}
          count={draftTournamentsCount}
          onClick={() => onFilterChange('NotStarted')}
        />
        <Divider />
        <TournamentStatusButton
          label={t('finishedTournaments')}
          count={finishedTournamentsCount}
          onClick={() => onFilterChange('Finished')}
        />
      </List>
      <Box sx={{ mt: 2 }}>
        <InputBase
          placeholder={t('search')}
          fullWidth
          sx={{
            padding: '4px 8px',
            border: '1px solid #ccc',
            borderRadius: 4,
          }}
        />
      </Box>
    </Paper>
  );
};

export default TournamentSidebar;
