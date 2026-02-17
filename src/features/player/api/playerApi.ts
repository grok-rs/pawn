import { commands } from '@dto/bindings';
import type { CreatePlayer, UpdatePlayer, BulkImportRequest, AssignPlayerToCategory, CreateRatingHistory } from '@dto/bindings';

export const getPlayersByTournamentEnhanced = (tournamentId: number) => commands.getPlayersByTournamentEnhanced(tournamentId);
export const getPlayersByTournament = (tournamentId: number) => commands.getPlayersByTournament(tournamentId);
export const createPlayerEnhanced = (data: CreatePlayer) => commands.createPlayerEnhanced(data);
export const updatePlayer = (data: UpdatePlayer) => commands.updatePlayer(data);
export const deletePlayer = (playerId: number) => commands.deletePlayer(playerId);
export const withdrawPlayer = (playerId: number) => commands.withdrawPlayer(playerId);
export const requestPlayerBye = (playerId: number) => commands.requestPlayerBye(playerId);
export const updatePlayerStatus = (playerId: number, status: string) => commands.updatePlayerStatus(playerId, status);
export const validateBulkImport = (request: BulkImportRequest) => commands.validateBulkImport(request);
export const bulkImportPlayers = (request: BulkImportRequest) => commands.bulkImportPlayers(request);
export const assignPlayerToCategory = (data: AssignPlayerToCategory) => commands.assignPlayerToCategory(data);
export const generatePairingNumbers = (request: Parameters<typeof commands.generatePairingNumbers>[0]) => commands.generatePairingNumbers(request);
export const getPlayerRatingHistory = (playerId: number) => commands.getPlayerRatingHistory(playerId);
export const addPlayerRatingHistory = (data: CreateRatingHistory) => commands.addPlayerRatingHistory(data);
