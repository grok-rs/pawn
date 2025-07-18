import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Grid2 as Grid,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import {
  EmojiEvents,
  People,
  Star,
  TrendingUp,
  TrendingDown,
  Remove,
  Assessment,
  Refresh,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { commands } from '@dto/bindings';

// Types for team standings
interface TeamStanding {
  team: Team;
  rank: number;
  points: number;
  match_points: number;
  board_points: number;
  games_played: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  buchholz_score: number;
  sonneborn_berger_score: number;
  average_rating: number;
  performance_rating: number;
  members: TeamMember[];
}

interface Team {
  id: number;
  tournament_id: number;
  name: string;
  captain?: string;
  description?: string;
  color?: string;
  max_board_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TeamMember {
  id: number;
  team_id: number;
  player_id: number;
  player_name: string;
  board_number?: number;
  is_captain: boolean;
  is_reserve: boolean;
  rating?: number;
  title?: string;
  points: number;
  games_played: number;
  performance_rating?: number;
}

interface TeamStandingsProps {
  tournamentId: number;
  refreshInterval?: number; // milliseconds
}

const TeamStandings: React.FC<TeamStandingsProps> = ({
  tournamentId,
  refreshInterval = 30000, // 30 seconds default
}) => {
  const { t } = useTranslation();
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamStanding | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>('rank');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load team standings
  const loadStandings = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Use real API call once bindings are regenerated
      // const standingsData = await commands.getTeamStandings(tournamentId);

      // For now, use mock data
      const mockStandings: TeamStanding[] = [
        {
          team: {
            id: 1,
            tournament_id: tournamentId,
            name: 'Team Alpha',
            captain: 'Alice Smith',
            description: 'Strong team with experienced players',
            color: '#1976d2',
            max_board_count: 4,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          rank: 1,
          points: 15.5,
          match_points: 8.0,
          board_points: 15.5,
          games_played: 24,
          matches_won: 4,
          matches_drawn: 0,
          matches_lost: 1,
          buchholz_score: 28.5,
          sonneborn_berger_score: 185.25,
          average_rating: 2050,
          performance_rating: 2150,
          members: [
            {
              id: 1,
              team_id: 1,
              player_id: 1,
              player_name: 'Alice Smith',
              board_number: 1,
              is_captain: true,
              is_reserve: false,
              rating: 2100,
              title: 'IM',
              points: 4.5,
              games_played: 6,
              performance_rating: 2200,
            },
          ],
        },
        {
          team: {
            id: 2,
            tournament_id: tournamentId,
            name: 'Team Beta',
            captain: 'Bob Johnson',
            description: 'Young and ambitious team',
            color: '#d32f2f',
            max_board_count: 4,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          rank: 2,
          points: 14.0,
          match_points: 6.0,
          board_points: 14.0,
          games_played: 24,
          matches_won: 3,
          matches_drawn: 0,
          matches_lost: 2,
          buchholz_score: 26.0,
          sonneborn_berger_score: 168.0,
          average_rating: 1925,
          performance_rating: 2000,
          members: [
            {
              id: 2,
              team_id: 2,
              player_id: 2,
              player_name: 'Bob Johnson',
              board_number: 1,
              is_captain: true,
              is_reserve: false,
              rating: 1950,
              title: 'FM',
              points: 4.0,
              games_played: 6,
              performance_rating: 2050,
            },
          ],
        },
      ];

      setStandings(mockStandings);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading team standings:', err);
      setError('Failed to load team standings');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadStandings();
  }, [tournamentId]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(loadStandings, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const handleShowTeamDetails = (team: TeamStanding) => {
    setSelectedTeam(team);
    setDetailsDialogOpen(true);
  };

  const handleRefresh = () => {
    loadStandings();
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <EmojiEvents sx={{ color: '#FFD700' }} />;
      case 2:
        return <EmojiEvents sx={{ color: '#C0C0C0' }} />;
      case 3:
        return <EmojiEvents sx={{ color: '#CD7F32' }} />;
      default:
        return (
          <Typography variant="h6" fontWeight={600}>
            {rank}
          </Typography>
        );
    }
  };

  const getPerformanceTrend = (performance: number, average: number) => {
    if (performance > average + 50) return <TrendingUp color="success" />;
    if (performance < average - 50) return <TrendingDown color="error" />;
    return <Remove color="action" />;
  };

  const formatScore = (score: number) => {
    return score % 1 === 0 ? score.toString() : score.toFixed(1);
  };

  const sortedStandings = [...standings].sort((a, b) => {
    switch (sortBy) {
      case 'rank':
        return a.rank - b.rank;
      case 'points':
        return b.points - a.points;
      case 'match_points':
        return b.match_points - a.match_points;
      case 'performance':
        return b.performance_rating - a.performance_rating;
      case 'name':
        return a.team.name.localeCompare(b.team.name);
      default:
        return a.rank - b.rank;
    }
  });

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          {t('tournament.teams.standings')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>{t('tournament.teams.sortBy')}</InputLabel>
            <Select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              label={t('tournament.teams.sortBy')}
            >
              <MenuItem value="rank">{t('tournament.teams.rank')}</MenuItem>
              <MenuItem value="points">{t('tournament.teams.points')}</MenuItem>
              <MenuItem value="match_points">
                {t('tournament.teams.matchPoints')}
              </MenuItem>
              <MenuItem value="performance">
                {t('tournament.teams.performance')}
              </MenuItem>
              <MenuItem value="name">{t('tournament.teams.name')}</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
          >
            {t('common.refresh')}
          </Button>
        </Box>
      </Box>

      {lastUpdated && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 2, display: 'block' }}
        >
          {t('tournament.teams.lastUpdated')}:{' '}
          {lastUpdated.toLocaleTimeString()}
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>
                {t('tournament.teams.rank')}
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                {t('tournament.teams.team')}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {t('tournament.teams.points')}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {t('tournament.teams.matchPoints')}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {t('tournament.teams.matches')}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {t('tournament.teams.performance')}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                {t('common.actions')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedStandings.map(standing => (
              <TableRow
                key={standing.team.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => handleShowTeamDetails(standing)}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getRankIcon(standing.rank)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: standing.team.color,
                        width: 32,
                        height: 32,
                      }}
                    >
                      <People fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        {standing.team.name}
                      </Typography>
                      {standing.team.captain && (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          <Star fontSize="small" color="primary" />
                          <Typography variant="caption" color="text.secondary">
                            {standing.team.captain}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body1" fontWeight={600}>
                    {formatScore(standing.points)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    /{standing.games_played}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body1" fontWeight={600}>
                    {formatScore(standing.match_points)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box>
                    <Typography variant="body2">
                      {standing.matches_won}-{standing.matches_drawn}-
                      {standing.matches_lost}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      W-D-L
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 1,
                    }}
                  >
                    <Typography variant="body2">
                      {standing.performance_rating}
                    </Typography>
                    {getPerformanceTrend(
                      standing.performance_rating,
                      standing.average_rating
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    startIcon={<Assessment />}
                    onClick={e => {
                      e.stopPropagation();
                      handleShowTeamDetails(standing);
                    }}
                  >
                    {t('tournament.teams.details')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {standings.length === 0 && !loading && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {t('tournament.teams.noStandingsMessage')}
        </Alert>
      )}

      {/* Team Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {selectedTeam && (
              <>
                <Avatar sx={{ bgcolor: selectedTeam.team.color }}>
                  <People />
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedTeam.team.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('tournament.teams.rank')} {selectedTeam.rank} •{' '}
                    {formatScore(selectedTeam.points)}{' '}
                    {t('tournament.teams.points')}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTeam && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {t('tournament.teams.teamStats')}
                    </Typography>
                    <Box
                      sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography>
                          {t('tournament.teams.matchPoints')}:
                        </Typography>
                        <Typography fontWeight={600}>
                          {formatScore(selectedTeam.match_points)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography>
                          {t('tournament.teams.boardPoints')}:
                        </Typography>
                        <Typography fontWeight={600}>
                          {formatScore(selectedTeam.board_points)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography>
                          {t('tournament.teams.buchholz')}:
                        </Typography>
                        <Typography fontWeight={600}>
                          {formatScore(selectedTeam.buchholz_score)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography>
                          {t('tournament.teams.sonneborn')}:
                        </Typography>
                        <Typography fontWeight={600}>
                          {formatScore(selectedTeam.sonneborn_berger_score)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography>
                          {t('tournament.teams.averageRating')}:
                        </Typography>
                        <Typography fontWeight={600}>
                          {selectedTeam.average_rating}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography>
                          {t('tournament.teams.performanceRating')}:
                        </Typography>
                        <Typography fontWeight={600}>
                          {selectedTeam.performance_rating}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {t('tournament.teams.teamMembers')}
                    </Typography>
                    <List dense>
                      {selectedTeam.members.map(member => (
                        <ListItem key={member.id} sx={{ px: 0 }}>
                          <ListItemText
                            primary={
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                }}
                              >
                                <Typography variant="body2">
                                  {member.board_number &&
                                    `${t('tournament.teams.board')} ${member.board_number}:`}
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                  {member.player_name}
                                </Typography>
                                {member.title && (
                                  <Chip
                                    label={member.title}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                                {member.is_captain && (
                                  <Star color="primary" fontSize="small" />
                                )}
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', gap: 2 }}>
                                <Typography variant="caption">
                                  {t('player.rating')}: {member.rating}
                                </Typography>
                                <Typography variant="caption">
                                  {t('tournament.teams.points')}:{' '}
                                  {formatScore(member.points)}
                                </Typography>
                                {member.performance_rating && (
                                  <Typography variant="caption">
                                    {t('tournament.teams.performance')}:{' '}
                                    {member.performance_rating}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamStandings;
