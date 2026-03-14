import type { Round } from '@dto/bindings';
import { commands, type Tournament } from '@dto/bindings';
import {
  CalendarToday,
  Category,
  EmojiEvents,
  LocationOn,
  MoreVert,
  People,
  Timer,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Typography,
  useTheme,
} from '@mui/material';
import {
  calculateActualRoundsPlayed,
  formatLocalizedDate,
  getTournamentProgressActual,
  isDraftTournament,
  isDraftTournamentActual,
  isFinishedTournament,
  isFinishedTournamentActual,
  isOngoingTournament,
  isOngoingTournamentActual,
  translateTournamentType,
} from '@shared/lib/tournamentUtils';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

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
  const { t, i18n } = useTranslation();
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
      } catch (_error) {
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

  const formatDate = (dateString: string) =>
    formatLocalizedDate(dateString, i18n.language);

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
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
        '&:hover': {
          boxShadow: '0px 4px 20px rgba(0,0,0,0.08)',
          borderColor: 'rgba(0,0,0,0.1)',
        },
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={handleViewTournament}
    >
      <CardContent
        sx={{
          p: { xs: 2, sm: 3 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: { xs: 2, sm: 2.5 },
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 1.5 },
                mb: { xs: 1, sm: 1.5 },
                flexWrap: 'wrap',
              }}
            >
              <EmojiEvents
                sx={{
                  color: theme.palette.primary.main,
                  fontSize: { xs: '1.25rem', sm: '1.5rem' },
                }}
              />
              <Typography
                variant="h6"
                fontWeight={600}
                sx={{
                  fontSize: { xs: '1.125rem', sm: '1.25rem' },
                  lineHeight: 1.2,
                }}
              >
                {tournament.name}
              </Typography>
              {getStatusChip()}
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: '1fr 1fr',
                  md: 'repeat(auto-fit, minmax(200px, 1fr))',
                },
                gap: { xs: 1.5, sm: 2 },
                color: 'text.secondary',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  py: 0.5,
                }}
              >
                <CalendarToday
                  sx={{
                    fontSize: { xs: '1rem', sm: '1.125rem' },
                    color: 'text.secondary',
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    fontWeight: 500,
                  }}
                >
                  {formatDate(tournament.date)}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  py: 0.5,
                }}
              >
                <LocationOn
                  sx={{
                    fontSize: { xs: '1rem', sm: '1.125rem' },
                    color: 'text.secondary',
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    fontWeight: 500,
                  }}
                >
                  {tournament.location}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  py: 0.5,
                }}
              >
                <People
                  sx={{
                    fontSize: { xs: '1rem', sm: '1.125rem' },
                    color: 'text.secondary',
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    fontWeight: 500,
                  }}
                >
                  {actualPlayerCount !== null ? (
                    actualPlayerCount !== tournament.player_count ? (
                      <>
                        {actualPlayerCount} / {tournament.player_count}{' '}
                        {t('players').toLowerCase()}
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            ml: 0.5,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          }}
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
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  py: 0.5,
                }}
              >
                <Timer
                  sx={{
                    fontSize: { xs: '1rem', sm: '1.125rem' },
                    color: 'text.secondary',
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    fontWeight: 500,
                  }}
                >
                  {tournament.time_type
                    ? t(`timeControls.${tournament.time_type}`)
                    : '-'}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  py: 0.5,
                }}
              >
                <Category
                  sx={{
                    fontSize: { xs: '1rem', sm: '1.125rem' },
                    color: 'text.secondary',
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    fontWeight: 500,
                  }}
                >
                  {translateTournamentType(tournament.tournament_type, t)}
                </Typography>
              </Box>
            </Box>
          </Box>
          <IconButton
            onClick={handleMenuClick}
            sx={{
              ml: { xs: 1, sm: 2 },
              minHeight: '44px',
              minWidth: '44px',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <MoreVert sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
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
