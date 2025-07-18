import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  ButtonGroup,
  Grid2 as Grid,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TextField,
  Collapse,
} from '@mui/material';
import {
  NavigateBefore,
  NavigateNext,
  FirstPage,
  LastPage,
  Download,
  Timeline,
  Analytics,
  TableChart,
  BarChart,
  TrendingUp,
  TrendingDown,
  EmojiEvents,
  Games,
  CheckCircle,
  PlayCircle,
  ExpandMore,
  ExpandLess,
  Refresh,
  Close,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
} from 'recharts';

// Define basic types for the round viewer
interface RoundHistory {
  round: {
    id: number;
    tournament_id: number;
    round_number: number;
    status: string;
    created_at: string;
    completed_at?: string;
  };
  standings: PlayerStanding[];
  games: GameResult[];
  statistics: RoundStatistics;
}

interface PlayerStanding {
  player_id: number;
  player_name: string;
  position: number;
  points: number;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  tiebreak_scores: TiebreakScore[];
  performance_rating?: number;
  rating_change?: number;
}

interface TiebreakScore {
  tiebreak_type: string;
  value: number;
  display_value: string;
}

interface GameResult {
  game: {
    id: number;
    tournament_id: number;
    round_number: number;
    white_player_id: number;
    black_player_id: number;
    result: string;
    result_type?: string;
    result_reason?: string;
    created_at: string;
  };
  white_player: {
    id: number;
    name: string;
    rating?: number;
  };
  black_player: {
    id: number;
    name: string;
    rating?: number;
  };
}

interface RoundStatistics {
  total_games: number;
  completed_games: number;
  ongoing_games: number;
  white_wins: number;
  black_wins: number;
  draws: number;
  completion_rate: number;
  average_game_duration?: number;
  performance_metrics: PlayerPerformanceMetric[];
}

interface PlayerPerformanceMetric {
  player_id: number;
  player_name: string;
  round_score: number;
  cumulative_score: number;
  position: number;
  position_change: number;
  rating_change?: number;
  color_balance: {
    white_games: number;
    black_games: number;
    color_preference: string;
  };
}

interface RoundProgression {
  tournament_id: number;
  round_histories: RoundHistory[];
  progression_chart: PlayerProgressionData[];
  tournament_statistics: TournamentStatistics;
}

interface PlayerProgressionData {
  player_id: number;
  player_name: string;
  round_scores: number[];
  cumulative_scores: number[];
  positions: number[];
  rating_changes: (number | null)[];
}

interface TournamentStatistics {
  total_rounds: number;
  completed_rounds: number;
  total_games: number;
  result_distribution: {
    white_wins: number;
    black_wins: number;
    draws: number;
    decisive_games: number;
    draw_rate: number;
    white_advantage: number;
  };
  player_activity: {
    player_id: number;
    player_name: string;
    games_played: number;
    byes: number;
    withdrawals: number;
    activity_rate: number;
  }[];
  round_duration_stats: {
    average_duration: number;
    median_duration: number;
    min_duration: number;
    max_duration: number;
    duration_by_round: number[];
  };
}

interface RoundViewerProps {
  tournamentId: number;
  onClose?: () => void;
}

type ViewMode =
  | 'history'
  | 'standings'
  | 'games'
  | 'statistics'
  | 'progression';

