import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  TextField,
  Button,
  Chip,
  Typography,
  Alert,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Warning as WarningIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';

import type {
  GameResult,
  UpdateGameResult,
  GameResultValidation,
  BatchValidationResult,
  GameResultAudit,
} from '../../dto/bindings';

interface ResultsGridProps {
  tournamentId: number;
  roundNumber?: number;
  games: GameResult[];
  onResultsUpdated?: () => void;
  readOnly?: boolean;
}

interface ResultEntry {
  gameId: number;
  result: string;
  resultType?: string;
  resultReason?: string;
  arbiterNotes?: string;
  isModified: boolean;
  validation?: GameResultValidation;
  requiresApproval: boolean;
}

const RESULT_OPTIONS = [
  { value: '1-0', label: 'White wins (1-0)', standard: true },
  { value: '0-1', label: 'Black wins (0-1)', standard: true },
  { value: '1/2-1/2', label: 'Draw (½-½)', standard: true },
  { value: '*', label: 'Ongoing (*)', standard: true },
  { value: '0-1F', label: 'White forfeit', standard: false },
  { value: '1-0F', label: 'Black forfeit', standard: false },
  { value: '0-1D', label: 'White default', standard: false },
  { value: '1-0D', label: 'Black default', standard: false },
  { value: 'ADJ', label: 'Adjourned', standard: false },
  { value: '0-1T', label: 'Timeout (White)', standard: false },
  { value: '1-0T', label: 'Timeout (Black)', standard: false },
  { value: '0-0', label: 'Double forfeit', standard: false },
  { value: 'CANC', label: 'Cancelled', standard: false },
];

