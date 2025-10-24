import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User, Trophy, TrendingUp, ArrowLeft, Trash2, ChevronDown, ChevronUp, Calendar, Clock } from 'lucide-react';
import api from '../config/api';
import { getChampionIconUrl } from '../utils/championHelper';
import { displayRole } from '../utils/roleMapping';
import { getItemIconUrl, filterEmptyItems, handleItemError } from '../utils/itemHelper';
import RoleIcon from '../components/RoleIcon';

const PlayerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [champions, setChampions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedMatches, setExpandedMatches] = useState(new Set());
  const [matchesLimit, setMatchesLimit] = useState(20);

  useEffect(() => {
    fetchPlayerData();
  }, [id]);

  const fetchPlayerData = async () => {
    try {
      const [playerRes, championsRes, teamsRes, matchesRes] = await Promise.all([
        api.get(`/players/${id}`),
        api.get(`/players/${id}/champions?limit=20`),
        api.get(`/teams/`).catch(() => ({ data: { teams: [] } })),
        api.get(`/players/${id}/matches?limit=${matchesLimit}`).catch(() => ({ data: { matches: [] } }))
      ]);

      setPlayer(playerRes.data);
      setChampions(championsRes.data.champions || []);
      setMatches(matchesRes.data.matches || []);

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

  const toggleMatch = (matchId) => {
    setExpandedMatches((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(matchId)) {
        newSet.delete(matchId);
      } else {
        newSet.add(matchId);
      }
      return newSet;
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const loadMoreMatches = async () => {
    setLoadingMore(true);
    const newLimit = matchesLimit + 20;
    try {
      const matchesRes = await api.get(`/players/${id}/matches?limit=${newLimit}`);
      setMatches(matchesRes.data.matches || []);
      setMatchesLimit(newLimit);
    } catch (error) {
      console.error('Failed to load more matches:', error);
    } finally {
      setLoadingMore(false);
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
                    <div className="flex items-center gap-3">
                      {teams.map((team, idx) => (
                        <span key={team.id} className="flex items-center gap-1.5">
                          {team.role && <RoleIcon role={team.role} size={18} />}
                          <Link to={`/teams/${team.id}`} className="text-cyan-400 hover:text-cyan-300 transition-colors">
                            {team.name}
                          </Link>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {champions.slice(0, 12).map((champ) => (
                <div key={champ.champion_id} className="flex items-center gap-3 px-3 py-2 bg-surface/40 hover:bg-surface-hover rounded-lg border border-border/50 hover:border-primary/30 transition-all duration-200 group">
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={getChampionIconUrl(champ.champion_id)} alt={champ.champion_name} className="w-full h-full object-cover scale-110" onError={(e) => e.target.style.display = 'none'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm truncate">{champ.champion_name}</h3>
                    <p className="text-xs text-slate-400">{champ.games_played || 0} Games</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-shrink-0">
                    <div className="text-center">
                      <p className={`font-bold ${(champ.winrate || 0) >= 50 ? 'text-success' : 'text-error'}`}>{champ.winrate?.toFixed(0) || 0}%</p>
                      <p className="text-slate-500">WR</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-cyan-400">{champ.kda_average?.toFixed(1) || '0.0'}</p>
                      <p className="text-slate-500">KDA</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-white">{champ.cs_per_min?.toFixed(1) || '0.0'}</p>
                      <p className="text-slate-500">CS/m</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prime League Match History */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Prime League Match History</h2>
          {matches.length === 0 ? (
            <div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 text-center py-12">
              <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400">Keine Prime League Matches gefunden</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => {
                const isExpanded = expandedMatches.has(match.match_id);

                // Combine both teams and sort by side (Blue=100, Red=200)
                const allPlayers = [...(match.our_team || []), ...(match.enemy_team || [])];
                const blueTeam = allPlayers.filter(p => p.riot_team_id === 100);
                const redTeam = allPlayers.filter(p => p.riot_team_id === 200);

                // Check which side we're on for the win indicator
                const ourTeam = match.our_team || [];
                const weAreBlue = ourTeam.length > 0 && ourTeam[0].riot_team_id === 100;

                return (
                  <div
                    key={match.match_id}
                    className={`rounded-xl bg-slate-800/40 backdrop-blur border overflow-hidden ${
                      match.win ? 'border-green-500/50' : 'border-red-500/50'
                    }`}
                  >
                    <button
                      onClick={() => toggleMatch(match.match_id)}
                      className="w-full text-left p-4 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div
                            className={`px-4 py-2 rounded-lg font-bold ${
                              match.win
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {match.win ? 'Sieg' : 'Niederlage'}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-slate-400">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {formatDate(match.game_creation)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {formatDuration(match.game_duration)}
                            </div>
                          </div>

                          <div className="flex -space-x-2">
                            {ourTeam.slice(0, 5).map((p, idx) => (
                              <div
                                key={`${match.match_id}-preview-${idx}`}
                                className="w-8 h-8 rounded-full overflow-hidden border-2 border-slate-800"
                                title={`${p.summoner_name} - ${p.champion_name}`}
                              >
                                <img
                                  src={p.champion_icon}
                                  alt={p.champion_name}
                                  className="w-full h-full object-cover scale-110"
                                  onError={(e) => e.target.style.display = 'none'}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="text-slate-400">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-700/50 space-y-6">
                        {/* Blue Side Team */}
                        <div>
                          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <span className="text-blue-400">BLUE SIDE</span>
                            {weAreBlue && <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">Unser Team</span>}
                          </h3>
                          <div className="space-y-2">
                            {blueTeam.map((p, idx) => (
                              <div
                                key={`${match.match_id}-our-${idx}`}
                                className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50"
                              >
                                <div className="w-12 h-12 rounded-lg overflow-hidden">
                                  <img
                                    src={p.champion_icon}
                                    alt={p.champion_name}
                                    className="w-full h-full object-cover scale-110"
                                    onError={(e) => e.target.style.display = 'none'}
                                  />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-white truncate">
                                    {p.summoner_name}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {displayRole(p.role)}
                                  </p>
                                </div>

                                <div className="flex gap-1">
                                  {filterEmptyItems(p.items).map((itemId, itemIdx) => (
                                    <div key={itemIdx} className="w-8 h-8 rounded overflow-hidden bg-slate-700/50">
                                      <img
                                        src={getItemIconUrl(itemId, match.game_version)}
                                        alt={`Item ${itemId}`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => handleItemError(e, itemId)}
                                      />
                                    </div>
                                  ))}
                                </div>

                                <div className="text-center">
                                  <p className="text-sm font-semibold text-white">
                                    {p.kills}/{p.deaths}/{p.assists}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {p.deaths === 0
                                      ? 'Perfect'
                                      : ((p.kills + p.assists) / p.deaths).toFixed(2)}{' '}
                                    KDA
                                  </p>
                                </div>

                                <div className="text-center">
                                  <p className="text-sm font-semibold text-white">{p.cs}</p>
                                  <p className="text-xs text-slate-400">CS</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Red Side Team */}
                        <div>
                          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <span className="text-red-400">RED SIDE</span>
                            {!weAreBlue && <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">Unser Team</span>}
                          </h3>
                          <div className="space-y-2">
                            {redTeam.map((p, idx) => (
                              <div
                                key={`${match.match_id}-enemy-${idx}`}
                                className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50"
                              >
                                <div className="w-12 h-12 rounded-lg overflow-hidden">
                                  <img
                                    src={p.champion_icon}
                                    alt={p.champion_name}
                                    className="w-full h-full object-cover scale-110"
                                    onError={(e) => e.target.style.display = 'none'}
                                  />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-white truncate">
                                    {p.summoner_name}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {displayRole(p.role)}
                                  </p>
                                </div>

                                <div className="flex gap-1">
                                  {filterEmptyItems(p.items).map((itemId, itemIdx) => (
                                    <div key={itemIdx} className="w-8 h-8 rounded overflow-hidden bg-slate-700/50">
                                      <img
                                        src={getItemIconUrl(itemId, match.game_version)}
                                        alt={`Item ${itemId}`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => handleItemError(e, itemId)}
                                      />
                                    </div>
                                  ))}
                                </div>

                                <div className="text-center">
                                  <p className="text-sm font-semibold text-white">
                                    {p.kills}/{p.deaths}/{p.assists}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {p.deaths === 0
                                      ? 'Perfect'
                                      : ((p.kills + p.assists) / p.deaths).toFixed(2)}{' '}
                                    KDA
                                  </p>
                                </div>

                                <div className="text-center">
                                  <p className="text-sm font-semibold text-white">{p.cs}</p>
                                  <p className="text-xs text-slate-400">CS</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {matches.length > 0 && matches.length % 20 === 0 && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMoreMatches}
                disabled={loadingMore}
                className="px-6 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loadingMore ? 'Lädt...' : 'Mehr laden'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerDetail;
