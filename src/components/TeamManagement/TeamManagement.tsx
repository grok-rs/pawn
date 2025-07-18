import React, { useState, useEffect } from 'react';
import {
  Box,
  // Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid2 as Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Avatar,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  People,
  Person,
  Star,
  // DragHandle,
  // Close,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { commands } from '@dto/bindings';

// Types from bindings - these will be auto-generated once bindings are updated
interface Team {
  id: number;
  tournament_id: number;
  name: string;
  captain?: string;
  description?: string;
  color?: string;
  club_affiliation?: string;
  contact_email?: string;
  contact_phone?: string;
  max_board_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Player {
  id: number;
  tournament_id: number;
  name: string;
  rating?: number;
  title?: string;
  country_code?: string;
  birth_date?: string;
  gender?: string;
  email?: string;
  phone?: string;
  club?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TeamMembership {
  id: number;
  team_id: number;
  player_id: number;
  board_number?: number;
  is_captain: boolean;
  is_reserve: boolean;
  rating_at_assignment?: number;
  notes?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// interface CreateTeamData {
//   tournament_id: number;
//   name: string;
//   captain?: string;
//   description?: string;
//   color?: string;
//   club_affiliation?: string;
//   contact_email?: string;
//   contact_phone?: string;
//   max_board_count: number;
// }

// interface AddPlayerToTeamData {
//   team_id: number;
//   player_id: number;
//   board_number?: number;
//   is_captain: boolean;
//   is_reserve: boolean;
//   rating_at_assignment?: number;
//   notes?: string;
// }

// interface TeamStatistics {
//   total_teams: number;
//   active_teams: number;
//   withdrawn_teams: number;
//   disqualified_teams: number;
//   total_players: number;
//   matches_played: number;
//   matches_completed: number;
//   matches_scheduled: number;
//   average_team_rating: number;
// }

interface TeamManagementProps {
  tournamentId: number;
  onTeamsChange?: (teams: Team[]) => void;
}

const TEAM_COLORS = [
  '#1976d2', // Blue
  '#d32f2f', // Red
  '#388e3c', // Green
  '#f57c00', // Orange
  '#7b1fa2', // Purple
  '#0288d1', // Light Blue
  '#689f38', // Light Green
  '#fbc02d', // Yellow
];

const TeamManagement: React.FC<TeamManagementProps> = ({
  tournamentId,
  onTeamsChange,
}) => {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [_editDialogOpen, _setEditDialogOpen] = useState(false);
  const [playerDialogOpen, setPlayerDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [newTeamColor, setNewTeamColor] = useState(TEAM_COLORS[0]);
  const [newTeamCaptain, setNewTeamCaptain] = useState('');
  const [newTeamMaxBoards, setNewTeamMaxBoards] = useState(4);
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [boardNumber, setBoardNumber] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load teams, players, and memberships from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load players from API
        const playersData = await commands.getPlayersByTournament(tournamentId);
        setPlayers(playersData as Player[]);

        // TODO: Load teams and memberships once bindings are regenerated
        // const teamsData = await commands.getTeamsByTournament(tournamentId);
        // setTeams(teamsData);

        // For now, use mock data for teams until bindings are ready
        setTeams([]);
        setTeamMemberships([]);
      } catch (err) {
        console.error('Error loading team data:', err);
        setError('Failed to load team data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tournamentId]);

  const getTeamMembers = (teamId: number) => {
    return teamMemberships
      .filter(membership => membership.team_id === teamId)
      .sort((a, b) => (a.board_number || 0) - (b.board_number || 0))
      .map(membership => {
        const player = players.find(p => p.id === membership.player_id);
        return { ...membership, player };
      });
  };

  const handleCreateTeam = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Use real API call once bindings are regenerated
      // const teamData: CreateTeamData = {
      //   tournament_id: tournamentId,
      //   name: newTeamName,
      //   captain: newTeamCaptain || undefined,
      //   description: newTeamDescription || undefined,
      //   color: newTeamColor,
      //   max_board_count: newTeamMaxBoards,
      // };
      // const newTeam = await commands.createTeam(teamData);

      // For now, simulate the API call
      const newTeam: Team = {
        id: teams.length + 1,
        tournament_id: tournamentId,
        name: newTeamName,
        captain: newTeamCaptain || undefined,
        description: newTeamDescription || undefined,
        color: newTeamColor,
        max_board_count: newTeamMaxBoards,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setTeams([...teams, newTeam]);
      setCreateDialogOpen(false);
      setNewTeamName('');
      setNewTeamDescription('');
      setNewTeamColor(TEAM_COLORS[0]);
      setNewTeamCaptain('');
      setNewTeamMaxBoards(4);

      if (onTeamsChange) {
        onTeamsChange([...teams, newTeam]);
      }
    } catch (err) {
      console.error('Error creating team:', err);
      setError('Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = (teamId: number) => {
    // In real implementation, this would be an API call
    const updatedTeams = teams.filter(team => team.id !== teamId);
    setTeams(updatedTeams);
    setTeamMemberships(
      teamMemberships.filter(membership => membership.team_id !== teamId)
    );

    if (onTeamsChange) {
      onTeamsChange(updatedTeams);
    }
  };

  const handleAddPlayerToTeam = () => {
    if (!selectedTeam || !selectedPlayer) return;

    // Check if player is already in the team
    const existingMembership = teamMemberships.find(
      membership =>
        membership.team_id === selectedTeam.id &&
        membership.player_id === selectedPlayer
    );

    if (existingMembership) {
      return; // Player already in team
    }

    // In real implementation, this would be an API call
    const newMembership: TeamMembership = {
      id: teamMemberships.length + 1,
      team_id: selectedTeam.id,
      player_id: selectedPlayer,
      board_number: boardNumber,
      is_captain: false,
      is_reserve: false,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTeamMemberships([...teamMemberships, newMembership]);
    setPlayerDialogOpen(false);
    setSelectedPlayer(null);
    setBoardNumber(1);
  };

  const handleRemovePlayer = (membershipId: number) => {
    // In real implementation, this would be an API call
    setTeamMemberships(
      teamMemberships.filter(membership => membership.id !== membershipId)
    );
  };

  const getAvailablePlayers = () => {
    if (!selectedTeam) return [];

    const teamPlayerIds = teamMemberships
      .filter(membership => membership.team_id === selectedTeam.id)
      .map(membership => membership.player_id);

    return players.filter(player => !teamPlayerIds.includes(player.id));
  };

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
          {t('tournament.teams.management')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          {t('tournament.teams.createTeam')}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Loading team data...
        </Alert>
      )}

      {teams.length === 0 && !loading ? (
        <Alert severity="info">{t('tournament.teams.noTeamsMessage')}</Alert>
      ) : (
        <Grid container spacing={3}>
          {teams.map(team => (
            <Grid size={{ mobile: 12, tablet: 6 }} key={team.id}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Avatar sx={{ bgcolor: team.color }}>
                      <People />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {team.name}
                      </Typography>
                      {team.description && (
                        <Typography variant="body2" color="text.secondary">
                          {team.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      sx={{ mb: 1 }}
                    >
                      {t('tournament.teams.members')}
                    </Typography>
                    <List dense>
                      {getTeamMembers(team.id).map(membership => (
                        <ListItem key={membership.id} sx={{ px: 0 }}>
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
                                  {t('tournament.teams.board')}{' '}
                                  {membership.board_number}:
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                  {membership.player?.name}
                                </Typography>
                                {membership.player?.title && (
                                  <Chip
                                    label={membership.player.title}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                                {membership.is_captain && (
                                  <Star color="primary" fontSize="small" />
                                )}
                              </Box>
                            }
                            secondary={
                              membership.player?.rating && (
                                <Typography variant="caption">
                                  {t('player.rating')}:{' '}
                                  {membership.player.rating}
                                </Typography>
                              )
                            }
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              size="small"
                              onClick={() => handleRemovePlayer(membership.id)}
                            >
                              <Delete />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<Person />}
                    onClick={() => {
                      setSelectedTeam(team);
                      setPlayerDialogOpen(true);
                    }}
                  >
                    {t('tournament.teams.addPlayer')}
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => {
                      setSelectedTeam(team);
                      _setEditDialogOpen(true);
                    }}
                  >
                    {t('common.edit')}
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => handleDeleteTeam(team.id)}
                  >
                    {t('common.delete')}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Team Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth={false}
        fullWidth
      >
        <DialogTitle>{t('tournament.teams.createTeam')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t('tournament.teams.teamName')}
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label={t('tournament.teams.description')}
            value={newTeamDescription}
            onChange={e => setNewTeamDescription(e.target.value)}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label={t('tournament.teams.captain')}
            value={newTeamCaptain}
            onChange={e => setNewTeamCaptain(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            type="number"
            label={t('tournament.teams.maxBoardCount')}
            value={newTeamMaxBoards}
            onChange={e => setNewTeamMaxBoards(Number(e.target.value))}
            inputProps={{ min: 1, max: 10 }}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>{t('tournament.teams.teamColor')}</InputLabel>
            <Select
              value={newTeamColor}
              onChange={e => setNewTeamColor(e.target.value)}
              label={t('tournament.teams.teamColor')}
            >
              {TEAM_COLORS.map((color, index) => (
                <MenuItem key={color} value={color}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        bgcolor: color,
                      }}
                    />
                    {t('tournament.teams.color')} {index + 1}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleCreateTeam}
            disabled={!newTeamName.trim() || loading}
            variant="contained"
          >
            {loading ? 'Creating...' : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Player Dialog */}
      <Dialog
        open={playerDialogOpen}
        onClose={() => setPlayerDialogOpen(false)}
        maxWidth={false}
        fullWidth
      >
        <DialogTitle>
          {t('tournament.teams.addPlayerToTeam', {
            teamName: selectedTeam?.name,
          })}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>{t('tournament.teams.selectPlayer')}</InputLabel>
            <Select
              value={selectedPlayer || ''}
              onChange={e => setSelectedPlayer(Number(e.target.value))}
              label={t('tournament.teams.selectPlayer')}
            >
              {getAvailablePlayers().map(player => (
                <MenuItem key={player.id} value={player.id}>
                  <Box>
                    <Typography>
                      {player.name}
                      {player.title && ` (${player.title})`}
                    </Typography>
                    {player.rating && (
                      <Typography variant="caption" color="text.secondary">
                        {t('player.rating')}: {player.rating}
                      </Typography>
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            type="number"
            label={t('tournament.teams.boardNumber')}
            value={boardNumber}
            onChange={e => setBoardNumber(Number(e.target.value))}
            inputProps={{ min: 1, max: 10 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlayerDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleAddPlayerToTeam}
            disabled={!selectedPlayer}
            variant="contained"
          >
            {t('tournament.teams.addPlayer')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamManagement;
