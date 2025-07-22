import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Alert,
  TextField,
  InputAdornment,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  FileUpload,
  Edit,
  Delete,
  MoreVert,
  Search,
  Flag,
  Person,
  Email,
  Phone,
  EmojiEvents,
  Category,
  Groups,
  Schedule,
  History,
} from '@mui/icons-material';
import { commands } from '@dto/bindings';
import type { Player, TournamentDetails } from '@dto/bindings';
import AddPlayerForm from './AddPlayerForm';
import BulkImportDialog from './BulkImportDialog';
import PlayerCategoryManagement from './PlayerCategoryManagement';
import LateEntryDialog from './LateEntryDialog';
import PlayerWithdrawalDialog from './PlayerWithdrawalDialog';
import RatingHistoryDialog from './RatingHistoryDialog';

interface PlayerManagementProps {
  tournamentId: number;
  players: Player[];
  tournamentDetails?: TournamentDetails; // Add tournament details to check if tournament has started
  onPlayersUpdated: () => void;
}

function PlayerManagement({
  tournamentId,
  players,
  tournamentDetails,
  onPlayersUpdated,
}: PlayerManagementProps) {
  const { t } = useTranslation();
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [lateEntryOpen, setLateEntryOpen] = useState(false);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [ratingHistoryOpen, setRatingHistoryOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [managingPlayer, setManagingPlayer] = useState<Player | null>(null);
  const [ratingHistoryPlayer, setRatingHistoryPlayer] = useState<Player | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const filteredPlayers = players.filter(
    player =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (player.country_code &&
        player.country_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (player.title &&
        player.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    playerId: number
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedPlayerId(playerId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPlayerId(null);
  };

  const handleEditPlayer = () => {
    const player = players.find(p => p.id === selectedPlayerId);
    if (player) {
      setEditingPlayer(player);
      setAddPlayerOpen(true);
    }
    handleMenuClose();
  };

  const handleDeletePlayer = async () => {
    if (!selectedPlayerId) return;

    setLoading(true);
    try {
      await commands.deletePlayer(selectedPlayerId);
      onPlayersUpdated();
      setError(null);
    } catch (err) {
      console.error('Failed to delete player:', err);
      setError(t('failedToDeletePlayer'));
    } finally {
      setLoading(false);
      handleMenuClose();
    }
  };

  const handleManagePlayerStatus = () => {
    const player = players.find(p => p.id === selectedPlayerId);
    if (player) {
      setManagingPlayer(player);
      setWithdrawalDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleViewRatingHistory = () => {
    const player = players.find(p => p.id === selectedPlayerId);
    if (player) {
      setRatingHistoryPlayer(player);
      setRatingHistoryOpen(true);
    }
    handleMenuClose();
  };

  const handleAddPlayerSuccess = () => {
    setAddPlayerOpen(false);
    setEditingPlayer(null);
    onPlayersUpdated();
    setError(null);
  };

  const handleBulkImportSuccess = () => {
    setBulkImportOpen(false);
    onPlayersUpdated();
    setError(null);
  };

  const getStatusColor = (
    status: string
  ):
    | 'default'
    | 'primary'
    | 'secondary'
    | 'error'
    | 'info'
    | 'success'
    | 'warning' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'withdrawn':
        return 'error';
      case 'bye_requested':
        return 'warning';
      case 'late_entry':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography
          variant="h6"
          component="h2"
          color="text.primary"
          sx={{ fontWeight: 600 }}
        >
          {t('playerManagement')} ({players.length} {t('players')})
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="player management tabs"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
            },
          }}
        >
          <Tab icon={<Groups />} label={t('players')} iconPosition="start" />
          <Tab
            icon={<Category />}
            label={t('categories')}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Tab Panel 0: Players */}
      {tabValue === 0 && (
        <Box>
          {/* Actions */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setAddPlayerOpen(true)}
              >
                {t('addPlayer')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<FileUpload />}
                onClick={() => setBulkImportOpen(true)}
              >
                {t('importPlayers')}
              </Button>
              {/* Show Late Entry button if tournament has started */}
              {(tournamentDetails?.tournament?.rounds_played || 0) > 0 && (
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<Schedule />}
                  onClick={() => setLateEntryOpen(true)}
                >
                  {t('lateEntry')}
                </Button>
              )}
            </Box>
          </Box>

          {/* Search */}
          <TextField
            fullWidth
            variant="outlined"
            placeholder={t('searchPlayers')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          {/* Players Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('name')}</TableCell>
                  <TableCell>{t('rating')}</TableCell>
                  <TableCell>{t('title')}</TableCell>
                  <TableCell>{t('country')}</TableCell>
                  <TableCell>{t('contact')}</TableCell>
                  <TableCell>{t('status')}</TableCell>
                  <TableCell>{t('registered')}</TableCell>
                  <TableCell align="right">{t('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPlayers.map(player => (
                  <TableRow key={player.id} hover>
                    <TableCell>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Person fontSize="small" color="action" />
                        <Typography variant="subtitle2" fontWeight={500}>
                          {player.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {player.rating ? (
                        <Chip
                          label={player.rating}
                          variant="outlined"
                          size="small"
                          color="primary"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {t('unrated')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {player.title ? (
                        <Chip
                          label={t(`title.${player.title}`, player.title)}
                          size="small"
                          color="secondary"
                          icon={<EmojiEvents />}
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {player.country_code ? (
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <Flag fontSize="small" />
                          {t(
                            `country.${player.country_code}`,
                            player.country_code
                          )}
                        </Box>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.5,
                        }}
                      >
                        {player.email && (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            <Email fontSize="small" color="action" />
                            <Typography variant="caption">
                              {player.email}
                            </Typography>
                          </Box>
                        )}
                        {player.phone && (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            <Phone fontSize="small" color="action" />
                            <Typography variant="caption">
                              {player.phone}
                            </Typography>
                          </Box>
                        )}
                        {!player.email && !player.phone && '-'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t(
                          `playerStatus.${player.status}`,
                          player.status
                        )}
                        size="small"
                        color={getStatusColor(player.status)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(player.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={e => handleMenuClick(e, player.id)}
                        disabled={loading}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPlayers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ py: 4 }}
                      >
                        {searchTerm
                          ? t('noPlayersMatchSearch')
                          : t('noPlayersRegistered')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab Panel 1: Categories */}
      {tabValue === 1 && (
        <Box>
          <PlayerCategoryManagement
            tournamentId={tournamentId}
            players={players}
            onCategoriesUpdated={onPlayersUpdated}
          />
        </Box>
      )}

      {/* Loading indicator */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* Player Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditPlayer}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          {t('editPlayer')}
        </MenuItem>
        <MenuItem onClick={handleViewRatingHistory}>
          <History fontSize="small" sx={{ mr: 1 }} />
          {t('ratingHistory')}
        </MenuItem>
        <MenuItem onClick={handleManagePlayerStatus}>
          <Person fontSize="small" sx={{ mr: 1 }} />
          {t('manageStatus')}
        </MenuItem>
        <MenuItem onClick={handleDeletePlayer} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          {t('deletePlayer')}
        </MenuItem>
      </Menu>

      {/* Add/Edit Player Dialog */}
      <AddPlayerForm
        open={addPlayerOpen}
        onClose={() => {
          setAddPlayerOpen(false);
          setEditingPlayer(null);
        }}
        onSuccess={handleAddPlayerSuccess}
        tournamentId={tournamentId}
        editingPlayer={editingPlayer}
      />

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onSuccess={handleBulkImportSuccess}
        tournamentId={tournamentId}
      />

      {/* Late Entry Dialog */}
      <LateEntryDialog
        open={lateEntryOpen}
        onClose={() => setLateEntryOpen(false)}
        onSuccess={() => {
          setLateEntryOpen(false);
          onPlayersUpdated();
        }}
        tournamentId={tournamentId}
        tournamentDetails={tournamentDetails || null}
      />

      {/* Player Withdrawal Dialog */}
      <PlayerWithdrawalDialog
        open={withdrawalDialogOpen}
        onClose={() => {
          setWithdrawalDialogOpen(false);
          setManagingPlayer(null);
        }}
        onSuccess={() => {
          setWithdrawalDialogOpen(false);
          setManagingPlayer(null);
          onPlayersUpdated();
        }}
        player={managingPlayer}
      />

      {/* Rating History Dialog */}
      <RatingHistoryDialog
        open={ratingHistoryOpen}
        onClose={() => {
          setRatingHistoryOpen(false);
          setRatingHistoryPlayer(null);
        }}
        player={ratingHistoryPlayer}
      />
    </Box>
  );
}

export default PlayerManagement;
