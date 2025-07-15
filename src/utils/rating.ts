/**
 * Chess rating utilities following FIDE Elo rating system
 */

// Rating constants
const RATING_SCALE_FACTOR = 400;
const MIN_RATING = 100;
const MAX_RATING = 4000;

// K-factor thresholds
const HIGH_K_THRESHOLD = 2100;
const MEDIUM_K_THRESHOLD = 2400;

// K-factor values
const HIGH_K_FACTOR = 32;
const MEDIUM_K_FACTOR = 24;
const LOW_K_FACTOR = 16;

/**
 * Calculate expected score for a player against an opponent using Elo formula
 */
function calculateExpectedScore(
  playerRating: number,
  opponentRating: number
): number {
  const ratingDiff = opponentRating - playerRating;
  return 1 / (1 + Math.pow(10, ratingDiff / RATING_SCALE_FACTOR));
}

/**
 * Get K-factor based on player rating
 * Simplified version - in real FIDE system this depends on age, title, games played, etc.
 */
function getKFactor(rating: number): number {
  if (rating < HIGH_K_THRESHOLD) return HIGH_K_FACTOR;
  if (rating < MEDIUM_K_THRESHOLD) return MEDIUM_K_FACTOR;
  return LOW_K_FACTOR;
}

/**
 * Calculate rating change based on game result
 * @param playerRating Current player rating
 * @param opponentRating Opponent rating
 * @param score Game score (1.0 = win, 0.5 = draw, 0.0 = loss)
 * @returns Rating change (positive for gain, negative for loss)
 */
export function calculateRatingChange(
  playerRating: number,
  opponentRating: number,
  score: number
): number {
  const expectedScore = calculateExpectedScore(playerRating, opponentRating);
  const kFactor = getKFactor(playerRating);
  const change = Math.round(kFactor * (score - expectedScore));
  return change;
}

/**
 * Get rating category label
 */
export function getRatingCategory(rating: number): string {
  if (rating < 1200) return 'Beginner';
  if (rating < 1800) return 'Intermediate';
  if (rating < 2200) return 'Advanced';
  if (rating < 2400) return 'Expert';
  return 'Master';
}

/**
 * Validate if rating is within acceptable range
 */
export function isValidRating(rating: number): boolean {
  // Check if it's an integer
  if (!Number.isInteger(rating)) return false;

  // Check range using constants
  return rating >= MIN_RATING && rating <= MAX_RATING;
}
