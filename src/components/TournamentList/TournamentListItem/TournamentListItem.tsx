import { useNavigate } from 'react-router-dom';
import { Tournament } from '../../../dto/bindings';
import EventIcon from '@mui/icons-material/Event';
import FlagIcon from '@mui/icons-material/Flag';
import GroupIcon from '@mui/icons-material/Group';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TimerIcon from '@mui/icons-material/Timer';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Box, Tooltip, Typography, IconButton } from '@mui/material';

import { DetailsBox, InfoBox, LocationBox, StyledPaper } from './styled';

type TournamentListItemProps = {
  tournament: Tournament;
};

const TournamentListItem = ({ tournament }: TournamentListItemProps) => {
  const navigate = useNavigate();

  const handleViewTournament = () => {
    navigate(`/tournament/${tournament.id}`);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <StyledPaper
      sx={{
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
      }}
      onClick={handleViewTournament}
    >
      <InfoBox>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="h6" gutterBottom>
            {tournament.name}
          </Typography>
          <IconButton
            size="small"
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              handleViewTournament();
            }}
          >
            <VisibilityIcon />
          </IconButton>
        </Box>
        <DetailsBox>
          <EventIcon fontSize="small" />
          <Typography variant="body2">{formatDate(tournament.date)}</Typography>
          <GroupIcon fontSize="small" />
          <Typography variant="body2">{tournament.player_count} players</Typography>
          <TimerIcon fontSize="small" />
          <Typography variant="body2">{tournament.time_type}</Typography>
          <PlayArrowIcon fontSize="small" />
          <Typography variant="body2">
            {tournament.rounds_played}/{tournament.total_rounds} rounds
          </Typography>
        </DetailsBox>
      </InfoBox>
      <LocationBox>
        <Tooltip title={tournament.location}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FlagIcon sx={{ color: '#0057B7' }} />
            <Typography variant="body2" sx={{ marginLeft: 0.5 }}>
              {tournament.location}
            </Typography>
          </Box>
        </Tooltip>
      </LocationBox>
    </StyledPaper>
  );
};

export default TournamentListItem;
