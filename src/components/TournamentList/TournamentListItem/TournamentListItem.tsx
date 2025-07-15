import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tournament } from '../../../dto/bindings';
import {
  CalendarToday,
  LocationOn,
  People,
  Timer,
  EmojiEvents,
  MoreVert,
  Category,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  LinearProgress,
  useTheme,
  Menu,
  MenuItem,
} from '@mui/material';
import { useState, useEffect } from 'react';
import {
  isOngoingTournament,
  isDraftTournament,
  isFinishedTournament,
  isOngoingTournamentActual,
  isDraftTournamentActual,
  isFinishedTournamentActual,
  getTournamentProgressActual,
  calculateActualRoundsPlayed,
} from '../../../utils';
import { commands } from '../../../dto/bindings';
import type { Round } from '../../../dto/bindings';

type TournamentListItemProps = {
  tournament: Tournament;
  onDelete?: (id: number) => void;
};

const TournamentListItem = ({
  tournament,
  onDelete,
}: TournamentListItemProps) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [actualPlayerCount, setActualPlayerCount] = useState<number | null>(
    null
  );
  const [rounds, setRounds] = useState<Round[]>([]);

  useEffect(() => {
    const fetchActualData = async () => {
      try {
        // Fetch actual player count
        const players = await commands.getPlayersByTournamentEnhanced(
          tournament.id
        );
        setActualPlayerCount(players.length);

        // Fetch rounds for status calculation
        const roundsData = await commands.getRoundsByTournament(tournament.id);
        setRounds(roundsData);
      } catch (error) {
        console.error('Failed to fetch tournament data:', error);
        // Fallback to tournament.player_count if fetch fails
        setActualPlayerCount(tournament.player_count);
        setRounds([]);
      }
    };

    fetchActualData();
  }, [tournament.id, tournament.player_count]);

  const handleViewTournament = () => {
    navigate(`/tournament/${tournament.id}`);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const useActualData = rounds !== null;

  const getStatusChip = () => {
    if (useActualData) {
      if (isFinishedTournamentActual(tournament, rounds)) {
        return <Chip label={t('finished')} size="small" color="info" />;
      } else if (isOngoingTournamentActual(tournament, rounds)) {
        return <Chip label={t('ongoing')} size="small" color="success" />;
      } else if (isDraftTournamentActual(tournament, rounds)) {
        return <Chip label={t('notStarted')} size="small" color="warning" />;
      }
    } else {
      // Fallback to static data
      if (isFinishedTournament(tournament)) {
        return <Chip label={t('finished')} size="small" color="info" />;
      } else if (isOngoingTournament(tournament)) {
        return <Chip label={t('ongoing')} size="small" color="success" />;
      } else if (isDraftTournament(tournament)) {
        return <Chip label={t('notStarted')} size="small" color="warning" />;
      }
    }
    return null;
  };
  const progress = useActualData
    ? getTournamentProgressActual(tournament, rounds)
    : tournament.total_rounds > 0
      ? (tournament.rounds_played / tournament.total_rounds) * 100
      : 0;

  return (
    <Card
      sx={{
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[4],
        },
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={handleViewTournament}
    >
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <EmojiEvents sx={{ color: theme.palette.primary.main }} />
              <Typography variant="h6" fontWeight={600}>
                {tournament.name}
              </Typography>
              {getStatusChip()}
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 3,
                color: 'text.secondary',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarToday fontSize="small" />
                <Typography variant="body2">
                  {formatDate(tournament.date)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOn fontSize="small" />
                <Typography variant="body2">{tournament.location}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <People fontSize="small" />
                <Typography variant="body2">
                  {actualPlayerCount !== null ? (
                    actualPlayerCount !== tournament.player_count ? (
                      <>
                        {actualPlayerCount} / {tournament.player_count}{' '}
                        {t('players').toLowerCase()}
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 0.5 }}
                        >
                          ({t('actualPlayers').toLowerCase()})
                        </Typography>
                      </>
                    ) : (
                      `${actualPlayerCount} ${t('players').toLowerCase()}`
                    )
                  ) : (
                    `${tournament.player_count} ${t('players').toLowerCase()}`
                  )}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Timer fontSize="small" />
                <Typography variant="body2">
                  {tournament.time_type
                    ? t(`timeControls.${tournament.time_type}`)
                    : '-'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Category fontSize="small" />
                <Typography variant="body2">
                  {tournament.tournament_type || '-'}
                </Typography>
              </Box>
            </Box>
          </Box>
          <IconButton size="small" onClick={handleMenuClick} sx={{ ml: 1 }}>
            <MoreVert />
          </IconButton>
        </Box>

        {(useActualData
          ? isOngoingTournamentActual(tournament, rounds)
          : isOngoingTournament(tournament)) && (
          <Box sx={{ mt: 2 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                {t('progress') || 'Progress'}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {t('round')}{' '}
                {useActualData
                  ? calculateActualRoundsPlayed(rounds)
                  : tournament.rounds_played}{' '}
                / {tournament.total_rounds}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: theme.palette.grey[200],
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  backgroundColor: theme.palette.success.main,
                },
              }}
            />
          </Box>
        )}
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            handleMenuClose();
            handleViewTournament();
          }}
        >
          {t('viewDetails')}
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>{t('editTournament')}</MenuItem>
        <MenuItem onClick={handleMenuClose}>{t('exportData')}</MenuItem>
        <MenuItem
          onClick={event => {
            event.stopPropagation();
            handleMenuClose();
            onDelete?.(tournament.id);
          }}
          sx={{ color: 'error.main' }}
        >
          {t('deleteTournament')}
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default TournamentListItem;
