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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-text-muted">Lädt...</div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="card text-center py-12">
        <p className="text-text-secondary">Spieler nicht gefunden</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Link to="/players" className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Zurück zu Spielern
      </Link>

      {/* Player Header */}
      <div className="card">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-accent to-primary rounded-xl flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-text-primary mb-1">
              {player.summoner_name}
            </h1>
            <div className="flex items-center gap-3">
              {player.current_rank && (
                <span className="text-text-secondary">
                  {player.current_rank}
                </span>
              )}
              {teams.length > 0 && (
                <>
                  <span className="text-text-muted">•</span>
                  <div className="flex items-center gap-2">
                    {teams.map((team, idx) => (
                      <span key={team.id}>
                        <Link to={`/teams/${team.id}`} className="text-primary hover:text-primary-light transition-colors">
                          {team.name}
                        </Link>
                        {team.role && (
                          <span className={`ml-1 text-sm ${getRoleColor(team.role)}`}>
                            ({team.role})
                          </span>
                        )}
                        {idx < teams.length - 1 && <span className="text-text-muted">, </span>}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Spieler löschen
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card max-w-md w-full">
            <h3 className="text-xl font-bold text-text-primary mb-4">Spieler löschen?</h3>
            <p className="text-text-secondary mb-6">
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
                className="btn bg-error hover:bg-error/80 text-white flex-1"
                disabled={deleting}
              >
                {deleting ? 'Lösche...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-5 h-5 text-success" />
            <p className="text-text-muted text-sm">Total Games</p>
          </div>
          <p className="text-3xl font-bold text-text-primary">
            {champions.reduce((sum, c) => sum + c.games_played_total, 0)}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <p className="text-text-muted text-sm">Champions</p>
          </div>
          <p className="text-3xl font-bold text-text-primary">
            {champions.length}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <User className="w-5 h-5 text-secondary" />
            <p className="text-text-muted text-sm">Level</p>
          </div>
          <p className="text-3xl font-bold text-text-primary">
            {player.summoner_level || 'N/A'}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-5 h-5 text-accent" />
            <p className="text-text-muted text-sm">Teams</p>
          </div>
          <p className="text-3xl font-bold text-text-primary">
            {teams.length}
          </p>
        </div>
      </div>

      {/* Champion Pool */}
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-4">Champion Pool</h2>
        {champions.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-text-secondary">Keine Champion-Daten verfügbar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {champions.slice(0, 12).map((champ) => (
              <div key={champ.champion_id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-text-primary">
                    {champ.champion_name}
                  </h3>
                  <span className="text-xs text-text-muted">
                    {champ.games_played_total} Games
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-text-muted text-xs">Winrate</p>
                    <p className={`font-semibold ${(champ.winrate_total || 0) >= 50 ? 'text-success' : 'text-error'}`}>
                      {champ.winrate_total !== null && champ.winrate_total !== undefined ? champ.winrate_total.toFixed(0) : '0'}%
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs">KDA</p>
                    <p className="font-semibold text-text-primary">
                      {champ.kda_average !== null && champ.kda_average !== undefined ? champ.kda_average.toFixed(2) : '0.00'}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs">CS/min</p>
                    <p className="font-semibold text-text-primary">
                      {champ.cs_per_min !== null && champ.cs_per_min !== undefined ? champ.cs_per_min.toFixed(1) : '0.0'}
                    </p>
                  </div>
                </div>
                {champ.games_played_recent > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs text-text-muted">
                      Recent: {champ.games_played_recent} games, {champ.winrate_recent !== null && champ.winrate_recent !== undefined ? champ.winrate_recent.toFixed(0) : '0'}% WR
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerDetail;
