import { useState } from 'react';
import { ChevronDown, ChevronUp, Trophy, Calendar, Clock, Users, List, LayoutGrid, ArrowLeftRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { displayRole } from '../utils/roleMapping';
import { getItemIconUrl, filterEmptyItems, handleItemError } from '../utils/itemHelper';
import { useTeamMatches } from '../hooks/api/useTeam';
import { usePlayerMatches } from '../hooks/api/usePlayer';

/**
 * Reusable Match History Component for both Team and Player views
 * @param {string} entityId - The ID of the team or player
 * @param {string} entityType - Either 'team' or 'player'
 */
const MatchHistory = ({ entityId, entityType = 'team' }) => {
  const [expandedMatches, setExpandedMatches] = useState(new Set());
  const [matchesLimit, setMatchesLimit] = useState(entityType === 'team' ? 50 : 20);
  const [viewMode, setViewMode] = useState('detailed'); // 'detailed' or 'simplified'

  // Fetch matches with SWR
  const teamMatchesResult = useTeamMatches(entityType === 'team' ? entityId : null, matchesLimit);
  const playerMatchesResult = usePlayerMatches(entityType === 'player' ? entityId : null, matchesLimit);

  const { matches, isLoading: loading } = entityType === 'team' ? teamMatchesResult : playerMatchesResult;

  const loadMoreMatches = () => {
    const increment = entityType === 'team' ? 50 : 20;
    setMatchesLimit(matchesLimit + increment);
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
    return participant?.champion_icon || null;
  };

  const getRoleColor = (role) => {
    // Keep role colors gray as requested
    return 'text-text-muted';
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

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-surface/40 p-1 rounded-lg border border-border/50">
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-3 py-1.5 rounded transition-all flex items-center gap-2 ${
              viewMode === 'detailed'
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text-primary'
            }`}
            title="Detailed View"
          >
            <LayoutGrid className="w-4 h-4" />
            Detailed
          </button>
          <button
            onClick={() => setViewMode('simplified')}
            className={`px-3 py-1.5 rounded transition-all flex items-center gap-2 ${
              viewMode === 'simplified'
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text-primary'
            }`}
            title="Simplified View (Players Only)"
          >
            <List className="w-4 h-4" />
            Players
          </button>
        </div>
      </div>

      {matches.map((match) => {
        const isExpanded = expandedMatches.has(match.match_id);

        // Combine both teams and sort by side (Blue=100, Red=200)
        const allPlayers = [...(match.our_team || []), ...(match.enemy_team || [])];
        const blueTeam = allPlayers.filter(p => p.riot_team_id === 100);
        const redTeam = allPlayers.filter(p => p.riot_team_id === 200);

        // Check which side we're on
        const ourTeam = match.our_team || [];
        const weAreBlue = ourTeam.length > 0 && ourTeam[0].riot_team_id === 100;

        // Simplified view - only show player names
        if (viewMode === 'simplified') {
          return (
            <div
              key={match.match_id}
              className={`card overflow-hidden border-l-4 ${
                match.win ? 'border-success' : 'border-error'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Win/Loss Badge */}
                <div
                  className={`w-16 px-2 py-2 rounded-lg font-bold text-center text-sm flex-shrink-0 ${
                    match.win
                      ? 'bg-success/20 text-success'
                      : 'bg-error/20 text-error'
                  }`}
                >
                  {match.win ? 'W' : 'L'}
                </div>

                {/* Player Names with Champion Icons - 5 players in one row */}
                <div className="flex-1 flex items-center gap-2">
                  {ourTeam
                    .filter((p) => entityType === 'team' ? p.is_team_member : true)
                    .slice(0, 5)
                    .map((player, idx) => {
                      // Remove Riot tag (#EUW1, #NA1, etc.) from summoner name
                      const displayName = player.summoner_name.split('#')[0];

                      return (
                        <Link
                          key={`${match.match_id}-player-${idx}`}
                          to={`/players/${player.player_id}`}
                          className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 bg-surface-hover hover:bg-surface rounded-lg transition-all group"
                          title={`${player.summoner_name} - ${player.champion_name}`}
                        >
                          {/* Champion Icon */}
                          <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                            {getChampionUrl(player) && (
                              <img
                                src={getChampionUrl(player)}
                                alt={player.champion_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                          </div>

                          {/* Player Name (without tag) */}
                          <span className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors truncate">
                            {displayName}
                          </span>
                        </Link>
                      );
                    })}
                </div>

                {/* Match Date - Right side */}
                <div className="flex items-center gap-2 text-sm text-text-secondary flex-shrink-0">
                  <Calendar className="w-4 h-4" />
                  <span className="whitespace-nowrap">{formatDate(match.game_creation)}</span>
                </div>
              </div>
            </div>
          );
        }

        // Detailed view (original)
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
              <div className="flex items-center gap-6">
                {/* Win/Loss Badge - Fixed width */}
                <div
                  className={`w-28 px-4 py-2 rounded-lg font-bold text-center flex-shrink-0 ${
                    match.win
                      ? 'bg-success/20 text-success'
                      : 'bg-error/20 text-error'
                  }`}
                >
                  {match.win ? 'Sieg' : 'Niederlage'}
                </div>

                {/* Match Info - Fixed widths */}
                <div className="flex items-center gap-6 text-sm text-text-secondary">
                  <div className="flex items-center gap-2 w-28 flex-shrink-0">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(match.game_creation)}</span>
                  </div>
                  <div className="flex items-center gap-2 w-20 flex-shrink-0">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(match.game_duration)}</span>
                  </div>
                  {entityType === 'team' && (
                    <div className="flex items-center gap-2 w-24 flex-shrink-0">
                      <Users className="w-4 h-4" />
                      <span>{match.team_players_count}/5 Team</span>
                    </div>
                  )}
                </div>

                {/* Team Champions Preview (fixed 5-slot grid) */}
                <div className="flex gap-1.5 ml-auto">
                  {Array.from({ length: 5 }).map((_, slotIdx) => {
                    const player = ourTeam
                      .filter((p) => entityType === 'team' ? p.is_team_member : true)[slotIdx];

                    return (
                      <div
                        key={`${match.match_id}-preview-slot-${slotIdx}`}
                        className="relative w-12 flex-shrink-0"
                      >
                        <div
                          className={`w-12 h-12 rounded-lg overflow-hidden border-2 ${
                            player?.laneswap_detected
                              ? 'border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.6)]'
                              : 'border-border/50'
                          } bg-surface-hover flex items-center justify-center`}
                          title={player ? `${player.summoner_name} - ${player.champion_name}${player.laneswap_detected ? ' ⚠ Laneswap Detected' : ''}` : 'Empty slot'}
                        >
                          {player && getChampionUrl(player) ? (
                            <img
                              src={getChampionUrl(player)}
                              alt={player.champion_name}
                              className="w-full h-full object-cover scale-110"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-xs text-text-muted">-</span>
                          )}
                        </div>
                        {player?.laneswap_detected && (
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-purple-500 rounded-sm px-0.5 py-0.5 shadow-lg">
                            <ArrowLeftRight className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Expand Icon - Fixed width */}
                <div className="text-text-muted w-6 flex-shrink-0 flex items-center justify-center">
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
                {/* Bans Section */}
                {match.bans && (match.bans.blue.length > 0 || match.bans.red.length > 0) && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-text-primary">BANS</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Blue Side Bans */}
                      <div>
                        <h4 className="text-xs font-medium text-blue-400 mb-2">BLUE SIDE</h4>
                        <div className="space-y-2">
                          {[1, 2].map(phase => {
                            const phaseBans = match.bans.blue.filter(ban => {
                              // Blue team: Phase 1 = turns 1,3,5 | Phase 2 = turns 8,10
                              const phaseTurns = phase === 1 ? [1, 3, 5] : [8, 10];
                              return phaseTurns.includes(ban.pick_turn);
                            }).sort((a, b) => a.pick_turn - b.pick_turn);

                            return phaseBans.length > 0 && (
                              <div key={phase}>
                                <p className="text-xs text-text-muted mb-1">Phase {phase}</p>
                                <div className="flex gap-1">
                                  {phaseBans.map((ban, idx) => (
                                    <div
                                      key={`blue-ban-${phase}-${idx}`}
                                      className="w-10 h-10 rounded overflow-hidden bg-surface-lighter"
                                      title={ban.champion_name}
                                    >
                                      {ban.champion_icon && (
                                        <img
                                          src={ban.champion_icon}
                                          alt={ban.champion_name}
                                          className="w-full h-full object-cover scale-120"
                                          onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Red Side Bans */}
                      <div>
                        <h4 className="text-xs font-medium text-red-400 mb-2">RED SIDE</h4>
                        <div className="space-y-2">
                          {[1, 2].map(phase => {
                            const phaseBans = match.bans.red.filter(ban => {
                              // Red team: Phase 1 = turns 2,4,6 | Phase 2 = turns 7,9
                              const phaseTurns = phase === 1 ? [2, 4, 6] : [7, 9];
                              return phaseTurns.includes(ban.pick_turn);
                            }).sort((a, b) => a.pick_turn - b.pick_turn);

                            return phaseBans.length > 0 && (
                              <div key={phase}>
                                <p className="text-xs text-text-muted mb-1">Phase {phase}</p>
                                <div className="flex gap-1">
                                  {phaseBans.map((ban, idx) => (
                                    <div
                                      key={`red-ban-${phase}-${idx}`}
                                      className="w-10 h-10 rounded overflow-hidden bg-surface-lighter"
                                      title={ban.champion_name}
                                    >
                                      {ban.champion_icon && (
                                        <img
                                          src={ban.champion_icon}
                                          alt={ban.champion_name}
                                          className="w-full h-full object-cover scale-120"
                                          onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Blue Side Team */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <span className="text-blue-400">BLUE SIDE</span>
                    {weAreBlue && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Unser Team</span>}
                  </h3>
                  <div className="space-y-2">
                    {blueTeam.map((p, idx) => (
                      <div
                        key={`${match.match_id}-blue-${p.summoner_name}-${idx}`}
                        className={`flex items-center gap-4 p-3 rounded-lg ${
                          entityType === 'team' && p.is_team_member ? 'bg-primary/10' : 'bg-surface-hover'
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
                                entityType === 'team' && p.is_team_member
                                  ? 'text-primary'
                                  : 'text-text-muted'
                              }`}
                            >
                              {p.summoner_name}
                            </p>
                            {entityType === 'team' && !p.is_team_member && (
                              <span className="text-xs text-error bg-error/20 px-2 py-0.5 rounded">
                                Extern
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${getRoleColor(p.role)}`}>
                            {displayRole(p.role)}
                          </p>
                        </div>

                        {/* Laneswap Warning - Prominent in center with fixed width */}
                        <div className="w-28 flex-shrink-0">
                          {p.laneswap_detected && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/15 rounded-lg border border-purple-500/50">
                              <span className="text-purple-400 text-lg">⚠</span>
                              <div className="text-xs text-center">
                                <div className="font-semibold text-purple-300">Laneswap</div>
                                <div className="text-purple-400/70">Detected</div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Items - Fixed width container */}
                        <div className="flex gap-1 w-52 flex-shrink-0">
                          {filterEmptyItems(p.items || []).map((itemId, itemIdx) => (
                            <div key={itemIdx} className="w-7 h-7 rounded overflow-hidden bg-surface-lighter">
                              <img
                                src={getItemIconUrl(itemId, match.game_version)}
                                alt={`Item ${itemId}`}
                                className="w-full h-full object-cover"
                                onError={(e) => handleItemError(e, itemId)}
                              />
                            </div>
                          ))}
                        </div>

                        {/* KDA - Fixed width */}
                        <div className="text-center w-20 flex-shrink-0">
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

                        {/* CS - Fixed width */}
                        <div className="text-center w-16 flex-shrink-0">
                          <p className="text-sm font-semibold text-text-primary">
                            {p.cs}
                          </p>
                          <p className="text-xs text-text-muted">CS</p>
                        </div>

                        {/* Gold - Fixed width */}
                        <div className="text-center w-16 flex-shrink-0">
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

                {/* Red Side Team */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <span className="text-red-400">RED SIDE</span>
                    {!weAreBlue && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Unser Team</span>}
                  </h3>
                  <div className="space-y-2">
                    {redTeam.map((p, idx) => (
                      <div
                        key={`${match.match_id}-red-${p.summoner_name}-${idx}`}
                        className={`flex items-center gap-4 p-3 rounded-lg ${
                          entityType === 'team' && p.is_team_member ? 'bg-primary/10' : 'bg-surface-hover'
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
                                entityType === 'team' && p.is_team_member
                                  ? 'text-primary'
                                  : 'text-text-muted'
                              }`}
                            >
                              {p.summoner_name}
                            </p>
                            {entityType === 'team' && !p.is_team_member && (
                              <span className="text-xs text-error bg-error/20 px-2 py-0.5 rounded">
                                Extern
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${getRoleColor(p.role)}`}>
                            {displayRole(p.role)}
                          </p>
                        </div>

                        {/* Laneswap Warning - Prominent in center with fixed width */}
                        <div className="w-28 flex-shrink-0">
                          {p.laneswap_detected && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/15 rounded-lg border border-purple-500/50">
                              <span className="text-purple-400 text-lg">⚠</span>
                              <div className="text-xs text-center">
                                <div className="font-semibold text-purple-300">Laneswap</div>
                                <div className="text-purple-400/70">Detected</div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Items - Fixed width container */}
                        <div className="flex gap-1 w-52 flex-shrink-0">
                          {filterEmptyItems(p.items || []).map((itemId, itemIdx) => (
                            <div key={itemIdx} className="w-7 h-7 rounded overflow-hidden bg-surface-lighter">
                              <img
                                src={getItemIconUrl(itemId, match.game_version)}
                                alt={`Item ${itemId}`}
                                className="w-full h-full object-cover"
                                onError={(e) => handleItemError(e, itemId)}
                              />
                            </div>
                          ))}
                        </div>

                        {/* KDA - Fixed width */}
                        <div className="text-center w-20 flex-shrink-0">
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

                        {/* CS - Fixed width */}
                        <div className="text-center w-16 flex-shrink-0">
                          <p className="text-sm font-semibold text-text-primary">
                            {p.cs}
                          </p>
                          <p className="text-xs text-text-muted">CS</p>
                        </div>

                        {/* Gold - Fixed width */}
                        <div className="text-center w-16 flex-shrink-0">
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

      {matches.length > 0 && matches.length % (entityType === 'team' ? 50 : 20) === 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMoreMatches}
            disabled={loading}
            className="px-6 py-3 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Lädt...' : 'Mehr laden'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MatchHistory;
