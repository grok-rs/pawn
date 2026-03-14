import {
  Add,
  CheckCircle,
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
import { StandingsTable } from '@widgets/standings-table';
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
  onRoundUpdate?: () => void;
}

function RoundManager({ tournamentId, onRoundUpdate }: RoundManagerProps) {
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
    standings,
    standingsLoading,
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
    getProgressPercentage,
  } = useRoundManager(tournamentId, onRoundUpdate);

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

      {/* Current Standings */}
      {standings && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              {t('rounds.currentStandings')}
            </Typography>
            <Box sx={{ height: 400 }}>
              <StandingsTable
                standings={standings.standings}
                loading={standingsLoading}
              />
            </Box>
          </CardContent>
        </Card>
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
                / {rounds.length}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={getProgressPercentage()}
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
                    Round {round.round_number}
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
