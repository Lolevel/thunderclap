import useSWR, { mutate as globalMutate } from 'swr';
import { useEffect } from 'react';

/**
 * OPTIMIZED: Fetch ALL team data in a single request
 *
 * This hook uses the unified /api/teams/{id}/full-data endpoint
 * which returns all tab data in one request, dramatically reducing
 * initial load time and number of requests.
 *
 * @param {string} teamId - Team UUID
 * @returns {object} All team data + loading states
 */
export function useTeamFullData(teamId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? `/teams/${teamId}/full-data` : null,
    {
      // Refresh every 10 minutes
      refreshInterval: 600000,
      // Don't revalidate on focus to avoid unnecessary requests
      revalidateOnFocus: false,
      // Use cache-first strategy
      dedupingInterval: 60000, // 1 minute deduping
    }
  );

  // If full data fetch succeeds, populate individual SWR caches
  // This allows tabs to work even if they try to fetch individually
  useEffect(() => {
    if (!data || !teamId) return;

    // Populate individual caches so tabs can use existing hooks
    if (data.overview) {
      globalMutate(`/teams/${teamId}/overview`, data.overview, false);
    }
    if (data.roster) {
      globalMutate(`/teams/${teamId}/roster`, data.roster, false);
    }
    if (data.champion_pools) {
      globalMutate(`/teams/${teamId}/player-champion-pools`, data.champion_pools, false);
    }
    if (data.draft_analysis) {
      globalMutate(`/teams/${teamId}/draft-analysis`, data.draft_analysis, false);
    }
    if (data.scouting_report) {
      globalMutate(`/teams/${teamId}/scouting-report`, data.scouting_report, false);
    }
    if (data.matches) {
      globalMutate(`/teams/${teamId}/matches?limit=20`, data.matches, false);
    }
  }, [data, teamId]);

  return {
    // Full data object
    fullData: data,

    // Individual tab data (destructured for convenience)
    overview: data?.overview,
    roster: data?.roster,
    championPools: data?.champion_pools,
    draftAnalysis: data?.draft_analysis,
    scoutingReport: data?.scouting_report,
    matches: data?.matches,

    // Loading states
    isLoading,
    isError: error,
    isValidating,

    // Manual refresh
    refresh: mutate,

    // Metadata
    fetchedAt: data?.fetched_at,
    teamName: data?.team_name,
  };
}

/**
 * OPTIMIZED: Prefetch team full data
 *
 * Call this when you know the user will navigate to a team page
 * to pre-load all data before they arrive.
 *
 * @param {string} teamId - Team UUID
 */
export function prefetchTeamFullData(teamId) {
  if (!teamId) return;

  // Trigger prefetch (SWR will handle deduplication)
  globalMutate(`/teams/${teamId}/full-data`);
}