const RoundViewer: React.FC<RoundViewerProps> = ({ tournamentId, onClose }) => {
  const { t } = useTranslation();

  // State management
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [viewMode, setViewMode] = useState<ViewMode>('history');
  const [roundHistory, setRoundHistory] = useState<RoundHistory | null>(null);
  const [progression, setProgression] = useState<RoundProgression | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf'>(
    'json'
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['overview'])
  );

  // Mock data for demonstration
  const mockRoundHistory = useMemo(
    (): RoundHistory => ({
      round: {
        id: 1,
        tournament_id: tournamentId,
        round_number: selectedRound,
        status: 'completed',
        created_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T12:00:00Z',
      },
      standings: [
        {
          player_id: 1,
          player_name: 'Alice Johnson',
          position: 1,
          points: 4.5,
          games_played: 5,
          wins: 4,
          draws: 1,
          losses: 0,
          tiebreak_scores: [
            { tiebreak_type: 'Buchholz', value: 20.5, display_value: '20.5' },
            {
              tiebreak_type: 'Sonneborn-Berger',
              value: 18.25,
              display_value: '18.25',
            },
          ],
          performance_rating: 2150,
          rating_change: 25,
        },
        {
          player_id: 2,
          player_name: 'Bob Smith',
          position: 2,
          points: 4.0,
          games_played: 5,
          wins: 3,
          draws: 2,
          losses: 0,
          tiebreak_scores: [
            { tiebreak_type: 'Buchholz', value: 19.0, display_value: '19.0' },
            {
              tiebreak_type: 'Sonneborn-Berger',
              value: 16.5,
              display_value: '16.5',
            },
          ],
          performance_rating: 2080,
          rating_change: 15,
        },
      ],
      games: [
        {
          game: {
            id: 1,
            tournament_id: tournamentId,
            round_number: selectedRound,
            white_player_id: 1,
            black_player_id: 2,
            result: '1/2-1/2',
            result_type: 'Normal',
            created_at: '2024-01-15T10:00:00Z',
          },
          white_player: { id: 1, name: 'Alice Johnson', rating: 1950 },
          black_player: { id: 2, name: 'Bob Smith', rating: 1890 },
        },
      ],
      statistics: {
        total_games: 10,
        completed_games: 10,
        ongoing_games: 0,
        white_wins: 4,
        black_wins: 3,
        draws: 3,
        completion_rate: 100,
        average_game_duration: 85,
        performance_metrics: [
          {
            player_id: 1,
            player_name: 'Alice Johnson',
            round_score: 0.5,
            cumulative_score: 4.5,
            position: 1,
            position_change: 0,
            rating_change: 25,
            color_balance: {
              white_games: 3,
              black_games: 2,
              color_preference: 'white',
            },
          },
        ],
      },
    }),
    [tournamentId, selectedRound]
  );

  // Mock progression data
  const mockProgression = useMemo(
    (): RoundProgression => ({
      tournament_id: tournamentId,
      round_histories: [mockRoundHistory],
      progression_chart: [
        {
          player_id: 1,
          player_name: 'Alice Johnson',
          round_scores: [1.0, 0.5, 1.0, 1.0, 0.5],
          cumulative_scores: [1.0, 1.5, 2.5, 3.5, 4.0],
          positions: [1, 2, 1, 1, 1],
          rating_changes: [10, 5, 8, 2, 0],
        },
        {
          player_id: 2,
          player_name: 'Bob Smith',
          round_scores: [0.5, 1.0, 0.5, 1.0, 0.5],
          cumulative_scores: [0.5, 1.5, 2.0, 3.0, 3.5],
          positions: [3, 2, 3, 2, 2],
          rating_changes: [5, 8, 2, 5, 0],
        },
      ],
      tournament_statistics: {
        total_rounds: 5,
        completed_rounds: 5,
        total_games: 25,
        result_distribution: {
          white_wins: 12,
          black_wins: 8,
          draws: 5,
          decisive_games: 20,
          draw_rate: 20,
          white_advantage: 10,
        },
        player_activity: [
          {
            player_id: 1,
            player_name: 'Alice Johnson',
            games_played: 5,
            byes: 0,
            withdrawals: 0,
            activity_rate: 100,
          },
        ],
        round_duration_stats: {
          average_duration: 85,
          median_duration: 80,
          min_duration: 45,
          max_duration: 120,
          duration_by_round: [90, 85, 80, 75, 95],
        },
      },
    }),
    [tournamentId, mockRoundHistory]
  );

  // Simulate API calls
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // In a real implementation, these would be API calls:
        // const roundHistory = await commands.getRoundHistory(tournamentId, selectedRound);
        // const progression = await commands.getTournamentProgression(tournamentId);

        setRoundHistory(mockRoundHistory);
        setProgression(mockProgression);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load round data'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tournamentId, selectedRound, mockRoundHistory, mockProgression]);

  // Navigation handlers
  const handleRoundChange = (newRound: number) => {
    const maxRound = progression?.tournament_statistics.total_rounds || 1;
    if (newRound >= 1 && newRound <= maxRound) {
      setSelectedRound(newRound);
    }
  };

  const handleExport = async () => {
    try {
      // In a real implementation:
      // await commands.exportRoundData({
      //   tournament_id: tournamentId,
      //   round_number: selectedRound,
      //   format: exportFormat,
      //   include_statistics: true,
      //   include_standings: true,
      //   include_games: true,
      // });

      // Export completed successfully
      setShowExportDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Chart data preparation
  const progressionChartData = useMemo(() => {
    if (!progression) return [];

    const rounds = Array.from(
      { length: progression.tournament_statistics.total_rounds },
      (_, i) => i + 1
    );

    return rounds.map(round => {
      const roundData: { [key: string]: number } = { round };

      progression.progression_chart.forEach(player => {
        if (player.cumulative_scores[round - 1] !== undefined) {
          roundData[player.player_name] = player.cumulative_scores[round - 1];
        }
      });

      return roundData;
    });
  }, [progression]);

  const positionChartData = useMemo(() => {
    if (!progression) return [];

    const rounds = Array.from(
      { length: progression.tournament_statistics.total_rounds },
      (_, i) => i + 1
    );

    return rounds.map(round => {
      const roundData: { [key: string]: number } = { round };

      progression.progression_chart.forEach(player => {
        if (player.positions[round - 1] !== undefined) {
          roundData[player.player_name] = player.positions[round - 1];
        }
      });

      return roundData;
    });
  }, [progression]);

  const resultDistributionData = useMemo(() => {
    if (!roundHistory) return [];

    const stats = roundHistory.statistics;
    return [
      { name: 'White Wins', value: stats.white_wins, color: '#4CAF50' },
      { name: 'Black Wins', value: stats.black_wins, color: '#2196F3' },
      { name: 'Draws', value: stats.draws, color: '#FF9800' },
    ];
  }, [roundHistory]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          {t('roundViewer.loading')}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => window.location.reload()}
            >
              <Refresh />
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  const maxRound = progression?.tournament_statistics.total_rounds || 1;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          {t('roundViewer.title')}
        </Typography>
        {onClose && (
          <IconButton onClick={onClose} size="large">
            <Close />
          </IconButton>
        )}
      </Box>

      {/* Round Navigation */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Typography variant="h6">{t('roundViewer.navigation')}</Typography>
            <Chip
              label={`${t('round')} ${selectedRound} / ${maxRound}`}
              color="primary"
              variant="outlined"
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ButtonGroup variant="outlined" size="small">
              <IconButton
                onClick={() => handleRoundChange(1)}
                disabled={selectedRound === 1}
              >
                <FirstPage />
              </IconButton>
              <IconButton
                onClick={() => handleRoundChange(selectedRound - 1)}
                disabled={selectedRound === 1}
              >
                <NavigateBefore />
              </IconButton>
              <IconButton
                onClick={() => handleRoundChange(selectedRound + 1)}
                disabled={selectedRound === maxRound}
              >
                <NavigateNext />
              </IconButton>
              <IconButton
                onClick={() => handleRoundChange(maxRound)}
                disabled={selectedRound === maxRound}
              >
                <LastPage />
              </IconButton>
            </ButtonGroup>

            <TextField
              type="number"
              value={selectedRound}
              onChange={e => handleRoundChange(parseInt(e.target.value) || 1)}
              size="small"
              sx={{ width: 100 }}
              inputProps={{ min: 1, max: maxRound }}
            />

            <Button
              startIcon={<Download />}
              onClick={() => setShowExportDialog(true)}
              variant="outlined"
              size="small"
            >
              {t('export')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* View Mode Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <ButtonGroup variant="outlined" size="small" sx={{ mb: 2 }}>
            <Button
              onClick={() => setViewMode('history')}
              variant={viewMode === 'history' ? 'contained' : 'outlined'}
              startIcon={<Timeline />}
            >
              {t('roundViewer.history')}
            </Button>
            <Button
              onClick={() => setViewMode('standings')}
              variant={viewMode === 'standings' ? 'contained' : 'outlined'}
              startIcon={<TableChart />}
            >
              {t('roundViewer.standings')}
            </Button>
            <Button
              onClick={() => setViewMode('games')}
              variant={viewMode === 'games' ? 'contained' : 'outlined'}
              startIcon={<Games />}
            >
              {t('roundViewer.games')}
            </Button>
            <Button
              onClick={() => setViewMode('statistics')}
              variant={viewMode === 'statistics' ? 'contained' : 'outlined'}
              startIcon={<BarChart />}
            >
              {t('roundViewer.statistics')}
            </Button>
            <Button
              onClick={() => setViewMode('progression')}
              variant={viewMode === 'progression' ? 'contained' : 'outlined'}
              startIcon={<Analytics />}
            >
              {t('roundViewer.progression')}
            </Button>
          </ButtonGroup>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Round Overview */}
        {viewMode === 'history' && roundHistory && (
          <Grid size={12}>
            <Card>
              <CardContent>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
                >
                  <Typography variant="h6">
                    {t('roundViewer.overview')}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => toggleSection('overview')}
                  >
                    {expandedSections.has('overview') ? (
                      <ExpandLess />
                    ) : (
                      <ExpandMore />
                    )}
                  </IconButton>
                </Box>

                <Collapse in={expandedSections.has('overview')}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="primary">
                          {roundHistory.round.round_number}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('roundViewer.roundNumber')}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Chip
                          label={roundHistory.round.status}
                          color={
                            roundHistory.round.status === 'completed'
                              ? 'success'
                              : 'warning'
                          }
                          icon={
                            roundHistory.round.status === 'completed' ? (
                              <CheckCircle />
                            ) : (
                              <PlayCircle />
                            )
                          }
                        />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          {t('roundViewer.status')}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6">
                          {roundHistory.statistics.completion_rate.toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('roundViewer.completionRate')}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6">
                          {roundHistory.statistics.average_game_duration || 0}
                          min
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('roundViewer.avgDuration')}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Standings View */}
        {viewMode === 'standings' && roundHistory && (
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('roundViewer.historicalStandings')}
                </Typography>
                <List>
                  {roundHistory.standings.map((standing, index) => (
                    <ListItem key={standing.player_id} divider>
                      <ListItemIcon>
                        <EmojiEvents
                          color={index < 3 ? 'primary' : 'disabled'}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                            }}
                          >
                            <Typography variant="h6">
                              {standing.position}. {standing.player_name}
                            </Typography>
                            <Chip
                              label={`${standing.points} pts`}
                              size="small"
                              color="primary"
                            />
                            {standing.rating_change && (
                              <Chip
                                label={`${standing.rating_change > 0 ? '+' : ''}${standing.rating_change}`}
                                size="small"
                                color={
                                  standing.rating_change > 0
                                    ? 'success'
                                    : 'error'
                                }
                                icon={
                                  standing.rating_change > 0 ? (
                                    <TrendingUp />
                                  ) : (
                                    <TrendingDown />
                                  )
                                }
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {t('roundViewer.record', {
                              wins: standing.wins,
                              draws: standing.draws,
                              losses: standing.losses,
                            })}
                            {standing.performance_rating && (
                              <>
                                {' '}
                                • {t('roundViewer.performance')}:{' '}
                                {standing.performance_rating}
                              </>
                            )}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Games View */}
        {viewMode === 'games' && roundHistory && (
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('roundViewer.roundGames')}
                </Typography>
                <List>
                  {roundHistory.games.map(gameResult => (
                    <ListItem key={gameResult.game.id} divider>
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                            }}
                          >
                            <Typography variant="body1">
                              {gameResult.white_player.name} -{' '}
                              {gameResult.black_player.name}
                            </Typography>
                            <Chip
                              label={gameResult.game.result}
                              size="small"
                              color={
                                gameResult.game.result === '1-0'
                                  ? 'success'
                                  : gameResult.game.result === '0-1'
                                    ? 'error'
                                    : gameResult.game.result === '1/2-1/2'
                                      ? 'warning'
                                      : 'default'
                              }
                            />
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {t('roundViewer.gameInfo', {
                              whiteRating:
                                gameResult.white_player.rating || 'Unrated',
                              blackRating:
                                gameResult.black_player.rating || 'Unrated',
                              resultType:
                                gameResult.game.result_type || 'Normal',
                            })}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Statistics View */}
        {viewMode === 'statistics' && roundHistory && (
          <Grid size={12}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {t('roundViewer.resultDistribution')}
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={resultDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {resultDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {t('roundViewer.roundStats')}
                    </Typography>
                    <Stack spacing={2}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography>{t('roundViewer.totalGames')}</Typography>
                        <Typography fontWeight="bold">
                          {roundHistory.statistics.total_games}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography>
                          {t('roundViewer.completedGames')}
                        </Typography>
                        <Typography fontWeight="bold">
                          {roundHistory.statistics.completed_games}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography>{t('roundViewer.ongoingGames')}</Typography>
                        <Typography fontWeight="bold">
                          {roundHistory.statistics.ongoing_games}
                        </Typography>
                      </Box>
                      <Divider />
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography>{t('roundViewer.whiteWins')}</Typography>
                        <Typography fontWeight="bold" color="success.main">
                          {roundHistory.statistics.white_wins}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography>{t('roundViewer.blackWins')}</Typography>
                        <Typography fontWeight="bold" color="info.main">
                          {roundHistory.statistics.black_wins}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography>{t('roundViewer.draws')}</Typography>
                        <Typography fontWeight="bold" color="warning.main">
                          {roundHistory.statistics.draws}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        )}

        {/* Progression View */}
        {viewMode === 'progression' && progression && (
          <Grid size={12}>
            <Grid container spacing={3}>
              <Grid size={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {t('roundViewer.scoreProgression')}
                    </Typography>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={progressionChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="round" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        {progression.progression_chart.map((player, index) => (
                          <Line
                            key={player.player_id}
                            type="monotone"
                            dataKey={player.player_name}
                            stroke={`hsl(${index * 137.5}, 70%, 50%)`}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {t('roundViewer.positionProgression')}
                    </Typography>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={positionChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="round" />
                        <YAxis reversed domain={[1, 'dataMax']} />
                        <RechartsTooltip />
                        <Legend />
                        {progression.progression_chart.map((player, index) => (
                          <Line
                            key={player.player_id}
                            type="monotone"
                            dataKey={player.player_name}
                            stroke={`hsl(${index * 137.5}, 70%, 50%)`}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        )}
      </Grid>

      {/* Export Dialog */}
      <Dialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      >
        <DialogTitle>{t('roundViewer.exportRound')}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>{t('roundViewer.exportFormat')}</InputLabel>
            <Select
              value={exportFormat}
              onChange={e =>
                setExportFormat(e.target.value as 'json' | 'csv' | 'pdf')
              }
              label={t('roundViewer.exportFormat')}
            >
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="pdf">PDF</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExportDialog(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleExport} variant="contained">
            {t('export')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoundViewer;
