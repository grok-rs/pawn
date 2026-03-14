import type {
  BatchValidationResult,
  GameResult,
  GameResultAudit,
  GameResultValidation,
  UpdateGameResult,
} from '@dto/bindings';
import { commands } from '@dto/bindings';
import { useCallback, useEffect, useRef, useState } from 'react';

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

export type { ResultEntry };

const REQUIRES_APPROVAL_TYPES = [
  'white_forfeit',
  'black_forfeit',
  'white_default',
  'black_default',
  'double_forfeit',
  'cancelled',
];

export function useResultsGrid(
  tournamentId: number,
  games: GameResult[],
  onResultsUpdated?: () => void,
  readOnly = false
) {
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

  // Initialize result entries from games
  useEffect(() => {
    const entries = new Map<number, ResultEntry>();
    for (const game of games) {
      entries.set(game.game.id, {
        gameId: game.game.id,
        result: game.game.result,
        resultType: game.game.result_type || undefined,
        resultReason: game.game.result_reason || undefined,
        arbiterNotes: game.game.arbiter_notes || undefined,
        isModified: false,
        requiresApproval: game.game.result_type
          ? REQUIRES_APPROVAL_TYPES.includes(game.game.result_type)
          : false,
      });
    }
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
          changed_by: 'current_user',
        });

        updateResultEntry(gameId, { validation });
        return validation;
      } catch (_error) {
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
        changed_by: 'current_user',
      }));

      const results = await commands.batchUpdateResults({
        tournament_id: tournamentId,
        updates,
        validate_only: true,
      });

      setValidationResults(results);

      results.results.forEach(([index, validation]) => {
        const entry = modifiedEntries[index];
        if (entry) {
          updateResultEntry(entry.gameId, { validation });
        }
      });
    } catch (_error) {}
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
        changed_by: 'current_user',
      }));

      const results = await commands.batchUpdateResults({
        tournament_id: tournamentId,
        updates,
        validate_only: false,
      });

      if (results.overall_valid) {
        setResultEntries(prev => {
          const newMap = new Map(prev);
          for (const entry of modifiedEntries) {
            newMap.set(entry.gameId, { ...entry, isModified: false });
          }
          return newMap;
        });

        onResultsUpdated?.();
      } else {
        setValidationResults(results);
      }
    } catch (_error) {
    } finally {
      setIsSaving(false);
    }
  }, [resultEntries, tournamentId, onResultsUpdated]);

  const handleBulkOperation = useCallback(
    async (
      operation: 'all_draws' | 'all_ongoing' | 'clear_all' | 'reset_modified'
    ) => {
      setBulkMenuAnchor(null);

      switch (operation) {
        case 'all_draws': {
          for (const gameResult of games) {
            if (gameResult.game.result !== '1/2-1/2') {
              handleResultChange(gameResult.game.id, '1/2-1/2');
            }
          }
          break;
        }

        case 'all_ongoing':
        case 'clear_all': {
          for (const gameResult of games) {
            if (gameResult.game.result !== '*') {
              handleResultChange(gameResult.game.id, '*');
            }
          }
          break;
        }

        case 'reset_modified': {
          setResultEntries(prev => {
            const newMap = new Map(prev);
            for (const entry of Array.from(prev.values()).filter(
              e => e.isModified
            )) {
              const originalGame = games.find(g => g.game.id === entry.gameId);
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
            }
            return newMap;
          });
          break;
        }
      }
    },
    [games, handleResultChange]
  );

  // Keyboard shortcuts
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
          const currentEntry = resultEntries.get(currentGame.game.id);
          result = currentEntry?.result === '0-1F' ? '1-0F' : '0-1F';
          break;
        }
        case 'd': {
          const currentEntryD = resultEntries.get(currentGame.game.id);
          result = currentEntryD?.result === '0-1D' ? '1-0D' : '0-1D';
          break;
        }
        case 'a':
          result = 'ADJ';
          break;
        case 't': {
          const currentEntryT = resultEntries.get(currentGame.game.id);
          result = currentEntryT?.result === '0-1T' ? '1-0T' : '0-1T';
          break;
        }
        case 'x':
          result = '0-0';
          break;
        case 'c':
          result = 'CANC';
          break;
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
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

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
            setShowKeyboardHelp(prev => !prev);
            break;
        }
        return;
      }

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
  ]);

  const handleShowAuditTrail = useCallback(async (gameId: number) => {
    try {
      const trail = await commands.getGameAuditTrail(gameId);
      setAuditTrail(trail);
      setSelectedAuditGame(gameId);
      setIsAuditDialogOpen(true);
    } catch (_error) {}
  }, []);

  const modifiedCount = Array.from(resultEntries.values()).filter(
    entry => entry.isModified
  ).length;
  const hasErrors = validationResults && !validationResults.overall_valid;

  return {
    // State
    resultEntries,
    selectedAuditGame,
    auditTrail,
    isAuditDialogOpen,
    isSaving,
    validationResults,
    selectedGameIndex,
    keyboardShortcutsEnabled,
    showKeyboardHelp,
    showMobileView,
    bulkMenuAnchor,
    showCsvImport,
    tableRef,

    // Derived
    modifiedCount,
    hasErrors,

    // Setters
    setIsAuditDialogOpen,
    setSelectedGameIndex,
    setKeyboardShortcutsEnabled,
    setShowKeyboardHelp,
    setShowMobileView,
    setBulkMenuAnchor,
    setShowCsvImport,

    // Actions
    updateResultEntry,
    handleResultChange,
    handleResultTypeChange,
    batchValidate,
    handleSaveAll,
    handleBulkOperation,
    handleShowAuditTrail,
  };
}
