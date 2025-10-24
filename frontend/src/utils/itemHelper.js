/**
 * Helper functions for item data handling
 * Items use Data Dragon with patch-specific URLs
 */

/**
 * Extracts the patch version from game_version
 * Data Dragon requires full version like "15.21.1" not just "15.21"
 * @param {string} gameVersion - Full game version string (e.g., "15.20.719.545")
 * @returns {string} - Patch version (e.g., "15.20.1")
 */
export const extractPatchVersion = (gameVersion) => {
  if (!gameVersion) {
    // Fallback for old matches without game_version
    return '15.21.1';
  }

  // Game version format: "15.20.719.545"
  // Data Dragon versions are like: "15.20.1"
  const parts = gameVersion.split('.');
  if (parts.length >= 2) {
    const major = parts[0];
    const minor = parts[1];
    // Use major.minor.1 format (Data Dragon standard)
    return `${major}.${minor}.1`;
  }

  // Fallback
  return '15.21.1';
};

/**
 * Gets the item icon URL for a specific patch
 * Uses the exact patch from the game to ensure correct item icons
 * @param {number} itemId - Item ID from match data
 * @param {string} gameVersion - Full game version string
 * @returns {string} - URL to item icon
 */
export const getItemIconUrl = (itemId, gameVersion) => {
  // Item ID 0 means empty slot
  if (!itemId || itemId === 0) return null;

  const patch = extractPatchVersion(gameVersion);
  return `https://ddragon.leagueoflegends.com/cdn/${patch}/img/item/${itemId}.png`;
};

/**
 * Gets item icon URL with fallback to latest patch
 * @param {number} itemId - Item ID
 * @param {string} gameVersion - Full game version string
 * @returns {string} - URL to item icon
 */
export const getItemIconUrlWithFallback = (itemId, gameVersion) => {
  if (!itemId || itemId === 0) return null;

  const patch = extractPatchVersion(gameVersion);
  const url = `https://ddragon.leagueoflegends.com/cdn/${patch}/img/item/${itemId}.png`;

  return url;
};

/**
 * Handles item image error with fallback to latest patch
 * @param {Event} e - Image error event
 * @param {number} itemId - Item ID
 */
export const handleItemError = (e, itemId) => {
  if (!e.target.dataset.fallbackTried) {
    e.target.dataset.fallbackTried = 'true';
    e.target.src = `https://ddragon.leagueoflegends.com/cdn/latest/img/item/${itemId}.png`;
  } else {
    // Hide if fallback also fails
    e.target.style.display = 'none';
  }
};

/**
 * Filters out empty item slots (item ID 0)
 * @param {Array<number>} items - Array of item IDs
 * @returns {Array<number>} - Filtered array without empty slots
 */
export const filterEmptyItems = (items) => {
  if (!items || !Array.isArray(items)) return [];
  return items.filter(itemId => itemId && itemId !== 0);
};
