/**
 * Centralized cache key factory functions for SWR
 *
 * This ensures consistency across the application and makes cache invalidation easier.
 * All API endpoints should have corresponding cache key functions here.
 */

export const cacheKeys = {
  // Teams
  teams: () => '/teams',
  team: (teamId) => `/teams/${teamId}`,
  teamStats: (teamId) => `/teams/${teamId}/stats`,
  teamRoster: (teamId) => `/teams/${teamId}/roster`,
  teamOverview: (teamId) => `/teams/${teamId}/overview`,
  teamChampions: (teamId) => `/teams/${teamId}/player-champion-pools`,  // Backend endpoint
  teamDraftPatterns: (teamId) => `/teams/${teamId}/draft-analysis`,     // Backend endpoint
  teamMatches: (teamId, limit = 20) => `/teams/${teamId}/matches?limit=${limit}`,

  // Players
  player: (playerId) => `/players/${playerId}`,
  playerChampions: (playerId, type = 'tournament') => `/players/${playerId}/champions/${type}`,  // Backend endpoint
  playerMatches: (playerId, limit = 20) => `/players/${playerId}/matches?limit=${limit}`,
  playerStats: (playerId) => `/players/${playerId}/stats`,
  playerPerformance: (playerId) => `/players/${playerId}/performance`,

  // Matches
  matches: (teamId) => `/teams/${teamId}/matches`,
  match: (matchId) => `/matches/${matchId}`,
  matchTimeline: (matchId) => `/matches/${matchId}/timeline`,

  // Draft Scenarios
  draftScenarios: (teamId) => `/teams/${teamId}/draft-scenarios`,
  draftScenario: (scenarioId) => `/draft-scenarios/${scenarioId}`,

  // Scouting
  lineupPrediction: (teamId) => `/teams/${teamId}/roster/predictions`,  // Backend endpoint
  scoutingReport: (teamId) => `/teams/${teamId}/scouting-report`,       // Backend endpoint
  draftHelper: () => '/scout/draft-helper',

  // Analytics
  analytics: (teamId, type) => `/analytics/${teamId}?type=${type}`,

  // Draft Analysis
  draftAnalysis: (teamId) => `/teams/${teamId}/draft-analysis`,
  playerChampionPools: (teamId) => `/teams/${teamId}/player-champion-pools`,
  rosterPredictions: (teamId) => `/teams/${teamId}/roster/predictions`,

  // Scouting Report (In-Depth Stats)
  scoutingReportStats: (teamId) => `/teams/${teamId}/scouting-report`,
};

/**
 * Helper to get all related cache keys for a resource
 * Useful for invalidating multiple related caches at once
 *
 * @param {string} resource - 'team', 'player', 'match', etc.
 * @param {string} id - Resource ID (UUID)
 * @returns {string[]} Array of cache keys to invalidate
 */
export function getRelatedKeys(resource, id) {
  const related = {
    team: [
      cacheKeys.team(id),
      cacheKeys.teamStats(id),
      cacheKeys.teamRoster(id),
      cacheKeys.teamOverview(id),
      cacheKeys.teamChampions(id),
      cacheKeys.teamDraftPatterns(id),
      cacheKeys.teamMatches(id),
      cacheKeys.draftScenarios(id),
      cacheKeys.lineupPrediction(id),
      cacheKeys.scoutingReport(id),
    ],
    player: [
      cacheKeys.player(id),
      cacheKeys.playerChampions(id, 'tournament'),
      cacheKeys.playerChampions(id, 'soloqueue'),
      cacheKeys.playerMatches(id),
      cacheKeys.playerStats(id),
      cacheKeys.playerPerformance(id),
    ],
    match: [
      cacheKeys.match(id),
      cacheKeys.matchTimeline(id),
    ],
    draft_scenario: [
      cacheKeys.draftScenario(id),
    ],
  };

  return related[resource] || [];
}

/**
 * Helper to invalidate all team-related caches
 * Use when team data is updated
 */
export function getTeamRelatedKeys(teamId) {
  return getRelatedKeys('team', teamId);
}

/**
 * Helper to invalidate all player-related caches
 * Use when player data is updated
 */
export function getPlayerRelatedKeys(playerId) {
  return getRelatedKeys('player', playerId);
}
