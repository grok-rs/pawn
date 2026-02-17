import { commands } from '@dto/bindings';
import type { CreateRound, UpdateRoundStatus } from '@dto/bindings';

export const getRoundsByTournament = (tournamentId: number) => commands.getRoundsByTournament(tournamentId);
export const getRoundDetails = (roundId: number) => commands.getRoundDetails(roundId);
export const getCurrentRound = (tournamentId: number) => commands.getCurrentRound(tournamentId);
export const createRound = (data: CreateRound) => commands.createRound(data);
export const createNextRound = (tournamentId: number) => commands.createNextRound(tournamentId);
export const updateRoundStatus = (data: UpdateRoundStatus) => commands.updateRoundStatus(data);
export const completeRound = (roundId: number) => commands.completeRound(roundId);
export const generatePairings = (data: Parameters<typeof commands.generatePairings>[0]) => commands.generatePairings(data);
export const createPairingsAsGames = (
  tournamentId: number,
  roundNumber: number,
  pairings: Parameters<typeof commands.createPairingsAsGames>[2]
) => commands.createPairingsAsGames(tournamentId, roundNumber, pairings);
