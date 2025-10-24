import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Trophy, Calendar, Clock, Users } from 'lucide-react';
import api from '../config/api';
import { displayRole } from '../utils/roleMapping';

const MatchHistoryTab = ({ teamId }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatches, setExpandedMatches] = useState(new Set());

  useEffect(() => {
    fetchMatches();
  }, [teamId]);

  const fetchMatches = async () => {
    try {
      const response = await api.get(`/teams/${teamId}/matches?limit=50`);
      setMatches(response.data.matches || []);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    } finally {
      setLoading(false);
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

  const getChampionUrl = (participant) => {
    // Use champion_icon from API (Community Dragon with correct patch)
    // Falls back to placeholder if not available
    return participant?.champion_icon || null;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-text-muted">Lädt Matches...</div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="card text-center py-12">
        <Trophy className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <p className="text-text-secondary">Keine Prime League Matches gefunden</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-text-primary">
          Match History ({matches.length} Games)
        </h2>
      </div>

      {matches.map((match) => {
        const isExpanded = expandedMatches.has(match.match_id);
        // Backend returns our_team and enemy_team instead of participants
        const ourTeam = match.our_team || [];
        const enemyTeam = match.enemy_team || [];

        return (
          <div
            key={match.match_id}
            className={`card overflow-hidden border-l-4 ${
              match.win ? 'border-success' : 'border-error'
            }`}
          >
            {/* Match Summary (always visible) */}
            <button
              onClick={() => toggleMatch(match.match_id)}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  {/* Win/Loss Badge */}
                  <div
                    className={`px-4 py-2 rounded-lg font-bold ${
                      match.win
                        ? 'bg-success/20 text-success'
                        : 'bg-error/20 text-error'
                    }`}
                  >
                    {match.win ? 'Sieg' : 'Niederlage'}
                  </div>

                  {/* Match Info */}
                  <div className="flex items-center gap-4 text-sm text-text-secondary">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDate(match.game_creation)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {formatDuration(match.game_duration)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {match.team_players_count}/5 Team
                    </div>
                  </div>

                  {/* Team Champions Preview (first 5 only) */}
                  <div className="flex -space-x-2">
                    {ourTeam
                      .filter((p) => p.is_team_member)
                      .map((p, idx) => (
                        <div
                          key={`${match.match_id}-preview-${p.summoner_name}-${idx}`}
                          className="w-8 h-8 rounded-full overflow-hidden border-2 border-surface"
                          title={`${p.summoner_name} - ${p.champion_name}`}
                        >
                          <img
                            src={getChampionUrl(p)}
                            alt={p.champion_name}
                            className="w-full h-full object-cover scale-110"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      ))}
                  </div>
                </div>

                {/* Expand Icon */}
                <div className="text-text-muted">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </div>
            </button>

            {/* Match Details (expandable) */}
            {isExpanded && (
              <div className="mt-6 pt-6 border-t border-border space-y-6">
                {/* Our Team */}
                <div>
                  <h3 className="text-sm font-semibold text-primary mb-3">
                    UNSER TEAM
                  </h3>
                  <div className="space-y-2">
                    {ourTeam.map((p, idx) => (
                      <div
                        key={`${match.match_id}-our-${p.summoner_name}-${idx}`}
                        className={`flex items-center gap-4 p-3 rounded-lg ${
                          p.is_team_member ? 'bg-primary/10' : 'bg-surface-hover'
                        }`}
                      >
                        {/* Champion */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden">
                          <img
                            src={getChampionUrl(p)}
                            alt={p.champion_name}
                            className="w-full h-full object-cover scale-120"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>

                        {/* Player Name & Role */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={`font-semibold truncate ${
                                p.is_team_member
                                  ? 'text-primary'
                                  : 'text-text-muted'
                              }`}
                            >
                              {p.summoner_name}
                            </p>
                            {!p.is_team_member && (
                              <span className="text-xs text-error bg-error/20 px-2 py-0.5 rounded">
                                Extern
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${getRoleColor(p.role)}`}>
                            {displayRole(p.role)}
                          </p>
                        </div>

                        {/* KDA */}
                        <div className="text-center">
                          <p className="text-sm font-semibold text-text-primary">
                            {p.kills}/{p.deaths}/{p.assists}
                          </p>
                          <p className="text-xs text-text-muted">
                            {p.deaths === 0
                              ? 'Perfect'
                              : ((p.kills + p.assists) / p.deaths).toFixed(2)}{' '}
                            KDA
                          </p>
                        </div>

                        {/* CS */}
                        <div className="text-center">
                          <p className="text-sm font-semibold text-text-primary">
                            {p.cs}
                          </p>
                          <p className="text-xs text-text-muted">CS</p>
                        </div>

                        {/* Gold */}
                        <div className="text-center">
                          <p className="text-sm font-semibold text-text-primary">
                            {(p.gold / 1000).toFixed(1)}k
                          </p>
                          <p className="text-xs text-text-muted">Gold</p>
                        </div>

                        {/* Damage */}
                        <div className="text-center">
                          <p className="text-sm font-semibold text-text-primary">
                            {(p.damage_dealt / 1000).toFixed(1)}k
                          </p>
                          <p className="text-xs text-text-muted">Damage</p>
                        </div>

                        {/* Vision Score */}
                        <div className="text-center">
                          <p className="text-sm font-semibold text-text-primary">
                            {p.vision_score}
                          </p>
                          <p className="text-xs text-text-muted">Vision</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Enemy Team */}
                <div>
                  <h3 className="text-sm font-semibold text-error mb-3">
                    GEGNER
                  </h3>
                  <div className="space-y-2">
                    {enemyTeam.map((p, idx) => (
                      <div
                        key={`${match.match_id}-enemy-${p.summoner_name}-${idx}`}
                        className={`flex items-center gap-4 p-3 rounded-lg ${
                          p.is_team_member ? 'bg-primary/10' : 'bg-surface-hover'
                        }`}
                      >
                        {/* Champion */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden">
                          <img
                            src={getChampionUrl(p)}
                            alt={p.champion_name}
                            className="w-full h-full object-cover scale-110"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>

                        {/* Player Name & Role */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={`font-semibold truncate ${
                                p.is_team_member
                                  ? 'text-primary'
                                  : 'text-text-muted'
                              }`}
                            >
                              {p.summoner_name}
                            </p>
                            {!p.is_team_member && (
                              <span className="text-xs text-error bg-error/20 px-2 py-0.5 rounded">
                                Extern
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${getRoleColor(p.role)}`}>
                            {displayRole(p.role)}
                          </p>
                        </div>

                        {/* KDA */}
                        <div className="text-center">
                          <p className="text-sm font-semibold text-text-primary">
                            {p.kills}/{p.deaths}/{p.assists}
                          </p>
                          <p className="text-xs text-text-muted">
                            {p.deaths === 0
                              ? 'Perfect'
                              : ((p.kills + p.assists) / p.deaths).toFixed(2)}{' '}
                            KDA
                          </p>
                        </div>

                        {/* CS */}
                        <div className="text-center">
                          <p className="text-sm font-semibold text-text-primary">
                            {p.cs}
                          </p>
                          <p className="text-xs text-text-muted">CS</p>
                        </div>

                        {/* Gold */}
                        <div className="text-center">
                          <p className="text-sm font-semibold text-text-primary">
                            {(p.gold / 1000).toFixed(1)}k
                          </p>
                          <p className="text-xs text-text-muted">Gold</p>
                        </div>

                        {/* Damage */}
                        <div className="text-center">
                          <p className="text-sm font-semibold text-text-primary">
                            {(p.damage_dealt / 1000).toFixed(1)}k
                          </p>
                          <p className="text-xs text-text-muted">Damage</p>
                        </div>

                        {/* Vision Score */}
                        <div className="text-center">
                          <p className="text-sm font-semibold text-text-primary">
                            {p.vision_score}
                          </p>
                          <p className="text-xs text-text-muted">Vision</p>
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
  );
};

export default MatchHistoryTab;
