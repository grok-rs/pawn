import { describe, test, expect } from 'vitest';
import {
  calculateRatingChange,
  getRatingCategory,
  isValidRating,
} from './rating';

describe('Rating Utilities', () => {
  describe('calculateRatingChange', () => {
    test('should calculate rating gain for win against equal opponent', () => {
      const change = calculateRatingChange(1500, 1500, 1.0); // win
      expect(change).toBe(16); // Standard K-factor of 32, expected score 0.5
    });

    test('should calculate rating loss for loss against equal opponent', () => {
      const change = calculateRatingChange(1500, 1500, 0.0); // loss
      expect(change).toBe(-16);
    });

    test('should calculate rating change for draw against equal opponent', () => {
      const change = calculateRatingChange(1500, 1500, 0.5); // draw
      expect(change).toBe(0);
    });

    test('should calculate larger gain when beating higher-rated opponent', () => {
      const change = calculateRatingChange(1400, 1600, 1.0); // win against +200
      expect(change).toBeGreaterThan(16);
    });

    test('should calculate smaller loss when losing to higher-rated opponent', () => {
      const change = calculateRatingChange(1400, 1600, 0.0); // loss to +200
      expect(change).toBeGreaterThan(-16);
    });
  });

  describe('getRatingCategory', () => {
    test('should categorize beginner ratings', () => {
      expect(getRatingCategory(800)).toBe('Beginner');
      expect(getRatingCategory(1199)).toBe('Beginner');
    });

    test('should categorize intermediate ratings', () => {
      expect(getRatingCategory(1200)).toBe('Intermediate');
      expect(getRatingCategory(1799)).toBe('Intermediate');
    });

    test('should categorize advanced ratings', () => {
      expect(getRatingCategory(1800)).toBe('Advanced');
      expect(getRatingCategory(2199)).toBe('Advanced');
    });

    test('should categorize expert ratings', () => {
      expect(getRatingCategory(2200)).toBe('Expert');
      expect(getRatingCategory(2399)).toBe('Expert');
    });

    test('should categorize master ratings', () => {
      expect(getRatingCategory(2400)).toBe('Master');
      expect(getRatingCategory(3000)).toBe('Master');
    });
  });

  describe('isValidRating', () => {
    test('should accept valid rating range', () => {
      expect(isValidRating(1000)).toBe(true);
      expect(isValidRating(2000)).toBe(true);
      expect(isValidRating(3000)).toBe(true);
    });

    test('should reject ratings below minimum', () => {
      expect(isValidRating(99)).toBe(false);
      expect(isValidRating(0)).toBe(false);
      expect(isValidRating(-100)).toBe(false);
    });

    test('should reject ratings above maximum', () => {
      expect(isValidRating(4001)).toBe(false);
      expect(isValidRating(5000)).toBe(false);
    });

    test('should reject non-integer ratings', () => {
      expect(isValidRating(1500.5)).toBe(false);
      expect(isValidRating(1200.1)).toBe(false);
    });
  });
});
