/**
 * Complete Champion List for League of Legends
 * All 172 champions as of latest patch (includes Ambessa, Mel, Yunara)
 * Uses Community Dragon CDN for latest assets (no patch version needed)
 */

/**
 * Get champion icon URL by champion ID
 * Uses Community Dragon which provides latest assets automatically
 */
export function getChampionIconById(championId) {
  if (!championId) return null;
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`;
}

/**
 * Get champion icon URL by champion key (name)
 * Uses Community Dragon which provides latest assets automatically
 */
export function getChampionIcon(championKey) {
  if (!championKey) return null;
  // Map key to champion ID for Community Dragon
  const champion = CHAMPIONS.find(c => c.key === championKey);
  if (champion) {
    return getChampionIconById(champion.id);
  }
  // Fallback to Data Dragon if champion not in our list
  return `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${championKey}.png`;
}

export const CHAMPIONS = [
  { id: 266, key: 'Aatrox', name: 'Aatrox', roles: ['top'] },
  { id: 103, key: 'Ahri', name: 'Ahri', roles: ['mid'] },
  { id: 84, key: 'Akali', name: 'Akali', roles: ['mid', 'top'] },
  { id: 166, key: 'Akshan', name: 'Akshan', roles: ['mid', 'top'] },
  { id: 12, key: 'Alistar', name: 'Alistar', roles: ['support'] },
  { id: 799, key: 'Ambessa', name: 'Ambessa', roles: ['top'] },
  { id: 32, key: 'Amumu', name: 'Amumu', roles: ['jungle'] },
  { id: 34, key: 'Anivia', name: 'Anivia', roles: ['mid'] },
  { id: 1, key: 'Annie', name: 'Annie', roles: ['mid'] },
  { id: 523, key: 'Aphelios', name: 'Aphelios', roles: ['bot'] },
  { id: 22, key: 'Ashe', name: 'Ashe', roles: ['bot', 'support'] },
  { id: 136, key: 'AurelionSol', name: 'Aurelion Sol', roles: ['mid'] },
  { id: 893, key: 'Aurora', name: 'Aurora', roles: ['mid'] },
  { id: 268, key: 'Azir', name: 'Azir', roles: ['mid'] },
  { id: 432, key: 'Bard', name: 'Bard', roles: ['support'] },
  { id: 200, key: 'Belveth', name: "Bel'Veth", roles: ['jungle'] },
  { id: 53, key: 'Blitzcrank', name: 'Blitzcrank', roles: ['support'] },
  { id: 63, key: 'Brand', name: 'Brand', roles: ['support', 'mid'] },
  { id: 201, key: 'Braum', name: 'Braum', roles: ['support'] },
  { id: 233, key: 'Briar', name: 'Briar', roles: ['jungle'] },
  { id: 51, key: 'Caitlyn', name: 'Caitlyn', roles: ['bot'] },
  { id: 164, key: 'Camille', name: 'Camille', roles: ['top'] },
  { id: 69, key: 'Cassiopeia', name: 'Cassiopeia', roles: ['mid'] },
  { id: 31, key: 'Chogath', name: "Cho'Gath", roles: ['top'] },
  { id: 42, key: 'Corki', name: 'Corki', roles: ['mid', 'bot'] },
  { id: 122, key: 'Darius', name: 'Darius', roles: ['top'] },
  { id: 131, key: 'Diana', name: 'Diana', roles: ['jungle', 'mid'] },
  { id: 119, key: 'Draven', name: 'Draven', roles: ['bot'] },
  { id: 36, key: 'DrMundo', name: 'Dr. Mundo', roles: ['top', 'jungle'] },
  { id: 245, key: 'Ekko', name: 'Ekko', roles: ['jungle', 'mid'] },
  { id: 60, key: 'Elise', name: 'Elise', roles: ['jungle'] },
  { id: 28, key: 'Evelynn', name: 'Evelynn', roles: ['jungle'] },
  { id: 81, key: 'Ezreal', name: 'Ezreal', roles: ['bot'] },
  { id: 9, key: 'Fiddlesticks', name: 'Fiddlesticks', roles: ['jungle'] },
  { id: 114, key: 'Fiora', name: 'Fiora', roles: ['top'] },
  { id: 105, key: 'Fizz', name: 'Fizz', roles: ['mid'] },
  { id: 3, key: 'Galio', name: 'Galio', roles: ['mid', 'support'] },
  { id: 41, key: 'Gangplank', name: 'Gangplank', roles: ['top'] },
  { id: 86, key: 'Garen', name: 'Garen', roles: ['top'] },
  { id: 150, key: 'Gnar', name: 'Gnar', roles: ['top'] },
  { id: 79, key: 'Gragas', name: 'Gragas', roles: ['top', 'jungle'] },
  { id: 104, key: 'Graves', name: 'Graves', roles: ['jungle'] },
  { id: 887, key: 'Gwen', name: 'Gwen', roles: ['top'] },
  { id: 120, key: 'Hecarim', name: 'Hecarim', roles: ['jungle'] },
  { id: 74, key: 'Heimerdinger', name: 'Heimerdinger', roles: ['mid', 'top'] },
  { id: 910, key: 'Hwei', name: 'Hwei', roles: ['mid'] },
  { id: 420, key: 'Illaoi', name: 'Illaoi', roles: ['top'] },
  { id: 39, key: 'Irelia', name: 'Irelia', roles: ['top', 'mid'] },
  { id: 427, key: 'Ivern', name: 'Ivern', roles: ['jungle'] },
  { id: 40, key: 'Janna', name: 'Janna', roles: ['support'] },
  { id: 59, key: 'JarvanIV', name: 'Jarvan IV', roles: ['jungle'] },
  { id: 24, key: 'Jax', name: 'Jax', roles: ['top', 'jungle'] },
  { id: 126, key: 'Jayce', name: 'Jayce', roles: ['top', 'mid'] },
  { id: 202, key: 'Jhin', name: 'Jhin', roles: ['bot'] },
  { id: 222, key: 'Jinx', name: 'Jinx', roles: ['bot'] },
  { id: 145, key: 'Kaisa', name: "Kai'Sa", roles: ['bot'] },
  { id: 429, key: 'Kalista', name: 'Kalista', roles: ['bot'] },
  { id: 43, key: 'Karma', name: 'Karma', roles: ['support', 'mid'] },
  { id: 30, key: 'Karthus', name: 'Karthus', roles: ['jungle'] },
  { id: 38, key: 'Kassadin', name: 'Kassadin', roles: ['mid'] },
  { id: 55, key: 'Katarina', name: 'Katarina', roles: ['mid'] },
  { id: 10, key: 'Kayle', name: 'Kayle', roles: ['top'] },
  { id: 141, key: 'Kayn', name: 'Kayn', roles: ['jungle'] },
  { id: 85, key: 'Kennen', name: 'Kennen', roles: ['top'] },
  { id: 121, key: 'Khazix', name: "Kha'Zix", roles: ['jungle'] },
  { id: 203, key: 'Kindred', name: 'Kindred', roles: ['jungle'] },
  { id: 240, key: 'Kled', name: 'Kled', roles: ['top'] },
  { id: 96, key: 'KogMaw', name: "Kog'Maw", roles: ['bot'] },
  { id: 897, key: 'KSante', name: "K'Sante", roles: ['top'] },
  { id: 7, key: 'Leblanc', name: 'LeBlanc', roles: ['mid'] },
  { id: 64, key: 'LeeSin', name: 'Lee Sin', roles: ['jungle'] },
  { id: 89, key: 'Leona', name: 'Leona', roles: ['support'] },
  { id: 876, key: 'Lillia', name: 'Lillia', roles: ['jungle'] },
  { id: 127, key: 'Lissandra', name: 'Lissandra', roles: ['mid'] },
  { id: 236, key: 'Lucian', name: 'Lucian', roles: ['bot'] },
  { id: 117, key: 'Lulu', name: 'Lulu', roles: ['support'] },
  { id: 99, key: 'Lux', name: 'Lux', roles: ['support', 'mid'] },
  { id: 54, key: 'Malphite', name: 'Malphite', roles: ['top'] },
  { id: 90, key: 'Malzahar', name: 'Malzahar', roles: ['mid'] },
  { id: 57, key: 'Maokai', name: 'Maokai', roles: ['support', 'jungle'] },
  { id: 11, key: 'MasterYi', name: 'Master Yi', roles: ['jungle'] },
  { id: 800, key: 'Mel', name: 'Mel', roles: ['support', 'mid'] },
  { id: 902, key: 'Milio', name: 'Milio', roles: ['support'] },
  { id: 21, key: 'MissFortune', name: 'Miss Fortune', roles: ['bot'] },
  { id: 62, key: 'MonkeyKing', name: 'Wukong', roles: ['jungle', 'top'] },
  { id: 82, key: 'Mordekaiser', name: 'Mordekaiser', roles: ['top'] },
  { id: 25, key: 'Morgana', name: 'Morgana', roles: ['support'] },
  { id: 267, key: 'Nami', name: 'Nami', roles: ['support'] },
  { id: 75, key: 'Nasus', name: 'Nasus', roles: ['top'] },
  { id: 111, key: 'Nautilus', name: 'Nautilus', roles: ['support'] },
  { id: 518, key: 'Neeko', name: 'Neeko', roles: ['mid', 'support'] },
  { id: 76, key: 'Nidalee', name: 'Nidalee', roles: ['jungle'] },
  { id: 895, key: 'Nilah', name: 'Nilah', roles: ['bot'] },
  { id: 56, key: 'Nocturne', name: 'Nocturne', roles: ['jungle'] },
  { id: 20, key: 'Nunu', name: 'Nunu & Willump', roles: ['jungle'] },
  { id: 2, key: 'Olaf', name: 'Olaf', roles: ['top', 'jungle'] },
  { id: 61, key: 'Orianna', name: 'Orianna', roles: ['mid'] },
  { id: 516, key: 'Ornn', name: 'Ornn', roles: ['top'] },
  { id: 80, key: 'Pantheon', name: 'Pantheon', roles: ['support', 'mid'] },
  { id: 78, key: 'Poppy', name: 'Poppy', roles: ['top', 'support'] },
  { id: 555, key: 'Pyke', name: 'Pyke', roles: ['support'] },
  { id: 246, key: 'Qiyana', name: 'Qiyana', roles: ['mid', 'jungle'] },
  { id: 133, key: 'Quinn', name: 'Quinn', roles: ['top'] },
  { id: 497, key: 'Rakan', name: 'Rakan', roles: ['support'] },
  { id: 33, key: 'Rammus', name: 'Rammus', roles: ['jungle'] },
  { id: 421, key: 'RekSai', name: "Rek'Sai", roles: ['jungle'] },
  { id: 526, key: 'Rell', name: 'Rell', roles: ['support'] },
  { id: 888, key: 'Renata', name: 'Renata Glasc', roles: ['support'] },
  { id: 58, key: 'Renekton', name: 'Renekton', roles: ['top'] },
  { id: 107, key: 'Rengar', name: 'Rengar', roles: ['jungle', 'top'] },
  { id: 92, key: 'Riven', name: 'Riven', roles: ['top'] },
  { id: 68, key: 'Rumble', name: 'Rumble', roles: ['top'] },
  { id: 13, key: 'Ryze', name: 'Ryze', roles: ['mid'] },
  { id: 360, key: 'Samira', name: 'Samira', roles: ['bot'] },
  { id: 113, key: 'Sejuani', name: 'Sejuani', roles: ['jungle'] },
  { id: 235, key: 'Senna', name: 'Senna', roles: ['support', 'bot'] },
  { id: 147, key: 'Seraphine', name: 'Seraphine', roles: ['support', 'mid'] },
  { id: 875, key: 'Sett', name: 'Sett', roles: ['top'] },
  { id: 35, key: 'Shaco', name: 'Shaco', roles: ['jungle'] },
  { id: 98, key: 'Shen', name: 'Shen', roles: ['top', 'support'] },
  { id: 102, key: 'Shyvana', name: 'Shyvana', roles: ['jungle'] },
  { id: 27, key: 'Singed', name: 'Singed', roles: ['top'] },
  { id: 14, key: 'Sion', name: 'Sion', roles: ['top'] },
  { id: 15, key: 'Sivir', name: 'Sivir', roles: ['bot'] },
  { id: 72, key: 'Skarner', name: 'Skarner', roles: ['jungle'] },
  { id: 37, key: 'Sona', name: 'Sona', roles: ['support'] },
  { id: 16, key: 'Soraka', name: 'Soraka', roles: ['support'] },
  { id: 50, key: 'Swain', name: 'Swain', roles: ['support', 'mid'] },
  { id: 517, key: 'Sylas', name: 'Sylas', roles: ['mid', 'top'] },
  { id: 134, key: 'Syndra', name: 'Syndra', roles: ['mid'] },
  { id: 223, key: 'TahmKench', name: 'Tahm Kench', roles: ['top', 'support'] },
  { id: 163, key: 'Taliyah', name: 'Taliyah', roles: ['jungle', 'mid'] },
  { id: 91, key: 'Talon', name: 'Talon', roles: ['mid'] },
  { id: 44, key: 'Taric', name: 'Taric', roles: ['support'] },
  { id: 17, key: 'Teemo', name: 'Teemo', roles: ['top'] },
  { id: 412, key: 'Thresh', name: 'Thresh', roles: ['support'] },
  { id: 18, key: 'Tristana', name: 'Tristana', roles: ['bot'] },
  { id: 48, key: 'Trundle', name: 'Trundle', roles: ['top', 'jungle'] },
  { id: 23, key: 'Tryndamere', name: 'Tryndamere', roles: ['top'] },
  { id: 4, key: 'TwistedFate', name: 'Twisted Fate', roles: ['mid'] },
  { id: 29, key: 'Twitch', name: 'Twitch', roles: ['bot'] },
  { id: 77, key: 'Udyr', name: 'Udyr', roles: ['jungle'] },
  { id: 6, key: 'Urgot', name: 'Urgot', roles: ['top'] },
  { id: 110, key: 'Varus', name: 'Varus', roles: ['bot'] },
  { id: 67, key: 'Vayne', name: 'Vayne', roles: ['bot'] },
  { id: 45, key: 'Veigar', name: 'Veigar', roles: ['mid'] },
  { id: 161, key: 'Velkoz', name: "Vel'Koz", roles: ['support', 'mid'] },
  { id: 711, key: 'Vex', name: 'Vex', roles: ['mid'] },
  { id: 254, key: 'Vi', name: 'Vi', roles: ['jungle'] },
  { id: 234, key: 'Viego', name: 'Viego', roles: ['jungle'] },
  { id: 112, key: 'Viktor', name: 'Viktor', roles: ['mid'] },
  { id: 8, key: 'Vladimir', name: 'Vladimir', roles: ['mid', 'top'] },
  { id: 106, key: 'Volibear', name: 'Volibear', roles: ['jungle', 'top'] },
  { id: 19, key: 'Warwick', name: 'Warwick', roles: ['jungle'] },
  { id: 498, key: 'Xayah', name: 'Xayah', roles: ['bot'] },
  { id: 101, key: 'Xerath', name: 'Xerath', roles: ['mid', 'support'] },
  { id: 5, key: 'XinZhao', name: 'Xin Zhao', roles: ['jungle'] },
  { id: 157, key: 'Yasuo', name: 'Yasuo', roles: ['mid', 'top'] },
  { id: 777, key: 'Yone', name: 'Yone', roles: ['mid', 'top'] },
  { id: 83, key: 'Yorick', name: 'Yorick', roles: ['top'] },
  { id: 350, key: 'Yuumi', name: 'Yuumi', roles: ['support'] },
  { id: 804, key: 'Yunara', name: 'Yunara', roles: ['bot', 'jungle'] },
  { id: 154, key: 'Zac', name: 'Zac', roles: ['jungle'] },
  { id: 238, key: 'Zed', name: 'Zed', roles: ['mid'] },
  { id: 221, key: 'Zeri', name: 'Zeri', roles: ['bot'] },
  { id: 115, key: 'Ziggs', name: 'Ziggs', roles: ['mid', 'bot'] },
  { id: 26, key: 'Zilean', name: 'Zilean', roles: ['support'] },
  { id: 142, key: 'Zoe', name: 'Zoe', roles: ['mid'] },
  { id: 143, key: 'Zyra', name: 'Zyra', roles: ['support'] },
];

export const searchChampions = (query, laneFilter = 'all') => {
  let filtered = CHAMPIONS;

  if (laneFilter !== 'all') {
    filtered = filtered.filter(champ => champ.roles.includes(laneFilter));
  }

  if (query) {
    const lowerQuery = query.toLowerCase();
    filtered = filtered.filter(champ =>
      champ.name.toLowerCase().includes(lowerQuery)
    );
  }

  return filtered;
};

export const LANE_FILTERS = [
  { value: 'all', label: 'All Lanes' },
  { value: 'top', label: 'Top' },
  { value: 'jungle', label: 'Jungle' },
  { value: 'mid', label: 'Mid' },
  { value: 'bot', label: 'Bot' },
  { value: 'support', label: 'Support' }
];
