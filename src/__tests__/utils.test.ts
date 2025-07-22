import { describe, it, expect } from 'vitest';
import type { Tournament, Round } from '@dto/bindings';
import {
  isFinishedTournament,
  isOngoingTournament,
  isDraftTournament,
  calculateActualRoundsPlayed,
  isFinishedTournamentActual,
  isOngoingTournamentActual,
  isDraftTournamentActual,
  getTournamentStatusActual,
  getTournamentProgressActual,
} from '../utils';

// Mock data factories
const createMockTournament = (
  overrides: Partial<Tournament> = {}
): Tournament => ({
  id: 1,
  name: 'Test Tournament',
  location: 'Test Location',
  date: new Date().toISOString().split('T')[0],
  time_type: 'classical',
  tournament_type: 'swiss',
  player_count: 16,
  rounds_played: 0,
  total_rounds: 7,
  country_code: 'US',
  status: 'draft',
  start_time: null,
  end_time: null,
  description: null,
  website_url: null,
  contact_email: null,
  entry_fee: null,
  currency: null,
  is_team_tournament: null,
  team_size: null,
  max_teams: null,
  ...overrides,
});

const createMockRound = (overrides: Partial<Round> = {}): Round => ({
  id: 1,
  tournament_id: 1,
  round_number: 1,
  status: 'Draft',
  created_at: new Date().toISOString(),
  completed_at: null,
  ...overrides,
});

