import type { GameResult } from '@dto/bindings';
import { commands } from '@dto/bindings';
import {
  Add,
  CheckCircle,
  Delete,
  EditNote,
  PlayArrow,
  Refresh,
  Stop,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PairingsDisplay from './PairingsDisplay';
import {
  getRoundStatusColor,
  getRoundStatusIcon,
  getStatusLabel,
} from './roundStatusUtils';
import { useRoundManager } from './useRoundManager';

interface RoundManagerProps {
  tournamentId: number;
  totalRounds: number;
  onRoundUpdate?: () => void;
}

function RoundManager({
  tournamentId,
  totalRounds,
  onRoundUpdate,
}: RoundManagerProps) {
  const { t } = useTranslation();
  const {
    rounds,
    currentRound,
    loading,
    actionLoading,
    error,
    createRoundDialogOpen,
    pairingMethod,
    generatedPairings,
    showPairings,
    roundsWithGames,
    setCreateRoundDialogOpen,
    setPairingMethod,
    clearError,
    closePairings,
    handleCreateRound,
    handleGeneratePairings,
    handleCreatePairingsAsGames,
    handleUpdateRoundStatus,
    handleCompleteRound,
    handleCreateNextRound,
    handleRegeneratePairings,
    handleDeleteRound,
    handleSwapGameColors,
    handleDeleteGameFromRound,
  } = useRoundManager(tournamentId, onRoundUpdate);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roundToDelete, setRoundToDelete] = useState<number | null>(null);
  const [editPairingsGames, setEditPairingsGames] = useState<GameResult[]>([]);
  const [editPairingsRoundNumber, setEditPairingsRoundNumber] = useState(0);
  const [editPairingsOpen, setEditPairingsOpen] = useState(false);

  const handleEditPairings = async (roundId: number, roundNumber: number) => {
    try {
      const details = await commands.getRoundDetails(roundId);
      setEditPairingsGames(details.games);
      setEditPairingsRoundNumber(roundNumber);
      setEditPairingsOpen(true);
    } catch (_err) {
      // handled by error state
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      {/* Round Progress Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              {t('rounds.tournamentProgress')}
            </Typography>
            <Button
              startIcon={<Add />}
              variant="contained"
              onClick={() => setCreateRoundDialogOpen(true)}
              disabled={actionLoading}
            >
              {t('rounds.newRound')}
            </Button>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                {t('rounds.roundsCompleted')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {
                  rounds.filter(
                    r => r.status === 'completed' || r.status === 'verified'
                  ).length
                }{' '}
                / {totalRounds}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={
                totalRounds > 0
                  ? (rounds.filter(
                      r => r.status === 'completed' || r.status === 'verified'
                    ).length /
                      totalRounds) *
                    100
                  : 0
              }
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {currentRound && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {t('rounds.currentRound')}
              </Typography>
              <Chip
                icon={getRoundStatusIcon(currentRound.status)}
                label={`${t('round')} ${currentRound.round_number} - ${getStatusLabel(currentRound.status, t)}`}
                color={getRoundStatusColor(currentRound.status)}
                variant="outlined"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Rounds List */}
      <Grid container spacing={3}>
        {rounds.map(round => (
          <Grid key={round.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              sx={{
                height: '100%',
                border: currentRound?.id === round.id ? 2 : 1,
                borderColor:
                  currentRound?.id === round.id ? 'primary.main' : 'divider',
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" fontWeight={600}>
                    {t('round')} {round.round_number}
                  </Typography>
                  <Chip
                    icon={getRoundStatusIcon(round.status)}
                    label={getStatusLabel(round.status, t)}
                    color={getRoundStatusColor(round.status)}
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('rounds.created')}{' '}
                  {new Date(round.created_at).toLocaleDateString()}
                </Typography>

                {round.completed_at && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t('rounds.completed')}{' '}
                    {new Date(round.completed_at).toLocaleDateString()}
                  </Typography>
                )}

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {(round.status === 'planned' ||
                    round.status === 'upcoming') && (
                    <Button
                      size="small"
                      startIcon={<PlayArrow />}
                      onClick={() => handleGeneratePairings(round.round_number)}
                      disabled={actionLoading}
                    >
                      {t('rounds.generatePairings')}
                    </Button>
                  )}

                  {round.status === 'pairing' && (
                    <Button size="small" variant="outlined" disabled={true}>
                      {t('rounds.generatingPairings')}...
                    </Button>
                  )}

                  {round.status === 'published' &&
                    (roundsWithGames.has(round.id) ? (
                      <>
                        <Button
                          size="small"
                          startIcon={<PlayArrow />}
                          color="primary"
                          onClick={() =>
                            handleUpdateRoundStatus(round.id, 'in_progress')
                          }
                          disabled={actionLoading}
                        >
                          {t('rounds.startRound')}
                        </Button>
                        <Button
                          size="small"
                          startIcon={<EditNote />}
                          onClick={() =>
                            handleEditPairings(round.id, round.round_number)
                          }
                          disabled={actionLoading}
                        >
                          {t('pairingEdit.editPairings')}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="small"
                        startIcon={<Refresh />}
                        color="warning"
                        onClick={() =>
                          handleRegeneratePairings(round.id, round.round_number)
                        }
                        disabled={actionLoading}
                      >
                        {t('rounds.regeneratePairings')}
                      </Button>
                    ))}

                  {(round.status === 'in_progress' ||
                    round.status === 'finishing') && (
                    <Button
                      size="small"
                      startIcon={<Stop />}
                      color="warning"
                      onClick={() => handleCompleteRound(round.id)}
                      disabled={actionLoading}
                    >
                      {t('rounds.completeRound')}
                    </Button>
                  )}

                  {round.status === 'completed' && (
                    <Button
                      size="small"
                      startIcon={<CheckCircle />}
                      color="success"
                      onClick={() =>
                        handleUpdateRoundStatus(round.id, 'verified')
                      }
                      disabled={actionLoading}
                    >
                      {t('rounds.verifyRound')}
                    </Button>
                  )}

                  {round.status === 'verified' &&
                    currentRound?.id === round.id && (
                      <Button
                        size="small"
                        startIcon={<Add />}
                        onClick={handleCreateNextRound}
                        disabled={actionLoading}
                      >
                        {t('rounds.nextRound')}
                      </Button>
                    )}

                  {round.status !== 'in_progress' &&
                    round.status !== 'finishing' && (
                      <Button
                        size="small"
                        startIcon={<Delete />}
                        color="error"
                        onClick={() => {
                          setRoundToDelete(round.id);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={actionLoading}
                      >
                        {t('delete')}
                      </Button>
                    )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {rounds.length === 0 && (
          <Grid size={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {t('rounds.noRoundsYet')}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  {t('rounds.createFirstRoundDescription')}
                </Typography>
                <Button
                  startIcon={<Add />}
                  variant="contained"
                  onClick={() => setCreateRoundDialogOpen(true)}
                  disabled={actionLoading}
                >
                  {t('rounds.createFirstRound')}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Create Round Dialog */}
      <Dialog
        open={createRoundDialogOpen}
        onClose={() => setCreateRoundDialogOpen(false)}
        fullWidth
        PaperProps={{
          sx: { maxWidth: 'sm', margin: 'auto' },
        }}
      >
        <DialogTitle>{t('rounds.createNewRound')}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>{t('rounds.pairingMethod')}</InputLabel>
            <Select
              value={pairingMethod}
              label={t('rounds.pairingMethod')}
              onChange={e => setPairingMethod(e.target.value)}
            >
              <MenuItem value="swiss">{t('rounds.swissSystem')}</MenuItem>
              <MenuItem value="round_robin">{t('rounds.roundRobin')}</MenuItem>
              <MenuItem value="manual">{t('rounds.manual')}</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateRoundDialogOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleCreateRound}
            variant="contained"
            disabled={actionLoading}
          >
            {actionLoading ? (
              <CircularProgress size={20} />
            ) : (
              t('rounds.createRound')
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pairings Dialog */}
      {showPairings && (
        <PairingsDisplay
          open={showPairings}
          pairings={generatedPairings}
          roundNumber={currentRound?.round_number || 1}
          onClose={closePairings}
          onConfirm={pairings =>
            handleCreatePairingsAsGames(
              pairings,
              currentRound?.round_number || 1
            )
          }
          loading={actionLoading}
        />
      )}

      {/* Delete Round Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>{t('confirmDeleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography>{t('rounds.confirmDeleteRound')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              if (roundToDelete !== null) {
                await handleDeleteRound(roundToDelete);
              }
              setDeleteDialogOpen(false);
              setRoundToDelete(null);
            }}
            disabled={actionLoading}
          >
            {t('delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Pairings Dialog */}
      <Dialog
        open={editPairingsOpen}
        onClose={() => setEditPairingsOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {t('pairingEdit.editPairings')} — {t('round')}{' '}
          {editPairingsRoundNumber}
        </DialogTitle>
        <DialogContent dividers>
          {editPairingsGames.length === 0 ? (
            <Typography color="text.secondary">
              {t('pairings.noPairingsMessage')}
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {editPairingsGames.map(gr => (
                <Card key={gr.game.id} variant="outlined">
                  <CardContent
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      '&:last-child': { pb: 1 },
                    }}
                  >
                    <Typography variant="body2">
                      {gr.white_player.name} vs {gr.black_player.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        onClick={async () => {
                          await handleSwapGameColors(gr.game.id);
                          handleEditPairings(
                            rounds.find(
                              r => r.round_number === editPairingsRoundNumber
                            )?.id ?? 0,
                            editPairingsRoundNumber
                          );
                        }}
                        disabled={actionLoading}
                      >
                        {t('pairings.swapColors')}
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={async () => {
                          await handleDeleteGameFromRound(gr.game.id);
                          handleEditPairings(
                            rounds.find(
                              r => r.round_number === editPairingsRoundNumber
                            )?.id ?? 0,
                            editPairingsRoundNumber
                          );
                        }}
                        disabled={actionLoading}
                      >
                        {t('delete')}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPairingsOpen(false)}>
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>

      {actionLoading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
          }}
        >
          <LinearProgress />
        </Box>
      )}
    </Box>
  );
}

export default RoundManager;
