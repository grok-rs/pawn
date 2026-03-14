import type { Player, TournamentDetails } from '@dto/bindings';
import {
  Add,
  Category,
  Delete,
  Edit,
  Email,
  EmojiEvents,
  FileUpload,
  Flag,
  Groups,
  History,
  MoreVert,
  Person,
  Phone,
  Schedule,
  Search,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
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
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AddPlayerForm from './AddPlayerForm';
import BulkImportDialog from './BulkImportDialog';
import LateEntryDialog from './LateEntryDialog';
import PlayerCategoryManagement from './PlayerCategoryManagement';
import PlayerWithdrawalDialog from './PlayerWithdrawalDialog';
import RatingHistoryDialog from './RatingHistoryDialog';
import { getStatusColor, usePlayerManagement } from './usePlayerManagement';

interface PlayerManagementProps {
  tournamentId: number;
  players: Player[];
  tournamentDetails?: TournamentDetails;
  onPlayersUpdated: () => void;
}

function PlayerManagement({
  tournamentId,
  players,
  tournamentDetails,
  onPlayersUpdated,
}: PlayerManagementProps) {
  const { t } = useTranslation();
  const {
    addPlayerOpen,
    bulkImportOpen,
    lateEntryOpen,
    withdrawalDialogOpen,
    ratingHistoryOpen,
    editingPlayer,
    managingPlayer,
    ratingHistoryPlayer,
    searchTerm,
    anchorEl,
    loading,
    error,
    tabValue,
    filteredPlayers,
    setAddPlayerOpen,
    setBulkImportOpen,
    setLateEntryOpen,
    setSearchTerm,
    clearError,
    handleTabChange,
    handleMenuClick,
    handleMenuClose,
    handleEditPlayer,
    handleDeletePlayer,
    handleManagePlayerStatus,
    handleViewRatingHistory,
    handleAddPlayerSuccess,
    handleBulkImportSuccess,
    closeAddPlayer,
    closeWithdrawal,
    onWithdrawalSuccess,
    closeRatingHistory,
    onLateEntrySuccess,
  } = usePlayerManagement(players, onPlayersUpdated);

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
        <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
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
                  <TableCell>{t('title.label')}</TableCell>
                  <TableCell>{t('country.label')}</TableCell>
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
        onClose={closeAddPlayer}
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
        onSuccess={onLateEntrySuccess}
        tournamentId={tournamentId}
        tournamentDetails={tournamentDetails || null}
      />

      {/* Player Withdrawal Dialog */}
      <PlayerWithdrawalDialog
        open={withdrawalDialogOpen}
        onClose={closeWithdrawal}
        onSuccess={onWithdrawalSuccess}
        player={managingPlayer}
      />

      {/* Rating History Dialog */}
      <RatingHistoryDialog
        open={ratingHistoryOpen}
        onClose={closeRatingHistory}
        player={ratingHistoryPlayer}
      />
    </Box>
  );
}

export default PlayerManagement;
