import type { Round, Tournament } from '@dto/bindings';
import type { TFunction } from 'i18next';

const tournamentTypeKeys: Record<string, string> = {
  swiss: 'tournament.types.swiss.label',
  roundRobin: 'tournament.types.roundRobin.label',
  round_robin: 'tournament.types.roundRobin.label',
  knockout: 'tournament.types.knockout.label',
  elimination: 'tournament.types.elimination.label',
  scheveningen: 'tournament.types.scheveningen.label',
};

export const translateTournamentType = (
  type: string | null | undefined,
  t: TFunction
): string => {
  if (!type) return '-';
  const key = tournamentTypeKeys[type];
  return key ? t(key) : type;
};

export const formatLocalizedDate = (
  dateString: string,
  locale: string
): string => {
  try {
    const langMap: Record<string, string> = { ua: 'uk' };
    return new Date(dateString).toLocaleDateString(langMap[locale] || locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const isFinishedTournament = (tournament: Tournament): boolean => {
  return tournament.rounds_played === tournament.total_rounds;
};

export const isOngoingTournament = (tournament: Tournament): boolean => {
  return (
    tournament.rounds_played > 0 &&
    tournament.rounds_played < tournament.total_rounds
  );
};

export const isDraftTournament = (tournament: Tournament): boolean => {
  return tournament.rounds_played === 0;
};

// Enhanced tournament status functions using actual data
export const calculateActualRoundsPlayed = (rounds: Round[]): number => {
  return rounds.filter(round => round.status === 'Completed').length;
};

export const isFinishedTournamentActual = (
  tournament: Tournament,
  rounds: Round[]
): boolean => {
  const actualRoundsPlayed = calculateActualRoundsPlayed(rounds);
  return actualRoundsPlayed === tournament.total_rounds;
};

export const isOngoingTournamentActual = (
  tournament: Tournament,
  rounds: Round[]
): boolean => {
  const actualRoundsPlayed = calculateActualRoundsPlayed(rounds);
  return actualRoundsPlayed > 0 && actualRoundsPlayed < tournament.total_rounds;
};

export const isDraftTournamentActual = (
  _tournament: Tournament,
  rounds: Round[]
): boolean => {
  const actualRoundsPlayed = calculateActualRoundsPlayed(rounds);
  return actualRoundsPlayed === 0;
};

export const getTournamentStatusActual = (
  tournament: Tournament,
  rounds: Round[]
): 'draft' | 'ongoing' | 'finished' => {
  if (isFinishedTournamentActual(tournament, rounds)) {
    return 'finished';
  } else if (isOngoingTournamentActual(tournament, rounds)) {
    return 'ongoing';
  } else {
    return 'draft';
  }
};

export const getTournamentProgressActual = (
  tournament: Tournament,
  rounds: Round[]
): number => {
  const actualRoundsPlayed = calculateActualRoundsPlayed(rounds);
  return tournament.total_rounds > 0
    ? (actualRoundsPlayed / tournament.total_rounds) * 100
    : 0;
};
