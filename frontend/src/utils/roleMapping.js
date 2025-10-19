/**
 * Role Mapping Utilities
 * Maps Riot's internal role names to user-friendly display names
 */

export const ROLE_DISPLAY_MAP = {
  'TOP': 'Top',
  'JUNGLE': 'Jungle',
  'MIDDLE': 'Mid',
  'BOTTOM': 'Bot',
  'UTILITY': 'Support'
};

export const ROLE_RIOT_MAP = {
  'Top': 'TOP',
  'Jungle': 'JUNGLE',
  'Mid': 'MIDDLE',
  'Bot': 'BOTTOM',
  'Support': 'UTILITY'
};

/**
 * Convert Riot role name to display name
 * @param {string} riotRole - Riot's role name (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY)
 * @returns {string} User-friendly role name
 */
export const displayRole = (riotRole) => {
  if (!riotRole) return '';
  return ROLE_DISPLAY_MAP[riotRole.toUpperCase()] || riotRole;
};

/**
 * Convert display role name to Riot role name
 * @param {string} displayRole - User-friendly role name
 * @returns {string} Riot's internal role name
 */
export const toRiotRole = (displayRoleName) => {
  if (!displayRoleName) return '';
  return ROLE_RIOT_MAP[displayRoleName] || displayRoleName.toUpperCase();
};

/**
 * Get all role options for dropdowns
 * @returns {Array} Array of {value, label} objects
 */
export const getRoleOptions = () => {
  return [
    { value: 'TOP', label: 'Top' },
    { value: 'JUNGLE', label: 'Jungle' },
    { value: 'MIDDLE', label: 'Mid' },
    { value: 'BOTTOM', label: 'Bot' },
    { value: 'UTILITY', label: 'Support' }
  ];
};

/**
 * Get role icon/color class
 * @param {string} role - Role name (either Riot or display format)
 * @returns {string} CSS class name
 */
export const getRoleClass = (role) => {
  const normalized = displayRole(role).toLowerCase();
  return `role-${normalized}`;
};

/**
 * Sort players by role
 * @param {Array} players - Array of player objects with role property
 * @returns {Array} Sorted players (Top, Jungle, Mid, Bot, Support)
 */
export const sortByRole = (players) => {
  const roleOrder = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];

  return [...players].sort((a, b) => {
    const roleA = a.role ? a.role.toUpperCase() : '';
    const roleB = b.role ? b.role.toUpperCase() : '';

    const indexA = roleOrder.indexOf(roleA);
    const indexB = roleOrder.indexOf(roleB);

    // If role not found, put at end
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });
};
