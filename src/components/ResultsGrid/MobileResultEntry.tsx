import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  TextField,
  Alert,
  Slide,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Clear as ClearIcon,
  MoreVert as MoreIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Save as SaveIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';

import type {
  GameResult,
  UpdateGameResult,
  GameResultValidation,
} from '../../dto/bindings';

interface MobileResultEntryProps {
  tournamentId: number;
  games: GameResult[];
  onResultsUpdated?: () => void;
  onClose?: () => void;
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

const RESULT_BUTTONS = [
  { value: '1-0', label: '1-0', color: 'success', fullLabel: 'White wins' },
  { value: '1/2-1/2', label: '½-½', color: 'info', fullLabel: 'Draw' },
  { value: '0-1', label: '0-1', color: 'error', fullLabel: 'Black wins' },
  { value: '*', label: '*', color: 'warning', fullLabel: 'Ongoing' },
] as const;

const SPECIAL_RESULTS = [
  { value: '0-1F', label: 'W Forfeit', type: 'white_forfeit' },
  { value: '1-0F', label: 'B Forfeit', type: 'black_forfeit' },
  { value: '0-1D', label: 'W Default', type: 'white_default' },
  { value: '1-0D', label: 'B Default', type: 'black_default' },
  { value: '0-1T', label: 'W Timeout', type: 'timeout' },
  { value: '1-0T', label: 'B Timeout', type: 'timeout' },
  { value: 'ADJ', label: 'Adjourned', type: 'adjourned' },
  { value: '0-0', label: 'Dbl Forfeit', type: 'double_forfeit' },
  { value: 'CANC', label: 'Cancelled', type: 'cancelled' },
];

export const MobileResultEntry: React.FC<MobileResultEntryProps> = ({
  tournamentId,
  games,
  onResultsUpdated,
  onClose,
}) => {
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [resultEntries, setResultEntries] = useState<Map<number, ResultEntry>>(
    new Map()
  );
  const [showSpecialResults, setShowSpecialResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const currentGame = games[currentGameIndex];
  const currentEntry = currentGame
    ? resultEntries.get(currentGame.game.id)
    : null;

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

  const handleResultChange = useCallback(
    async (gameId: number, result: string, resultType?: string) => {
      updateResultEntry(gameId, { result, resultType });
      setValidationError(null);

      // Auto-validate on change
      if (result && result !== '*') {
        try {
          const validation = await invoke<GameResultValidation>(
            'plugin:pawn|validate_game_result',
            {
              data: {
                game_id: gameId,
                result,
                result_type: resultType,
                tournament_id: tournamentId,
                changed_by: 'current_user',
              },
            }
          );

          updateResultEntry(gameId, { validation });

          if (!validation.is_valid && validation.errors.length > 0) {
            setValidationError(validation.errors.join(', '));
          }
        } catch (error) {
          console.error('Failed to validate result:', error);
          setValidationError('Validation failed');
        }
      }
    },
    [tournamentId, updateResultEntry]
  );

  const handleSaveResult = useCallback(async () => {
    if (!currentGame || !currentEntry) return;

    setIsSaving(true);
    try {
      const updateData: UpdateGameResult = {
        game_id: currentEntry.gameId,
        result: currentEntry.result,
        result_type: currentEntry.resultType || null,
        result_reason: currentEntry.resultReason || null,
        arbiter_notes: currentEntry.arbiterNotes || null,
        changed_by: 'current_user',
      };

      await invoke('plugin:pawn|update_game_result', {
        data: updateData,
      });

      // Mark as saved
      updateResultEntry(currentEntry.gameId, { isModified: false });

      if (onResultsUpdated) {
        onResultsUpdated();
      }

      // Auto-advance to next game
      if (currentGameIndex < games.length - 1) {
        setCurrentGameIndex(currentGameIndex + 1);
      }
    } catch (error) {
      console.error('Failed to save result:', error);
      setValidationError('Failed to save result');
    } finally {
      setIsSaving(false);
    }
  }, [
    currentGame,
    currentEntry,
    currentGameIndex,
    games.length,
    onResultsUpdated,
    updateResultEntry,
  ]);

  const navigateGame = useCallback(
    (direction: 'prev' | 'next') => {
      if (direction === 'prev' && currentGameIndex > 0) {
        setCurrentGameIndex(currentGameIndex - 1);
      } else if (direction === 'next' && currentGameIndex < games.length - 1) {
        setCurrentGameIndex(currentGameIndex + 1);
      }
    },
    [currentGameIndex, games.length]
  );

  const modifiedCount = Array.from(resultEntries.values()).filter(
    entry => entry.isModified
  ).length;

  if (!currentGame) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <Typography variant="h6">No games available</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Header */}
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Board {currentGameIndex + 1} of {games.length}
          </Typography>
          {modifiedCount > 0 && (
            <Chip
              label={`${modifiedCount} modified`}
              color="warning"
              size="small"
              sx={{ mr: 1 }}
            />
          )}
          {onClose && (
            <IconButton color="inherit" onClick={onClose}>
              <ClearIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Game Information */}
      <Card sx={{ m: 2, mb: 1 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={5}>
              <Typography variant="h6" align="center">
                {currentGame.white_player.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                White
              </Typography>
            </Grid>
            <Grid item xs={2}>
              <Typography variant="h4" align="center" color="primary">
                vs
              </Typography>
            </Grid>
            <Grid item xs={5}>
              <Typography variant="h6" align="center">
                {currentGame.black_player.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                Black
              </Typography>
            </Grid>
          </Grid>

          {currentEntry && (
            <Box
              mt={2}
              display="flex"
              justifyContent="center"
              alignItems="center"
            >
              <Typography variant="h5" color="primary">
                Current: {currentEntry.result}
              </Typography>
              {currentEntry.isModified && (
                <Chip
                  label="Modified"
                  color="warning"
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Result Entry Buttons */}
      <Card sx={{ m: 2, mb: 1 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Select Result
          </Typography>

          {/* Standard Results */}
          <Grid container spacing={1} mb={2}>
            {RESULT_BUTTONS.map(button => (
              <Grid item xs={6} sm={3} key={button.value}>
                <Button
                  fullWidth
                  variant={
                    currentEntry?.result === button.value
                      ? 'contained'
                      : 'outlined'
                  }
                  color={
                    button.color as 'success' | 'info' | 'error' | 'warning'
                  }
                  size="large"
                  onClick={() =>
                    handleResultChange(currentGame.game.id, button.value)
                  }
                  sx={{ height: 60, flexDirection: 'column' }}
                >
                  <Typography variant="h6">{button.label}</Typography>
                  <Typography variant="caption">{button.fullLabel}</Typography>
                </Button>
              </Grid>
            ))}
          </Grid>

          {/* Special Results Toggle */}
          <Button
            fullWidth
            variant="outlined"
            onClick={() => setShowSpecialResults(!showSpecialResults)}
            startIcon={
              showSpecialResults ? <KeyboardArrowUpIcon /> : <MoreIcon />
            }
          >
            Special Results
          </Button>

          {/* Special Results */}
          <Slide
            direction="up"
            in={showSpecialResults}
            mountOnEnter
            unmountOnExit
          >
            <Grid container spacing={1} mt={1}>
              {SPECIAL_RESULTS.map(result => (
                <Grid item xs={6} sm={4} key={result.value}>
                  <Button
                    fullWidth
                    variant={
                      currentEntry?.result === result.value
                        ? 'contained'
                        : 'outlined'
                    }
                    color="secondary"
                    onClick={() =>
                      handleResultChange(
                        currentGame.game.id,
                        result.value,
                        result.type
                      )
                    }
                    sx={{ minHeight: 48 }}
                  >
                    <Typography variant="body2">{result.label}</Typography>
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Slide>
        </CardContent>
      </Card>

      {/* Validation Error */}
      {validationError && (
        <Alert severity="error" sx={{ m: 2, mb: 1 }}>
          {validationError}
        </Alert>
      )}

      {/* Advanced Options */}
      {currentEntry?.requiresApproval && (
        <Card sx={{ m: 2, mb: 1 }}>
          <CardContent>
            <Typography variant="body1" color="warning.main" gutterBottom>
              <WarningIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              This result requires arbiter approval
            </Typography>

            <TextField
              fullWidth
              label="Reason/Notes"
              multiline
              rows={2}
              value={currentEntry.resultReason || ''}
              onChange={e =>
                updateResultEntry(currentGame.game.id, {
                  resultReason: e.target.value,
                })
              }
              sx={{ mt: 2 }}
            />
          </CardContent>
        </Card>
      )}

      {/* Navigation and Action Buttons */}
      <Box sx={{ flexGrow: 1 }} />

      <Box
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<PrevIcon />}
              onClick={() => navigateGame('prev')}
              disabled={currentGameIndex === 0}
            >
              Prev
            </Button>
          </Grid>

          <Grid item xs={6}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              onClick={handleSaveResult}
              disabled={!currentEntry?.isModified || isSaving}
              startIcon={<SaveIcon />}
              sx={{ height: 48 }}
            >
              {isSaving ? 'Saving...' : 'Save & Next'}
            </Button>
          </Grid>

          <Grid item xs={3}>
            <Button
              fullWidth
              variant="outlined"
              endIcon={<NextIcon />}
              onClick={() => navigateGame('next')}
              disabled={currentGameIndex === games.length - 1}
            >
              Next
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};
