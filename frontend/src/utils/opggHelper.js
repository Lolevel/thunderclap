/**
 * OP.GG Helper Utilities
 * Generate and open OP.GG URLs for players and teams
 */

import api from '../config/api';

/**
 * Get OP.GG URL for a single player
 * @param {string} playerId - Player UUID
 * @returns {Promise<string>} OP.GG URL
 */
export const getPlayerOpggUrl = async (playerId) => {
  try {
    const response = await api.get(`/players/${playerId}/opgg`);
    return response.data.opgg_url;
  } catch (error) {
    console.error('Failed to get player OP.GG URL:', error);
    throw error;
  }
};

/**
 * Get OP.GG multi-search URL for a team
 * @param {string} teamId - Team UUID
 * @param {Array<string>} playerIds - Optional array of player IDs (uses full roster if not provided)
 * @returns {Promise<string>} OP.GG URL
 */
export const getTeamOpggUrl = async (teamId, playerIds = null) => {
  try {
    let url = `/teams/${teamId}/opgg`;

    if (playerIds && playerIds.length > 0) {
      url += `?player_ids=${playerIds.join(',')}`;
    }

    const response = await api.get(url);
    return response.data.opgg_url;
  } catch (error) {
    console.error('Failed to get team OP.GG URL:', error);
    throw error;
  }
};

/**
 * Open player OP.GG in new tab
 * @param {string} playerId - Player UUID
 */
export const openPlayerOpgg = async (playerId) => {
  try {
    const url = await getPlayerOpggUrl(playerId);
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (error) {
    console.error('Failed to open player OP.GG:', error);
    alert('Failed to open OP.GG. Please try again.');
  }
};

/**
 * Open team OP.GG in new tab
 * @param {string} teamId - Team UUID
 * @param {Array<string>} playerIds - Optional array of player IDs
 */
export const openTeamOpgg = async (teamId, playerIds = null) => {
  try {
    const url = await getTeamOpggUrl(teamId, playerIds);
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (error) {
    console.error('Failed to open team OP.GG:', error);
    alert('Failed to open OP.GG. Please try again.');
  }
};

/**
 * Generate OP.GG URL from summoner name (client-side only, no API call)
 * @param {string} summonerName - Summoner name (GameName#TAG format)
 * @param {string} region - Region (default: 'euw')
 * @returns {string} OP.GG URL
 */
export const generateOpggUrl = (summonerName, region = 'euw') => {
  let gameName, tag;

  if (summonerName.includes('#')) {
    [gameName, tag] = summonerName.split('#');
  } else {
    gameName = summonerName;
    tag = 'EUW';
  }

  return `https://www.op.gg/summoners/${region}/${gameName}-${tag}`;
};

/**
 * Generate OP.GG multi-search URL (client-side only)
 * @param {Array<string>} summonerNames - Array of summoner names
 * @param {string} region - Region (default: 'euw')
 * @returns {string} OP.GG multi-search URL
 */
export const generateMultiSearchUrl = (summonerNames, region = 'euw') => {
  const formattedNames = summonerNames.map(name => {
    if (name.includes('#')) {
      const [gameName, tag] = name.split('#');
      return `${gameName}-${tag}`;
    }
    return name;
  });

  const encoded = formattedNames.map(name => encodeURIComponent(name)).join(',');
  return `https://www.op.gg/multisearch/${region}?summoners=${encoded}`;
};
