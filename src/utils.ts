import type { Tournament } from './dto/bindings';

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
