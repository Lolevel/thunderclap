import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { CHAMPIONS, searchChampions, getChampionIcon, LANE_FILTERS } from '../../lib/championsComplete';

/**
 * Draft Board Component
 * Visual: Like LoL Draft
 * - Bans horizontal (top)
 * - Picks vertical (sides)
 * - Champions in center
 * - Drag & Drop + Click to select
 */
export default function DraftBoard({ scenario, onUpdate, teamName }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [laneFilter, setLaneFilter] = useState('all');
  const [selectedSlot, setSelectedSlot] = useState(null); // {type: 'ban'|'pick', side: 'blue'|'red', index: 0}
  const [draggedChampion, setDraggedChampion] = useState(null);

  const filteredChampions = searchChampions(searchQuery, laneFilter);

  // Handle champion selection (click champion → place in selected slot)
  const handleChampionClick = useCallback((champion) => {
    if (!selectedSlot) return;

    const { type, side, index } = selectedSlot;

    if (type === 'ban') {
      const bansKey = `${side}_bans`;
      const newBans = [...(scenario[bansKey] || [])];
      newBans[index] = { champion_id: champion.id, champion_key: champion.key, order: index + 1 };
      onUpdate({ [bansKey]: newBans });
    } else {
      const picksKey = `${side}_picks`;
      const newPicks = [...(scenario[picksKey] || [])];
      newPicks[index] = { champion_id: champion.id, champion_key: champion.key, role: getRoleForIndex(index) };
      onUpdate({ [picksKey]: newPicks });
    }

    setSelectedSlot(null);
  }, [selectedSlot, scenario, onUpdate]);

  // Drag & Drop handlers
  const handleDragStart = (e, champion) => {
    setDraggedChampion(champion);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = useCallback((e, type, side, index) => {
    e.preventDefault();
    if (!draggedChampion) return;

    handleChampionClick(draggedChampion);
    setDraggedChampion(null);
  }, [draggedChampion, handleChampionClick]);

  // Remove champion from slot
  const removeChampion = (type, side, index) => {
    if (type === 'ban') {
      const bansKey = `${side}_bans`;
      const newBans = [...(scenario[bansKey] || [])];
      newBans[index] = null;
      onUpdate({ [bansKey]: newBans });
    } else {
      const picksKey = `${side}_picks`;
      const newPicks = [...(scenario[picksKey] || [])];
      newPicks[index] = null;
      onUpdate({ [picksKey]: newPicks });
    }
  };

  // Get role for pick index (TOP, JUNGLE, MID, BOT, SUPPORT)
  const getRoleForIndex = (index) => {
    const roles = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];
    return roles[index] || 'UNKNOWN';
  };

  // Determine team names based on side
  const ourSide = scenario.side; // 'blue' or 'red'
  const opponentSide = ourSide === 'blue' ? 'red' : 'blue';
  const ourTeamName = teamName;
  const opponentTeamName = 'Opponent';

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search champions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>

        <select
          value={laneFilter}
          onChange={(e) => setLaneFilter(e.target.value)}
          className="px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary"
        >
          {LANE_FILTERS.map(filter => (
            <option key={filter.value} value={filter.value}>{filter.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-[300px_1fr_300px] gap-6">
        {/* Blue Side (Left) */}
        <div className="space-y-4">
          {/* Blue Bans (Horizontal) */}
          <div>
            <h3 className="text-sm font-semibold text-blue-400 mb-2">
              Blue Bans {ourSide === 'blue' ? `(${ourTeamName})` : `(${opponentTeamName})`}
            </h3>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5].map(index => (
                <BanSlot
                  key={index}
                  champion={scenario.blue_bans?.[index]}
                  onSelect={() => setSelectedSlot({ type: 'ban', side: 'blue', index })}
                  onDrop={(e) => handleDrop(e, 'ban', 'blue', index)}
                  onRemove={() => removeChampion('ban', 'blue', index)}
                  isSelected={selectedSlot?.type === 'ban' && selectedSlot?.side === 'blue' && selectedSlot?.index === index}
                />
              ))}
            </div>
          </div>

          {/* Blue Picks (Vertical) */}
          <div>
            <h3 className="text-sm font-semibold text-blue-400 mb-2">
              Blue Picks {ourSide === 'blue' ? `(${ourTeamName})` : `(${opponentTeamName})`}
            </h3>
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map(index => (
                <PickSlot
                  key={index}
                  champion={scenario.blue_picks?.[index]}
                  role={getRoleForIndex(index)}
                  onSelect={() => setSelectedSlot({ type: 'pick', side: 'blue', index })}
                  onDrop={(e) => handleDrop(e, 'pick', 'blue', index)}
                  onRemove={() => removeChampion('pick', 'blue', index)}
                  isSelected={selectedSlot?.type === 'pick' && selectedSlot?.side === 'blue' && selectedSlot?.index === index}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Champions Grid (Center) */}
        <div className="bg-surface rounded-lg p-4 border border-border max-h-[600px] overflow-y-auto">
          <div className="grid grid-cols-6 gap-2">
            {filteredChampions.map(champion => (
              <ChampionIcon
                key={champion.id}
                champion={champion}
                onClick={() => handleChampionClick(champion)}
                onDragStart={(e) => handleDragStart(e, champion)}
              />
            ))}
          </div>
        </div>

        {/* Red Side (Right) */}
        <div className="space-y-4">
          {/* Red Bans (Horizontal) */}
          <div>
            <h3 className="text-sm font-semibold text-red-400 mb-2">
              Red Bans {ourSide === 'red' ? `(${ourTeamName})` : `(${opponentTeamName})`}
            </h3>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5].map(index => (
                <BanSlot
                  key={index}
                  champion={scenario.red_bans?.[index]}
                  onSelect={() => setSelectedSlot({ type: 'ban', side: 'red', index })}
                  onDrop={(e) => handleDrop(e, 'ban', 'red', index)}
                  onRemove={() => removeChampion('ban', 'red', index)}
                  isSelected={selectedSlot?.type === 'ban' && selectedSlot?.side === 'red' && selectedSlot?.index === index}
                />
              ))}
            </div>
          </div>

          {/* Red Picks (Vertical) */}
          <div>
            <h3 className="text-sm font-semibold text-red-400 mb-2">
              Red Picks {ourSide === 'red' ? `(${ourTeamName})` : `(${opponentTeamName})`}
            </h3>
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map(index => (
                <PickSlot
                  key={index}
                  champion={scenario.red_picks?.[index]}
                  role={getRoleForIndex(index)}
                  onSelect={() => setSelectedSlot({ type: 'pick', side: 'red', index })}
                  onDrop={(e) => handleDrop(e, 'pick', 'red', index)}
                  onRemove={() => removeChampion('pick', 'red', index)}
                  isSelected={selectedSlot?.type === 'pick' && selectedSlot?.side === 'red' && selectedSlot?.index === index}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedSlot && (
        <div className="text-center text-sm text-primary">
          Click a champion to place it, or drag & drop
        </div>
      )}
    </div>
  );
}

// Ban Slot Component (small, horizontal)
function BanSlot({ champion, onSelect, onDrop, onRemove, isSelected }) {
  return (
    <div
      onClick={onSelect}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={`
        w-12 h-12 rounded border-2 cursor-pointer
        flex items-center justify-center relative
        transition-all
        ${isSelected ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary/50'}
        ${champion ? 'bg-surface' : 'bg-surface-hover'}
      `}
    >
      {champion && champion.champion_key ? (
        <>
          <img
            src={getChampionIcon(champion.champion_key)}
            alt={champion.champion_key}
            className="w-full h-full object-cover rounded opacity-50"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <X className="w-6 h-6 text-red-500" />
          </div>
          <button
            onClick={(e) => {e.stopPropagation(); onRemove();}}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
          >
            ×
          </button>
        </>
      ) : (
        <span className="text-xs text-text-secondary">Ban</span>
      )}
    </div>
  );
}

// Pick Slot Component (larger, vertical)
function PickSlot({ champion, role, onSelect, onDrop, onRemove, isSelected }) {
  const roleNames = { TOP: 'Top', JUNGLE: 'Jng', MIDDLE: 'Mid', BOTTOM: 'Bot', UTILITY: 'Sup' };

  return (
    <div
      onClick={onSelect}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={`
        h-16 rounded border-2 cursor-pointer
        flex items-center gap-3 px-3 relative
        transition-all
        ${isSelected ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary/50'}
        ${champion ? 'bg-surface' : 'bg-surface-hover'}
      `}
    >
      {champion && champion.champion_key ? (
        <>
          <img
            src={getChampionIcon(champion.champion_key)}
            alt={champion.champion_key}
            className="w-12 h-12 rounded object-cover"
          />
          <div className="flex-1">
            <div className="font-semibold text-sm">{champion.champion_key}</div>
            <div className="text-xs text-text-secondary">{roleNames[role]}</div>
          </div>
          <button
            onClick={(e) => {e.stopPropagation(); onRemove();}}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
          >
            ×
          </button>
        </>
      ) : (
        <span className="text-sm text-text-secondary">{roleNames[role]}</span>
      )}
    </div>
  );
}

// Champion Icon Component (draggable)
function ChampionIcon({ champion, onClick, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="relative group cursor-pointer hover:scale-105 transition-transform"
      title={champion.name}
    >
      <img
        src={getChampionIcon(champion.key)}
        alt={champion.name}
        className="w-full aspect-square rounded border-2 border-transparent group-hover:border-primary"
      />
      <div className="absolute bottom-0 inset-x-0 bg-black/80 text-white text-[10px] text-center py-0.5 rounded-b opacity-0 group-hover:opacity-100 transition-opacity">
        {champion.name}
      </div>
    </div>
  );
}
