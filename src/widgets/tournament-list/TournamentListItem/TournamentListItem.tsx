import type { Round } from '@dto/bindings';
import { commands, type Tournament } from '@dto/bindings';
import {
  CalendarToday,
  Category,
  EmojiEvents,
  FiberManualRecord,
  LocationOn,
  MoreVert,
  People,
  Timer,
} from '@mui/icons-material';
import {
  Box,
  Button,
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
  variant?: 'featured' | 'compact';
};

const TournamentListItem = ({
  tournament,
  onDelete,
  variant = 'featured',
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
        const players = await commands.getPlayersByTournamentEnhanced(
          tournament.id
        );
        setActualPlayerCount(players.length);

        const roundsData = await commands.getRoundsByTournament(tournament.id);
        setRounds(roundsData);
      } catch (_error) {
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

  const isOngoing = useActualData
    ? isOngoingTournamentActual(tournament, rounds)
    : isOngoingTournament(tournament);

  const actualRoundsPlayed = useActualData
    ? calculateActualRoundsPlayed(rounds)
    : tournament.rounds_played;

  const progress = useActualData
    ? getTournamentProgressActual(tournament, rounds)
    : tournament.total_rounds > 0
      ? (tournament.rounds_played / tournament.total_rounds) * 100
      : 0;

  const getStatusChip = () => {
    if (useActualData) {
      if (isFinishedTournamentActual(tournament, rounds)) {
        return <Chip label={t('finished')} size="small" color="info" />;
      }
      if (isOngoingTournamentActual(tournament, rounds)) {
        return (
          <Chip
            label={`${t('round')} ${actualRoundsPlayed}`}
            size="small"
            color="success"
          />
        );
      }
      if (isDraftTournamentActual(tournament, rounds)) {
        return <Chip label={t('notStarted')} size="small" color="warning" />;
      }
    } else {
      if (isFinishedTournament(tournament)) {
        return <Chip label={t('finished')} size="small" color="info" />;
      }
      if (isOngoingTournament(tournament)) {
        return (
          <Chip
            label={`${t('round')} ${tournament.rounds_played}`}
            size="small"
            color="success"
          />
        );
      }
      if (isDraftTournament(tournament)) {
        return <Chip label={t('notStarted')} size="small" color="warning" />;
      }
    }
    return null;
  };

  const playerDisplay =
    actualPlayerCount !== null ? actualPlayerCount : tournament.player_count;

  const statusColor = isOngoing
    ? theme.palette.success.main
    : useActualData
      ? isDraftTournamentActual(tournament, rounds)
        ? theme.palette.warning.main
        : theme.palette.info.main
      : isDraftTournament(tournament)
        ? theme.palette.warning.main
        : theme.palette.info.main;

  if (variant === 'compact') {
    return (
      <>
        <Card
          sx={{
            cursor: 'pointer',
            transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
            '&:hover': {
              boxShadow: '0px 4px 20px rgba(0,0,0,0.08)',
              borderColor: 'rgba(0,0,0,0.1)',
              '& .compact-actions': {
                opacity: 1,
              },
            },
            borderLeft: `4px solid ${statusColor}`,
          }}
          onClick={handleViewTournament}
        >
          <CardContent
            sx={{
              p: { xs: 1.5, sm: 2 },
              '&:last-child': { pb: { xs: 1.5, sm: 2 } },
            }}
          >
            {/* Row 1: Name + Status + Actions */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Typography
                variant="body1"
                fontWeight={600}
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {tournament.name}
              </Typography>

              <Box sx={{ justifySelf: 'end' }}>{getStatusChip()}</Box>

              <Box
                className="compact-actions"
                sx={{
                  opacity: { xs: 1, sm: 0 },
                  transition: 'opacity 0.15s ease',
                }}
              >
                <IconButton
                  onClick={handleMenuClick}
                  size="small"
                  sx={{ minHeight: '36px', minWidth: '36px' }}
                >
                  <MoreVert fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Row 2: Metadata */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                mt: 0.5,
                color: 'text.secondary',
                flexWrap: 'wrap',
              }}
            >
              <Typography
                variant="caption"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <CalendarToday sx={{ fontSize: '0.8rem' }} />
                {formatDate(tournament.date)}
              </Typography>
              {tournament.location && (
                <Typography
                  variant="caption"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <LocationOn sx={{ fontSize: '0.8rem' }} />
                  {tournament.location}
                </Typography>
              )}
              <Typography
                variant="caption"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <People sx={{ fontSize: '0.8rem' }} />
                {playerDisplay}
              </Typography>
              {tournament.tournament_type && (
                <Typography
                  variant="caption"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <Category sx={{ fontSize: '0.8rem' }} />
                  {translateTournamentType(tournament.tournament_type, t)}
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>

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
      </>
    );
  }

  // Featured variant (for ongoing tournaments)
  return (
    <>
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
          borderLeft: isOngoing
            ? `4px solid ${theme.palette.success.main}`
            : undefined,
        }}
        onClick={handleViewTournament}
      >
        <CardContent
          sx={{
            p: { xs: 2, sm: 3 },
          }}
        >
          {/* Header: Name row + Status + Menu */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              alignItems: 'center',
              gap: 1,
              mb: { xs: 1.5, sm: 2 },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 1.5 },
                minWidth: 0,
              }}
            >
              {isOngoing ? (
                <FiberManualRecord
                  sx={{
                    color: theme.palette.success.main,
                    fontSize: '0.75rem',
                    flexShrink: 0,
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.4 },
                    },
                  }}
                />
              ) : (
                <EmojiEvents
                  sx={{
                    color: theme.palette.primary.main,
                    fontSize: { xs: '1.25rem', sm: '1.5rem' },
                    flexShrink: 0,
                  }}
                />
              )}
              <Typography
                variant="h6"
                fontWeight={600}
                sx={{
                  fontSize: { xs: '1.125rem', sm: '1.25rem' },
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {tournament.name}
              </Typography>
            </Box>

            <Box sx={{ justifySelf: 'end' }}>{getStatusChip()}</Box>

            <IconButton
              onClick={handleMenuClick}
              sx={{
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

          <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
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

          {isOngoing && (
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {t('round')} {actualRoundsPlayed} / {tournament.total_rounds}
                </Typography>
                <Box
                  sx={{ display: 'flex', gap: 1 }}
                  onClick={e => e.stopPropagation()}
                >
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      navigate(`/tournament/${tournament.id}?tab=0`)
                    }
                  >
                    {t('standings')}
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={() =>
                      navigate(`/tournament/${tournament.id}?tab=2`)
                    }
                  >
                    {t('resultsTab')}
                  </Button>
                </Box>
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
      </Card>

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
    </>
  );
};

export default TournamentListItem;
