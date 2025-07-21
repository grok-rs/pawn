import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TFunction } from 'i18next';
import { parseBackendError, handleTournamentCompletion } from '../errorUtils';

// Mock the translation function
const createMockT = (): TFunction => {
  const mockT = vi.fn() as unknown as TFunction;
  (mockT as any).mockImplementation((key: string, options?: any) => {
    const translations: Record<string, string> = {
      'rounds.errors.incompleteGames':
        'There are incomplete games in this round',
      'rounds.errors.incompleteGamesCount':
        'There are {{count}} incomplete games in this round',
      'rounds.errors.noPairings':
        'No pairings have been generated for this round',
      'rounds.errors.publishedNoGames': 'Round is published but has no games',
      'tournament.errors.incompleteGames': 'Tournament has incomplete games',
      'tournament.errors.incompleteGamesCount':
        'Tournament has {{count}} incomplete games',
      'tournament.errors.incompleteRoundsCount':
        'Tournament has {{incomplete}} incomplete rounds out of {{total}} total rounds',
      'general.error': 'An error occurred',
      failedToCompleteRound: 'Failed to complete round',
    };

    let result = translations[key] || key;

    // Simple interpolation for testing
    if (options && typeof result === 'string') {
      Object.entries(options).forEach(([placeholder, value]) => {
        result = result.replace(`{{${placeholder}}}`, String(value));
      });
    }

    return result;
  });
  return mockT;
};

// Mock the bindings module
const mockCommands = {
  updateTournamentStatus: vi.fn(),
};

vi.mock('../../dto/bindings', () => ({
  commands: mockCommands,
}));

