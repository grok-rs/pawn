import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid2 as Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Breadcrumbs,
  Link,
  useTheme,
  Divider,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack,
  EmojiEvents,
  People,
  Games,
  LocationOn,
  CalendarToday,
  Timer,
  Flag,
  NavigateNext,
  MoreVert,
  Download,
  Edit,
  Print,
  Share,
  PlayCircleOutline,
} from '@mui/icons-material';
import { commands } from '../../dto/bindings';
import type { TournamentDetails, StandingsCalculationResult } from '../../dto/bindings';
import BaseLayout from '../../components/BaseLayout';
import { StandingsTable } from '../../components/StandingsTable';
import RoundManager from '../../components/RoundManager';
import { exportStandingsToCsv, exportStandingsToPdf } from '../../utils/export';
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

const TournamentInfoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useTranslation();
  const [tournamentDetails, setTournamentDetails] = useState<TournamentDetails | null>(null);
  const [standings, setStandings] = useState<StandingsCalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [hasMockData, setHasMockData] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const fetchTournamentDetails = async () => {
    if (!id) {
      setError(t('tournamentIdNotProvided'));
      setLoading(false);
      return;
    }

    try {
      const tournamentId = parseInt(id);
      const details = await commands.getTournamentDetails(tournamentId);
      setTournamentDetails(details);
      setHasMockData(details.players.length > 0);
      
      // Fetch standings with tiebreaks if we have players
      if (details.players.length > 0) {
        fetchStandings(tournamentId);
      }
    } catch (err) {
      console.error('Failed to fetch tournament details:', err);
      setError(t('failedToLoadTournamentDetails'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStandings = async (tournamentId: number) => {
    setLoadingStandings(true);
    try {
      const standingsData = await commands.getTournamentStandings(tournamentId);
      setStandings(standingsData);
    } catch (err) {
      console.error('Failed to fetch standings:', err);
      // Don't show error, just use regular standings
    } finally {
      setLoadingStandings(false);
    }
  };

  const handlePopulateMockData = async () => {
    if (!id) return;

    try {
      const tournamentId = parseInt(id);
      await commands.populateMockData(tournamentId);
      // Refresh the data
      await fetchTournamentDetails();
    } catch (err) {
      console.error('Failed to populate mock data:', err);
      setError(t('failedToPopulateMockData'));
    }
  };

  const handleExportCsv = () => {
    if (standings && tournamentDetails) {
      exportStandingsToCsv(standings.standings, tournamentDetails.tournament.name);
    }
  };

  const handleExportPdf = () => {
    if (standings && tournamentDetails) {
      exportStandingsToPdf(standings.standings, tournamentDetails.tournament.name);
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
      await commands.deleteTournament(parseInt(id));
      navigate('/');
    } catch (err) {
      console.error('Failed to delete tournament:', err);
      setError(t('failedToDeleteTournament'));
    }
    setDeleteDialogOpen(false);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  useEffect(() => {
    fetchTournamentDetails();
  }, [id]);

  const getResultChip = (result: string) => {
    let color: 'success' | 'error' | 'warning' | 'default' = 'default';
    let label = result;

    switch (result) {
      case '1-0':
        color = 'success';
        label = t('whiteWins');
        break;
      case '0-1':
        color = 'error';
        label = t('blackWins');
        break;
      case '1/2-1/2':
        color = 'warning';
        label = t('draw');
        break;
      case '*':
        color = 'default';
        label = t('ongoing');
        break;
    }

    return <Chip label={label} color={color} size="small" />;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

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
            {error || 'Tournament not found'}
          </Alert>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/tournaments')}
            sx={{ mt: 2 }}
          >
            Back to Tournaments
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
            Tournaments
          </Link>
          <Typography color="text.primary" fontWeight={500}>
            {tournament.name}
          </Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box>
              <Typography variant="h4" component="h1" fontWeight={700} gutterBottom color="text.primary">
                {tournament.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocationOn fontSize="small" />
                  <Typography variant="body1">{tournament.location}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarToday fontSize="small" />
                  <Typography variant="body1">{formatDate(tournament.date)}</Typography>
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
            <Grid size={{ mobile: 12, tablet: 6, laptop: 3 }}>
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
                        {players.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('players')}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ mobile: 12, tablet: 6, laptop: 3 }}>
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
                        {games.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Games Played
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ mobile: 12, tablet: 6, laptop: 3 }}>
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
                        {tournament.time_type || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Time Control
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ mobile: 12, tablet: 6, laptop: 3 }}>
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
                        {tournament.rounds_played}/{tournament.total_rounds}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Rounds Progress
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
                label="Rounds"
                iconPosition="start"
                {...a11yProps(1)}
              />
              <Tab
                icon={<Games />}
                label={t('gamesTab')}
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
                onPlayerClick={(playerId) => console.log('Player clicked:', playerId)}
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
                      <TableCell>{t('player')}</TableCell>
                      <TableCell>{t('rating')}</TableCell>
                      <TableCell>{t('country')}</TableCell>
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                          {playerResult.player.rating || 'Unrated'}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Flag fontSize="small" />
                            {playerResult.player.country_code || 'N/A'}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="h6" color="primary">
                            {playerResult.points}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{playerResult.games_played}</TableCell>
                        <TableCell align="center">{playerResult.wins}</TableCell>
                        <TableCell align="center">{playerResult.draws}</TableCell>
                        <TableCell align="center">{playerResult.losses}</TableCell>
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
              tournamentId={parseInt(id!)}
              onRoundUpdate={() => {
                // Refresh tournament details when rounds are updated
                fetchTournamentDetails();
              }}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {/* Games Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('round')}</TableCell>
                    <TableCell>{t('white')}</TableCell>
                    <TableCell>{t('black')}</TableCell>
                    <TableCell align="center">{t('result')}</TableCell>
                    <TableCell>{t('date')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {games.map((gameResult) => (
                    <TableRow key={gameResult.game.id} hover>
                      <TableCell>
                        <Chip
                          label={`${t('round')} ${gameResult.game.round_number}`}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">
                            {gameResult.white_player.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {gameResult.white_player.rating ? `(${gameResult.white_player.rating})` : ''}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">
                            {gameResult.black_player.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {gameResult.black_player.rating ? `(${gameResult.black_player.rating})` : ''}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {getResultChip(gameResult.game.result)}
                      </TableCell>
                      <TableCell>
                        {formatDate(gameResult.game.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {games.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="textSecondary">
                          {t('noDataAvailable')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            {/* Players Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('name')}</TableCell>
                    <TableCell>{t('rating')}</TableCell>
                    <TableCell>{t('country')}</TableCell>
                    <TableCell>{t('registered')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {players.map((playerResult) => (
                    <TableRow key={playerResult.player.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {playerResult.player.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {playerResult.player.rating ? (
                          <Chip
                            label={playerResult.player.rating}
                            variant="outlined"
                            size="small"
                          />
                        ) : (
                          'Unrated'
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Flag fontSize="small" />
                          {playerResult.player.country_code || 'N/A'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {formatDate(playerResult.player.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {players.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="textSecondary">
                          {t('noDataAvailable')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </Box>

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => {
            handleMenuClose();
            setSettingsOpen(true);
          }}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Tournament Settings
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <Download fontSize="small" sx={{ mr: 1 }} />
            Export Data
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <Print fontSize="small" sx={{ mr: 1 }} />
            Print Report
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <Share fontSize="small" sx={{ mr: 1 }} />
            Share Tournament
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleDeleteTournament} sx={{ color: 'error.main' }}>
            {t('deleteTournament')}
          </MenuItem>
        </Menu>
        
        {/* Tournament Settings Dialog */}
        <TournamentSettings
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          tournamentId={parseInt(id!)}
          onSettingsUpdated={() => {
            // Refresh standings when settings are updated
            if (id) {
              fetchStandings(parseInt(id));
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
              {t('confirmDeleteMessage')} "{tournamentDetails?.tournament.name}"?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelDelete} color="primary">
              {t('cancel')}
            </Button>
            <Button onClick={handleConfirmDelete} color="error" variant="contained">
              {t('delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </BaseLayout>
  );
};

export default TournamentInfoPage;
