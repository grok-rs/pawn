import { commands } from '@dto/bindings';

export const getTournamentStandings = (tournamentId: number) => commands.getTournamentStandings(tournamentId);
export const getRealtimeStandings = (tournamentId: number) => commands.getRealtimeStandings(tournamentId);
export const forceRecalculateStandings = (tournamentId: number) => commands.forceRecalculateStandings(tournamentId);
export const clearStandingsCache = (tournamentId: number) => commands.clearStandingsCache(tournamentId);
