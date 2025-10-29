import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { CHAMPIONS, searchChampions, getChampionIcon, LANE_FILTERS } from '../../lib/championsComplete';
import RoleIcon from '../RoleIcon';

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
  const [selectedRoles, setSelectedRoles] = useState([]); // Multi-select role filter
  const [selectedSlot, setSelectedSlot] = useState(null); // {type: 'ban'|'pick', side: 'blue'|'red', index: 0}
  const [selectedChampion, setSelectedChampion] = useState(null); // Champion selected from pool
  const [draggedChampion, setDraggedChampion] = useState(null);
  const [draggedFromSlot, setDraggedFromSlot] = useState(null); // {type, side, index}
  const [updateTrigger, setUpdateTrigger] = useState(0); // Force re-render trigger

  // Filter champions by search and selected roles
  const filteredChampions = CHAMPIONS.filter(champ => {
    // Search filter
    if (searchQuery && !champ.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Role filter (if any roles selected)
    if (selectedRoles.length > 0) {
      return selectedRoles.some(role => champ.roles?.includes(role));
    }
    return true;
  });

  // Toggle role filter
  const toggleRoleFilter = (role) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  // Handle champion click from pool
  const handleChampionPoolClick = useCallback((champion) => {
    // If a slot is selected, place champion there
    if (selectedSlot) {
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
      setSelectedChampion(null);
      setUpdateTrigger(prev => prev + 1);
    } else {
      // No slot selected - select champion and wait for slot click
      setSelectedChampion(champion);
    }
  }, [selectedSlot, scenario, onUpdate]);

  // Handle slot click when champion is already selected
  const handleSlotClick = useCallback((type, side, index) => {
    const isSelected = selectedSlot?.type === type && selectedSlot?.side === side && selectedSlot?.index === index;

    // If champion selected from pool, place it here
    if (selectedChampion) {
      if (type === 'ban') {
        const bansKey = `${side}_bans`;
        const newBans = [...(scenario[bansKey] || [])];
        newBans[index] = { champion_id: selectedChampion.id, champion_key: selectedChampion.key, order: index + 1 };
        onUpdate({ [bansKey]: newBans });
      } else {
        const picksKey = `${side}_picks`;
        const newPicks = [...(scenario[picksKey] || [])];
        newPicks[index] = { champion_id: selectedChampion.id, champion_key: selectedChampion.key, role: getRoleForIndex(index) };
        onUpdate({ [picksKey]: newPicks });
      }

      setSelectedChampion(null);
      setUpdateTrigger(prev => prev + 1);
    } else {
      // Toggle slot selection
      if (isSelected) {
        setSelectedSlot(null);
      } else {
        setSelectedSlot({ type, side, index });
      }
    }
  }, [selectedChampion, selectedSlot, scenario, onUpdate]);

  // Drag & Drop handlers
  const handleDragStart = (e, champion) => {
    setDraggedChampion(champion);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Drag start from slot (pick/ban)
  const handleSlotDragStart = (e, champion, type, side, index) => {
    setDraggedChampion(champion);
    setDraggedFromSlot({ type, side, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedFromSlot ? 'move' : 'copy';
  };

  const handleDrop = useCallback((e, type, side, index) => {
    e.preventDefault();
    if (!draggedChampion) return;

    // If dragging from another slot, remove from old slot first
    if (draggedFromSlot) {
      const { type: oldType, side: oldSide, index: oldIndex } = draggedFromSlot;

      if (oldType === 'ban') {
        const oldBansKey = `${oldSide}_bans`;
        const oldBans = [...(scenario[oldBansKey] || [])];
        oldBans[oldIndex] = null;
        onUpdate({ [oldBansKey]: oldBans });
      } else {
        const oldPicksKey = `${oldSide}_picks`;
        const oldPicks = [...(scenario[oldPicksKey] || [])];
        oldPicks[oldIndex] = null;
        onUpdate({ [oldPicksKey]: oldPicks });
      }
    }

    // Place champion in the new slot
    if (type === 'ban') {
      const bansKey = `${side}_bans`;
      const newBans = [...(scenario[bansKey] || [])];
      newBans[index] = { champion_id: draggedChampion.id, champion_key: draggedChampion.key, order: index + 1 };
      onUpdate({ [bansKey]: newBans });
    } else {
      const picksKey = `${side}_picks`;
      const newPicks = [...(scenario[picksKey] || [])];
      newPicks[index] = { champion_id: draggedChampion.id, champion_key: draggedChampion.key, role: getRoleForIndex(index) };
      onUpdate({ [picksKey]: newPicks });
    }

    setDraggedChampion(null);
    setDraggedFromSlot(null);
    setSelectedSlot(null);
    setUpdateTrigger(prev => prev + 1);
  }, [draggedChampion, draggedFromSlot, scenario, onUpdate]);

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
      {/* Search Only */}
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
      </div>

      {/* Draft Layout: Like LoL Client - Bans top, Picks vertical sides, Champions center */}
      <div className="space-y-6">
        {/* Team Names */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <h3 className="text-lg font-bold text-blue-400">
              {ourSide === 'blue' ? ourTeamName : opponentTeamName}
            </h3>
            <p className="text-xs text-slate-400">Blue Side</p>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-red-400">
              {ourSide === 'red' ? ourTeamName : opponentTeamName}
            </h3>
            <p className="text-xs text-slate-400">Red Side</p>
          </div>
        </div>

        {/* Bans Row (Top) with Role Filter in center */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
          {/* Blue Bans - Align right */}
          <div className="flex gap-2 justify-end">
            {[0, 1, 2, 3, 4].map(index => {
              const champion = scenario.blue_bans?.[index];
              const key = `blue-ban-${index}-${champion?.champion_key || 'empty'}-${updateTrigger}`;
              const isSelected = selectedSlot?.type === 'ban' && selectedSlot?.side === 'blue' && selectedSlot?.index === index;
              return (
                <>
                  <BanSlot
                    key={key}
                    champion={champion}
                    onSelect={() => handleSlotClick('ban', 'blue', index)}
                    onDrop={(e) => handleDrop(e, 'ban', 'blue', index)}
                    onRemove={() => removeChampion('ban', 'blue', index)}
                    onDragStart={(e) => champion && handleSlotDragStart(e, champion, 'ban', 'blue', index)}
                    isSelected={isSelected}
                  />
                  {/* Gap after 3rd ban (index 2) to show ban phases */}
                  {index === 2 && <div className="w-4" />}
                </>
              );
            })}
          </div>

          {/* Role Filter - Center */}
          <div className="flex gap-2 px-4">
            {['top', 'jungle', 'mid', 'bot', 'support'].map(role => {
              const isActive = selectedRoles.includes(role);
              return (
                <button
                  key={role}
                  onClick={() => toggleRoleFilter(role)}
                  className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-purple-500/20 border-purple-500'
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}
                  title={role.charAt(0).toUpperCase() + role.slice(1)}
                >
                  <RoleIcon role={role.toUpperCase()} size={20} />
                </button>
              );
            })}
          </div>

          {/* Red Bans - Align left */}
          <div className="flex gap-2 justify-start">
            {[0, 1, 2, 3, 4].map(index => {
              const champion = scenario.red_bans?.[index];
              const key = `red-ban-${index}-${champion?.champion_key || 'empty'}-${updateTrigger}`;
              const isSelected = selectedSlot?.type === 'ban' && selectedSlot?.side === 'red' && selectedSlot?.index === index;
              return (
                <>
                  <BanSlot
                    key={key}
                    champion={champion}
                    onSelect={() => handleSlotClick('ban', 'red', index)}
                    onDrop={(e) => handleDrop(e, 'ban', 'red', index)}
                    onRemove={() => removeChampion('ban', 'red', index)}
                    onDragStart={(e) => champion && handleSlotDragStart(e, champion, 'ban', 'red', index)}
                    isSelected={isSelected}
                  />
                  {/* Gap after 3rd ban (index 2) to show ban phases */}
                  {index === 2 && <div className="w-4" />}
                </>
              );
            })}
          </div>
        </div>

        {/* Main Draft Area: Picks (Vertical) + Champions (Center) */}
        <div className="grid grid-cols-[120px_1fr_120px] gap-4">
          {/* Blue Picks (Left - Vertical) */}
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map(index => {
              const champion = scenario.blue_picks?.[index];
              const key = `blue-pick-${index}-${champion?.champion_key || 'empty'}-${updateTrigger}`;
              const isSelected = selectedSlot?.type === 'pick' && selectedSlot?.side === 'blue' && selectedSlot?.index === index;
              return (
                <div
                  key={key}
                  className={index === 3 ? 'mt-4' : ''}
                >
                  <PickSlot
                    champion={champion}
                    side="blue"
                    pickNumber={index + 1}
                    onSelect={() => handleSlotClick('pick', 'blue', index)}
                    onDrop={(e) => handleDrop(e, 'pick', 'blue', index)}
                    onRemove={() => removeChampion('pick', 'blue', index)}
                    onDragStart={(e) => champion && handleSlotDragStart(e, champion, 'pick', 'blue', index)}
                    isSelected={isSelected}
                  />
                </div>
              );
            })}
          </div>

          {/* Champions Grid (Center) - Drop zone for removal */}
          <div
            className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 max-h-[600px] overflow-y-auto"
            onDragOver={handleDragOver}
            onDrop={(e) => {
              e.preventDefault();
              // If dragging from a slot, remove the champion
              if (draggedFromSlot) {
                const { type, side, index } = draggedFromSlot;
                removeChampion(type, side, index);
                setDraggedChampion(null);
                setDraggedFromSlot(null);
                setUpdateTrigger(prev => prev + 1);
              }
            }}
          >
            <div className="grid grid-cols-10 gap-1.5">
              {filteredChampions.map(champion => (
                <ChampionIcon
                  key={champion.id}
                  champion={champion}
                  onClick={() => handleChampionPoolClick(champion)}
                  onDragStart={(e) => handleDragStart(e, champion)}
                  isSelected={selectedChampion?.id === champion.id}
                />
              ))}
            </div>
          </div>

          {/* Red Picks (Right - Vertical) */}
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map(index => {
              const champion = scenario.red_picks?.[index];
              const key = `red-pick-${index}-${champion?.champion_key || 'empty'}-${updateTrigger}`;
              const isSelected = selectedSlot?.type === 'pick' && selectedSlot?.side === 'red' && selectedSlot?.index === index;
              return (
                <div
                  key={key}
                  className={index === 3 ? 'mt-4' : ''}
                >
                  <PickSlot
                    champion={champion}
                    side="red"
                    pickNumber={index + 1}
                    onSelect={() => handleSlotClick('pick', 'red', index)}
                    onDrop={(e) => handleDrop(e, 'pick', 'red', index)}
                    onRemove={() => removeChampion('pick', 'red', index)}
                    onDragStart={(e) => champion && handleSlotDragStart(e, champion, 'pick', 'red', index)}
                    isSelected={isSelected}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedChampion && (
        <div className="text-center text-sm text-green-400 font-semibold">
          Champion selected: {selectedChampion.name} - Click a slot to place it
        </div>
      )}
    </div>
  );
}

// Ban Slot Component (horizontal, like LoL client)
function BanSlot({ champion, onSelect, onDrop, onRemove, onDragStart, isSelected }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onSelect}
      draggable={!!champion}
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        w-16 h-16 rounded-lg border-2 cursor-pointer
        flex items-center justify-center relative overflow-hidden
        transition-all
        ${isSelected ? 'border-primary ring-2 ring-primary' : 'border-slate-700 hover:border-primary/50'}
        ${champion ? 'bg-slate-800' : 'bg-slate-900/50'}
      `}
    >
      {champion && champion.champion_key ? (
        <>
          <img
            src={getChampionIcon(champion.champion_key)}
            alt={champion.champion_key}
            className="w-full h-full object-cover rounded-lg opacity-40 scale-115"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <X className="w-6 h-6 text-red-500 stroke-[2]" />
          </div>
        </>
      ) : (
        <span className="text-[10px] text-slate-500">Ban</span>
      )}
    </div>
  );
}

// Pick Slot Component (vertical, larger like LoL client)
function PickSlot({ champion, side, pickNumber, onSelect, onDrop, onRemove, onDragStart, isSelected }) {
  const [isHovered, setIsHovered] = useState(false);
  const label = side === 'blue' ? `B${pickNumber}` : `R${pickNumber}`;

  return (
    <div
      onClick={onSelect}
      draggable={!!champion}
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        w-full aspect-square rounded-lg border-2 cursor-pointer
        flex flex-col items-center justify-center relative overflow-hidden
        transition-all
        ${isSelected ? 'border-primary ring-2 ring-primary' : 'border-slate-700 hover:border-primary/50'}
        ${champion ? 'bg-slate-800' : 'bg-slate-900/50'}
      `}
    >
      {champion && champion.champion_key ? (
        <>
          <img
            src={getChampionIcon(champion.champion_key)}
            alt={champion.champion_key}
            className="w-full h-full rounded-lg object-cover scale-115"
          />
          {/* Pick Label at bottom */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-300">
            {label}
          </div>
        </>
      ) : (
        <div className="text-center">
          <div className="text-xs text-slate-400">{label}</div>
        </div>
      )}
    </div>
  );
}

// Champion Icon Component (draggable)
function ChampionIcon({ champion, onClick, onDragStart, isSelected }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="relative group cursor-pointer hover:scale-105 transition-transform overflow-hidden rounded"
      title={champion.name}
    >
      <img
        src={getChampionIcon(champion.key)}
        alt={champion.name}
        className={`w-full aspect-square rounded border-2 object-cover scale-115 transition-colors ${
          isSelected ? 'border-green-400 ring-2 ring-green-400' : 'border-transparent group-hover:border-primary'
        }`}
      />
      <div className="absolute bottom-0 inset-x-0 bg-black/80 text-white text-[10px] text-center py-0.5 rounded-b opacity-0 group-hover:opacity-100 transition-opacity">
        {champion.name}
      </div>
      {isSelected && (
        <div className="absolute top-0 right-0 bg-green-400 rounded-full w-4 h-4 flex items-center justify-center">
          <span className="text-white text-xs font-bold">✓</span>
        </div>
      )}
    </div>
  );
}
