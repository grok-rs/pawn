import type { RoundStatus } from '@dto/bindings';

/**
 * Round status constants matching backend serialized values.
 * Use these instead of string literals for type safety.
 */
export const ROUND_STATUS: Record<string, RoundStatus> = {
  Planned: 'planned',
  Pairing: 'pairing',
  Published: 'published',
  InProgress: 'in_progress',
  Finishing: 'finishing',
  Completed: 'completed',
  Verified: 'verified',
} as const;

export function isRoundCompleted(status: string): boolean {
  return status === ROUND_STATUS.Completed || status === ROUND_STATUS.Verified;
}

export function isRoundInProgress(status: string): boolean {
  return (
    status === ROUND_STATUS.InProgress || status === ROUND_STATUS.Finishing
  );
}

export function isRoundPending(status: string): boolean {
  return status === ROUND_STATUS.Planned;
}
