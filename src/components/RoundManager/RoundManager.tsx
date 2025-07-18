import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid2 as Grid,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Add,
  CheckCircle,
  Schedule,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import { commands } from '../../dto/bindings';
import type {
  Round,
  Pairing,
  StandingsCalculationResult,
} from '../../dto/bindings';
import PairingsDisplay from '../PairingsDisplay';
import { StandingsTable } from '../StandingsTable';

interface RoundManagerProps {
  tournamentId: number;
  onRoundUpdate?: () => void;
}

const RoundManager: React.FC<RoundManagerProps> = ({
  tournamentId,
  onRoundUpdate,
}) => {
  const { t } = useTranslation();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createRoundDialogOpen, setCreateRoundDialogOpen] = useState(false);
  const [pairingMethod, setPairingMethod] = useState<string>('swiss');
  const [generatedPairings, setGeneratedPairings] = useState<Pairing[]>([]);
  const [showPairings, setShowPairings] = useState(false);
  const [standings, setStandings] = useState<StandingsCalculationResult | null>(
    null
  );
  const [standingsLoading, setStandingsLoading] = useState(false);

  const fetchStandings = useCallback(async () => {
    try {
      setStandingsLoading(true);
      const standingsData = await commands.getTournamentStandings(tournamentId);
      setStandings(standingsData);
    } catch (err) {
      console.error('Failed to fetch standings:', err);
      // Don't show error for standings failure, it's not critical
    } finally {
      setStandingsLoading(false);
    }
  }, [tournamentId]);

  const fetchRounds = useCallback(async () => {
    try {
      setLoading(true);
      const [roundsData, currentRoundData] = await Promise.all([
        commands.getRoundsByTournament(tournamentId),
        commands.getCurrentRound(tournamentId),
      ]);

      setRounds(roundsData);
      setCurrentRound(currentRoundData || null);

      // Also fetch current standings
      await fetchStandings();
    } catch (err) {
      console.error('Failed to fetch rounds:', err);
      setError(t('failedToLoadRounds'));
    } finally {
      setLoading(false);
    }
  }, [tournamentId, t, fetchStandings]);

  const handleCreateRound = async () => {
    try {
      setActionLoading(true);
      const nextRoundNumber =
        rounds.length > 0
          ? Math.max(...rounds.map(r => r.round_number)) + 1
          : 1;

      await commands.createRound({
        tournament_id: tournamentId,
        round_number: nextRoundNumber,
      });

      await fetchRounds();
      setCreateRoundDialogOpen(false);
      onRoundUpdate?.();
    } catch (err) {
      console.error('Failed to create round:', err);
      setError(t('failedToCreateRound'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleGeneratePairings = async (roundNumber: number) => {
    try {
      setActionLoading(true);
      setError(null); // Clear any previous errors

      // Find the round and update its status to 'pairing'
      const roundToUpdate = rounds.find(r => r.round_number === roundNumber);
      if (roundToUpdate) {
        await handleUpdateRoundStatus(roundToUpdate.id, 'pairing');
      }

      const pairings = await commands.generatePairings({
        tournament_id: tournamentId,
        round_number: roundNumber,
        pairing_method: pairingMethod,
      });

      if (pairings.length === 0) {
        setError(t('rounds.noPairingsGenerated'));
        // Reset status back to planned on error
        if (roundToUpdate) {
          await handleUpdateRoundStatus(roundToUpdate.id, 'planned');
        }
        return;
      }

      // Update status to 'published' after successful pairing generation
      if (roundToUpdate) {
        await handleUpdateRoundStatus(roundToUpdate.id, 'published');
      }

      setGeneratedPairings(pairings);
      setShowPairings(true);
    } catch (err) {
      console.error('Failed to generate pairings:', err);

      // Reset status back to planned on error
      const roundToUpdate = rounds.find(r => r.round_number === roundNumber);
      if (roundToUpdate) {
        await handleUpdateRoundStatus(roundToUpdate.id, 'planned');
      }

      // Extract more detailed error information
      let errorMessage = t('failedToGeneratePairings');
      if (err instanceof Error) {
        errorMessage += `: ${err.message}`;
      } else if (typeof err === 'string') {
        errorMessage += `: ${err}`;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage += `: ${String(err.message)}`;
      }

      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePairingsAsGames = async (
    pairings: Pairing[],
    roundNumber: number
  ) => {
    try {
      setActionLoading(true);
      await commands.createPairingsAsGames(tournamentId, roundNumber, pairings);

      // Start the round
      if (currentRound) {
        await commands.updateRoundStatus({
          round_id: currentRound.id,
          status: 'in_progress',
        });
      }

      await fetchRounds();
      setShowPairings(false);
      setGeneratedPairings([]);
      onRoundUpdate?.();
    } catch (err) {
      console.error('Failed to create games from pairings:', err);
      // Show more specific error message if available
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : t('failedToCreateGames');
      setError(`${t('failedToCreateGames')}: ${errorMessage}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRoundStatus = async (
    roundId: number,
    newStatus: string
  ) => {
    try {
      setActionLoading(true);
      await commands.updateRoundStatus({
        round_id: roundId,
        status: newStatus,
      });
      await fetchRounds();
      onRoundUpdate?.();
    } catch (err) {
      console.error('Failed to update round status:', err);
      setError(t('failedToUpdateRoundStatus'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteRound = async (roundId: number) => {
    try {
      setActionLoading(true);
      await commands.completeRound(roundId);
      await fetchRounds();
      onRoundUpdate?.();
    } catch (err) {
      console.error('Failed to complete round:', err);
      setError(t('failedToCompleteRound'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateNextRound = async () => {
    try {
      setActionLoading(true);
      await commands.createNextRound(tournamentId);
      await fetchRounds();
      onRoundUpdate?.();
    } catch (err) {
      console.error('Failed to create next round:', err);
      setError(t('failedToCreateNextRound'));
    } finally {
      setActionLoading(false);
    }
  };

  const getRoundStatusIcon = (status: string) => {
    switch (status) {
      case 'planned':
      case 'upcoming': // Backward compatibility
        return <RadioButtonUnchecked color="action" />;
      case 'pairing':
        return <Schedule color="info" />;
      case 'published':
        return <PlayArrow color="primary" />;
      case 'in_progress':
        return <Schedule color="warning" />;
      case 'finishing':
        return <Schedule color="warning" />;
      case 'completed':
        return <CheckCircle color="success" />;
      case 'verified':
        return <CheckCircle color="success" />;
      default:
        return <RadioButtonUnchecked />;
    }
  };

  const getRoundStatusColor = (
    status: string
  ): 'default' | 'warning' | 'success' | 'info' | 'primary' => {
    switch (status) {
      case 'planned':
      case 'upcoming': // Backward compatibility
        return 'default';
      case 'pairing':
        return 'info';
      case 'published':
        return 'primary';
      case 'in_progress':
      case 'finishing':
        return 'warning';
      case 'completed':
      case 'verified':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'planned':
        return t('rounds.status.planned');
      case 'upcoming': // Backward compatibility
        return t('rounds.status.planned');
      case 'pairing':
        return t('rounds.status.pairing');
      case 'published':
        return t('rounds.status.published');
      case 'in_progress':
        return t('rounds.status.inProgress');
      case 'finishing':
        return t('rounds.status.finishing');
      case 'completed':
        return t('rounds.status.completed');
      case 'verified':
        return t('rounds.status.verified');
      default:
        return t('rounds.status.unknown');
    }
  };

  const getProgressPercentage = () => {
    if (rounds.length === 0) return 0;
    const completedRounds = rounds.filter(
      r => r.status === 'completed' || r.status === 'verified'
    ).length;
    return (completedRounds / rounds.length) * 100;
  };

  useEffect(() => {
    fetchRounds();
  }, [tournamentId, fetchRounds]);

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
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
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
                label={`${t('round')} ${currentRound.round_number} - ${getStatusLabel(currentRound.status)}`}
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
          <Grid key={round.id} size={{ mobile: 12, tablet: 6, laptop: 4 }}>
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
                    label={getStatusLabel(round.status)}
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

                  {round.status === 'published' && (
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
                  )}

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
          onClose={() => {
            setShowPairings(false);
            setGeneratedPairings([]);
          }}
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
};

export default RoundManager;
