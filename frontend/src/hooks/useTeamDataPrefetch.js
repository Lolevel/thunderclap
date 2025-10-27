import { useEffect, useState } from 'react';
import { useSWRConfig } from 'swr';
import { cacheKeys } from '../lib/cacheKeys';

/**
 * Prefetches all team data in a staggered manner to avoid lag
 * Loads data sequentially with delays between each request
 *
 * @param {string} teamId - Team UUID
 * @param {boolean} enabled - Whether to start prefetching
 */
export function useTeamDataPrefetch(teamId, enabled = true) {
  const { mutate } = useSWRConfig();
  const [prefetchStatus, setPrefetchStatus] = useState({
    overview: 'pending',
    champions: 'pending',
    draftPatterns: 'pending',
    stats: 'pending',
    matches: 'pending',
    scoutingReport: 'pending',
  });

  useEffect(() => {
    if (!teamId || !enabled) return;

    let cancelled = false;

    const prefetchData = async () => {
      // Delay between requests to avoid overwhelming the backend
      const DELAY_MS = 300;

      const endpoints = [
        { key: 'overview', cache: cacheKeys.teamOverview(teamId) },
        { key: 'champions', cache: cacheKeys.teamChampions(teamId) },
        { key: 'draftPatterns', cache: cacheKeys.teamDraftPatterns(teamId) },
        { key: 'stats', cache: cacheKeys.teamStats(teamId) },
        { key: 'matches', cache: cacheKeys.teamMatches(teamId, 50) },
        { key: 'scoutingReport', cache: cacheKeys.scoutingReport(teamId) },
      ];

      for (const endpoint of endpoints) {
        if (cancelled) break;

        try {
          setPrefetchStatus(prev => ({ ...prev, [endpoint.key]: 'loading' }));

          // Trigger SWR revalidation for this endpoint
          await mutate(endpoint.cache);

          setPrefetchStatus(prev => ({ ...prev, [endpoint.key]: 'loaded' }));

          // Wait before loading next endpoint
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        } catch (error) {
          console.error(`[Prefetch] Failed to load ${endpoint.key}:`, error);
          setPrefetchStatus(prev => ({ ...prev, [endpoint.key]: 'error' }));
        }
      }

      if (!cancelled) {
        console.log('[Prefetch] All team data loaded');
      }
    };

    // Start prefetching after a short delay to let critical data load first
    const timeoutId = setTimeout(() => {
      prefetchData();
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [teamId, enabled, mutate]);

  return prefetchStatus;
}
