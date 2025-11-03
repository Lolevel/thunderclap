import { useState, memo, useCallback } from 'react';
import { Lock, Unlock, Edit2, Trash2, Plus, Check, X } from 'lucide-react';
import RoleIcon from '../RoleIcon';
import { getSummonerIconUrl, handleSummonerIconError } from '../../utils/summonerHelper';

// Helper function to get rank icon URL
function getRankIconUrl(tier, division) {
  if (!tier) return null;
  const tierLower = tier.toLowerCase();
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/${tierLower}.png`;
}

// Helper function to convert division to Roman numeral
function divisionToRoman(division) {
  const romanMap = { 'IV': 'IV', 'III': 'III', 'II': 'II', 'I': 'I' };
  return romanMap[division] || '';
}

/**
 * Roster Manager Component
 * Phase 1: Select and save roster (5 players)
 */
export default function RosterManager({
  rosters,
  lockedRoster,
  availablePlayers,
  onCreateRoster,
  onUpdateRoster,
  onDeleteRoster,
  onLockRoster,
  onUnlockRoster,
  onSelectRoster,
  currentRoster,
  predictions // Add predictions prop
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingRoster, setEditingRoster] = useState(null);
  const currentRosterId = onSelectRoster ? currentRoster?.id : null;

  // Memoize callbacks to prevent unnecessary re-renders
  const handleCreate = useCallback(() => setIsCreating(true), []);
  const handleCancelCreate = useCallback(() => setIsCreating(false), []);
  const handleSaveCreate = useCallback((roster) => {
    onCreateRoster(roster);
    setIsCreating(false);
  }, [onCreateRoster]);

  const handleStartEdit = useCallback((roster) => setEditingRoster(roster), []);
  const handleCancelEdit = useCallback(() => setEditingRoster(null), []);
  const handleSaveEdit = useCallback((roster) => {
    onUpdateRoster(editingRoster.id, roster);
    setEditingRoster(null);
  }, [editingRoster, onUpdateRoster]);

  // Create predicted roster
  const handleCreatePredicted = useCallback(() => {
    if (!predictions || predictions.length === 0) return;

    const predictedLineup = predictions[0].predicted_lineup;
    const roleOrder = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];
    const rosterArray = roleOrder
      .filter(role => predictedLineup[role])
      .map(role => ({
        player_id: predictedLineup[role].player_id,
        summoner_name: predictedLineup[role].player_name,
        profile_icon_id: predictedLineup[role].profile_icon_id,
        role: role
      }));

    console.log('[RosterManager] Creating predicted roster:', rosterArray);
    console.log('[RosterManager] Profile icon IDs:', rosterArray.map(p => ({ name: p.summoner_name, icon_id: p.profile_icon_id })));

    onCreateRoster({ name: 'Predicted Lineup', roster: rosterArray });
  }, [predictions, onCreateRoster]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Phase 1: Roster Selection</h2>
          <p className="text-sm text-slate-400">
            {lockedRoster ? 'Roster locked. Unlock to create more.' : 'Create and save a roster to proceed to draft scenarios.'}
          </p>
        </div>

        {!lockedRoster && (
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg shadow-purple-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Roster
          </button>
        )}
      </div>

      {/* Locked Roster Display */}
      {lockedRoster && lockedRoster.roster && (
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 border-purple-500/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="text-lg font-bold text-purple-300">{lockedRoster.name}</h3>
                <p className="text-xs text-purple-400/80">
                  Locked by {lockedRoster.locked_by} on {new Date(lockedRoster.locked_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => onUnlockRoster(lockedRoster.id)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-300 flex items-center gap-2 border border-slate-600 hover:border-slate-500"
            >
              <Unlock className="w-4 h-4" />
              Unlock
            </button>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {lockedRoster.roster.map((player) => (
              <div
                key={player.player_id}
                className="bg-slate-800/50 border border-purple-500/30 rounded-lg p-3"
              >
                {/* Role Icon and Elo - Centered with Divider */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <RoleIcon role={player.role} size={20} />
                  {player.soloq_tier && (
                    <>
                      <div className="h-4 w-px bg-slate-600"></div>
                      <div className="flex items-center gap-1">
                        <img
                          src={getRankIconUrl(player.soloq_tier, player.soloq_division)}
                          alt={player.soloq_tier}
                          className="w-5 h-5"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                        {player.soloq_division && !['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(player.soloq_tier) && (
                          <span className="text-xs font-semibold text-slate-300">
                            {divisionToRoman(player.soloq_division)}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Player Info with Icon */}
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src={getSummonerIconUrl(player.profile_icon_id)}
                    alt={player.summoner_name}
                    onError={handleSummonerIconError}
                    className="w-10 h-10 rounded-full border-2 border-purple-500/50"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {player.summoner_name}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create New Roster Form */}
      {isCreating && (
        <RosterForm
          availablePlayers={availablePlayers}
          onSave={handleSaveCreate}
          onCancel={handleCancelCreate}
        />
      )}

      {/* Edit Roster Form */}
      {editingRoster && (
        <RosterForm
          availablePlayers={availablePlayers}
          initialRoster={editingRoster}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}

      {/* Roster List - Hide when one is locked */}
      {!lockedRoster && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rosters.filter(r => !r.is_locked).map(roster => {
            // Create stable callbacks per roster
            const handleEdit = () => handleStartEdit(roster);
            const handleDelete = () => onDeleteRoster(roster.id);
            const handleLock = () => onLockRoster(roster.id);
            const handleSelect = () => onSelectRoster(roster.id);

            return (
              <RosterCard
                key={roster.id}
                roster={roster}
                isSelected={roster.id === currentRosterId}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onLock={handleLock}
                onSelect={handleSelect}
              />
            );
          })}
        </div>
      )}

      {rosters.length === 0 && !isCreating && !editingRoster && (
        <div className="text-center py-12 bg-slate-800/40 rounded-xl border border-slate-700/50">
          <p className="text-slate-400 mb-4">No rosters yet. Create one to get started!</p>
          <div className="flex items-center justify-center gap-3">
            {predictions && predictions.length > 0 && (
              <button
                onClick={handleCreatePredicted}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-lg shadow-blue-500/20 inline-flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Load Predicted Lineup
              </button>
            )}
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg shadow-purple-500/20 inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Custom Roster
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom Player Selector Component
function PlayerSelector({ role, availablePlayers, selectedPlayer, onSelect, alreadySelectedPlayerIds }) {
  const [isOpen, setIsOpen] = useState(false);
  const roleNames = { TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'Bot', UTILITY: 'Support' };

  // Filter out already selected players (except current selection)
  const availableOptions = availablePlayers.filter(
    p => !alreadySelectedPlayerIds.includes(p.player_id) || p.player_id === selectedPlayer?.player_id
  );

  return (
    <div className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-slate-600/50 border border-slate-600 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
          {selectedPlayer ? (
            <>
              <img
                src={getSummonerIconUrl(selectedPlayer.profile_icon_id)}
                alt={selectedPlayer.summoner_name}
                onError={handleSummonerIconError}
                className="w-full h-full object-cover"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                <RoleIcon role={role} size={10} />
              </div>
            </>
          ) : (
            <RoleIcon role={role} size={20} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-400 mb-0.5">{roleNames[role]}</div>
          <div className="text-sm text-white truncate">
            {selectedPlayer ? selectedPlayer.summoner_name : 'Select player...'}
          </div>
        </div>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
            {availableOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400 text-center">
                No available players
              </div>
            ) : (
              availableOptions.map(player => (
                <div
                  key={player.player_id}
                  onClick={() => {
                    onSelect(role, player.player_id);
                    setIsOpen(false);
                  }}
                  className={`px-4 py-3 hover:bg-slate-700 cursor-pointer transition-colors flex items-center gap-3 ${
                    selectedPlayer?.player_id === player.player_id ? 'bg-purple-500/20' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 overflow-hidden flex-shrink-0">
                    <img
                      src={getSummonerIconUrl(player.player?.profile_icon_id)}
                      alt={player.player?.summoner_name}
                      onError={handleSummonerIconError}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">
                      {player.player?.summoner_name || 'Unknown'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Roster Form (Create/Edit)
function RosterForm({ availablePlayers, initialRoster, onSave, onCancel }) {
  const [name, setName] = useState(initialRoster?.name || '');
  const [selectedPlayers, setSelectedPlayers] = useState(initialRoster?.roster || []);

  // Role order: Top → Jungle → Mid → Bot → Support
  const roles = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];
  const roleNames = { TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'Bot', UTILITY: 'Support' };

  const handlePlayerSelect = (role, playerId) => {
    const teamRosterEntry = availablePlayers.find(p => p.player_id === playerId);
    if (!teamRosterEntry) return;

    const newPlayers = [...selectedPlayers];
    const existingIndex = newPlayers.findIndex(p => p.role === role);

    const playerData = {
      player_id: teamRosterEntry.player_id,
      summoner_name: teamRosterEntry.player?.summoner_name || 'Unknown',
      profile_icon_id: teamRosterEntry.player?.profile_icon_id,
      role: role
    };

    if (existingIndex >= 0) {
      newPlayers[existingIndex] = playerData;
    } else {
      newPlayers.push(playerData);
    }

    setSelectedPlayers(newPlayers);
  };

  const handleSave = () => {
    if (selectedPlayers.length !== 5) {
      alert('Please select all 5 players');
      return;
    }
    if (!name.trim()) {
      alert('Please enter a roster name');
      return;
    }

    onSave({ name, roster: selectedPlayers });
  };

  return (
    <div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 p-6">
      <h3 className="text-lg font-semibold mb-4 text-white">
        {initialRoster ? 'Edit Roster' : 'Create New Roster'}
      </h3>

      {/* Roster Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-slate-300">Roster Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Krugs, Raptors, Wolves..."
          className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-slate-400 transition-colors"
        />
      </div>

      {/* Player Selection per Role */}
      <div className="space-y-3 mb-6">
        {roles.map(role => {
          const currentPlayer = selectedPlayers.find(p => p.role === role);
          const alreadySelectedPlayerIds = selectedPlayers
            .filter(p => p.role !== role)
            .map(p => p.player_id);

          return (
            <PlayerSelector
              key={role}
              role={role}
              availablePlayers={availablePlayers}
              selectedPlayer={currentPlayer}
              onSelect={handlePlayerSelect}
              alreadySelectedPlayerIds={alreadySelectedPlayerIds}
            />
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={selectedPlayers.length !== 5}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg shadow-purple-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="w-4 h-4" />
          Save Roster
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-300 flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>

      <div className="mt-4 text-sm text-slate-400">
        {selectedPlayers.length}/5 players selected
      </div>
    </div>
  );
}

// Roster Card - Memoized to prevent unnecessary re-renders
const RosterCard = memo(function RosterCard({ roster, isSelected, onEdit, onDelete, onLock, onSelect }) {
  const roleNames = { TOP: 'Top', JUNGLE: 'Jng', MIDDLE: 'Mid', BOTTOM: 'Bot', UTILITY: 'Sup' };

  return (
    <div
      className={`
        rounded-xl backdrop-blur p-4 cursor-pointer border-2
        transition-[background-color,border-color,box-shadow] duration-200
        ${isSelected
          ? 'bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/30'
          : 'bg-slate-800/40 border-slate-700/50 hover:border-purple-500/50'
        }
      `}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white">{roster.name}</h3>
          {roster.is_locked && (
            <Lock className="w-4 h-4 text-purple-400" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {!roster.is_locked && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-1 hover:bg-slate-700/50 rounded transition-colors"
                title="Edit"
              >
                <Edit2 className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1 hover:bg-slate-700/50 rounded text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Players */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        {roster.roster.map((player, i) => {
          // Handle both nested and flat player data structures
          const profileIconId = player.profile_icon_id || player.player?.profile_icon_id;
          const summonerName = player.summoner_name || player.player?.summoner_name || 'Unknown';

          // Debug log for first player only
          if (i === 0) {
            console.log('[RosterCard] Player data:', player);
            console.log('[RosterCard] Profile icon ID:', profileIconId);
          }

          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              {/* Role Icon above */}
              <div className="w-5 h-5 flex items-center justify-center">
                <RoleIcon role={player.role} size={16} />
              </div>
              {/* Player Avatar */}
              <div className="w-12 h-12 rounded-full bg-slate-700/50 border-2 border-slate-600 overflow-hidden">
                <img
                  src={getSummonerIconUrl(profileIconId)}
                  alt={summonerName}
                  onError={handleSummonerIconError}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Player Name */}
              <div className="text-[10px] text-slate-400 text-center truncate w-full px-1">
                {summonerName}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
        <div className="text-xs text-slate-400">
          {roster.scenario_count || 0} scenarios
        </div>
        {!roster.is_locked && (
          <button
            onClick={(e) => { e.stopPropagation(); onLock(); }}
            className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-sm shadow-purple-500/20 flex items-center gap-1"
          >
            <Lock className="w-3 h-3" />
            Lock
          </button>
        )}
      </div>
    </div>
  );
});