describe('errorUtils', () => {
  let mockT: TFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockT = createMockT();
  });

  describe('parseBackendError', () => {
    describe('Error format parsing', () => {
      it('should extract error from details property (Tauri format)', () => {
        const error = { details: 'Database connection failed' };
        const result = parseBackendError(error, mockT, 'general.error');
        expect(result).toBe('Database connection failed');
      });

      it('should extract error from message property', () => {
        const error = { message: 'Network timeout' };
        const result = parseBackendError(error, mockT, 'general.error');
        expect(result).toBe('Network timeout');
      });

      it('should handle string error directly', () => {
        const error = 'Simple error message';
        const result = parseBackendError(error, mockT, 'general.error');
        expect(result).toBe('Simple error message');
      });

      it('should prefer details over message when both exist', () => {
        const error = { details: 'Detailed error', message: 'Generic error' };
        const result = parseBackendError(error, mockT, 'general.error');
        expect(result).toBe('Detailed error');
      });

      it('should handle "Invalid input:" prefix', () => {
        const error = { details: 'Invalid input: Actual validation error' };
        const result = parseBackendError(error, mockT, 'general.error');
        expect(result).toBe('Actual validation error');
      });
    });

    describe('Round-specific error handling', () => {
      it('should handle incomplete games error with zero count', () => {
        const error = { details: 'INCOMPLETE_GAMES_ERROR::0' };
        const result = parseBackendError(error, mockT, 'general.error');
        expect(result).toBe('There are incomplete games in this round');
        expect(mockT).toHaveBeenCalledWith('rounds.errors.incompleteGames');
      });

      it('should handle incomplete games error with specific count', () => {
        const error = { details: 'INCOMPLETE_GAMES_ERROR::5' };
        const result = parseBackendError(error, mockT, 'general.error');
        expect(result).toBe('There are 5 incomplete games in this round');
        expect(mockT).toHaveBeenCalledWith(
          'rounds.errors.incompleteGamesCount',
          { count: 5 }
        );
      });

      it('should handle no pairings error', () => {
        const error = { details: 'ROUND_NO_PAIRINGS_ERROR' };
        const result = parseBackendError(error, mockT, 'general.error');
        expect(result).toBe('No pairings have been generated for this round');
        expect(mockT).toHaveBeenCalledWith('rounds.errors.noPairings');
      });

      it('should handle published no games error', () => {
        const error = { details: 'ROUND_PUBLISHED_NO_GAMES_ERROR' };
        const result = parseBackendError(error, mockT, 'general.error');
        expect(result).toBe('Round is published but has no games');
        expect(mockT).toHaveBeenCalledWith('rounds.errors.publishedNoGames');
      });

      it('should handle invalid transition error', () => {
        const error = { details: 'ROUND_INVALID_TRANSITION::Draft::Completed' };
        const result = parseBackendError(error, mockT, 'general.error');
        expect(result).toBe('Cannot transition round from Draft to Completed');
      });
    });

    describe('Tournament-specific error handling', () => {
      it('should handle tournament incomplete games error with zero count', () => {
        const error = { details: 'TOURNAMENT_INCOMPLETE_GAMES_ERROR::0' };
        const result = parseBackendError(error, mockT, 'general.error');
        expect(result).toBe('Tournament has incomplete games');
        expect(mockT).toHaveBeenCalledWith('tournament.errors.incompleteGames');
      });

      it('should handle tournament incomplete games error with specific count', () => {
        const error = { details: 'TOURNAMENT_INCOMPLETE_GAMES_ERROR::3' };
        const result = parseBackendError(error, mockT, 'general.error');
        expect(result).toBe('Tournament has 3 incomplete games');
        expect(mockT).toHaveBeenCalledWith(
          'tournament.errors.incompleteGamesCount',
          { count: 3 }
        );
      });

      it('should handle tournament incomplete rounds error', () => {
        const error = { details: 'TOURNAMENT_INCOMPLETE_ROUNDS_ERROR::2::7' };
        const result = parseBackendError(error, mockT, 'general.error');
        expect(result).toBe(
          'Tournament has 2 incomplete rounds out of 7 total rounds'
        );
        expect(mockT).toHaveBeenCalledWith(
          'tournament.errors.incompleteRoundsCount',
          {
            incomplete: 2,
            total: 7,
          }
        );
      });
    });

    describe('Fallback error handling', () => {
      it('should use default key when no error message is found', () => {
        const error = {};
        const result = parseBackendError(error, mockT, 'general.error');
        expect(result).toBe('An error occurred');
        expect(mockT).toHaveBeenCalledWith('general.error');
      });

      it('should use default key when error is null', () => {
        const result = parseBackendError(null, mockT, 'general.error');
        expect(result).toBe('An error occurred');
        expect(mockT).toHaveBeenCalledWith('general.error');
      });

      it('should use default key when error is undefined', () => {
        const result = parseBackendError(undefined, mockT, 'general.error');
        expect(result).toBe('An error occurred');
        expect(mockT).toHaveBeenCalledWith('general.error');
      });

      it('should handle empty string error', () => {
        const result = parseBackendError('', mockT, 'general.error');
        expect(result).toBe('An error occurred');
        expect(mockT).toHaveBeenCalledWith('general.error');
      });
    });

    describe('Edge cases', () => {
      it('should handle malformed incomplete games error', () => {
        const error = { details: 'INCOMPLETE_GAMES_ERROR::invalid' };
        parseBackendError(error, mockT, 'general.error');
        // Should parse as NaN but still call the translation
        expect(mockT).toHaveBeenCalledWith(
          'rounds.errors.incompleteGamesCount',
          { count: NaN }
        );
      });

      it('should handle incomplete transition error with missing parts', () => {
        const error = { details: 'ROUND_INVALID_TRANSITION::Draft' };
        const result = parseBackendError(error, mockT, 'general.error');
        expect(result).toBe('Cannot transition round from Draft to undefined');
      });

      it('should handle numeric error values', () => {
        const error = 404;
        const result = parseBackendError(error, mockT, 'general.error');
        expect(result).toBe('An error occurred');
        expect(mockT).toHaveBeenCalledWith('general.error');
      });

      it('should handle boolean error values', () => {
        const error = true;
        const result = parseBackendError(error, mockT, 'general.error');
        expect(result).toBe('An error occurred');
        expect(mockT).toHaveBeenCalledWith('general.error');
      });

      it('should handle array error values', () => {
        const error = ['error1', 'error2'];
        const result = parseBackendError(error, mockT, 'general.error');
        expect(result).toBe('An error occurred');
        expect(mockT).toHaveBeenCalledWith('general.error');
      });
    });
  });

  describe('handleTournamentCompletion', () => {
    const mockOnSuccess = vi.fn();
    const mockOnError = vi.fn();

    beforeEach(() => {
      mockOnSuccess.mockClear();
      mockOnError.mockClear();
      mockCommands.updateTournamentStatus.mockClear();
    });

    it('should call success callback on successful tournament completion', async () => {
      mockCommands.updateTournamentStatus.mockResolvedValue({ success: true });

      await handleTournamentCompletion(123, mockT, mockOnSuccess, mockOnError);

      expect(mockCommands.updateTournamentStatus).toHaveBeenCalledWith({
        tournament_id: 123,
        status: 'completed',
      });
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should call error callback when tournament completion fails', async () => {
      const error = { details: 'Tournament cannot be completed' };
      mockCommands.updateTournamentStatus.mockRejectedValue(error);

      await handleTournamentCompletion(123, mockT, mockOnSuccess, mockOnError);

      expect(mockCommands.updateTournamentStatus).toHaveBeenCalledWith({
        tournament_id: 123,
        status: 'completed',
      });
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalledWith(
        'Tournament cannot be completed'
      );
    });

    it('should handle specific tournament errors during completion', async () => {
      const error = { details: 'TOURNAMENT_INCOMPLETE_GAMES_ERROR::2' };
      mockCommands.updateTournamentStatus.mockRejectedValue(error);

      await handleTournamentCompletion(123, mockT, mockOnSuccess, mockOnError);

      expect(mockOnError).toHaveBeenCalledWith(
        'Tournament has 2 incomplete games'
      );
    });

    it('should use default error message when no specific error is provided', async () => {
      const error = new Error('Unknown error');
      mockCommands.updateTournamentStatus.mockRejectedValue(error);

      await handleTournamentCompletion(123, mockT, mockOnSuccess, mockOnError);

      expect(mockOnError).toHaveBeenCalledWith('Unknown error');
    });

    it('should handle network errors during completion', async () => {
      const error = { details: 'Network connection failed' };
      mockCommands.updateTournamentStatus.mockRejectedValue(error);

      await handleTournamentCompletion(123, mockT, mockOnSuccess, mockOnError);

      expect(mockOnError).toHaveBeenCalledWith('Network connection failed');
    });

    it('should handle empty error during completion', async () => {
      mockCommands.updateTournamentStatus.mockRejectedValue({});

      await handleTournamentCompletion(123, mockT, mockOnSuccess, mockOnError);

      expect(mockOnError).toHaveBeenCalledWith('Failed to complete round');
    });
  });
});
