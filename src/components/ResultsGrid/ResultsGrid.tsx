import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  Typography,
  Alert,
  Grid2 as Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
  Menu,
  Divider,
  Chip,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Save as SaveIcon,
  Warning as WarningIcon,
  History as HistoryIcon,
  PhoneAndroid as PhoneIcon,
  Computer as ComputerIcon,
  FlashOn as BulkIcon,
  ExpandMore as ExpandMoreIcon,
  Clear as ClearIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { commands } from '@dto/bindings';
import type {
  GameResult,
  UpdateGameResult,
  GameResultValidation,
  BatchValidationResult,
  GameResultAudit,
} from '@dto/bindings';

import { MobileResultEntry } from './MobileResultEntry';
import { CsvImportDialog } from './CsvImportDialog';

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

// RESULT_OPTIONS will be created inside the component to access translations

export const ResultsGrid: React.FC<ResultsGridProps> = ({
  tournamentId,
  roundNumber,
  games,
  onResultsUpdated,
  readOnly = false,
}) => {
  const { t } = useTranslation();

  // Create result options with translations
  const RESULT_OPTIONS = [
    { value: '1-0', label: t('gameResults.results.whiteWins'), standard: true },
    { value: '0-1', label: t('gameResults.results.blackWins'), standard: true },
    { value: '1/2-1/2', label: t('gameResults.results.draw'), standard: true },
    { value: '*', label: t('gameResults.results.ongoing'), standard: true },
    {
      value: '0-1F',
      label: t('gameResults.results.whiteForfeit'),
      standard: false,
    },
    {
      value: '1-0F',
      label: t('gameResults.results.blackForfeit'),
      standard: false,
    },
    {
      value: '0-1D',
      label: t('gameResults.results.whiteDefault'),
      standard: false,
    },
    {
      value: '1-0D',
      label: t('gameResults.results.blackDefault'),
      standard: false,
    },
    {
      value: 'ADJ',
      label: t('gameResults.results.adjourned'),
      standard: false,
    },
    {
      value: '0-1T',
      label: t('gameResults.results.whiteTimeout'),
      standard: false,
    },
    {
      value: '1-0T',
      label: t('gameResults.results.blackTimeout'),
      standard: false,
    },
    {
      value: '0-0',
      label: t('gameResults.results.doubleForfeit'),
      standard: false,
    },
    {
      value: 'CANC',
      label: t('gameResults.results.cancelled'),
      standard: false,
    },
  ];

  const [resultEntries, setResultEntries] = useState<Map<number, ResultEntry>>(
    new Map()
  );
  const [selectedAuditGame, setSelectedAuditGame] = useState<number | null>(
    null
  );
  const [auditTrail, setAuditTrail] = useState<GameResultAudit[]>([]);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResults, setValidationResults] =
    useState<BatchValidationResult | null>(null);
  const [selectedGameIndex, setSelectedGameIndex] = useState<number>(0);
  const [keyboardShortcutsEnabled, setKeyboardShortcutsEnabled] =
    useState(true);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showMobileView, setShowMobileView] = useState(false);
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [showCsvImport, setShowCsvImport] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('laptop'));

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
        requiresApproval: game.game.result_type
          ? [
              'white_forfeit',
              'black_forfeit',
              'white_default',
              'black_default',
              'double_forfeit',
              'cancelled',
            ].includes(game.game.result_type)
          : false,
      });
    });
    setResultEntries(entries);
  }, [games]);

  const updateResultEntry = useCallback(
    (gameId: number, updates: Partial<ResultEntry>) => {
      setResultEntries(prev => {
        const entry = prev.get(gameId);
        if (!entry) return prev;

        const updated = { ...entry, ...updates, isModified: true };
        const newMap = new Map(prev);
        newMap.set(gameId, updated);
        return newMap;
      });
    },
    []
  );

  const validateResult = useCallback(
    async (gameId: number, result: string, resultType?: string) => {
      try {
        const validation = await commands.validateGameResult({
          game_id: gameId,
          result,
          result_type: resultType || null,
          tournament_id: tournamentId,
          changed_by: 'current_user', // This should come from user context
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
    },
    [tournamentId, updateResultEntry]
  );

  const handleResultChange = useCallback(
    async (gameId: number, result: string) => {
      updateResultEntry(gameId, { result });

      // Auto-validate on change
      if (result && result !== '*') {
        await validateResult(gameId, result);
      }
    },
    [updateResultEntry, validateResult]
  );

  const handleResultTypeChange = useCallback(
    async (gameId: number, resultType: string) => {
      const entry = resultEntries.get(gameId);
      if (!entry) return;

      updateResultEntry(gameId, { resultType });

      // Re-validate with new type
      if (entry.result && entry.result !== '*') {
        await validateResult(gameId, entry.result, resultType);
      }
    },
    [resultEntries, updateResultEntry, validateResult]
  );

  const batchValidate = useCallback(async () => {
    const modifiedEntries = Array.from(resultEntries.values()).filter(
      entry => entry.isModified
    );
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

      const results = await commands.batchUpdateResults({
        tournament_id: tournamentId,
        updates,
        validate_only: true,
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
    const modifiedEntries = Array.from(resultEntries.values()).filter(
      entry => entry.isModified
    );
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

      const results = await commands.batchUpdateResults({
        tournament_id: tournamentId,
        updates,
        validate_only: false,
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

  // Bulk operations
  const handleBulkOperation = useCallback(
    async (
      operation: 'all_draws' | 'all_ongoing' | 'clear_all' | 'reset_modified'
    ) => {
      setBulkMenuAnchor(null);

      switch (operation) {
        case 'all_draws': {
          games.forEach(gameResult => {
            if (gameResult.game.result !== '1/2-1/2') {
              handleResultChange(gameResult.game.id, '1/2-1/2');
            }
          });
          break;
        }

        case 'all_ongoing': {
          games.forEach(gameResult => {
            if (gameResult.game.result !== '*') {
              handleResultChange(gameResult.game.id, '*');
            }
          });
          break;
        }

        case 'clear_all': {
          games.forEach(gameResult => {
            if (gameResult.game.result !== '*') {
              handleResultChange(gameResult.game.id, '*');
            }
          });
          break;
        }

        case 'reset_modified': {
          setResultEntries(prev => {
            const newMap = new Map(prev);
            Array.from(prev.values())
              .filter(entry => entry.isModified)
              .forEach(entry => {
                const originalGame = games.find(
                  g => g.game.id === entry.gameId
                );
                if (originalGame) {
                  newMap.set(entry.gameId, {
                    ...entry,
                    result: originalGame.game.result,
                    resultType: originalGame.game.result_type || undefined,
                    resultReason: originalGame.game.result_reason || undefined,
                    arbiterNotes: originalGame.game.arbiter_notes || undefined,
                    isModified: false,
                    validation: undefined,
                  });
                }
              });
            return newMap;
          });
          break;
        }
      }
    },
    [games, handleResultChange]
  );

  // Keyboard shortcuts functionality
  const handleKeyboardShortcut = useCallback(
    (key: string) => {
      if (readOnly || !keyboardShortcutsEnabled || games.length === 0) return;

      const currentGame = games[selectedGameIndex];
      if (!currentGame) return;

      let result: string | null = null;

      switch (key.toLowerCase()) {
        case '1':
          result = '1-0';
          break;
        case '0':
          result = '0-1';
          break;
        case '=':
        case 'equal':
          result = '1/2-1/2';
          break;
        case '*':
          result = '*';
          break;
        case 'f': {
          // Cycle through forfeit options
          const currentEntry = resultEntries.get(currentGame.game.id);
          if (currentEntry?.result === '0-1F') {
            result = '1-0F';
          } else {
            result = '0-1F';
          }
          break;
        }
        case 'd': {
          // Cycle through default options
          const currentEntryD = resultEntries.get(currentGame.game.id);
          if (currentEntryD?.result === '0-1D') {
            result = '1-0D';
          } else {
            result = '0-1D';
          }
          break;
        }
        case 'a': {
          result = 'ADJ';
          break;
        }
        case 't': {
          // Cycle through timeout options
          const currentEntryT = resultEntries.get(currentGame.game.id);
          if (currentEntryT?.result === '0-1T') {
            result = '1-0T';
          } else {
            result = '0-1T';
          }
          break;
        }
        case 'x': {
          result = '0-0';
          break;
        }
        case 'c': {
          result = 'CANC';
          break;
        }
        default:
          return;
      }

      if (result) {
        handleResultChange(currentGame.game.id, result);
      }
    },
    [
      readOnly,
      keyboardShortcutsEnabled,
      games,
      selectedGameIndex,
      resultEntries,
      handleResultChange,
    ]
  );

  const navigateGames = useCallback(
    (direction: 'up' | 'down') => {
      if (games.length === 0) return;

      if (direction === 'up' && selectedGameIndex > 0) {
        setSelectedGameIndex(selectedGameIndex - 1);
      } else if (direction === 'down' && selectedGameIndex < games.length - 1) {
        setSelectedGameIndex(selectedGameIndex + 1);
      }
    },
    [games.length, selectedGameIndex]
  );

  // Keyboard event listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere with typing in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Handle navigation
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        navigateGames('up');
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        navigateGames('down');
        return;
      }

      // Handle shortcuts with Ctrl/Cmd modifier for safety
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            handleSaveAll();
            break;
          case 'Enter':
            event.preventDefault();
            batchValidate();
            break;
          case '?':
            event.preventDefault();
            setShowKeyboardHelp(!showKeyboardHelp);
            break;
        }
        return;
      }

      // Handle result shortcuts
      handleKeyboardShortcut(event.key);
    };

    if (keyboardShortcutsEnabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [
    keyboardShortcutsEnabled,
    navigateGames,
    handleKeyboardShortcut,
    handleSaveAll,
    batchValidate,
    showKeyboardHelp,
  ]);

  const handleShowAuditTrail = useCallback(async (gameId: number) => {
    try {
      const trail = await commands.getGameAuditTrail(gameId);
      setAuditTrail(trail);
      setSelectedAuditGame(gameId);
      setIsAuditDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch audit trail:', error);
    }
  }, []);

  const modifiedCount = Array.from(resultEntries.values()).filter(
    entry => entry.isModified
  ).length;
  const hasErrors = validationResults && !validationResults.overall_valid;

  // Show mobile view if enabled or on mobile screen
  if (showMobileView || (isMobileScreen && !readOnly)) {
    return (
      <MobileResultEntry
        tournamentId={tournamentId}
        games={games}
        onResultsUpdated={onResultsUpdated}
        onClose={() => setShowMobileView(false)}
      />
    );
  }

  return (
    <Box>
      <Grid container spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
        <Grid>
          <Typography variant="h6" color="primary" fontWeight={600}>
            {t('gameResults.title')}{' '}
            {roundNumber
              ? `- ${t('gameResults.roundTitle', { roundNumber })}`
              : ''}
          </Typography>
        </Grid>
        {!readOnly && (
          <>
            <Grid>
              <Button
                variant="outlined"
                onClick={batchValidate}
                disabled={modifiedCount === 0}
              >
                {t('gameResults.buttons.validateAll')} ({modifiedCount})
              </Button>
            </Grid>
            <Grid>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveAll}
                disabled={modifiedCount === 0 || isSaving}
                color={hasErrors ? 'error' : 'primary'}
              >
                {t('gameResults.buttons.saveAll')} ({modifiedCount})
              </Button>
            </Grid>
            <Grid>
              <Button
                variant="outlined"
                startIcon={<BulkIcon />}
                endIcon={<ExpandMoreIcon />}
                onClick={e => setBulkMenuAnchor(e.currentTarget)}
                disabled={games.length === 0}
              >
                {t('gameResults.buttons.bulkOperations')}
              </Button>
              <Menu
                anchorEl={bulkMenuAnchor}
                open={Boolean(bulkMenuAnchor)}
                onClose={() => setBulkMenuAnchor(null)}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
              >
                <MenuItem
                  onClick={() => handleBulkOperation('all_draws')}
                  disabled={games.length === 0}
                >
                  <ListItemIcon>
                    <BulkIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('gameResults.bulk.setAllDraws')}
                    secondary={t('gameResults.bulk.setAllDrawsDesc')}
                  />
                </MenuItem>
                <MenuItem
                  onClick={() => handleBulkOperation('all_ongoing')}
                  disabled={games.length === 0}
                >
                  <ListItemIcon>
                    <BulkIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('gameResults.bulk.setAllOngoing')}
                    secondary={t('gameResults.bulk.setAllOngoingDesc')}
                  />
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    setBulkMenuAnchor(null);
                    setShowCsvImport(true);
                  }}
                >
                  <ListItemIcon>
                    <UploadIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('gameResults.bulk.importCsv')}
                    secondary={t('gameResults.bulk.importCsvDesc')}
                  />
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => handleBulkOperation('reset_modified')}
                  disabled={modifiedCount === 0}
                >
                  <ListItemIcon>
                    <ClearIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('gameResults.bulk.resetChanges')}
                    secondary={t('gameResults.bulk.resetChangesDesc', {
                      count: modifiedCount,
                    })}
                  />
                </MenuItem>
              </Menu>
            </Grid>
            <Grid>
              <Button
                variant="outlined"
                onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                size="small"
              >
                {t('gameResults.buttons.shortcuts')} (Ctrl+?)
              </Button>
            </Grid>
            <Grid>
              <FormControl>
                <Button
                  variant={keyboardShortcutsEnabled ? 'contained' : 'outlined'}
                  onClick={() =>
                    setKeyboardShortcutsEnabled(!keyboardShortcutsEnabled)
                  }
                  size="small"
                  color={keyboardShortcutsEnabled ? 'primary' : 'inherit'}
                >
                  {keyboardShortcutsEnabled
                    ? t('gameResults.buttons.shortcutsOn')
                    : t('gameResults.buttons.shortcutsOff')}
                </Button>
              </FormControl>
            </Grid>
            <Grid>
              <Button
                variant={showMobileView ? 'contained' : 'outlined'}
                onClick={() => setShowMobileView(!showMobileView)}
                size="small"
                startIcon={showMobileView ? <PhoneIcon /> : <ComputerIcon />}
                color={showMobileView ? 'primary' : 'inherit'}
              >
                {showMobileView
                  ? t('gameResults.buttons.mobile')
                  : t('gameResults.buttons.desktop')}
              </Button>
            </Grid>
          </>
        )}
      </Grid>

      {hasErrors && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('gameResults.messages.validationFailed')}
        </Alert>
      )}

      {showKeyboardHelp && !readOnly && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('gameResults.shortcuts.title')}
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ mobile: 12, tablet: 6 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('gameResults.shortcuts.resultEntry')}
                </Typography>
                <Typography variant="body2" component="div">
                  <strong>1</strong> - {t('gameResults.shortcuts.whiteWins')}
                  <br />
                  <strong>0</strong> - {t('gameResults.shortcuts.blackWins')}
                  <br />
                  <strong>=</strong> - {t('gameResults.shortcuts.draw')}
                  <br />
                  <strong>*</strong> - {t('gameResults.shortcuts.ongoing')}
                  <br />
                </Typography>
              </Grid>
              <Grid size={{ mobile: 12, tablet: 6 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('gameResults.shortcuts.specialResults')}
                </Typography>
                <Typography variant="body2" component="div">
                  <strong>F</strong> - {t('gameResults.shortcuts.forfeit')}
                  <br />
                  <strong>D</strong> - {t('gameResults.shortcuts.default')}
                  <br />
                  <strong>T</strong> - {t('gameResults.shortcuts.timeout')}
                  <br />
                  <strong>A</strong> - {t('gameResults.shortcuts.adjourned')}
                  <br />
                  <strong>X</strong> -{' '}
                  {t('gameResults.shortcuts.doubleForfeit')}
                  <br />
                  <strong>C</strong> - {t('gameResults.shortcuts.cancelled')}
                  <br />
                </Typography>
              </Grid>
              <Grid size={{ mobile: 12, tablet: 6 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('gameResults.shortcuts.navigation')}
                </Typography>
                <Typography variant="body2" component="div">
                  <strong>↑/↓</strong> -{' '}
                  {t('gameResults.shortcuts.navigateGames')}
                  <br />
                  <strong>Ctrl+S</strong> - {t('gameResults.shortcuts.saveAll')}
                  <br />
                  <strong>Ctrl+Enter</strong> -{' '}
                  {t('gameResults.shortcuts.validateAll')}
                  <br />
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <TableContainer component={Paper} ref={tableRef}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('gameResults.headers.board')}</TableCell>
              <TableCell>{t('gameResults.headers.white')}</TableCell>
              <TableCell>{t('gameResults.headers.black')}</TableCell>
              <TableCell>{t('gameResults.headers.result')}</TableCell>
              {!readOnly && (
                <TableCell>{t('gameResults.headers.type')}</TableCell>
              )}
              {!readOnly && (
                <TableCell>{t('gameResults.headers.reasonNotes')}</TableCell>
              )}
              <TableCell>{t('gameResults.headers.status')}</TableCell>
              <TableCell>{t('gameResults.headers.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {games.map((gameResult, index) => {
              const entry = resultEntries.get(gameResult.game.id);
              if (!entry) return null;

              const isSelected =
                !readOnly &&
                keyboardShortcutsEnabled &&
                index === selectedGameIndex;

              return (
                <TableRow
                  key={gameResult.game.id}
                  sx={{
                    backgroundColor: isSelected ? 'primary.main' : 'inherit',
                    color: isSelected ? 'primary.contrastText' : 'inherit',
                    '&:hover': {
                      backgroundColor: isSelected ? 'primary.dark' : 'grey.100',
                    },
                    cursor: !readOnly ? 'pointer' : 'default',
                  }}
                  onClick={() => !readOnly && setSelectedGameIndex(index)}
                >
                  <TableCell sx={{ color: 'inherit' }}>{index + 1}</TableCell>
                  <TableCell sx={{ color: 'inherit' }}>
                    {gameResult.white_player.name}
                  </TableCell>
                  <TableCell sx={{ color: 'inherit' }}>
                    {gameResult.black_player.name}
                  </TableCell>

                  <TableCell sx={{ color: 'inherit' }}>
                    {readOnly ? (
                      entry.result
                    ) : (
                      <FormControl size="small" fullWidth>
                        <Select
                          value={entry.result}
                          onChange={e =>
                            handleResultChange(
                              gameResult.game.id,
                              e.target.value
                            )
                          }
                          sx={{
                            '& .MuiSelect-select': {
                              color: isSelected
                                ? 'primary.contrastText'
                                : 'inherit',
                            },
                          }}
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
                    <TableCell sx={{ color: 'inherit' }}>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={entry.resultType || ''}
                          onChange={e =>
                            handleResultTypeChange(
                              gameResult.game.id,
                              e.target.value
                            )
                          }
                          displayEmpty
                          sx={{
                            '& .MuiSelect-select': {
                              color: isSelected
                                ? 'primary.contrastText'
                                : 'inherit',
                            },
                          }}
                        >
                          <MenuItem value="">
                            {t('gameResults.types.standard')}
                          </MenuItem>
                          <MenuItem value="white_forfeit">
                            {t('gameResults.types.whiteForfeit')}
                          </MenuItem>
                          <MenuItem value="black_forfeit">
                            {t('gameResults.types.blackForfeit')}
                          </MenuItem>
                          <MenuItem value="white_default">
                            {t('gameResults.types.whiteDefault')}
                          </MenuItem>
                          <MenuItem value="black_default">
                            {t('gameResults.types.blackDefault')}
                          </MenuItem>
                          <MenuItem value="timeout">
                            {t('gameResults.types.timeout')}
                          </MenuItem>
                          <MenuItem value="adjourned">
                            {t('gameResults.types.adjourned')}
                          </MenuItem>
                          <MenuItem value="double_forfeit">
                            {t('gameResults.types.doubleForfeit')}
                          </MenuItem>
                          <MenuItem value="cancelled">
                            {t('gameResults.types.cancelled')}
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                  )}

                  {!readOnly && (
                    <TableCell sx={{ color: 'inherit' }}>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder={t('gameResults.placeholders.reasonNotes')}
                        value={entry.resultReason || ''}
                        onChange={e =>
                          updateResultEntry(gameResult.game.id, {
                            resultReason: e.target.value,
                          })
                        }
                        sx={{
                          '& .MuiInputBase-input': {
                            color: isSelected
                              ? 'primary.contrastText'
                              : 'inherit',
                          },
                        }}
                      />
                    </TableCell>
                  )}

                  <TableCell sx={{ color: 'inherit' }}>
                    <Box display="flex" gap={1} alignItems="center">
                      {entry.isModified && (
                        <Chip
                          label={t('gameResults.status.modified')}
                          size="small"
                          color="warning"
                        />
                      )}
                      {entry.requiresApproval && (
                        <Chip
                          label={t('gameResults.status.needsApproval')}
                          size="small"
                          color="error"
                        />
                      )}
                      {entry.validation?.errors &&
                        entry.validation.errors.length > 0 && (
                          <Tooltip title={entry.validation.errors.join(', ')}>
                            <WarningIcon color="error" />
                          </Tooltip>
                        )}
                      {entry.validation?.warnings &&
                        entry.validation.warnings.length > 0 && (
                          <Tooltip title={entry.validation.warnings.join(', ')}>
                            <WarningIcon color="warning" />
                          </Tooltip>
                        )}
                    </Box>
                  </TableCell>

                  <TableCell sx={{ color: 'inherit' }}>
                    <IconButton
                      size="small"
                      onClick={() => handleShowAuditTrail(gameResult.game.id)}
                      title={t('gameResults.tooltips.auditTrail')}
                      sx={{
                        color: isSelected ? 'primary.contrastText' : 'inherit',
                      }}
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
      <Dialog
        open={isAuditDialogOpen}
        onClose={() => setIsAuditDialogOpen(false)}
        maxWidth={false}
        fullWidth
      >
        <DialogTitle>
          {t('gameResults.audit.title', { gameId: selectedAuditGame })}
        </DialogTitle>
        <DialogContent>
          {auditTrail.length === 0 ? (
            <Typography>{t('gameResults.audit.noData')}</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('gameResults.audit.headers.date')}</TableCell>
                    <TableCell>
                      {t('gameResults.audit.headers.oldResult')}
                    </TableCell>
                    <TableCell>
                      {t('gameResults.audit.headers.newResult')}
                    </TableCell>
                    <TableCell>
                      {t('gameResults.audit.headers.changedBy')}
                    </TableCell>
                    <TableCell>
                      {t('gameResults.audit.headers.reason')}
                    </TableCell>
                    <TableCell>
                      {t('gameResults.audit.headers.approved')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditTrail.map(record => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {new Date(record.changed_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {record.old_result || t('gameResults.audit.na')}
                      </TableCell>
                      <TableCell>{record.new_result}</TableCell>
                      <TableCell>
                        {record.changed_by || t('gameResults.audit.system')}
                      </TableCell>
                      <TableCell>{record.reason || ''}</TableCell>
                      <TableCell>
                        {record.approved ? (
                          <Chip
                            label={t('gameResults.audit.approved')}
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip
                            label={t('gameResults.audit.pending')}
                            color="warning"
                            size="small"
                          />
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
          <Button onClick={() => setIsAuditDialogOpen(false)}>
            {t('gameResults.buttons.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSV Import Dialog */}
      <CsvImportDialog
        open={showCsvImport}
        onClose={() => setShowCsvImport(false)}
        tournamentId={tournamentId}
        onImportComplete={() => {
          setShowCsvImport(false);
          if (onResultsUpdated) {
            onResultsUpdated();
          }
        }}
      />
    </Box>
  );
};
