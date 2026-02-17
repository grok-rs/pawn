import { commands } from '@dto/bindings';
import type { CreateTournament, UpdateTournamentSettings, UpdateTournamentStatus, UpdateTournamentPairingMethod } from '@dto/bindings';

export const getTournaments = () => commands.getTournaments();
export const getTournamentDetails = (tournamentId: number) => commands.getTournamentDetails(tournamentId);
export const createTournament = (data: CreateTournament) => commands.createTournament(data);
export const deleteTournament = (id: number) => commands.deleteTournament(id);
export const populateMockTournaments = () => commands.populateMockTournaments();
export const populateMockData = (tournamentId: number) => commands.populateMockData(tournamentId);
export const getTournamentSettings = (tournamentId: number) => commands.getTournamentSettings(tournamentId);
export const updateTournamentSettings = (data: UpdateTournamentSettings) => commands.updateTournamentSettings(data);
export const updateTournamentStatus = (data: UpdateTournamentStatus) => commands.updateTournamentStatus(data);
export const updateTournamentPairingMethod = (data: UpdateTournamentPairingMethod) => commands.updateTournamentPairingMethod(data);
export const exportTournamentData = (request: Parameters<typeof commands.exportTournamentData>[0]) => commands.exportTournamentData(request);
