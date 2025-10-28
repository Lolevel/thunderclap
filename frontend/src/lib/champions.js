/**
 * Champion Data & Icons
 * Uses Riot's Data Dragon CDN
 */

// Latest League of Legends patch (update periodically)
const PATCH_VERSION = '14.23.1';
const DDRAGON_BASE = `https://ddragon.leagueoflegends.com/cdn/${PATCH_VERSION}`;

/**
 * Get champion icon URL
 */
export function getChampionIcon(championKey) {
  if (!championKey) return null;
  return `${DDRAGON_BASE}/img/champion/${championKey}.png`;
}

/**
 * Get champion square icon (smaller, for picks/bans)
 */
export function getChampionSquare(championKey) {
  if (!championKey) return null;
  return `${DDRAGON_BASE}/img/champion/${championKey}.png`;
}

/**
 * Get champion splash art
 */
export function getChampionSplash(championKey, skinNum = 0) {
  if (!championKey) return null;
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championKey}_${skinNum}.jpg`;
}

/**
 * Champion roles mapping
 */
export const ROLES = {
  TOP: { name: 'Top', icon: '🛡️' },
  JUNGLE: { name: 'Jungle', icon: '🌲' },
  MIDDLE: { name: 'Mid', icon: '⚔️' },
  BOTTOM: { name: 'Bot', icon: '🏹' },
  UTILITY: { name: 'Support', icon: '🛡️' }
};

/**
 * Lane filters for champion selection
 */
export const LANE_FILTERS = [
  { value: 'all', label: 'All Lanes' },
  { value: 'top', label: 'Top' },
  { value: 'jungle', label: 'Jungle' },
  { value: 'mid', label: 'Mid' },
  { value: 'bot', label: 'Bot' },
  { value: 'support', label: 'Support' }
];

/**
 * All Champions (simplified list - top 50 most played)
 * In production, fetch from Riot API or static JSON
 */
export const CHAMPIONS = [
  // Top Lane
  { id: 266, key: 'Aatrox', name: 'Aatrox', roles: ['top'] },
  { id: 412, key: 'Thresh', name: 'Thresh', roles: ['support'] },
  { id: 23, key: 'Tryndamere', name: 'Tryndamere', roles: ['top'] },
  { id: 79, key: 'Gragas', name: 'Gragas', roles: ['top', 'jungle'] },
  { id: 69, key: 'Cassiopeia', name: 'Cassiopeia', roles: ['mid'] },
  { id: 136, key: 'AurelionSol', name: 'Aurelion Sol', roles: ['mid'] },
  { id: 13, key: 'Ryze', name: 'Ryze', roles: ['mid', 'top'] },
  { id: 78, key: 'Poppy', name: 'Poppy', roles: ['top', 'support'] },

  // Jungle
  { id: 141, key: 'Kayn', name: 'Kayn', roles: ['jungle'] },
  { id: 121, key: 'Khazix', name: "Kha'Zix", roles: ['jungle'] },
  { id: 64, key: 'LeeSin', name: 'Lee Sin', roles: ['jungle'] },
  { id: 254, key: 'Vi', name: 'Vi', roles: ['jungle'] },
  { id: 107, key: 'Rengar', name: 'Rengar', roles: ['jungle'] },
  { id: 35, key: 'Shaco', name: 'Shaco', roles: ['jungle'] },

  // Mid Lane
  { id: 103, key: 'Ahri', name: 'Ahri', roles: ['mid'] },
  { id: 238, key: 'Zed', name: 'Zed', roles: ['mid'] },
  { id: 157, key: 'Yasuo', name: 'Yasuo', roles: ['mid', 'top'] },
  { id: 777, key: 'Yone', name: 'Yone', roles: ['mid', 'top'] },
  { id: 84, key: 'Akali', name: 'Akali', roles: ['mid', 'top'] },
  { id: 105, key: 'Fizz', name: 'Fizz', roles: ['mid'] },
  { id: 7, key: 'Leblanc', name: 'LeBlanc', roles: ['mid'] },
  { id: 55, key: 'Katarina', name: 'Katarina', roles: ['mid'] },

  // Bot Lane (ADC)
  { id: 81, key: 'Ezreal', name: 'Ezreal', roles: ['bot'] },
  { id: 22, key: 'Ashe', name: 'Ashe', roles: ['bot', 'support'] },
  { id: 222, key: 'Jinx', name: 'Jinx', roles: ['bot'] },
  { id: 51, key: 'Caitlyn', name: 'Caitlyn', roles: ['bot'] },
  { id: 498, key: 'Xayah', name: 'Xayah', roles: ['bot'] },
  { id: 119, key: 'Draven', name: 'Draven', roles: ['bot'] },
  { id: 21, key: 'MissFortune', name: 'Miss Fortune', roles: ['bot'] },
  { id: 145, key: 'Kaisa', name: "Kai'Sa", roles: ['bot'] },

  // Support
  { id: 53, key: 'Blitzcrank', name: 'Blitzcrank', roles: ['support'] },
  { id: 25, key: 'Morgana', name: 'Morgana', roles: ['support', 'mid'] },
  { id: 267, key: 'Nami', name: 'Nami', roles: ['support'] },
  { id: 37, key: 'Sona', name: 'Sona', roles: ['support'] },
  { id: 40, key: 'Janna', name: 'Janna', roles: ['support'] },
  { id: 16, key: 'Soraka', name: 'Soraka', roles: ['support'] },
  { id: 89, key: 'Leona', name: 'Leona', roles: ['support'] },
  { id: 555, key: 'Pyke', name: 'Pyke', roles: ['support'] },

  // Popular Flex Picks
  { id: 245, key: 'Ekko', name: 'Ekko', roles: ['jungle', 'mid'] },
  { id: 60, key: 'Elise', name: 'Elise', roles: ['jungle'] },
  { id: 28, key: 'Evelynn', name: 'Evelynn', roles: ['jungle'] },
  { id: 113, key: 'Sejuani', name: 'Sejuani', roles: ['jungle'] },
  { id: 154, key: 'Zac', name: 'Zac', roles: ['jungle', 'top'] },
  { id: 76, key: 'Nidalee', name: 'Nidalee', roles: ['jungle'] },
  { id: 56, key: 'Nocturne', name: 'Nocturne', roles: ['jungle'] },
  { id: 20, key: 'Nunu', name: 'Nunu & Willump', roles: ['jungle'] },
  { id: 2, key: 'Olaf', name: 'Olaf', roles: ['jungle', 'top'] },
  { id: 61, key: 'Orianna', name: 'Orianna', roles: ['mid'] },
  { id: 516, key: 'Ornn', name: 'Ornn', roles: ['top'] },
  { id: 80, key: 'Pantheon', name: 'Pantheon', roles: ['top', 'mid', 'support'] },
];

/**
 * Search champions by name
 */
export function searchChampions(query, laneFilter = 'all') {
  let results = CHAMPIONS;

  // Filter by lane
  if (laneFilter !== 'all') {
    results = results.filter(champ => champ.roles.includes(laneFilter));
  }

  // Filter by search query
  if (query && query.trim()) {
    const lowerQuery = query.toLowerCase();
    results = results.filter(champ =>
      champ.name.toLowerCase().includes(lowerQuery)
    );
  }

  return results;
}

/**
 * Get champion by key
 */
export function getChampionByKey(key) {
  return CHAMPIONS.find(c => c.key === key);
}

/**
 * Get champion by ID
 */
export function getChampionById(id) {
  return CHAMPIONS.find(c => c.id === id);
}
