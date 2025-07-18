import { TFunction } from 'i18next';

/**
 * Parses backend errors and returns appropriate localized error messages
 * @param error - The error object from the backend
 * @param t - The translation function
 * @param defaultKey - Default translation key to use if no specific error is found
 * @returns Localized error message
 */
export function parseBackendError(
  error: unknown,
  t: TFunction,
  defaultKey: string
): string {
  // Extract error message from different error formats
  let errorString = '';

  if (error && typeof error === 'object') {
    // Check for details property first (Tauri error format)
    if ('details' in error && typeof error.details === 'string') {
      errorString = error.details;
    }
    // Fallback to message property
    else if ('message' in error) {
      errorString = String(error.message);
    }
  } else if (typeof error === 'string') {
    errorString = error;
  }

  // Handle special case where details contains "Invalid input: ACTUAL_ERROR"
  if (errorString.startsWith('Invalid input: ')) {
    errorString = errorString.replace('Invalid input: ', '');
  }

  // Handle round-specific errors
  if (errorString.startsWith('INCOMPLETE_GAMES_ERROR::')) {
    const incompleteCount = errorString.split('::')[1];
    if (incompleteCount === '0') {
      return t('rounds.errors.incompleteGames');
    } else {
      return t('rounds.errors.incompleteGamesCount', {
        count: parseInt(incompleteCount, 10),
      });
    }
  }

  if (errorString === 'ROUND_NO_PAIRINGS_ERROR') {
    return t('rounds.errors.noPairings');
  }

  if (errorString === 'ROUND_PUBLISHED_NO_GAMES_ERROR') {
    return t('rounds.errors.publishedNoGames');
  }

  if (errorString.startsWith('ROUND_INVALID_TRANSITION::')) {
    const parts = errorString.split('::');
    const fromStatus = parts[1];
    const toStatus = parts[2];
    return `Cannot transition round from ${fromStatus} to ${toStatus}`;
  }

  // Handle tournament-specific errors
  if (errorString.startsWith('TOURNAMENT_INCOMPLETE_GAMES_ERROR::')) {
    const incompleteCount = errorString.split('::')[1];
    if (incompleteCount === '0') {
      return t('tournament.errors.incompleteGames');
    } else {
      return t('tournament.errors.incompleteGamesCount', {
        count: parseInt(incompleteCount, 10),
      });
    }
  }

  if (errorString.startsWith('TOURNAMENT_INCOMPLETE_ROUNDS_ERROR::')) {
    const parts = errorString.split('::');
    const incompleteCount = parts[1];
    const totalCount = parts[2];
    return t('tournament.errors.incompleteRoundsCount', {
      incomplete: parseInt(incompleteCount, 10),
      total: parseInt(totalCount, 10),
    });
  }

  // If we have a specific error message, use it
  if (errorString) {
    return errorString;
  }

  // Fall back to default error message
  return t(defaultKey);
}

/**
 * Creates a tournament completion handler with error handling
 * @param tournamentId - The ID of the tournament to complete
 * @param t - The translation function
 * @param onSuccess - Callback to execute on successful completion
 * @param onError - Callback to execute on error
 * @returns Promise-based tournament completion handler
 */
export async function handleTournamentCompletion(
  tournamentId: number,
  t: TFunction,
  onSuccess: () => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    // Import commands dynamically to avoid circular dependencies
    const { commands } = await import('../dto/bindings');

    await commands.updateTournamentStatus({
      tournament_id: tournamentId,
      status: 'completed',
    });

    onSuccess();
  } catch (error) {
    const errorMessage = parseBackendError(error, t, 'failedToCompleteRound');
    onError(errorMessage);
  }
}
