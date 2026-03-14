import type { Pairing, Round, StandingsCalculationResult } from '@dto/bindings';
import { commands } from '@dto/bindings';
import { parseBackendError } from '@shared/lib/errorUtils';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function useRoundManager(
  tournamentId: number,
  onRoundUpdate?: () => void
) {
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
  const [roundsWithGames, setRoundsWithGames] = useState<Set<number>>(
    new Set()
  );

  const fetchStandings = useCallback(async () => {
    try {
      setStandingsLoading(true);
      const standingsData = await commands.getTournamentStandings(tournamentId);
      setStandings(standingsData);
    } catch (_err) {
      // Don't show error for standings failure, it's not critical
    } finally {
      setStandingsLoading(false);
    }
  }, [tournamentId]);

  const checkRoundsWithGames = useCallback(async (rounds: Round[]) => {
    const roundsWithGamesSet = new Set<number>();

    for (const round of rounds) {
      try {
        const roundDetails = await commands.getRoundDetails(round.id);
        if (roundDetails.games.length > 0) {
          roundsWithGamesSet.add(round.id);
        }
      } catch (_err) {
        // Assume round has games if we can't check (safer)
        roundsWithGamesSet.add(round.id);
      }
    }

    setRoundsWithGames(roundsWithGamesSet);
  }, []);

  const fetchRounds = useCallback(async () => {
    try {
      setLoading(true);
      const [roundsData, currentRoundData] = await Promise.all([
        commands.getRoundsByTournament(tournamentId),
        commands.getCurrentRound(tournamentId),
      ]);

      setRounds(roundsData);
      setCurrentRound(currentRoundData || null);

      await checkRoundsWithGames(roundsData);
      await fetchStandings();
    } catch (_err) {
      setError(t('failedToLoadRounds'));
    } finally {
      setLoading(false);
    }
  }, [tournamentId, t, fetchStandings, checkRoundsWithGames]);

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
      const errorMessage = parseBackendError(
        err,
        t,
        'failedToUpdateRoundStatus'
      );
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

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
    } catch (_err) {
      setError(t('failedToCreateRound'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleGeneratePairings = async (roundNumber: number) => {
    try {
      setActionLoading(true);
      setError(null);

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
        if (roundToUpdate) {
          await handleUpdateRoundStatus(roundToUpdate.id, 'planned');
        }
        return;
      }

      await commands.createPairingsAsGames(tournamentId, roundNumber, pairings);

      if (roundToUpdate) {
        await handleUpdateRoundStatus(roundToUpdate.id, 'published');
      }

      setGeneratedPairings(pairings);
      setShowPairings(true);
    } catch (err) {
      const roundToUpdate = rounds.find(r => r.round_number === roundNumber);
      if (roundToUpdate) {
        await handleUpdateRoundStatus(roundToUpdate.id, 'planned');
      }

      const errorMessage = parseBackendError(
        err,
        t,
        'failedToGeneratePairings'
      );
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

  const handleCompleteRound = async (roundId: number) => {
    try {
      setActionLoading(true);
      await commands.completeRound(roundId);
      await fetchRounds();
      onRoundUpdate?.();
    } catch (err) {
      const errorMessage = parseBackendError(err, t, 'failedToCompleteRound');
      setError(errorMessage);
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
    } catch (_err) {
      setError(t('failedToCreateNextRound'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegeneratePairings = async (
    roundId: number,
    roundNumber: number
  ) => {
    try {
      setActionLoading(true);
      setError(null);

      await handleUpdateRoundStatus(roundId, 'planned');
      await handleGeneratePairings(roundNumber);
    } catch (err) {
      const errorMessage = parseBackendError(
        err,
        t,
        'failedToRegeneratePairings'
      );
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const clearError = () => setError(null);

  const closePairings = () => {
    setShowPairings(false);
    setGeneratedPairings([]);
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
  }, [fetchRounds]);

  return {
    // State
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

    // Setters
    setCreateRoundDialogOpen,
    setPairingMethod,
    clearError,
    closePairings,

    // Actions
    handleCreateRound,
    handleGeneratePairings,
    handleCreatePairingsAsGames,
    handleUpdateRoundStatus,
    handleCompleteRound,
    handleCreateNextRound,
    handleRegeneratePairings,

    // Derived
    getProgressPercentage,
  };
}
