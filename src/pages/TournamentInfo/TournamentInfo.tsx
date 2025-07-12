import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
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
} from '@mui/icons-material';
import { commands } from '../../dto/bindings';
import type { TournamentDetails } from '../../dto/bindings';
import BaseLayout from '../../components/BaseLayout';

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
  const [tournamentDetails, setTournamentDetails] = useState<TournamentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [hasMockData, setHasMockData] = useState(false);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const fetchTournamentDetails = async () => {
    if (!id) {
      setError('Tournament ID not provided');
      setLoading(false);
      return;
    }

    try {
      const tournamentId = parseInt(id);
      const details = await commands.getTournamentDetails(tournamentId);
      setTournamentDetails(details);
      setHasMockData(details.players.length > 0);
    } catch (err) {
      console.error('Failed to fetch tournament details:', err);
      setError('Failed to load tournament details');
    } finally {
      setLoading(false);
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
      setError('Failed to populate mock data');
    }
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
        label = 'White wins';
        break;
      case '0-1':
        color = 'error';
        label = 'Black wins';
        break;
      case '1/2-1/2':
        color = 'warning';
        label = 'Draw';
        break;
      case '*':
        color = 'default';
        label = 'Ongoing';
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
      <Container maxWidth={false}>
        <Box sx={{ py: 3 }}>
          {/* Header */}
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/tournaments')} color="primary">
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
              {tournament.name}
            </Typography>
            {!hasMockData && (
              <Button
                variant="outlined"
                onClick={handlePopulateMockData}
                startIcon={<People />}
              >
                Add Sample Data
              </Button>
            )}
          </Box>

          {/* Tournament Info Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ mobile: 12, desktop: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocationOn color="primary" />
                    <Typography variant="h6">Location</Typography>
                  </Box>
                  <Typography variant="body1">{tournament.location}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ mobile: 12, desktop: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarToday color="primary" />
                    <Typography variant="h6">Date</Typography>
                  </Box>
                  <Typography variant="body1">{formatDate(tournament.date)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ mobile: 12, desktop: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Timer color="primary" />
                    <Typography variant="h6">Time Control</Typography>
                  </Box>
                  <Typography variant="body1">{tournament.time_type}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ mobile: 12, desktop: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Games color="primary" />
                    <Typography variant="h6">Progress</Typography>
                  </Box>
                  <Typography variant="body1">
                    Round {tournament.rounds_played} of {tournament.total_rounds}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="tournament tabs">
              <Tab
                icon={<EmojiEvents />}
                label="Standings"
                iconPosition="start"
                {...a11yProps(0)}
              />
              <Tab
                icon={<Games />}
                label="Games"
                iconPosition="start"
                {...a11yProps(1)}
              />
              <Tab
                icon={<People />}
                label="Players"
                iconPosition="start"
                {...a11yProps(2)}
              />
            </Tabs>
          </Box>

          {/* Tab Panels */}
          <TabPanel value={tabValue} index={0}>
            {/* Standings Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Player</TableCell>
                    <TableCell>Rating</TableCell>
                    <TableCell>Country</TableCell>
                    <TableCell align="center">Points</TableCell>
                    <TableCell align="center">Games</TableCell>
                    <TableCell align="center">Wins</TableCell>
                    <TableCell align="center">Draws</TableCell>
                    <TableCell align="center">Losses</TableCell>
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
                          No players registered yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {/* Games Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Round</TableCell>
                    <TableCell>White</TableCell>
                    <TableCell>Black</TableCell>
                    <TableCell align="center">Result</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {games.map((gameResult) => (
                    <TableRow key={gameResult.game.id} hover>
                      <TableCell>
                        <Chip
                          label={`Round ${gameResult.game.round_number}`}
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
                          No games played yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {/* Players Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Rating</TableCell>
                    <TableCell>Country</TableCell>
                    <TableCell>Registered</TableCell>
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
                          No players registered yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </Box>
      </Container>
    </BaseLayout>
  );
};

export default TournamentInfoPage;
