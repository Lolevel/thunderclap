import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User, Trophy, TrendingUp, ArrowLeft, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { usePlayer, usePlayerChampions } from '../hooks/api/usePlayer';
import { useTeams, useTeamRoster } from '../hooks/api/useTeam';
import { RefreshIndicator } from '../components/ui/RefreshIndicator';
import { getChampionIconUrl } from '../utils/championHelper';
import { getSummonerIconUrl, handleSummonerIconError } from '../utils/summonerHelper';
import RoleIcon from '../components/RoleIcon';
import MatchHistory from '../components/MatchHistory';

const PlayerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [playerTeams, setPlayerTeams] = useState([]);

  // Fetch player data with SWR
  const { player, isLoading: playerLoading, isValidating: playerValidating } = usePlayer(id);
  const { champions, isLoading: championsLoading } = usePlayerChampions(id, 'tournament', 20);
  const { teams: allTeams, isLoading: teamsLoading } = useTeams();

  const loading = playerLoading || championsLoading || teamsLoading;

  // Find teams this player belongs to
  useEffect(() => {
    const findPlayerTeams = async () => {
      if (!allTeams || !id) return;

      const teams = [];
      for (const team of allTeams) {
        try {
          const rosterRes = await api.get(`/teams/${team.id}/roster`);
          const roster = rosterRes.data.roster || [];
          const isInTeam = roster.some(entry => entry.player.id === id);
          if (isInTeam) {
            const rosterEntry = roster.find(entry => entry.player.id === id);
            teams.push({
              ...team,
              role: rosterEntry?.role
            });
          }
        } catch (err) {
          console.error(`Failed to fetch roster for team ${team.id}:`, err);
        }
      }
      setPlayerTeams(teams);
    };

    findPlayerTeams();
  }, [allTeams, id]);

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
      <div className="flex items-center justify-center flex-1">
        <div className="animate-pulse text-slate-400">Lädt...</div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 text-center py-12">
          <p className="text-slate-400">Spieler nicht gefunden</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Background refresh indicator */}
      <RefreshIndicator isValidating={playerValidating} />

      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Back Button */}
        <Link to="/players" className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Zurück zu Spielern
        </Link>

        {/* Player Header */}
        <div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 p-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-xl overflow-hidden shadow-lg shadow-blue-500/20 border-2 border-cyan-500/50">
              <img
                src={getSummonerIconUrl(player.profile_icon_id)}
                alt={player.summoner_name}
                className="w-full h-full object-cover"
                onError={handleSummonerIconError}
              />
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
                {playerTeams.length > 0 && (
                  <>
                    <span className="text-slate-500">•</span>
                    <div className="flex items-center gap-3">
                      {playerTeams.map((team, idx) => (
                        <span key={team.id} className="flex items-center gap-1.5">
                          {team.role && <RoleIcon role={team.role} size={18} />}
                          <Link to={`/teams/${team.id}`} className="text-cyan-400 hover:text-cyan-300 transition-colors">
                            {team.name}
                          </Link>
                          {idx < playerTeams.length - 1 && <span className="text-slate-500">, </span>}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-slate-800/50 backdrop-blur border border-slate-700/50 hover:border-slate-600 text-white rounded-lg transition-all duration-300 flex items-center gap-2 cursor-pointer"
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
                  className="btn btn-secondary flex-1 cursor-pointer"
                  disabled={deleting}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDeletePlayer}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-300 flex-1 cursor-pointer"
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
          <div className="group relative overflow-hidden rounded-xl bg-slate-800/50 backdrop-blur border border-slate-700/50 p-5 transition-all duration-300 hover:border-green-500/30">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none" />
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

          <div className="group relative overflow-hidden rounded-xl bg-slate-800/50 backdrop-blur border border-slate-700/50 p-5 transition-all duration-300 hover:border-blue-500/30">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none" />
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

          <div className="group relative overflow-hidden rounded-xl bg-slate-800/50 backdrop-blur border border-slate-700/50 p-5 transition-all duration-300 hover:border-purple-500/30">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Teams</p>
                <p className="text-3xl font-bold text-white">
                  {playerTeams.length}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {champions.slice(0, 12).map((champ) => (
                <div key={champ.champion_id} className="flex items-center gap-3 px-3 py-2 bg-surface/40 hover:bg-surface-hover rounded-lg border border-border/50 hover:border-primary/30 transition-all duration-200 group">
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={getChampionIconUrl(champ.champion_id)} alt={champ.champion_name} className="w-full h-full object-cover scale-110" onError={(e) => e.target.style.display = 'none'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm truncate">{champ.champion_name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-lg font-bold text-cyan-400">{champ.games_played || 0}</p>
                      <p className="text-xs text-slate-500">Games</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-shrink-0">
                    <div className="text-center">
                      <p className={`text-xs ${(champ.winrate || 0) >= 50 ? 'text-green-400/60' : 'text-red-400/60'}`}>{champ.winrate?.toFixed(0) || 0}%</p>
                      <p className="text-[10px] text-slate-500">WR</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-300">{champ.kda_average?.toFixed(1) || '0.0'}</p>
                      <p className="text-[10px] text-slate-500">KDA</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-300">{champ.cs_per_min?.toFixed(1) || '0.0'}</p>
                      <p className="text-[10px] text-slate-500">CS/m</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prime League Match History */}
        <div>
          <MatchHistory entityId={id} entityType="player" />
        </div>
      </div>
    </div>
  );
};

export default PlayerDetail;
