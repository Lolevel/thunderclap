import useSWR from 'swr';
import { cacheKeys } from '../../lib/cacheKeys';

/**
 * Fetch team overview data
 * @param {string} teamId - Team UUID
 * @returns {object} { overview, isLoading, isError, isValidating, refresh }
 */
export function useTeamOverview(teamId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? cacheKeys.teamOverview(teamId) : null,
    {
      // Custom options for this specific query
      refreshInterval: 300000, // 5 minutes
      revalidateOnMount: true,
    }
  );

  return {
    overview: data,
    isLoading,
    isError: error,
    isValidating, // True when revalidating in background
    refresh: mutate, // Manual refresh function
  };
}

/**
 * Fetch team roster with role information
 * @param {string} teamId - Team UUID
 * @returns {object} { roster, isLoading, isError, isValidating, refresh }
 */
export function useTeamRoster(teamId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? cacheKeys.teamRoster(teamId) : null,
    {
      refreshInterval: 300000, // 5 minutes
    }
  );

  return {
    roster: data?.roster || [],
    lockedRoster: data?.locked_roster || null,
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Fetch team statistics (wins, losses, winrate, etc.)
 * @param {string} teamId - Team UUID
 * @returns {object} { stats, isLoading, isError, isValidating, refresh }
 */
export function useTeamStats(teamId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? cacheKeys.teamStats(teamId) : null,
    {
      refreshInterval: 300000, // 5 minutes
    }
  );

  return {
    stats: data,
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Fetch team champion pool
 * @param {string} teamId - Team UUID
 * @returns {object} { champions, isLoading, isError, isValidating, refresh }
 */
export function useTeamChampions(teamId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? cacheKeys.teamChampions(teamId) : null,
    {
      refreshInterval: 600000, // 10 minutes (champion pool changes slowly)
    }
  );

  return {
    champions: data?.champions || [],
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Fetch team draft patterns (bans/picks)
 * @param {string} teamId - Team UUID
 * @returns {object} { bans, picks, isLoading, isError, isValidating, refresh }
 */
export function useTeamDraftPatterns(teamId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? cacheKeys.teamDraftPatterns(teamId) : null,
    {
      refreshInterval: 600000, // 10 minutes
    }
  );

  return {
    bans: data?.bans || {},
    picks: data?.picks || {},
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Fetch team matches
 * @param {string} teamId - Team UUID
 * @param {number} limit - Number of matches to fetch
 * @returns {object} { matches, isLoading, isError, isValidating, refresh }
 */
export function useTeamMatches(teamId, limit = 20) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? cacheKeys.teamMatches(teamId, limit) : null,
    {
      refreshInterval: 300000, // 5 minutes
    }
  );

  return {
    matches: data?.matches || [],
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Fetch all teams list
 * @returns {object} { teams, isLoading, isError, isValidating, refresh }
 */
export function useTeams() {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    cacheKeys.teams(),
    {
      refreshInterval: 300000, // 5 minutes
    }
  );

  return {
    teams: data?.teams || [],
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Fetch team draft analysis (champion pool, bans, picks)
 * @param {string} teamId - Team UUID
 * @returns {object} { draftData, isLoading, isError, isValidating, refresh }
 */
export function useDraftAnalysis(teamId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? cacheKeys.draftAnalysis(teamId) : null,
    {
      refreshInterval: 600000, // 10 minutes
    }
  );

  return {
    draftData: data,
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Fetch player champion pools for team
 * @param {string} teamId - Team UUID
 * @returns {object} { playerPools, isLoading, isError, isValidating, refresh }
 */
export function usePlayerChampionPools(teamId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? cacheKeys.playerChampionPools(teamId) : null,
    {
      refreshInterval: 600000, // 10 minutes
    }
  );

  return {
    playerPools: data,
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Fetch roster predictions
 * @param {string} teamId - Team UUID
 * @returns {object} { predictions, isLoading, isError, isValidating, refresh }
 */
export function useRosterPredictions(teamId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? cacheKeys.rosterPredictions(teamId) : null,
    {
      refreshInterval: 600000, // 10 minutes
    }
  );

  return {
    predictions: data?.predictions || null,
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Fetch scouting report (in-depth stats)
 * @param {string} teamId - Team UUID
 * @returns {object} { report, isLoading, isError, isValidating, refresh }
 */
export function useScoutingReport(teamId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? cacheKeys.scoutingReportStats(teamId) : null,
    {
      refreshInterval: 600000, // 10 minutes
    }
  );

  return {
    report: data,
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}
