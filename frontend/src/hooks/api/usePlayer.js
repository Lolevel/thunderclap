import useSWR from 'swr';
import { cacheKeys } from '../../lib/cacheKeys';

/**
 * Fetch all players
 * @returns {object} { players, isLoading, isError, isValidating, refresh }
 */
export function usePlayers() {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    '/players',
    {
      refreshInterval: 300000, // 5 minutes
    }
  );

  return {
    players: data?.players || [],
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Fetch player champion pool
 * @param {string} playerId - Player UUID
 * @param {string} type - 'tournament' or 'soloqueue'
 * @returns {object} { champions, isLoading, isError, isValidating, refresh }
 */
export function usePlayerChampions(playerId, type = 'tournament') {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    playerId ? cacheKeys.playerChampions(playerId, type) : null,
    {
      refreshInterval: 600000, // 10 minutes
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
 * Fetch player match history
 * @param {string} playerId - Player UUID
 * @param {number} limit - Number of matches to fetch
 * @returns {object} { matches, isLoading, isError, isValidating, refresh }
 */
export function usePlayerMatches(playerId, limit = 20) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    playerId ? cacheKeys.playerMatches(playerId, limit) : null,
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
 * Fetch player statistics
 * @param {string} playerId - Player UUID
 * @returns {object} { stats, isLoading, isError, isValidating, refresh }
 */
export function usePlayerStats(playerId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    playerId ? cacheKeys.playerStats(playerId) : null,
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
 * Fetch player performance metrics
 * @param {string} playerId - Player UUID
 * @returns {object} { performance, isLoading, isError, isValidating, refresh }
 */
export function usePlayerPerformance(playerId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    playerId ? cacheKeys.playerPerformance(playerId) : null,
    {
      refreshInterval: 300000, // 5 minutes
    }
  );

  return {
    performance: data,
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Fetch player details
 * @param {string} playerId - Player UUID
 * @returns {object} { player, isLoading, isError, isValidating, refresh }
 */
export function usePlayer(playerId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    playerId ? cacheKeys.player(playerId) : null,
    {
      refreshInterval: 600000, // 10 minutes (basic info doesn't change often)
    }
  );

  return {
    player: data,
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}
