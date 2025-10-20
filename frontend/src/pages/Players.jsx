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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-text-muted">Lädt...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Spieler</h1>
        <p className="text-text-secondary">Alle erfassten Spieler</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Spieler durchsuchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input w-full pl-10"
        />
      </div>

      {/* Players List */}
      {filteredPlayers.length === 0 ? (
        <div className="card text-center py-12">
          <User className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary">
            {searchTerm ? 'Keine Spieler gefunden' : 'Noch keine Spieler erfasst'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlayers.map((player) => (
            <Link
              key={player.id}
              to={`/players/${player.id}`}
              className="card hover:bg-surface-hover transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-accent to-primary rounded-lg flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                    {player.summoner_name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    {player.teams && player.teams.length > 0 ? (
                      player.teams.map((team, idx) => (
                        <span key={team.id} className="flex items-center gap-1">
                          <span className="text-text-muted">{team.tag || team.name}</span>
                          {team.role && (
                            <span className={`text-xs ${getRoleColor(team.role)}`}>
                              ({displayRole(team.role)})
                            </span>
                          )}
                          {idx < player.teams.length - 1 && <span className="text-text-muted">,</span>}
                        </span>
                      ))
                    ) : (
                      <span className="text-text-muted">Kein Team</span>
                    )}
                  </div>
                </div>

                {/* Rank Badge */}
                {player.soloq && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded border border-primary/20">
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
                    <span className="text-xs font-semibold text-text-primary">
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
  );
};

export default Players;
