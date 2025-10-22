import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Search } from 'lucide-react';
import api from '../config/api';
import { displayRole } from '../utils/roleMapping';

const Players = () => {
  const [players, setPlayers] = useState([]);
  const [playersWithTeams, setPlayersWithTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const [playersRes, teamsRes] = await Promise.all([
        api.get('/players'),
        api.get('/teams/')
      ]);

      const playersArray = playersRes.data.players || [];
      const teamsArray = teamsRes.data.teams || [];

      // Fetch rosters for all teams and map players to their teams
      const playerTeamsMap = {};

      for (const team of teamsArray) {
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
      const enrichedPlayers = playersArray.map(player => ({
        ...player,
        teams: playerTeamsMap[player.id] || []
      }));

      setPlayers(enrichedPlayers);
      setPlayersWithTeams(enrichedPlayers);
    } catch (error) {
      console.error('Failed to fetch players:', error);
      setPlayers([]);
      setPlayersWithTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter((player) =>
    player.summoner_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role) => {
    const colors = {
      TOP: 'text-blue-400',
      JUNGLE: 'text-green-400',
      MIDDLE: 'text-purple-400',
      BOTTOM: 'text-red-400',
      UTILITY: 'text-yellow-400',
    };
    return colors[role] || 'text-text-muted';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="animate-pulse text-slate-400">Lädt...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
            Spieler
          </h1>
          <p className="text-slate-400">Alle erfassten Spieler</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Spieler durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
          />
        </div>

        {/* Players List */}
        {filteredPlayers.length === 0 ? (
          <div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 text-center py-12">
            <User className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-300 mb-2">
              {searchTerm ? 'Keine Spieler gefunden' : 'Noch keine Spieler erfasst'}
            </p>
            <p className="text-slate-500 text-sm">
              {!searchTerm && 'Spieler werden automatisch beim Import von Teams hinzugefügt'}
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
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow duration-300">
                    <User className="w-6 h-6 text-white" />
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
                              <span className={`text-xs ${getRoleColor(team.role)}`}>
                                ({displayRole(team.role)})
                              </span>
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
