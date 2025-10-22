import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User, Trophy, TrendingUp, ArrowLeft, Trash2 } from 'lucide-react';
import api from '../config/api';

const PlayerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [champions, setChampions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPlayerData();
  }, [id]);

  const fetchPlayerData = async () => {
    try {
      const [playerRes, championsRes, teamsRes] = await Promise.all([
        api.get(`/players/${id}`),
        api.get(`/players/${id}/champions?limit=20`),
        api.get(`/teams/`).catch(() => ({ data: { teams: [] } }))
      ]);

      setPlayer(playerRes.data);
      setChampions(championsRes.data.champions || []);

      // Find teams this player belongs to
      const allTeams = teamsRes.data.teams || [];
      const playerTeams = [];

      for (const team of allTeams) {
        try {
          const rosterRes = await api.get(`/teams/${team.id}/roster`);
          const roster = rosterRes.data.roster || [];
          const isInTeam = roster.some(entry => entry.player.id === id);
          if (isInTeam) {
            const rosterEntry = roster.find(entry => entry.player.id === id);
            playerTeams.push({
              ...team,
              role: rosterEntry?.role
            });
          }
        } catch (err) {
          console.error(`Failed to fetch roster for team ${team.id}:`, err);
        }
      }

      setTeams(playerTeams);
    } catch (error) {
      console.error('Failed to fetch player data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleDeletePlayer = async () => {
    setDeleting(true);
    try {
      await api.delete(`/players/${id}`);
      navigate('/players');
    } catch (error) {
      console.error('Failed to delete player:', error);
      alert('Fehler beim Löschen des Spielers');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="animate-pulse text-slate-400">Lädt...</div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 text-center py-12">
          <p className="text-slate-400">Spieler nicht gefunden</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Back Button */}
        <Link to="/players" className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Zurück zu Spielern
        </Link>

        {/* Player Header */}
        <div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 p-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-1">
                {player.summoner_name}
              </h1>
              <div className="flex items-center gap-3">
                {player.current_rank && (
                  <span className="text-slate-300">
                    {player.current_rank}
                  </span>
                )}
                {teams.length > 0 && (
                  <>
                    <span className="text-slate-500">•</span>
                    <div className="flex items-center gap-2">
                      {teams.map((team, idx) => (
                        <span key={team.id}>
                          <Link to={`/teams/${team.id}`} className="text-cyan-400 hover:text-cyan-300 transition-colors">
                            {team.name}
                          </Link>
                          {team.role && (
                            <span className={`ml-1 text-sm ${getRoleColor(team.role)}`}>
                              ({team.role})
                            </span>
                          )}
                          {idx < teams.length - 1 && <span className="text-slate-500">, </span>}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-slate-800/50 backdrop-blur border border-slate-700/50 hover:border-slate-600 text-white rounded-lg transition-all duration-300 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Spieler löschen
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="rounded-xl bg-slate-800/90 backdrop-blur border border-slate-700/50 p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Spieler löschen?</h3>
              <p className="text-slate-300 mb-6">
                Möchtest du {player.summoner_name} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn btn-secondary flex-1"
                  disabled={deleting}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDeletePlayer}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-300 flex-1"
                  disabled={deleting}
                >
                  {deleting ? 'Lösche...' : 'Löschen'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative overflow-hidden rounded-xl bg-slate-800/50 backdrop-blur border border-slate-700/50 p-5">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 opacity-0 hover:opacity-5 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Total Games</p>
                <p className="text-3xl font-bold text-white">
                  {champions.reduce((sum, c) => sum + (c.games_played || 0), 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-slate-800/50 backdrop-blur border border-slate-700/50 p-5">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 opacity-0 hover:opacity-5 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Champions</p>
                <p className="text-3xl font-bold text-white">
                  {champions.length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-slate-800/50 backdrop-blur border border-slate-700/50 p-5">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 opacity-0 hover:opacity-5 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Teams</p>
                <p className="text-3xl font-bold text-white">
                  {teams.length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Champion Pool */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Champion Pool</h2>
          {champions.length === 0 ? (
            <div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 text-center py-12">
              <p className="text-slate-400">Keine Champion-Daten verfügbar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {champions.slice(0, 12).map((champ) => (
                <div key={champ.champion_id} className="group relative overflow-hidden rounded-lg bg-slate-800/40 backdrop-blur border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300">
                  {/* Champion Icon */}
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-800/60 to-slate-800/40">
                    <img
                      src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${champ.champion_id}.png`}
                      alt={champ.champion_name}
                      className="w-12 h-12 rounded-lg border-2 border-slate-700 group-hover:border-cyan-500 transition-colors"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">
                        {champ.champion_name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {champ.games_played || 0} Games
                      </p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 p-3 text-xs">
                    <div className="text-center">
                      <p className="text-slate-500 mb-0.5">WR</p>
                      <p className={`font-bold ${(champ.winrate || 0) >= 50 ? 'text-success' : 'text-error'}`}>
                        {champ.winrate !== null && champ.winrate !== undefined ? champ.winrate.toFixed(0) : '0'}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 mb-0.5">KDA</p>
                      <p className="font-bold text-cyan-400">
                        {champ.kda_average !== null && champ.kda_average !== undefined ? champ.kda_average.toFixed(1) : '0.0'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 mb-0.5">CS/m</p>
                      <p className="font-bold text-white">
                        {champ.cs_per_min !== null && champ.cs_per_min !== undefined ? champ.cs_per_min.toFixed(1) : '0.0'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerDetail;
