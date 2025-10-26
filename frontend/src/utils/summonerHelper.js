/**
 * Summoner Icon Helper
 * Gets summoner icon URL from CommunityDragon
 */

/**
 * Get summoner icon URL for a given icon ID
 * @param {number} iconId - The summoner icon ID
 * @returns {string} - URL to the summoner icon
 */
export const getSummonerIconUrl = (iconId) => {
  if (!iconId) {
    return 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg';
  }

  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${iconId}.jpg`;
};

/**
 * Handle summoner icon error by showing a default icon
 * @param {Event} e - The error event
 */
export const handleSummonerIconError = (e) => {
  // Fallback to default icon if the specific icon fails to load
  e.target.src = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg';
};
