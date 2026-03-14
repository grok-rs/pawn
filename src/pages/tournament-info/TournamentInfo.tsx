import type {
  Player,
  StandingsCalculationResult,
  TournamentDetails,
} from '@dto/bindings';
import { commands, type GameResult } from '@dto/bindings';
import {
  ArrowBack,
  Assignment,
  CalendarToday,
  Download,
  Edit,
  EmojiEvents,
  Flag,
  Games,
  LocationOn,
  MoreVert,
  NavigateNext,
  People,
  PlayCircleOutline,
  Print,
  Share,
  Timer,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
  useTheme,
} from '@mui/material';
import BaseLayout from '@shared/layouts/BaseLayout';
import { exportStandingsToCsv, exportStandingsToPdf } from '@shared/lib/export';
import { formatLocalizedDate } from '@shared/lib/tournamentUtils';
import ExportDialog from '@widgets/export-dialog';
import PlayerManagement from '@widgets/player-management';
import { ResultsGrid } from '@widgets/results-grid';
import RoundManager from '@widgets/round-manager';
import { StandingsTable } from '@widgets/standings-table';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import TournamentSettings from './TournamentSettings';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tournament-tabpanel-${index}`}
      aria-labelledby={`tournament-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `tournament-tab-${index}`,
    'aria-controls': `tournament-tabpanel-${index}`,
  };
}

function TournamentInfoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const [tournamentDetails, setTournamentDetails] =
    useState<TournamentDetails | null>(null);
  const [standings, setStandings] = useState<StandingsCalculationResult | null>(
    null
  );
  const [enhancedPlayers, setEnhancedPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [hasMockData, setHasMockData] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actualRoundsPlayed, setActualRoundsPlayed] = useState<number>(0);
  const [actualPlayerCount, setActualPlayerCount] = useState<number | null>(
    null
  );
  const [completedGamesCount, setCompletedGamesCount] = useState<number>(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const fetchStandings = useCallback(async (tournamentId: number) => {
    setLoadingStandings(true);
    try {
      const standingsData = await commands.getTournamentStandings(tournamentId);
      setStandings(standingsData);
    } catch (_err) {
      // Don't show error, just use regular standings
    } finally {
      setLoadingStandings(false);
    }
  }, []);

  const fetchEnhancedPlayers = useCallback(async (tournamentId: number) => {
    try {
      const playersData =
        await commands.getPlayersByTournamentEnhanced(tournamentId);
      setEnhancedPlayers(playersData);
      // Set actual player count (active players only)
      const activePlayers = playersData.filter(
        p => p.status === 'active' || !p.status
      );
      setActualPlayerCount(activePlayers.length);
    } catch (_err) {
      // Fall back to regular players
      setEnhancedPlayers([]);
      setActualPlayerCount(null);
    }
  }, []);

  const fetchActualTournamentStats = useCallback(
    async (tournamentId: number, gamesList?: GameResult[]) => {
      try {
        // Fetch rounds to calculate actual rounds played
        const rounds = await commands.getRoundsByTournament(tournamentId);
        const playedRounds = rounds.filter(
          round => round.status === 'Completed'
        ).length;
        setActualRoundsPlayed(playedRounds);

        // For completed games count, use the provided games data
        if (gamesList) {
          setCompletedGamesCount(
            gamesList.filter(game => game.game.result !== null).length
          );
        }
      } catch (_err) {
        // Fallback to tournament static data
        setActualRoundsPlayed(0);
        setCompletedGamesCount(0);
      }
    },
    []
  );

  const fetchTournamentDetails = useCallback(async () => {
    if (!id) {
      setError(t('tournamentIdNotProvided'));
      setLoading(false);
      return;
    }

    try {
      const tournamentId = parseInt(id, 10);
      const details = await commands.getTournamentDetails(tournamentId);
      setTournamentDetails(details);
      setHasMockData(details.players.length > 0);

      // Fetch standings and enhanced players if we have players
      if (details.players.length > 0) {
        fetchStandings(tournamentId);
        fetchEnhancedPlayers(tournamentId);
      }

      // Always fetch actual tournament stats
      fetchActualTournamentStats(tournamentId, details.games);
    } catch (_err) {
      setError(t('failedToLoadTournamentDetails'));
    } finally {
      setLoading(false);
    }
  }, [id, t, fetchActualTournamentStats, fetchEnhancedPlayers, fetchStandings]);

  const handlePopulateMockData = async () => {
    if (!id) return;

    try {
      const tournamentId = parseInt(id, 10);
      await commands.populateMockData(tournamentId);
      // Refresh the data
      await fetchTournamentDetails();
    } catch (_err) {
      setError(t('failedToPopulateMockData'));
    }
  };

  const handlePlayersUpdated = () => {
    // Refresh tournament details and enhanced players
    fetchTournamentDetails();
    if (id && tournamentDetails) {
      const tournamentId = parseInt(id, 10);
      fetchEnhancedPlayers(tournamentId);
      fetchActualTournamentStats(tournamentId, tournamentDetails.games);
    }
  };

  const handleExportCsv = () => {
    if (standings && tournamentDetails) {
      exportStandingsToCsv(
        standings.standings,
        tournamentDetails.tournament.name
      );
    }
  };

  const handleExportPdf = () => {
    if (standings && tournamentDetails) {
      exportStandingsToPdf(
        standings.standings,
        tournamentDetails.tournament.name
      );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteTournament = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!id) return;

    try {
      await commands.deleteTournament(parseInt(id, 10));
      navigate('/');
    } catch (_err) {
      setError(t('failedToDeleteTournament'));
    }
    setDeleteDialogOpen(false);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  useEffect(() => {
    fetchTournamentDetails();
  }, [fetchTournamentDetails]);

  const formatDate = (dateString: string) =>
    formatLocalizedDate(dateString, i18n.language);

  if (loading) {
    return (
      <BaseLayout>
        <Container>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="200px"
          >
            <CircularProgress />
          </Box>
        </Container>
      </BaseLayout>
    );
  }

  if (error || !tournamentDetails) {
    return (
      <BaseLayout>
        <Container>
          <Alert severity="error" sx={{ mt: 2 }}>
            {error || t('tournament.tournamentNotFound')}
          </Alert>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/tournaments')}
            sx={{ mt: 2 }}
          >
            {t('tournament.backToTournaments')}
          </Button>
        </Container>
      </BaseLayout>
    );
  }

  const { tournament, players, games } = tournamentDetails;

  return (
    <BaseLayout>
      <Box>
        {/* Breadcrumbs */}
        <Breadcrumbs
          separator={<NavigateNext fontSize="small" />}
          sx={{ mb: 3 }}
        >
          <Link
            component="button"
            underline="hover"
            color="inherit"
            onClick={() => navigate('/tournaments')}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <EmojiEvents fontSize="small" />
            {t('tournaments')}
          </Link>
          <Typography color="text.primary" fontWeight={500}>
            {tournament.name}
          </Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 3,
            }}
          >
            <Box>
              <Typography
                variant="h4"
                component="h1"
                fontWeight={700}
                gutterBottom
                color="text.primary"
              >
                {tournament.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocationOn fontSize="small" />
                  <Typography variant="body1">{tournament.location}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarToday fontSize="small" />
                  <Typography variant="body1">
                    {formatDate(tournament.date)}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {!hasMockData && (
                <Button
                  variant="outlined"
                  onClick={handlePopulateMockData}
                  startIcon={<People />}
                >
                  {t('addSampleData')}
                </Button>
              )}
              <IconButton onClick={handleMenuClick}>
                <MoreVert />
              </IconButton>
            </Box>
          </Box>

          {/* Tournament Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.light}20 0%, ${theme.palette.primary.main}20 100%)`,
                  border: `1px solid ${theme.palette.primary.light}40`,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: theme.palette.primary.main,
                        width: 48,
                        height: 48,
                      }}
                    >
                      <People />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight={700}>
                        {actualPlayerCount !== null ? (
                          actualPlayerCount !== players.length ? (
                            <>
                              {actualPlayerCount}
                              <Typography
                                component="span"
                                variant="body2"
                                color="text.secondary"
                                sx={{ ml: 0.5 }}
                              >
                                / {players.length}
                              </Typography>
                            </>
                          ) : (
                            actualPlayerCount
                          )
                        ) : (
                          players.length
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {actualPlayerCount !== null &&
                        actualPlayerCount !== players.length
                          ? t('activePlayers')
                          : t('players')}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.success.light}20 0%, ${theme.palette.success.main}20 100%)`,
                  border: `1px solid ${theme.palette.success.light}40`,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: theme.palette.success.main,
                        width: 48,
                        height: 48,
                      }}
                    >
                      <Games />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight={700}>
                        {completedGamesCount > 0 &&
                        completedGamesCount !== games.length ? (
                          <>
                            {completedGamesCount}
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.secondary"
                              sx={{ ml: 0.5 }}
                            >
                              / {games.length}
                            </Typography>
                          </>
                        ) : (
                          games.length
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {completedGamesCount > 0 &&
                        completedGamesCount !== games.length
                          ? t('tournament.gamesCompleted')
                          : t('tournament.gamesPlayed')}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.warning.light}20 0%, ${theme.palette.warning.main}20 100%)`,
                  border: `1px solid ${theme.palette.warning.light}40`,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: theme.palette.warning.main,
                        width: 48,
                        height: 48,
                      }}
                    >
                      <Timer />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight={700}>
                        {tournament.time_type
                          ? t(`timeControls.${tournament.time_type}`)
                          : 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('tournament.timeControl.label')}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.info.light}20 0%, ${theme.palette.info.main}20 100%)`,
                  border: `1px solid ${theme.palette.info.light}40`,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: theme.palette.info.main,
                        width: 48,
                        height: 48,
                      }}
                    >
                      <EmojiEvents />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight={700}>
                        {actualRoundsPlayed}/{tournament.total_rounds}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('tournament.roundsProgress')}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="tournament tabs"
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  minHeight: 64,
                  textTransform: 'none',
                  fontSize: '1rem',
                },
                '& .Mui-selected': {
                  color: theme.palette.primary.main,
                },
              }}
            >
              <Tab
                icon={<EmojiEvents />}
                label={t('standings')}
                iconPosition="start"
                {...a11yProps(0)}
              />
              <Tab
                icon={<PlayCircleOutline />}
                label={t('tournament.rounds')}
                iconPosition="start"
                {...a11yProps(1)}
              />
              <Tab
                icon={<Assignment />}
                label={t('resultsTab')}
                iconPosition="start"
                {...a11yProps(2)}
              />
              <Tab
                icon={<People />}
                label={t('playersTab')}
                iconPosition="start"
                {...a11yProps(3)}
              />
            </Tabs>
          </Paper>

          {/* Tab Panels */}
          <TabPanel value={tabValue} index={0}>
            {/* Standings Table */}
            {standings ? (
              <StandingsTable
                standings={standings.standings}
                loading={loadingStandings}
                onPlayerClick={_playerId => {
                  // Player clicked: playerId
                }}
                onExportCsv={handleExportCsv}
                onExportPdf={handleExportPdf}
                onPrint={handlePrint}
              />
            ) : (
              <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('rank')}</TableCell>
                      <TableCell>{t('player.label')}</TableCell>
                      <TableCell>{t('rating')}</TableCell>
                      <TableCell>{t('country.label')}</TableCell>
                      <TableCell align="center">{t('points')}</TableCell>
                      <TableCell align="center">{t('games')}</TableCell>
                      <TableCell align="center">{t('wins')}</TableCell>
                      <TableCell align="center">{t('draws')}</TableCell>
                      <TableCell align="center">{t('losses')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {players.map((playerResult, index) => (
                      <TableRow key={playerResult.player.id} hover>
                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            {index + 1}
                            {index === 0 && <EmojiEvents color="warning" />}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2">
                            {playerResult.player.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {playerResult.player.rating || t('unrated')}
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Flag fontSize="small" />
                            {playerResult.player.country_code
                              ? t(
                                  `country.${playerResult.player.country_code}`,
                                  playerResult.player.country_code
                                )
                              : 'N/A'}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="h6" color="primary">
                            {playerResult.points}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {playerResult.games_played}
                        </TableCell>
                        <TableCell align="center">
                          {playerResult.wins}
                        </TableCell>
                        <TableCell align="center">
                          {playerResult.draws}
                        </TableCell>
                        <TableCell align="center">
                          {playerResult.losses}
                        </TableCell>
                      </TableRow>
                    ))}
                    {players.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          <Typography variant="body2" color="textSecondary">
                            {t('noDataAvailable')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {/* Round Management */}
            <RoundManager
              tournamentId={parseInt(id ?? '', 10)}
              onRoundUpdate={() => {
                // Refresh tournament details when rounds are updated
                fetchTournamentDetails();
                // Also refresh actual tournament stats since rounds have changed
                if (tournamentDetails) {
                  fetchActualTournamentStats(
                    parseInt(id ?? '', 10),
                    tournamentDetails.games
                  );
                }
              }}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {/* Results Management */}
            {games.length > 0 ? (
              <ResultsGrid
                tournamentId={parseInt(id ?? '', 10)}
                games={games}
                onResultsUpdated={() => {
                  // Refresh tournament details and standings when results are updated
                  fetchTournamentDetails();
                  if (id && tournamentDetails) {
                    const tournamentId = parseInt(id, 10);
                    fetchStandings(tournamentId);
                    fetchActualTournamentStats(
                      tournamentId,
                      tournamentDetails.games
                    );
                  }
                }}
              />
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {t('noGamesMessage')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('createRoundsFirstMessage')}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => setTabValue(1)}
                  sx={{ mt: 2 }}
                  startIcon={<PlayCircleOutline />}
                >
                  {t('goToRoundsTab')}
                </Button>
              </Paper>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            {/* Enhanced Player Management */}
            <PlayerManagement
              tournamentId={parseInt(id ?? '', 10)}
              players={enhancedPlayers}
              tournamentDetails={tournamentDetails}
              onPlayersUpdated={handlePlayersUpdated}
            />
          </TabPanel>
        </Box>

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem
            onClick={() => {
              handleMenuClose();
              setSettingsOpen(true);
            }}
          >
            <Edit fontSize="small" sx={{ mr: 1 }} />
            {t('tournament.menuSettings')}
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <Download fontSize="small" sx={{ mr: 1 }} />
            {t('tournament.menuExportData')}
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <Print fontSize="small" sx={{ mr: 1 }} />
            {t('tournament.menuPrintReport')}
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleMenuClose();
              setExportDialogOpen(true);
            }}
          >
            <Download fontSize="small" sx={{ mr: 1 }} />
            Export Tournament Data
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <Share fontSize="small" sx={{ mr: 1 }} />
            {t('tournament.menuShareTournament')}
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={handleDeleteTournament}
            sx={{ color: 'error.main' }}
          >
            {t('deleteTournament')}
          </MenuItem>
        </Menu>

        {/* Tournament Settings Dialog */}
        <TournamentSettings
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          tournamentId={parseInt(id ?? '', 10)}
          onSettingsUpdated={() => {
            // Refresh standings when settings are updated
            if (id) {
              fetchStandings(parseInt(id, 10));
            }
          }}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleCancelDelete}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
        >
          <DialogTitle id="delete-dialog-title">
            {t('confirmDeleteTitle')}
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-dialog-description">
              {t('confirmDeleteMessage')} "{tournamentDetails?.tournament.name}
              "?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelDelete} color="primary">
              {t('cancel')}
            </Button>
            <Button
              onClick={handleConfirmDelete}
              color="error"
              variant="contained"
            >
              {t('delete')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Export Dialog */}
        {tournamentDetails && (
          <ExportDialog
            open={exportDialogOpen}
            onClose={() => setExportDialogOpen(false)}
            tournamentId={tournamentDetails.tournament.id}
            tournamentName={tournamentDetails.tournament.name}
          />
        )}
      </Box>
    </BaseLayout>
  );
}

export default TournamentInfoPage;
