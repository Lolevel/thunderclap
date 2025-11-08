import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Search, Users as UsersIcon, Shield, ChevronDown } from 'lucide-react';
import api from '../lib/api';
import RoleIcon from '../components/RoleIcon';
import { getSummonerIconUrl, handleSummonerIconError } from '../utils/summonerHelper';
import { usePlayers } from '../hooks/api/usePlayer';
import { useTeams } from '../hooks/api/useTeam';
import { RefreshIndicator } from '../components/ui/RefreshIndicator';

const Players = () => {
  const [enrichedPlayers, setEnrichedPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);

  // Fetch data with SWR
  const { players: playersData, isLoading: playersLoading, isValidating: playersValidating } = usePlayers();
  const { teams: teamsData, isLoading: teamsLoading } = useTeams();

  const loading = playersLoading || teamsLoading;

  // Enrich players with team data
  useEffect(() => {
    const enrichPlayersWithTeams = async () => {
      if (!playersData || !teamsData) return;

      // Fetch rosters for all teams and map players to their teams
      const playerTeamsMap = {};

      for (const team of teamsData) {
        try {
          const rosterRes = await api.get(`/teams/${team.id}/roster`);
          const roster = rosterRes.data.roster || [];

          for (const entry of roster) {
            if (!playerTeamsMap[entry.player.id]) {
              playerTeamsMap[entry.player.id] = [];
            }
            playerTeamsMap[entry.player.id].push({
              id: team.id,
              name: team.name,
              tag: team.tag,
              role: entry.role
            });
          }
        } catch (err) {
          console.error(`Failed to fetch roster for team ${team.id}:`, err);
        }
      }

      // Attach teams to players
      const enriched = playersData.map(player => ({
        ...player,
        teams: playerTeamsMap[player.id] || []
      }));

      setEnrichedPlayers(enriched);
    };

    enrichPlayersWithTeams();
  }, [playersData, teamsData]);

  const filteredPlayers = enrichedPlayers.filter((player) => {
    // Search filter
    const matchesSearch = player.summoner_name.toLowerCase().includes(searchTerm.toLowerCase());

    // Team filter
    const matchesTeam = selectedTeam === 'all' ||
      player.teams.some(team => team.id === selectedTeam);

    // Role filter
    const matchesRole = selectedRole === 'all' ||
      player.teams.some(team => team.role === selectedRole);

    return matchesSearch && matchesTeam && matchesRole;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
          {/* Header Skeleton */}
          <div>
            <div className="h-10 w-48 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-lg mb-2 animate-pulse"></div>
            <div className="h-5 w-64 bg-slate-800/30 rounded animate-pulse"></div>
          </div>

          {/* Search & Filters Skeleton */}
          <div className="space-y-4">
            <div className="h-12 w-full bg-slate-800/50 rounded-lg animate-pulse"></div>
            <div className="flex gap-3">
              <div className="h-10 w-40 bg-slate-800/50 rounded-lg animate-pulse"></div>
              <div className="h-8 w-px bg-slate-700/50"></div>
              <div className="flex gap-2">
                <div className="h-10 w-20 bg-slate-800/50 rounded-lg animate-pulse"></div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-10 h-10 bg-slate-800/50 rounded-lg animate-pulse" style={{ animationDelay: `${i * 100}ms` }}></div>
                ))}
              </div>
            </div>
          </div>

          {/* Players Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 p-5" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center gap-4">
                  {/* Avatar skeleton */}
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-700/50 to-slate-600/50 animate-pulse"></div>

                  <div className="flex-1 space-y-2">
                    {/* Name skeleton */}
                    <div className="h-5 bg-slate-700/50 rounded w-3/4 animate-pulse"></div>
                    {/* Team/Role skeleton */}
                    <div className="h-4 bg-slate-800/50 rounded w-1/2 animate-pulse"></div>
                  </div>

                  {/* Rank badge skeleton */}
                  <div className="w-20 h-8 bg-slate-800/50 rounded-lg animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Cute loading indicator */}
          <div className="flex items-center justify-center py-8">
            <div className="relative">
              {/* Outer rotating ring */}
              <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 animate-spin" style={{ animationDuration: '3s' }}></div>

              {/* Inner pulsing circle */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/40 to-blue-500/40 animate-pulse"></div>
              </div>

              {/* Small orbiting dots */}
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s' }}>
                <div className="absolute top-0 left-1/2 w-2 h-2 -ml-1 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50"></div>
              </div>
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s', animationDelay: '0.5s' }}>
                <div className="absolute bottom-0 left-1/2 w-2 h-2 -ml-1 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50"></div>
              </div>
            </div>
          </div>

          <p className="text-center text-slate-400 text-sm animate-pulse">Loading players...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Background refresh indicator */}
      <RefreshIndicator isValidating={playersValidating} />

      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
            Players
          </h1>
          <p className="text-slate-400">All tracked players</p>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
            />
          </div>

          {/* Filters Row: Team Dropdown + Role Icons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Team Filter - Custom Dropdown */}
            <div className="relative">
              <div
                onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                className="flex items-center gap-3 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg cursor-pointer hover:border-cyan-500/50 transition-all duration-300"
              >
                <UsersIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div className="text-white text-sm whitespace-nowrap">
                  {selectedTeam === 'all'
                    ? 'All Teams'
                    : teamsData?.find(t => t.id === selectedTeam)?.name || 'All Teams'}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isTeamDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isTeamDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsTeamDropdownOpen(false)} />
                  <div className="absolute z-20 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    <div
                      onClick={() => {
                        setSelectedTeam('all');
                        setIsTeamDropdownOpen(false);
                      }}
                      className={`px-4 py-3 hover:bg-slate-700 cursor-pointer transition-colors ${
                        selectedTeam === 'all' ? 'bg-cyan-500/20 text-cyan-300' : 'text-white'
                      }`}
                    >
                      All Teams
                    </div>
                    {teamsData && teamsData.map(team => (
                      <div
                        key={team.id}
                        onClick={() => {
                          setSelectedTeam(team.id);
                          setIsTeamDropdownOpen(false);
                        }}
                        className={`px-4 py-3 hover:bg-slate-700 cursor-pointer transition-colors ${
                          selectedTeam === team.id ? 'bg-cyan-500/20 text-cyan-300' : 'text-white'
                        }`}
                      >
                        {team.name}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-slate-700/50"></div>

            {/* Role Filter with Icons */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-400">Role:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedRole('all')}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                    selectedRole === 'all'
                      ? 'bg-cyan-500/20 border-2 border-cyan-500/50 text-cyan-300'
                      : 'bg-slate-800/50 border-2 border-slate-700/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span className="text-sm font-medium">All</span>
                </button>
                {['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'].map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`w-10 h-10 rounded-lg transition-all duration-200 flex items-center justify-center ${
                      selectedRole === role
                        ? 'bg-cyan-500/20 border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                        : 'bg-slate-800/50 border-2 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/70'
                    }`}
                    title={role}
                  >
                    <RoleIcon role={role} size={20} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Players List */}
        {filteredPlayers.length === 0 ? (
          <div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 text-center py-12">
            <User className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-300 mb-2">
              {searchTerm ? 'No players found' : 'No players tracked yet'}
            </p>
            <p className="text-slate-500 text-sm">
              {!searchTerm && 'Players are automatically added when importing teams'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlayers.map((player) => (
              <Link
                key={player.id}
                to={`/players/${player.id}`}
                className="group relative overflow-hidden rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 p-5 hover:bg-slate-800/60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/5 transition-all duration-300" />

                <div className="relative flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg overflow-hidden shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow duration-300 border border-cyan-500/30">
                    <img
                      src={getSummonerIconUrl(player.profile_icon_id)}
                      alt={player.summoner_name}
                      className="w-full h-full object-cover"
                      onError={handleSummonerIconError}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">
                      {player.summoner_name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      {player.teams && player.teams.length > 0 ? (
                        player.teams.map((team, idx) => (
                          <span key={team.id} className="flex items-center gap-1">
                            <span className="text-slate-400">{team.tag || team.name}</span>
                            {team.role && (
                              <RoleIcon role={team.role} size={14} />
                            )}
                            {idx < player.teams.length - 1 && <span className="text-slate-400">,</span>}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500">Kein Team</span>
                      )}
                    </div>
                  </div>

                  {/* Rank Badge */}
                  {player.soloq && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors duration-300">
                      {player.soloq.icon_url && (
                        <img
                          src={player.soloq.icon_url}
                          alt={player.soloq.display}
                          className="w-5 h-5 rounded-full"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <span className="text-xs font-semibold text-white">
                        {player.soloq.display}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Players;
