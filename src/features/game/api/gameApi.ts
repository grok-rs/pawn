import { commands } from '@dto/bindings';
import type { ValidateGameResult, UpdateGameResult, BatchUpdateResults, CsvResultImport } from '@dto/bindings';

export const validateGameResult = (data: ValidateGameResult) => commands.validateGameResult(data);
export const updateGameResult = (data: UpdateGameResult) => commands.updateGameResult(data);
export const batchUpdateResults = (data: BatchUpdateResults) => commands.batchUpdateResults(data);
export const getGameAuditTrail = (gameId: number) => commands.getGameAuditTrail(gameId);
export const importResultsCsv = (data: CsvResultImport) => commands.importResultsCsv(data);
