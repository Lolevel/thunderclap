/**
 * Helper functions for champion data handling
 */

/**
 * Maps champion names from database/API format to Data Dragon format
 * Handles special cases like Wukong (MonkeyKing internally)
 * Removes spaces from champion names (e.g., "Twisted Fate" -> "TwistedFate")
 */
export const mapChampionNameForAssets = (championName) => {
  if (!championName) return '';

  const nameMap = {
    'MonkeyKing': 'MonkeyKing',  // Wukong's internal name
    'Wukong': 'MonkeyKing',       // User-facing name -> internal name
  };

  // If there's a special mapping, use it
  if (nameMap[championName]) {
    return nameMap[championName];
  }

  // Remove spaces from champion names (e.g., "Twisted Fate" -> "TwistedFate")
  return championName.replace(/\s+/g, '');
};

/**
 * Gets the correct champion splash art URL with fallbacks
 * @param {string} championName - Champion name from database
 * @param {number} skinNum - Skin number (0 = default)
 * @returns {string} URL to splash art
 */
export const getChampionSplashUrl = (championName, skinNum = 0) => {
  const mappedName = mapChampionNameForAssets(championName);
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${mappedName}_${skinNum}.jpg`;
};

/**
 * Gets champion icon URL using Community Dragon (requires champion ID)
 * @param {number} championId - Champion ID from database
 * @returns {string} URL to champion icon
 */
export const getChampionIconUrl = (championId) => {
  if (!championId) return '';
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`;
};

/**
 * Gets champion icon URL by name (fallback for when ID is not available)
 * Uses Community Dragon with 'latest' patch for consistency
 * Note: This requires looking up the champion ID from name, which is not ideal.
 * Prefer using getChampionIconUrl(championId) when possible.
 * @param {string} championName - Champion name from database
 * @returns {string} URL to champion icon (Data Dragon fallback)
 */
export const getChampionIconUrlByName = (championName) => {
  const mappedName = mapChampionNameForAssets(championName);
  // Fallback to Data Dragon since we don't have champion ID
  // Community Dragon requires champion ID, not name
  return `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${mappedName}.png`;
};

/**
 * Handles image error with smart fallbacks for splash arts
 * @param {Event} e - Image error event
 * @param {string} championName - Champion name
 * @param {number} championId - Champion ID (optional, for better icon fallback)
 */
export const handleSplashError = (e, championName, championId = null) => {
  const mappedName = mapChampionNameForAssets(championName);

  // First fallback: random skin (1-10)
  if (!e.target.dataset.fallbackTried) {
    e.target.dataset.fallbackTried = 'true';
    const randomSkin = Math.floor(Math.random() * 10) + 1;
    e.target.src = getChampionSplashUrl(mappedName, randomSkin);
  }
  // Second fallback: loading screen art
  else if (!e.target.dataset.fallbackTried2) {
    e.target.dataset.fallbackTried2 = 'true';
    e.target.src = `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${mappedName}_0.jpg`;
  }
  // Final fallback: champion icon
  else {
    e.target.src = championId ? getChampionIconUrl(championId) : getChampionIconUrlByName(championName);
    e.target.className = 'w-full h-full object-cover opacity-40';
  }
};