export const ResultsGrid: React.FC<ResultsGridProps> = ({
  tournamentId,
  roundNumber,
  games,
  onResultsUpdated,
  readOnly = false,
}) => {
  const [resultEntries, setResultEntries] = useState<Map<number, ResultEntry>>(new Map());
  const [selectedAuditGame, setSelectedAuditGame] = useState<number | null>(null);
  const [auditTrail, setAuditTrail] = useState<GameResultAudit[]>([]);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResults, setValidationResults] = useState<BatchValidationResult | null>(null);

  // Initialize result entries from games
  useEffect(() => {
    const entries = new Map<number, ResultEntry>();
    games.forEach(game => {
      entries.set(game.game.id, {
        gameId: game.game.id,
        result: game.game.result,
        resultType: game.game.result_type || undefined,
        resultReason: game.game.result_reason || undefined,
        arbiterNotes: game.game.arbiter_notes || undefined,
        isModified: false,
        requiresApproval: game.game.result_type ? 
          ['white_forfeit', 'black_forfeit', 'white_default', 'black_default', 'double_forfeit', 'cancelled']
            .includes(game.game.result_type) : false,
      });
    });
    setResultEntries(entries);
  }, [games]);

  const updateResultEntry = useCallback((gameId: number, updates: Partial<ResultEntry>) => {
    setResultEntries(prev => {
      const entry = prev.get(gameId);
      if (!entry) return prev;

      const updated = { ...entry, ...updates, isModified: true };
      const newMap = new Map(prev);
      newMap.set(gameId, updated);
      return newMap;
    });
  }, []);

  const validateResult = useCallback(async (gameId: number, result: string, resultType?: string) => {
    try {
      const validation = await invoke<GameResultValidation>('plugin:pawn|validate_game_result', {
        data: {
          game_id: gameId,
          result,
          result_type: resultType,
          tournament_id: tournamentId,
          changed_by: 'current_user', // This should come from user context
        },
      });

      updateResultEntry(gameId, { validation });
      return validation;
    } catch (error) {
      console.error('Failed to validate result:', error);
      return {
        is_valid: false,
        errors: ['Validation failed'],
        warnings: [],
      };
    }
  }, [tournamentId, updateResultEntry]);

  const handleResultChange = useCallback(async (gameId: number, result: string) => {
    updateResultEntry(gameId, { result });
    
    // Auto-validate on change
    if (result && result !== '*') {
      await validateResult(gameId, result);
    }
  }, [updateResultEntry, validateResult]);

  const handleResultTypeChange = useCallback(async (gameId: number, resultType: string) => {
    const entry = resultEntries.get(gameId);
    if (!entry) return;

    updateResultEntry(gameId, { resultType });
    
    // Re-validate with new type
    if (entry.result && entry.result !== '*') {
      await validateResult(gameId, entry.result, resultType);
    }
  }, [resultEntries, updateResultEntry, validateResult]);

  const batchValidate = useCallback(async () => {
    const modifiedEntries = Array.from(resultEntries.values()).filter(entry => entry.isModified);
    if (modifiedEntries.length === 0) return;

    try {
      const updates: UpdateGameResult[] = modifiedEntries.map(entry => ({
        game_id: entry.gameId,
        result: entry.result,
        result_type: entry.resultType || null,
        result_reason: entry.resultReason || null,
        arbiter_notes: entry.arbiterNotes || null,
        changed_by: 'current_user', // This should come from user context
      }));

      const results = await invoke<BatchValidationResult>('plugin:pawn|batch_update_results', {
        data: {
          tournament_id: tournamentId,
          updates,
          validate_only: true,
        },
      });

      setValidationResults(results);

      // Update individual validations
      results.results.forEach(([index, validation]) => {
        const entry = modifiedEntries[index];
        if (entry) {
          updateResultEntry(entry.gameId, { validation });
        }
      });
    } catch (error) {
      console.error('Batch validation failed:', error);
    }
  }, [resultEntries, tournamentId, updateResultEntry]);

  const handleSaveAll = useCallback(async () => {
    const modifiedEntries = Array.from(resultEntries.values()).filter(entry => entry.isModified);
    if (modifiedEntries.length === 0) return;

    setIsSaving(true);
    try {
      const updates: UpdateGameResult[] = modifiedEntries.map(entry => ({
        game_id: entry.gameId,
        result: entry.result,
        result_type: entry.resultType || null,
        result_reason: entry.resultReason || null,
        arbiter_notes: entry.arbiterNotes || null,
        changed_by: 'current_user', // This should come from user context
      }));

      const results = await invoke<BatchValidationResult>('plugin:pawn|batch_update_results', {
        data: {
          tournament_id: tournamentId,
          updates,
          validate_only: false,
        },
      });

      if (results.overall_valid) {
        // Mark all entries as saved
        setResultEntries(prev => {
          const newMap = new Map(prev);
          modifiedEntries.forEach(entry => {
            newMap.set(entry.gameId, { ...entry, isModified: false });
          });
          return newMap;
        });

        if (onResultsUpdated) {
          onResultsUpdated();
        }
      } else {
        setValidationResults(results);
      }
    } catch (error) {
      console.error('Failed to save results:', error);
    } finally {
      setIsSaving(false);
    }
  }, [resultEntries, tournamentId, onResultsUpdated]);

  const handleShowAuditTrail = useCallback(async (gameId: number) => {
    try {
      const trail = await invoke<GameResultAudit[]>('plugin:pawn|get_game_audit_trail', {
        gameId,
      });
      setAuditTrail(trail);
      setSelectedAuditGame(gameId);
      setIsAuditDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch audit trail:', error);
    }
  }, []);

  const modifiedCount = Array.from(resultEntries.values()).filter(entry => entry.isModified).length;
  const hasErrors = validationResults && !validationResults.overall_valid;

  return (
    <Box>
      <Grid container spacing={2} alignItems="center" mb={2}>
        <Grid item>
          <Typography variant="h6">
            Game Results {roundNumber ? `- Round ${roundNumber}` : ''}
          </Typography>
        </Grid>
        {!readOnly && (
          <>
            <Grid item>
              <Button
                variant="outlined"
                onClick={batchValidate}
                disabled={modifiedCount === 0}
              >
                Validate All ({modifiedCount})
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveAll}
                disabled={modifiedCount === 0 || isSaving}
                color={hasErrors ? "error" : "primary"}
              >
                Save All ({modifiedCount})
              </Button>
            </Grid>
          </>
        )}
      </Grid>

      {hasErrors && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Validation failed for some results. Please review and correct the errors.
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Board</TableCell>
              <TableCell>White</TableCell>
              <TableCell>Black</TableCell>
              <TableCell>Result</TableCell>
              {!readOnly && <TableCell>Type</TableCell>}
              {!readOnly && <TableCell>Reason/Notes</TableCell>}
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {games.map((gameResult, index) => {
              const entry = resultEntries.get(gameResult.game.id);
              if (!entry) return null;

              return (
                <TableRow key={gameResult.game.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{gameResult.white_player.name}</TableCell>
                  <TableCell>{gameResult.black_player.name}</TableCell>
                  
                  <TableCell>
                    {readOnly ? (
                      entry.result
                    ) : (
                      <FormControl size="small" fullWidth>
                        <Select
                          value={entry.result}
                          onChange={(e) => handleResultChange(gameResult.game.id, e.target.value)}
                        >
                          {RESULT_OPTIONS.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </TableCell>

                  {!readOnly && (
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={entry.resultType || ''}
                          onChange={(e) => handleResultTypeChange(gameResult.game.id, e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="">Standard</MenuItem>
                          <MenuItem value="white_forfeit">White Forfeit</MenuItem>
                          <MenuItem value="black_forfeit">Black Forfeit</MenuItem>
                          <MenuItem value="white_default">White Default</MenuItem>
                          <MenuItem value="black_default">Black Default</MenuItem>
                          <MenuItem value="timeout">Timeout</MenuItem>
                          <MenuItem value="adjourned">Adjourned</MenuItem>
                          <MenuItem value="double_forfeit">Double Forfeit</MenuItem>
                          <MenuItem value="cancelled">Cancelled</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                  )}

                  {!readOnly && (
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Reason/Notes"
                        value={entry.resultReason || ''}
                        onChange={(e) => updateResultEntry(gameResult.game.id, { resultReason: e.target.value })}
                      />
                    </TableCell>
                  )}

                  <TableCell>
                    <Box display="flex" gap={1} alignItems="center">
                      {entry.isModified && <Chip label="Modified" size="small" color="warning" />}
                      {entry.requiresApproval && <Chip label="Needs Approval" size="small" color="error" />}
                      {entry.validation?.errors && entry.validation.errors.length > 0 && (
                        <Tooltip title={entry.validation.errors.join(', ')}>
                          <WarningIcon color="error" />
                        </Tooltip>
                      )}
                      {entry.validation?.warnings && entry.validation.warnings.length > 0 && (
                        <Tooltip title={entry.validation.warnings.join(', ')}>
                          <WarningIcon color="warning" />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>

                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleShowAuditTrail(gameResult.game.id)}
                      title="View audit trail"
                    >
                      <HistoryIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Audit Trail Dialog */}
      <Dialog open={isAuditDialogOpen} onClose={() => setIsAuditDialogOpen(false)} maxWidth={false} fullWidth>
        <DialogTitle>
          Audit Trail - Game {selectedAuditGame}
        </DialogTitle>
        <DialogContent>
          {auditTrail.length === 0 ? (
            <Typography>No audit trail available</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Old Result</TableCell>
                    <TableCell>New Result</TableCell>
                    <TableCell>Changed By</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Approved</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditTrail.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{new Date(record.changed_at).toLocaleString()}</TableCell>
                      <TableCell>{record.old_result || 'N/A'}</TableCell>
                      <TableCell>{record.new_result}</TableCell>
                      <TableCell>{record.changed_by || 'System'}</TableCell>
                      <TableCell>{record.reason || ''}</TableCell>
                      <TableCell>
                        {record.approved ? (
                          <Chip label="Approved" color="success" size="small" />
                        ) : (
                          <Chip label="Pending" color="warning" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAuditDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};