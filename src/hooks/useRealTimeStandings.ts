import { useEffect, useState, useCallback, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { commands } from '@dto/bindings';
import type {
  StandingsCalculationResult,
  StandingsUpdateEvent,
} from '@dto/bindings';

interface UseRealTimeStandingsOptions {
  tournamentId: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  onError?: (error: Error) => void;
  onUpdate?: (standings: StandingsCalculationResult) => void;
}

interface RealTimeStandingsHook {
  standings: StandingsCalculationResult | null;
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  isConnected: boolean;
  forceRefresh: () => Promise<void>;
  clearCache: () => Promise<void>;
  retryConnection: () => void;
}

export const useRealTimeStandings = ({
  tournamentId,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds default
  onError,
  onUpdate,
}: UseRealTimeStandingsOptions): RealTimeStandingsHook => {
  const [standings, setStandings] = useState<StandingsCalculationResult | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);

  const fetchStandings = useCallback(
    async (force = false) => {
      if (!tournamentId) return;

      setLoading(true);
      setError(null);

      try {
        const result = force
          ? await commands.forceRecalculateStandings(tournamentId)
          : await commands.getRealtimeStandings(tournamentId);

        setStandings(result);
        setLastUpdated(new Date());
        setIsConnected(true);

        if (onUpdate) {
          onUpdate(result);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsConnected(false);

        if (onError) {
          onError(error);
        }
      } finally {
        setLoading(false);
      }
    },
    [tournamentId, onError, onUpdate]
  );

  const forceRefresh = useCallback(async () => {
    await fetchStandings(true);
  }, [fetchStandings]);

  const clearCache = useCallback(async () => {
    try {
      await commands.clearStandingsCache(tournamentId);
      // Fetch fresh data after clearing cache
      await fetchStandings(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      if (onError) {
        onError(error);
      }
    }
  }, [tournamentId, fetchStandings, onError]);

  const retryConnection = useCallback(() => {
    setError(null);
    fetchStandings();
  }, [fetchStandings]);

  // Set up real-time event listening
  useEffect(() => {
    if (!tournamentId) return;

    const setupEventListener = async () => {
      try {
        const unlisten = await listen<StandingsUpdateEvent>(
          'standings-update',
          event => {
            const updateEvent = event.payload;

            // Only process events for this tournament
            if (updateEvent.tournament_id === tournamentId) {
              // Received standings update

              // Update standings with the new data
              const result: StandingsCalculationResult = {
                standings: updateEvent.standings,
                last_updated: updateEvent.timestamp,
                tiebreak_config: standings?.tiebreak_config || {
                  tournament_id: tournamentId,
                  tiebreaks: [],
                  use_fide_defaults: true,
                  forfeit_time_minutes: null,
                  draw_offers_allowed: null,
                  mobile_phone_policy: null,
                  default_color_allocation: null,
                  late_entry_allowed: null,
                  bye_assignment_rule: null,
                  arbiter_notes: null,
                  tournament_category: null,
                  organizer_name: null,
                  organizer_email: null,
                  prize_structure: null,
                },
              };

              setStandings(result);
              setLastUpdated(new Date(updateEvent.timestamp));
              setIsConnected(true);

              if (onUpdate) {
                onUpdate(result);
              }
            }
          }
        );

        unlistenRef.current = unlisten;
        setIsConnected(true);
      } catch (err) {
        console.error('Failed to set up event listener:', err);
        setIsConnected(false);
      }
    };

    setupEventListener();

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, [tournamentId, standings?.tiebreak_config, onUpdate]);

  // Set up polling for fallback
  useEffect(() => {
    if (!autoRefresh || !tournamentId) return;

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      // Only poll if we're not getting real-time updates
      if (!isConnected) {
        fetchStandings();
      }
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, tournamentId, isConnected, fetchStandings]);

  // Initial fetch
  useEffect(() => {
    if (tournamentId) {
      fetchStandings();
    }
  }, [tournamentId, fetchStandings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, []);

  return {
    standings,
    loading,
    error,
    lastUpdated,
    isConnected,
    forceRefresh,
    clearCache,
    retryConnection,
  };
};

export default useRealTimeStandings;
