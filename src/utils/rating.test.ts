import { describe, test, expect } from 'vitest';
import {
  calculateRatingChange,
  getRatingCategory,
  isValidRating,
} from './rating';

describe('Rating Utilities', () => {
  describe('calculateRatingChange', () => {
    describe('Equal rating matchups', () => {
      test('should calculate rating gain for win against equal opponent', () => {
        const change = calculateRatingChange(1500, 1500, 1.0); // win
        expect(change).toBe(16); // K-factor 32, expected score 0.5, actual score 1.0
      });

      test('should calculate rating loss for loss against equal opponent', () => {
        const change = calculateRatingChange(1500, 1500, 0.0); // loss
        expect(change).toBe(-16);
      });

      test('should calculate rating change for draw against equal opponent', () => {
        const change = calculateRatingChange(1500, 1500, 0.5); // draw
        expect(change).toBe(0);
      });
    });

    describe('Different rating matchups', () => {
      test('should calculate larger gain when beating higher-rated opponent', () => {
        const change = calculateRatingChange(1400, 1600, 1.0); // win against +200
        expect(change).toBeGreaterThan(16);
        expect(change).toBe(24); // Approximately 24 points
      });

      test('should calculate smaller loss when losing to higher-rated opponent', () => {
        const change = calculateRatingChange(1400, 1600, 0.0); // loss to +200
        expect(change).toBeGreaterThan(-16);
        expect(change).toBe(-8); // Approximately -8 points
      });

      test('should calculate smaller gain when beating lower-rated opponent', () => {
        const change = calculateRatingChange(1600, 1400, 1.0); // win against -200
        expect(change).toBeLessThan(16);
        expect(change).toBe(8); // Approximately 8 points
      });

      test('should calculate larger loss when losing to lower-rated opponent', () => {
        const change = calculateRatingChange(1600, 1400, 0.0); // loss to -200
        expect(change).toBeLessThan(-16);
        expect(change).toBe(-24); // Approximately -24 points
      });
    });

    describe('K-factor variations based on rating', () => {
      test('should use high K-factor for lower-rated players', () => {
        const change1 = calculateRatingChange(1000, 1000, 1.0); // Below 2100
        const change2 = calculateRatingChange(2000, 2000, 1.0); // Below 2100
        expect(change1).toBe(16); // K=32
        expect(change2).toBe(16); // K=32
      });

      test('should use medium K-factor for mid-rated players', () => {
        const change = calculateRatingChange(2200, 2200, 1.0); // 2100-2400
        expect(change).toBe(12); // K=24
      });

      test('should use low K-factor for high-rated players', () => {
        const change = calculateRatingChange(2500, 2500, 1.0); // Above 2400
        expect(change).toBe(8); // K=16
      });
    });

    describe('Edge cases', () => {
      test('should handle very large rating differences', () => {
        const change1 = calculateRatingChange(1000, 2000, 1.0); // Huge upset
        const change2 = calculateRatingChange(2000, 1000, 0.0); // Huge upset loss

        expect(change1).toBeGreaterThan(25);
        expect(change2).toBeLessThan(-25);
      });

      test('should handle minimum and maximum ratings', () => {
        const changeMin = calculateRatingChange(100, 100, 1.0);
        const changeMax = calculateRatingChange(4000, 4000, 1.0);

        expect(changeMin).toBe(16); // High K-factor
        expect(changeMax).toBe(8); // Low K-factor
      });

      test('should handle fractional scores properly', () => {
        const change = calculateRatingChange(1500, 1500, 0.25); // Forfeit or partial score
        expect(change).toBe(-8); // 32 * (0.25 - 0.5) = -8
      });

      test('should round results to integers', () => {
        const change = calculateRatingChange(1455, 1533, 0.5); // Should produce fractional result
        expect(Number.isInteger(change)).toBe(true);
      });
    });

    describe('Real-world scenarios', () => {
      test('should calculate realistic changes for tournament games', () => {
        // Common tournament scenario: 1500-rated player in Swiss tournament
        const winChange = calculateRatingChange(1500, 1600, 1.0);
        const drawChange = calculateRatingChange(1500, 1600, 0.5);
        const lossChange = calculateRatingChange(1500, 1600, 0.0);

        expect(winChange).toBeGreaterThan(16);
        expect(drawChange).toBeGreaterThan(-8);
        expect(drawChange).toBeLessThan(0);
        expect(lossChange).toBeGreaterThan(-16);
      });

      test('should calculate changes for titled players', () => {
        // Titled player (GM level)
        const change = calculateRatingChange(2600, 2500, 1.0);
        expect(change).toBeLessThan(10); // Low K-factor should produce smaller changes
      });
    });
  });

  describe('getRatingCategory', () => {
    describe('Category boundaries', () => {
      test('should categorize beginner ratings', () => {
        expect(getRatingCategory(100)).toBe('Beginner');
        expect(getRatingCategory(800)).toBe('Beginner');
        expect(getRatingCategory(1199)).toBe('Beginner');
      });

      test('should categorize intermediate ratings', () => {
        expect(getRatingCategory(1200)).toBe('Intermediate');
        expect(getRatingCategory(1500)).toBe('Intermediate');
        expect(getRatingCategory(1799)).toBe('Intermediate');
      });

      test('should categorize advanced ratings', () => {
        expect(getRatingCategory(1800)).toBe('Advanced');
        expect(getRatingCategory(2000)).toBe('Advanced');
        expect(getRatingCategory(2199)).toBe('Advanced');
      });

      test('should categorize expert ratings', () => {
        expect(getRatingCategory(2200)).toBe('Expert');
        expect(getRatingCategory(2300)).toBe('Expert');
        expect(getRatingCategory(2399)).toBe('Expert');
      });

      test('should categorize master ratings', () => {
        expect(getRatingCategory(2400)).toBe('Master');
        expect(getRatingCategory(2600)).toBe('Master');
        expect(getRatingCategory(3000)).toBe('Master');
        expect(getRatingCategory(4000)).toBe('Master');
      });
    });

    describe('Edge cases', () => {
      test('should handle exact boundary values', () => {
        expect(getRatingCategory(1199)).toBe('Beginner');
        expect(getRatingCategory(1200)).toBe('Intermediate');
        expect(getRatingCategory(1799)).toBe('Intermediate');
        expect(getRatingCategory(1800)).toBe('Advanced');
        expect(getRatingCategory(2199)).toBe('Advanced');
        expect(getRatingCategory(2200)).toBe('Expert');
        expect(getRatingCategory(2399)).toBe('Expert');
        expect(getRatingCategory(2400)).toBe('Master');
      });

      test('should handle extreme rating values', () => {
        expect(getRatingCategory(1)).toBe('Beginner');
        expect(getRatingCategory(5000)).toBe('Master');
      });
    });

    describe('Real-world categories', () => {
      test('should align with chess rating systems', () => {
        // Club level players
        expect(getRatingCategory(1000)).toBe('Beginner');
        expect(getRatingCategory(1400)).toBe('Intermediate');

        // Tournament players
        expect(getRatingCategory(1900)).toBe('Advanced');
        expect(getRatingCategory(2100)).toBe('Advanced');

        // Strong players
        expect(getRatingCategory(2250)).toBe('Expert');

        // Master level
        expect(getRatingCategory(2450)).toBe('Master');
      });
    });
  });

  describe('isValidRating', () => {
    describe('Valid ratings', () => {
      test('should accept valid rating range', () => {
        expect(isValidRating(100)).toBe(true);
        expect(isValidRating(1000)).toBe(true);
        expect(isValidRating(2000)).toBe(true);
        expect(isValidRating(3000)).toBe(true);
        expect(isValidRating(4000)).toBe(true);
      });

      test('should accept boundary values', () => {
        expect(isValidRating(100)).toBe(true); // MIN_RATING
        expect(isValidRating(4000)).toBe(true); // MAX_RATING
      });
    });

    describe('Invalid ratings', () => {
      test('should reject ratings below minimum', () => {
        expect(isValidRating(99)).toBe(false);
        expect(isValidRating(0)).toBe(false);
        expect(isValidRating(-100)).toBe(false);
        expect(isValidRating(-1)).toBe(false);
      });

      test('should reject ratings above maximum', () => {
        expect(isValidRating(4001)).toBe(false);
        expect(isValidRating(5000)).toBe(false);
        expect(isValidRating(10000)).toBe(false);
      });

      test('should reject non-integer ratings', () => {
        expect(isValidRating(1500.5)).toBe(false);
        expect(isValidRating(1200.1)).toBe(false);
        expect(isValidRating(1500.999)).toBe(false);
        expect(isValidRating(2000.0)).toBe(true); // This should be true as it's effectively an integer
      });

      test('should reject non-numeric values', () => {
        expect(isValidRating(NaN)).toBe(false);
        expect(isValidRating(Infinity)).toBe(false);
        expect(isValidRating(-Infinity)).toBe(false);
      });

      test('should reject null and undefined', () => {
        expect(isValidRating(null as any)).toBe(false);
        expect(isValidRating(undefined as any)).toBe(false);
      });
    });

    describe('Edge cases', () => {
      test('should handle zero correctly', () => {
        expect(isValidRating(0)).toBe(false);
      });

      test('should handle very small positive numbers', () => {
        expect(isValidRating(0.1)).toBe(false);
        expect(isValidRating(1)).toBe(false); // Below MIN_RATING
      });

      test('should handle very large numbers', () => {
        expect(isValidRating(Number.MAX_SAFE_INTEGER)).toBe(false);
        expect(isValidRating(1e10)).toBe(false);
      });

      test('should handle floating point precision issues', () => {
        const almostInteger = 1500 + Number.EPSILON;
        expect(isValidRating(almostInteger)).toBe(false);
      });
    });

    describe('Real-world validation scenarios', () => {
      test('should validate common tournament ratings', () => {
        const commonRatings = [
          800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600,
        ];
        commonRatings.forEach(rating => {
          expect(isValidRating(rating)).toBe(true);
        });
      });

      test('should reject obviously invalid ratings from user input', () => {
        const invalidInputs = [-500, 0, 50, 10000, 1500.5];
        invalidInputs.forEach(rating => {
          expect(isValidRating(rating)).toBe(false);
        });
      });
    });
  });

  describe('Integration tests', () => {
    test('should work together for rating progression simulation', () => {
      let rating = 1200;
      expect(getRatingCategory(rating)).toBe('Intermediate');
      expect(isValidRating(rating)).toBe(true);

      // Simulate some wins
      for (let i = 0; i < 10; i++) {
        const change = calculateRatingChange(rating, rating + 100, 1.0);
        rating += change;
      }

      expect(rating).toBeGreaterThan(1200);
      expect(isValidRating(rating)).toBe(true);
      expect(getRatingCategory(rating)).toBe('Intermediate');
    });

    test('should handle rating system edge cases consistently', () => {
      const testRatings = [100, 1000, 2000, 3000, 4000];

      testRatings.forEach(rating => {
        expect(isValidRating(rating)).toBe(true);

        const category = getRatingCategory(rating);
        expect(typeof category).toBe('string');
        expect(category.length).toBeGreaterThan(0);

        const winChange = calculateRatingChange(rating, rating, 1.0);
        const lossChange = calculateRatingChange(rating, rating, 0.0);

        expect(winChange).toBeGreaterThan(0);
        expect(lossChange).toBeLessThan(0);
        expect(Math.abs(winChange)).toBe(Math.abs(lossChange));
      });
    });
  });
});