describe('Tournament Utils', () => {
  describe('Basic tournament status functions', () => {
    describe('isFinishedTournament', () => {
      it('should return true when rounds played equals total rounds', () => {
        const tournament = createMockTournament({
          rounds_played: 7,
          total_rounds: 7,
        });
        expect(isFinishedTournament(tournament)).toBe(true);
      });

      it('should return false when rounds played is less than total rounds', () => {
        const tournament = createMockTournament({
          rounds_played: 3,
          total_rounds: 7,
        });
        expect(isFinishedTournament(tournament)).toBe(false);
      });

      it('should return false for draft tournament', () => {
        const tournament = createMockTournament({
          rounds_played: 0,
          total_rounds: 7,
        });
        expect(isFinishedTournament(tournament)).toBe(false);
      });
    });

    describe('isOngoingTournament', () => {
      it('should return true when tournament has started but not finished', () => {
        const tournament = createMockTournament({
          rounds_played: 3,
          total_rounds: 7,
        });
        expect(isOngoingTournament(tournament)).toBe(true);
      });

      it('should return false for draft tournament', () => {
        const tournament = createMockTournament({
          rounds_played: 0,
          total_rounds: 7,
        });
        expect(isOngoingTournament(tournament)).toBe(false);
      });

      it('should return false for finished tournament', () => {
        const tournament = createMockTournament({
          rounds_played: 7,
          total_rounds: 7,
        });
        expect(isOngoingTournament(tournament)).toBe(false);
      });
    });

    describe('isDraftTournament', () => {
      it('should return true when no rounds have been played', () => {
        const tournament = createMockTournament({
          rounds_played: 0,
          total_rounds: 7,
        });
        expect(isDraftTournament(tournament)).toBe(true);
      });

      it('should return false when tournament has started', () => {
        const tournament = createMockTournament({
          rounds_played: 1,
          total_rounds: 7,
        });
        expect(isDraftTournament(tournament)).toBe(false);
      });

      it('should return false for finished tournament', () => {
        const tournament = createMockTournament({
          rounds_played: 7,
          total_rounds: 7,
        });
        expect(isDraftTournament(tournament)).toBe(false);
      });
    });
  });

  describe('Actual rounds-based tournament status functions', () => {
    describe('calculateActualRoundsPlayed', () => {
      it('should count completed rounds correctly', () => {
        const rounds = [
          createMockRound({ round_number: 1, status: 'Completed' }),
          createMockRound({ round_number: 2, status: 'Completed' }),
          createMockRound({ round_number: 3, status: 'Active' }),
          createMockRound({ round_number: 4, status: 'Draft' }),
        ];
        expect(calculateActualRoundsPlayed(rounds)).toBe(2);
      });

      it('should return 0 for all draft rounds', () => {
        const rounds = [
          createMockRound({ round_number: 1, status: 'Draft' }),
          createMockRound({ round_number: 2, status: 'Draft' }),
        ];
        expect(calculateActualRoundsPlayed(rounds)).toBe(0);
      });

      it('should return full count for all completed rounds', () => {
        const rounds = [
          createMockRound({ round_number: 1, status: 'Completed' }),
          createMockRound({ round_number: 2, status: 'Completed' }),
          createMockRound({ round_number: 3, status: 'Completed' }),
        ];
        expect(calculateActualRoundsPlayed(rounds)).toBe(3);
      });

      it('should handle empty rounds array', () => {
        expect(calculateActualRoundsPlayed([])).toBe(0);
      });
    });

    describe('isFinishedTournamentActual', () => {
      it('should return true when all rounds are completed', () => {
        const tournament = createMockTournament({ total_rounds: 3 });
        const rounds = [
          createMockRound({ round_number: 1, status: 'Completed' }),
          createMockRound({ round_number: 2, status: 'Completed' }),
          createMockRound({ round_number: 3, status: 'Completed' }),
        ];
        expect(isFinishedTournamentActual(tournament, rounds)).toBe(true);
      });

      it('should return false when not all rounds are completed', () => {
        const tournament = createMockTournament({ total_rounds: 3 });
        const rounds = [
          createMockRound({ round_number: 1, status: 'Completed' }),
          createMockRound({ round_number: 2, status: 'Active' }),
          createMockRound({ round_number: 3, status: 'Draft' }),
        ];
        expect(isFinishedTournamentActual(tournament, rounds)).toBe(false);
      });
    });

    describe('isOngoingTournamentActual', () => {
      it('should return true when some but not all rounds are completed', () => {
        const tournament = createMockTournament({ total_rounds: 3 });
        const rounds = [
          createMockRound({ round_number: 1, status: 'Completed' }),
          createMockRound({ round_number: 2, status: 'Active' }),
          createMockRound({ round_number: 3, status: 'Draft' }),
        ];
        expect(isOngoingTournamentActual(tournament, rounds)).toBe(true);
      });

      it('should return false when no rounds are completed', () => {
        const tournament = createMockTournament({ total_rounds: 3 });
        const rounds = [
          createMockRound({ round_number: 1, status: 'Draft' }),
          createMockRound({ round_number: 2, status: 'Draft' }),
          createMockRound({ round_number: 3, status: 'Draft' }),
        ];
        expect(isOngoingTournamentActual(tournament, rounds)).toBe(false);
      });

      it('should return false when all rounds are completed', () => {
        const tournament = createMockTournament({ total_rounds: 3 });
        const rounds = [
          createMockRound({ round_number: 1, status: 'Completed' }),
          createMockRound({ round_number: 2, status: 'Completed' }),
          createMockRound({ round_number: 3, status: 'Completed' }),
        ];
        expect(isOngoingTournamentActual(tournament, rounds)).toBe(false);
      });
    });

    describe('isDraftTournamentActual', () => {
      it('should return true when no rounds are completed', () => {
        const tournament = createMockTournament({ total_rounds: 3 });
        const rounds = [
          createMockRound({ round_number: 1, status: 'Draft' }),
          createMockRound({ round_number: 2, status: 'Draft' }),
          createMockRound({ round_number: 3, status: 'Draft' }),
        ];
        expect(isDraftTournamentActual(tournament, rounds)).toBe(true);
      });

      it('should return false when at least one round is completed', () => {
        const tournament = createMockTournament({ total_rounds: 3 });
        const rounds = [
          createMockRound({ round_number: 1, status: 'Completed' }),
          createMockRound({ round_number: 2, status: 'Draft' }),
          createMockRound({ round_number: 3, status: 'Draft' }),
        ];
        expect(isDraftTournamentActual(tournament, rounds)).toBe(false);
      });

      it('should handle empty rounds array', () => {
        const tournament = createMockTournament({ total_rounds: 3 });
        expect(isDraftTournamentActual(tournament, [])).toBe(true);
      });
    });

    describe('getTournamentStatusActual', () => {
      it('should return "draft" for tournament with no completed rounds', () => {
        const tournament = createMockTournament({ total_rounds: 3 });
        const rounds = [
          createMockRound({ round_number: 1, status: 'Draft' }),
          createMockRound({ round_number: 2, status: 'Draft' }),
        ];
        expect(getTournamentStatusActual(tournament, rounds)).toBe('draft');
      });

      it('should return "ongoing" for tournament with some completed rounds', () => {
        const tournament = createMockTournament({ total_rounds: 3 });
        const rounds = [
          createMockRound({ round_number: 1, status: 'Completed' }),
          createMockRound({ round_number: 2, status: 'Active' }),
        ];
        expect(getTournamentStatusActual(tournament, rounds)).toBe('ongoing');
      });

      it('should return "finished" for tournament with all completed rounds', () => {
        const tournament = createMockTournament({ total_rounds: 2 });
        const rounds = [
          createMockRound({ round_number: 1, status: 'Completed' }),
          createMockRound({ round_number: 2, status: 'Completed' }),
        ];
        expect(getTournamentStatusActual(tournament, rounds)).toBe('finished');
      });
    });

    describe('getTournamentProgressActual', () => {
      it('should calculate progress percentage correctly', () => {
        const tournament = createMockTournament({ total_rounds: 4 });
        const rounds = [
          createMockRound({ round_number: 1, status: 'Completed' }),
          createMockRound({ round_number: 2, status: 'Completed' }),
          createMockRound({ round_number: 3, status: 'Active' }),
          createMockRound({ round_number: 4, status: 'Draft' }),
        ];
        expect(getTournamentProgressActual(tournament, rounds)).toBe(50);
      });

      it('should return 0 for draft tournament', () => {
        const tournament = createMockTournament({ total_rounds: 4 });
        const rounds = [
          createMockRound({ round_number: 1, status: 'Draft' }),
          createMockRound({ round_number: 2, status: 'Draft' }),
        ];
        expect(getTournamentProgressActual(tournament, rounds)).toBe(0);
      });

      it('should return 100 for finished tournament', () => {
        const tournament = createMockTournament({ total_rounds: 2 });
        const rounds = [
          createMockRound({ round_number: 1, status: 'Completed' }),
          createMockRound({ round_number: 2, status: 'Completed' }),
        ];
        expect(getTournamentProgressActual(tournament, rounds)).toBe(100);
      });

      it('should handle edge case of zero total rounds', () => {
        const tournament = createMockTournament({ total_rounds: 0 });
        const rounds: Round[] = [];
        expect(getTournamentProgressActual(tournament, rounds)).toBe(0);
      });

      it('should handle empty rounds array', () => {
        const tournament = createMockTournament({ total_rounds: 5 });
        expect(getTournamentProgressActual(tournament, [])).toBe(0);
      });

      it('should handle partial progress correctly', () => {
        const tournament = createMockTournament({ total_rounds: 7 });
        const rounds = [
          createMockRound({ round_number: 1, status: 'Completed' }),
          createMockRound({ round_number: 2, status: 'Completed' }),
          createMockRound({ round_number: 3, status: 'Completed' }),
        ];
        // 3/7 * 100 = 42.857...
        expect(getTournamentProgressActual(tournament, rounds)).toBeCloseTo(
          42.86,
          2
        );
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle tournament with negative rounds played', () => {
      const tournament = createMockTournament({
        rounds_played: -1,
        total_rounds: 7,
      });
      expect(isFinishedTournament(tournament)).toBe(false);
      expect(isOngoingTournament(tournament)).toBe(false);
      expect(isDraftTournament(tournament)).toBe(false);
    });

    it('should handle tournament with rounds played exceeding total rounds', () => {
      const tournament = createMockTournament({
        rounds_played: 10,
        total_rounds: 7,
      });
      expect(isFinishedTournament(tournament)).toBe(false);
      expect(isOngoingTournament(tournament)).toBe(false);
    });

    it('should handle tournament with zero total rounds', () => {
      const tournament = createMockTournament({
        rounds_played: 0,
        total_rounds: 0,
      });
      expect(isFinishedTournament(tournament)).toBe(true);
      expect(isOngoingTournament(tournament)).toBe(false);
      expect(isDraftTournament(tournament)).toBe(true);
    });
  });
});
