import { useState } from 'react';
import { Lock, Unlock, Edit2, Trash2, Plus, Check, X } from 'lucide-react';

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
  currentRoster
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingRoster, setEditingRoster] = useState(null);
  const currentRosterId = onSelectRoster ? currentRoster?.id : null;

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
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg shadow-purple-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Roster
          </button>
        )}
      </div>

      {/* Locked Roster Banner */}
      {lockedRoster && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-purple-400" />
              <div>
                <div className="font-semibold text-white">Locked: {lockedRoster.name}</div>
                <div className="text-sm text-slate-400">
                  Locked by {lockedRoster.locked_by} on {new Date(lockedRoster.locked_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <button
              onClick={() => onUnlockRoster(lockedRoster.id)}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-300 flex items-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              Unlock
            </button>
          </div>
        </div>
      )}

      {/* Create New Roster Form */}
      {isCreating && (
        <RosterForm
          availablePlayers={availablePlayers}
          onSave={(roster) => {
            onCreateRoster(roster);
            setIsCreating(false);
          }}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {/* Edit Roster Form */}
      {editingRoster && (
        <RosterForm
          availablePlayers={availablePlayers}
          initialRoster={editingRoster}
          onSave={(roster) => {
            onUpdateRoster(editingRoster.id, roster);
            setEditingRoster(null);
          }}
          onCancel={() => setEditingRoster(null)}
        />
      )}

      {/* Roster List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rosters.filter(r => !r.is_locked).map(roster => (
          <RosterCard
            key={roster.id}
            roster={roster}
            isSelected={roster.id === currentRosterId}
            onEdit={() => setEditingRoster(roster)}
            onDelete={() => onDeleteRoster(roster.id)}
            onLock={() => onLockRoster(roster.id)}
            onSelect={() => onSelectRoster(roster.id)}
          />
        ))}
      </div>

      {rosters.length === 0 && !isCreating && (
        <div className="text-center py-12 text-text-secondary">
          <p>No rosters yet. Create one to get started!</p>
        </div>
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
          return (
            <div key={role} className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium text-slate-400">
                {roleNames[role]}
              </div>
              <select
                value={currentPlayer?.player_id || ''}
                onChange={(e) => handlePlayerSelect(role, e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:border-purple-500 text-white transition-colors cursor-pointer"
              >
                <option value="" className="bg-slate-800">Select player...</option>
                {availablePlayers.map(player => (
                  <option key={player.player_id} value={player.player_id} className="bg-slate-800">
                    {player.player?.summoner_name} ({player.player?.current_rank || 'Unranked'})
                  </option>
                ))}
              </select>
            </div>
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

// Roster Card
function RosterCard({ roster, isSelected, onEdit, onDelete, onLock, onSelect }) {
  const roleNames = { TOP: 'Top', JUNGLE: 'Jng', MIDDLE: 'Mid', BOTTOM: 'Bot', UTILITY: 'Sup' };

  return (
    <div
      className={`
        rounded-xl backdrop-blur p-4 transition-all duration-300 cursor-pointer
        ${isSelected
          ? 'bg-purple-500/20 border-2 border-purple-500 shadow-lg shadow-purple-500/30'
          : 'bg-slate-800/40 border border-slate-700/50 hover:border-purple-500/50'
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
      <div className="space-y-1.5 mb-3">
        {roster.roster.map((player, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="text-slate-400 w-12">{roleNames[player.role]}</span>
            <span className="truncate text-slate-200">{player.summoner_name}</span>
          </div>
        ))}
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
}
