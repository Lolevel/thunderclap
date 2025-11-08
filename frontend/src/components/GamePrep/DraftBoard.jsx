import { useState, useCallback } from 'react';
import { Search, X, ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Lock } from 'lucide-react';
import { CHAMPIONS, getChampionIcon, getChampionIconById } from '../../lib/championsComplete';
import RoleIcon from '../RoleIcon';
import { Link } from 'react-router-dom';
import { getSummonerIconUrl, handleSummonerIconError } from '../../utils/summonerHelper';
import useSWR from 'swr';

/**
 * Draft Board Component with Priority System
 * - 1st Priority: Main champion (displayed large)
 * - 2nd/3rd Priority: Alternative champions (expandable)
 * - Blue side expands left, Red side expands right
 */
export default function DraftBoard({ scenario, onUpdate, teamName, lockedRoster, currentRoster }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedChampion, setSelectedChampion] = useState(null);
  const [draggedChampion, setDraggedChampion] = useState(null);
  const [draggedFromSlot, setDraggedFromSlot] = useState(null);
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [expandedSlots, setExpandedSlots] = useState({}); // Track which slots are expanded
  const [showAllPrios, setShowAllPrios] = useState(false); // Global toggle for all priorities

  // Filter champions
  const filteredChampions = CHAMPIONS.filter(champ => {
    if (searchQuery && !champ.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedRoles.length > 0) {
      return selectedRoles.some(role => champ.roles?.includes(role));
    }
    return true;
  });

  const toggleRoleFilter = (role) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  // Normalize champion data - always return array
  const normalizeChampions = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return [data];
  };

  // Toggle slot expansion
  const toggleSlotExpansion = (type, side, index) => {
    const key = `${type}-${side}-${index}`;
    setExpandedSlots(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Check if slot is expanded (global override or individual)
  const isSlotExpanded = (type, side, index) => {
    if (showAllPrios) return true; // Global override
    const key = `${type}-${side}-${index}`;
    return expandedSlots[key] || false;
  };

  // Add champion to slot at specific priority position
  const addChampionAtPriority = useCallback((champion, type, side, index, targetPriority) => {
    const key = type === 'ban' ? `${side}_bans` : `${side}_picks`;
    const newArray = [...(scenario[key] || [])];
    const currentChampions = normalizeChampions(newArray[index]);

    // Handle both champion pool items (id/key) and existing picks (champion_id/champion_key)
    const championId = champion.champion_id || champion.id;
    const championKey = champion.champion_key || champion.key;

    // Check if champion already exists in this slot
    const alreadyExists = currentChampions.some(c => c.champion_id === championId);

    // Limit to max 5 priorities - block if trying to add a new champion when already at limit
    if (!alreadyExists && currentChampions.length >= 5) {
      return; // Block adding new champions when at max capacity
    }

    // Remove if already exists (for reordering)
    const filtered = currentChampions.filter(c => c.champion_id !== championId);

    // Insert at target priority position
    const newChampion = {
      champion_id: championId,
      champion_key: championKey,
      role: champion.isRolePlaceholder ? champion.role : (champion.role || (type === 'pick' ? getRoleForIndex(index) : undefined)),
      priority: targetPriority,
      isRolePlaceholder: champion.isRolePlaceholder || false,
      ...(type === 'ban' && { order: index + 1 })
    };

    filtered.splice(targetPriority - 1, 0, newChampion);

    // Re-assign priorities
    newArray[index] = filtered.map((c, i) => ({ ...c, priority: i + 1 }));
    onUpdate({ [key]: newArray });
    setUpdateTrigger(prev => prev + 1);
  }, [scenario, onUpdate]);

  // Add champion to slot (as priority or replace)
  const addChampionToSlot = useCallback((champion, type, side, index) => {
    const championId = champion.isRolePlaceholder ? champion.id : champion.id;
    const championKey = champion.key;

    if (type === 'ban') {
      const bansKey = `${side}_bans`;
      const newBans = [...(scenario[bansKey] || [])];
      const currentChampions = normalizeChampions(newBans[index]);

      // If priorities are hidden, replace the slot
      if (!showAllPrios) {
        newBans[index] = [{
          champion_id: championId,
          champion_key: championKey,
          order: index + 1,
          priority: 1,
          isRolePlaceholder: champion.isRolePlaceholder || false,
          role: champion.isRolePlaceholder ? champion.role : undefined
        }];
        onUpdate({ [bansKey]: newBans });
      } else {
        // Priorities are shown - add as priority
        // Limit to max 5 priorities (1 main + 4 secondary)
        if (currentChampions.length >= 5) {
          return; // Don't add more than 5
        }

        // Check if champion already exists
        if (!currentChampions.some(c => c.champion_id === championId)) {
          newBans[index] = [...currentChampions, {
            champion_id: championId,
            champion_key: championKey,
            order: index + 1,
            priority: currentChampions.length + 1,
            isRolePlaceholder: champion.isRolePlaceholder || false,
            role: champion.isRolePlaceholder ? champion.role : undefined
          }];
          onUpdate({ [bansKey]: newBans });
        }
      }
    } else {
      const picksKey = `${side}_picks`;
      const newPicks = [...(scenario[picksKey] || [])];
      const currentChampions = normalizeChampions(newPicks[index]);

      // If priorities are hidden, replace the slot
      if (!showAllPrios) {
        newPicks[index] = [{
          champion_id: championId,
          champion_key: championKey,
          role: champion.isRolePlaceholder ? champion.role : getRoleForIndex(index),
          priority: 1,
          isRolePlaceholder: champion.isRolePlaceholder || false
        }];
        onUpdate({ [picksKey]: newPicks });
      } else {
        // Priorities are shown - add as priority
        // Limit to max 5 priorities (1 main + 4 secondary)
        if (currentChampions.length >= 5) {
          return; // Don't add more than 5
        }

        // Check if champion already exists
        if (!currentChampions.some(c => c.champion_id === championId)) {
          newPicks[index] = [...currentChampions, {
            champion_id: championId,
            champion_key: championKey,
            role: champion.isRolePlaceholder ? champion.role : getRoleForIndex(index),
            priority: currentChampions.length + 1,
            isRolePlaceholder: champion.isRolePlaceholder || false
          }];
          onUpdate({ [picksKey]: newPicks });
        }
      }
    }
    setUpdateTrigger(prev => prev + 1);
  }, [scenario, onUpdate, showAllPrios]);

  // Handle champion click from pool
  const handleChampionPoolClick = useCallback((champion) => {
    if (selectedSlot) {
      const { type, side, index } = selectedSlot;
      addChampionToSlot(champion, type, side, index);
      setSelectedChampion(null);
    } else {
      setSelectedChampion(champion);
    }
  }, [selectedSlot, addChampionToSlot]);

  // Handle slot click
  const handleSlotClick = useCallback((type, side, index) => {
    const isSelected = selectedSlot?.type === type && selectedSlot?.side === side && selectedSlot?.index === index;

    if (selectedChampion) {
      addChampionToSlot(selectedChampion, type, side, index);
      setSelectedChampion(null);
    } else {
      if (isSelected) {
        setSelectedSlot(null);
      } else {
        setSelectedSlot({ type, side, index });
      }
    }
  }, [selectedChampion, selectedSlot, addChampionToSlot]);

  // Remove champion from slot
  const removeChampion = (type, side, index, championId) => {
    if (type === 'ban') {
      const bansKey = `${side}_bans`;
      const newBans = [...(scenario[bansKey] || [])];
      const currentChampions = normalizeChampions(newBans[index]);

      if (championId) {
        const filtered = currentChampions.filter(c => c.champion_id !== championId);
        // Re-assign priorities
        newBans[index] = filtered.map((c, i) => ({ ...c, priority: i + 1 }));
        if (newBans[index].length === 0) newBans[index] = null;
      } else {
        newBans[index] = null;
      }

      onUpdate({ [bansKey]: newBans });
    } else {
      const picksKey = `${side}_picks`;
      const newPicks = [...(scenario[picksKey] || [])];
      const currentChampions = normalizeChampions(newPicks[index]);

      if (championId) {
        const filtered = currentChampions.filter(c => c.champion_id !== championId);
        // Re-assign priorities
        newPicks[index] = filtered.map((c, i) => ({ ...c, priority: i + 1 }));
        if (newPicks[index].length === 0) newPicks[index] = null;
      } else {
        newPicks[index] = null;
      }

      onUpdate({ [picksKey]: newPicks });
    }
    setUpdateTrigger(prev => prev + 1);
  };

  // Drag & Drop handlers
  const handleDragStart = useCallback((e, champion, fromSlot = null) => {
    setDraggedChampion(champion);
    setDraggedFromSlot(fromSlot);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, type, side, index) => {
    e.preventDefault();

    if (draggedChampion) {
      const championId = draggedChampion.champion_id || draggedChampion.id;
      const championKey = draggedChampion.champion_key || draggedChampion.key;

      // Build complete new scenario state
      let newScenario = { ...scenario };

      // Step 1: Remove from old slot if dragged from a slot
      if (draggedFromSlot) {
        const { type: fromType, side: fromSide, index: fromIndex } = draggedFromSlot;
        const fromKey = fromType === 'ban' ? `${fromSide}_bans` : `${fromSide}_picks`;
        const fromArray = [...(newScenario[fromKey] || [])];
        const fromChampions = normalizeChampions(fromArray[fromIndex]);

        // Remove the dragged champion
        const filtered = fromChampions.filter(c => c.champion_id !== championId);
        fromArray[fromIndex] = filtered.length > 0 ? filtered.map((c, i) => ({ ...c, priority: i + 1 })) : null;
        newScenario[fromKey] = fromArray;
      }

      // Step 2: Add to new slot
      const toKey = type === 'ban' ? `${side}_bans` : `${side}_picks`;
      const toArray = [...(newScenario[toKey] || [])];
      const currentChampions = normalizeChampions(toArray[index]);

      // If priorities are hidden, ALWAYS replace
      if (!showAllPrios) {
        // Replace the entire slot with the new champion
        toArray[index] = [{
          champion_id: championId,
          champion_key: championKey,
          role: draggedChampion.isRolePlaceholder ? draggedChampion.role : (draggedChampion.role || (type === 'pick' ? getRoleForIndex(index) : undefined)),
          priority: 1,
          isRolePlaceholder: draggedChampion.isRolePlaceholder || false,
          ...(type === 'ban' && { order: index + 1 })
        }];
      } else {
        // Priorities are shown - add as new priority (if not already in this slot and under limit)
        const alreadyExists = currentChampions.some(c => c.champion_id === championId);
        if (!alreadyExists && currentChampions.length < 5) {
          toArray[index] = [...currentChampions, {
            champion_id: championId,
            champion_key: championKey,
            role: draggedChampion.isRolePlaceholder ? draggedChampion.role : (draggedChampion.role || (type === 'pick' ? getRoleForIndex(index) : undefined)),
            priority: currentChampions.length + 1,
            isRolePlaceholder: draggedChampion.isRolePlaceholder || false,
            ...(type === 'ban' && { order: index + 1 })
          }];
        }
      }

      newScenario[toKey] = toArray;

      // Update in one go
      onUpdate(newScenario);
      setUpdateTrigger(prev => prev + 1);
    }

    setDraggedChampion(null);
    setDraggedFromSlot(null);
  }, [draggedChampion, draggedFromSlot, showAllPrios, scenario, onUpdate]);

  const getRoleForIndex = (index) => {
    const roles = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];
    return roles[index] || 'UNKNOWN';
  };

  const ourSide = scenario.side;
  const opponentSide = ourSide === 'blue' ? 'red' : 'blue';
  const ourTeamName = 'Wir';
  const opponentTeamName = teamName;

  // Determine which roster to display
  const displayRoster = lockedRoster || currentRoster;
  const isLocked = !!lockedRoster;

  return (
    <div className="space-y-6">
      {/* Roster Display - Locked or Current */}
      {displayRoster && displayRoster.roster && (
        <div className={`rounded-lg p-4 transition-all ${
          isLocked
            ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 border-purple-500/50'
            : 'bg-slate-800/30 border-2 border-dashed border-yellow-500/50'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              {isLocked ? (
                <>
                  <Lock className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-bold text-purple-300">Locked Roster</h3>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 text-yellow-400" style={{ transform: 'rotate(-25deg)' }} />
                  <h3 className="text-lg font-bold text-yellow-300">Preview Roster (Not Locked)</h3>
                </>
              )}
            </div>
            <span className={`text-sm ${isLocked ? 'text-purple-400/80' : 'text-yellow-400/80'}`}>
              — {displayRoster.name}
            </span>
            {!isLocked && (
              <div className="ml-auto flex items-center gap-2 px-3.5 py-1.5 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                <span className="text-xs font-semibold text-yellow-300 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="text-base leading-none -translate-y-0.5">⚠</span>
                  <span>Not Final</span>
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-5 gap-3">
            {displayRoster.roster.map((player) => (
              <PlayerCardWithChampionPool key={player.player_id} player={player} isLocked={isLocked} />
            ))}
          </div>
        </div>
      )}

      {/* Search */}
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

      {/* Draft Layout */}
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

        {/* Bans Row with Role Filter */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
          {/* Blue Bans */}
          <div className="flex gap-2 justify-end">
            {[0, 1, 2, 3, 4].map(index => {
              const champions = normalizeChampions(scenario.blue_bans?.[index]);
              const key = `blue-ban-${index}-${updateTrigger}`;
              const isSelected = selectedSlot?.type === 'ban' && selectedSlot?.side === 'blue' && selectedSlot?.index === index;
              const isExpanded = isSlotExpanded('ban', 'blue', index);

              return (
                <div key={key} className="relative">
                  {index === 2 && <div className="w-4" />}
                  <BanSlotWithPrio
                    champions={champions}
                    side="blue"
                    onSelect={() => handleSlotClick('ban', 'blue', index)}
                    onRemoveChampion={(championId) => removeChampion('ban', 'blue', index, championId)}
                    isSelected={isSelected}
                    isExpanded={isExpanded}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'ban', 'blue', index)}
                    onDropAtPriority={(e, priority) => {
                      e.preventDefault();
                      if (draggedChampion && showAllPrios) {
                        const championId = draggedChampion.champion_id || draggedChampion.id;
                        const championKey = draggedChampion.champion_key || draggedChampion.key;

                        // Build complete new scenario state
                        let newScenario = { ...scenario };

                        // Step 1: Remove from old slot if dragged from a slot
                        if (draggedFromSlot) {
                          const { type: fromType, side: fromSide, index: fromIndex } = draggedFromSlot;
                          const fromKey = fromType === 'ban' ? `${fromSide}_bans` : `${fromSide}_picks`;
                          const fromArray = [...(newScenario[fromKey] || [])];
                          const fromChampions = normalizeChampions(fromArray[fromIndex]);

                          // Remove the dragged champion
                          const filtered = fromChampions.filter(c => c.champion_id !== championId);
                          fromArray[fromIndex] = filtered.length > 0 ? filtered.map((c, i) => ({ ...c, priority: i + 1 })) : null;
                          newScenario[fromKey] = fromArray;
                        }

                        // Step 2: Add at specific priority
                        const toKey = 'blue_bans';
                        const toArray = [...(newScenario[toKey] || [])];
                        const currentChampions = normalizeChampions(toArray[index]);

                        // Check if already exists in this slot
                        const alreadyExists = currentChampions.some(c => c.champion_id === championId);

                        // Limit to max 5 priorities
                        if (!alreadyExists && currentChampions.length >= 5) {
                          setDraggedChampion(null);
                          setDraggedFromSlot(null);
                          return;
                        }

                        // Remove if already exists (for reordering)
                        const filtered = currentChampions.filter(c => c.champion_id !== championId);

                        // Insert at target priority position
                        const newChampion = {
                          champion_id: championId,
                          champion_key: championKey,
                          order: index + 1,
                          priority: priority,
                          isRolePlaceholder: draggedChampion.isRolePlaceholder || false,
                          role: draggedChampion.isRolePlaceholder ? draggedChampion.role : undefined
                        };

                        filtered.splice(priority - 1, 0, newChampion);

                        // Re-assign priorities
                        toArray[index] = filtered.map((c, i) => ({ ...c, priority: i + 1 }));
                        newScenario[toKey] = toArray;

                        // Update in one go
                        onUpdate(newScenario);
                        setUpdateTrigger(prev => prev + 1);
                        setDraggedChampion(null);
                        setDraggedFromSlot(null);
                      }
                    }}
                    slotInfo={{ type: 'ban', side: 'blue', index }}
                  />
                </div>
              );
            })}
          </div>

          {/* Role Filter */}
          <div className="flex flex-col gap-2 px-4">
            <div className="flex gap-2">
              {['top', 'jungle', 'mid', 'bot', 'support'].map(role => {
                const isActive = selectedRoles.includes(role);
                return (
                  <button
                    key={role}
                    onClick={() => toggleRoleFilter(role)}
                    draggable
                    onDragStart={(e) => {
                      const rolePlaceholder = {
                        id: `role-${role}`,
                        key: role,
                        name: role.charAt(0).toUpperCase() + role.slice(1),
                        isRolePlaceholder: true,
                        role: role.toUpperCase()
                      };
                      handleDragStart(e, rolePlaceholder);
                    }}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all cursor-move ${
                      isActive
                        ? 'bg-purple-500/20 border-purple-500'
                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                    }`}
                    title={`${role.charAt(0).toUpperCase() + role.slice(1)} (Click to filter, Drag to add as placeholder)`}
                  >
                    <RoleIcon role={role.toUpperCase()} size={20} />
                  </button>
                );
              })}
            </div>

            {/* Global Priority Toggle */}
            <button
              onClick={() => setShowAllPrios(!showAllPrios)}
              className={`px-3 py-1.5 rounded-lg border-2 transition-all flex items-center justify-center gap-1.5 text-xs font-semibold ${
                showAllPrios
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
              title="Toggle all priorities"
            >
              {showAllPrios ? (
                <>
                  <ChevronsUp className="w-3.5 h-3.5" />
                  Prios ausblenden
                </>
              ) : (
                <>
                  <ChevronsDown className="w-3.5 h-3.5" />
                  Alle Prios einblenden
                </>
              )}
            </button>
          </div>

          {/* Red Bans */}
          <div className="flex gap-2 justify-start">
            {[0, 1, 2, 3, 4].map(index => {
              const champions = normalizeChampions(scenario.red_bans?.[index]);
              const key = `red-ban-${index}-${updateTrigger}`;
              const isSelected = selectedSlot?.type === 'ban' && selectedSlot?.side === 'red' && selectedSlot?.index === index;
              const isExpanded = isSlotExpanded('ban', 'red', index);

              return (
                <div key={key} className="relative">
                  {index === 2 && <div className="w-4" />}
                  <BanSlotWithPrio
                    champions={champions}
                    side="red"
                    onSelect={() => handleSlotClick('ban', 'red', index)}
                    onRemoveChampion={(championId) => removeChampion('ban', 'red', index, championId)}
                    isSelected={isSelected}
                    isExpanded={isExpanded}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'ban', 'red', index)}
                    onDropAtPriority={(e, priority) => {
                      e.preventDefault();
                      if (draggedChampion && showAllPrios) {
                        const championId = draggedChampion.champion_id || draggedChampion.id;
                        const championKey = draggedChampion.champion_key || draggedChampion.key;

                        // Build complete new scenario state
                        let newScenario = { ...scenario };

                        // Step 1: Remove from old slot if dragged from a slot
                        if (draggedFromSlot) {
                          const { type: fromType, side: fromSide, index: fromIndex } = draggedFromSlot;
                          const fromKey = fromType === 'ban' ? `${fromSide}_bans` : `${fromSide}_picks`;
                          const fromArray = [...(newScenario[fromKey] || [])];
                          const fromChampions = normalizeChampions(fromArray[fromIndex]);

                          // Remove the dragged champion
                          const filtered = fromChampions.filter(c => c.champion_id !== championId);
                          fromArray[fromIndex] = filtered.length > 0 ? filtered.map((c, i) => ({ ...c, priority: i + 1 })) : null;
                          newScenario[fromKey] = fromArray;
                        }

                        // Step 2: Add at specific priority
                        const toKey = 'red_bans';
                        const toArray = [...(newScenario[toKey] || [])];
                        const currentChampions = normalizeChampions(toArray[index]);

                        // Check if already exists in this slot
                        const alreadyExists = currentChampions.some(c => c.champion_id === championId);

                        // Limit to max 5 priorities
                        if (!alreadyExists && currentChampions.length >= 5) {
                          setDraggedChampion(null);
                          setDraggedFromSlot(null);
                          return;
                        }

                        // Remove if already exists (for reordering)
                        const filtered = currentChampions.filter(c => c.champion_id !== championId);

                        // Insert at target priority position
                        const newChampion = {
                          champion_id: championId,
                          champion_key: championKey,
                          order: index + 1,
                          priority: priority,
                          isRolePlaceholder: draggedChampion.isRolePlaceholder || false,
                          role: draggedChampion.isRolePlaceholder ? draggedChampion.role : undefined
                        };

                        filtered.splice(priority - 1, 0, newChampion);

                        // Re-assign priorities
                        toArray[index] = filtered.map((c, i) => ({ ...c, priority: i + 1 }));
                        newScenario[toKey] = toArray;

                        // Update in one go
                        onUpdate(newScenario);
                        setUpdateTrigger(prev => prev + 1);
                        setDraggedChampion(null);
                        setDraggedFromSlot(null);
                      }
                    }}
                    slotInfo={{ type: 'ban', side: 'red', index }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Draft Area: Picks + Champions */}
        <div className="flex gap-8 items-center justify-center">
          {/* Blue Picks - Main picks INSIDE, prios expand OUTSIDE (left) */}
          <div className={`space-y-2 flex flex-col items-start transition-all ${showAllPrios ? 'w-[260px]' : 'w-[130px]'}`}>
            {[0, 1, 2, 3, 4].map(index => {
              const champions = normalizeChampions(scenario.blue_picks?.[index]);
              const key = `blue-pick-${index}-${updateTrigger}`;
              const isSelected = selectedSlot?.type === 'pick' && selectedSlot?.side === 'blue' && selectedSlot?.index === index;
              const isExpanded = isSlotExpanded('pick', 'blue', index);

              return (
                <div key={key} className={index === 3 ? 'mt-8' : ''}>
                  <PickSlotWithPrio
                    champions={champions}
                    side="blue"
                    pickNumber={index + 1}
                    onSelect={() => handleSlotClick('pick', 'blue', index)}
                    onRemoveChampion={(championId) => removeChampion('pick', 'blue', index, championId)}
                    isSelected={isSelected}
                    isExpanded={isExpanded}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'pick', 'blue', index)}
                    onDropAtPriority={(e, priority) => {
                      e.preventDefault();
                      if (draggedChampion && showAllPrios) {
                        const championId = draggedChampion.champion_id || draggedChampion.id;
                        const championKey = draggedChampion.champion_key || draggedChampion.key;

                        // Build complete new scenario state
                        let newScenario = { ...scenario };

                        // Step 1: Remove from old slot if dragged from a slot
                        if (draggedFromSlot) {
                          const { type: fromType, side: fromSide, index: fromIndex } = draggedFromSlot;
                          const fromKey = fromType === 'ban' ? `${fromSide}_bans` : `${fromSide}_picks`;
                          const fromArray = [...(newScenario[fromKey] || [])];
                          const fromChampions = normalizeChampions(fromArray[fromIndex]);

                          // Remove the dragged champion
                          const filtered = fromChampions.filter(c => c.champion_id !== championId);
                          fromArray[fromIndex] = filtered.length > 0 ? filtered.map((c, i) => ({ ...c, priority: i + 1 })) : null;
                          newScenario[fromKey] = fromArray;
                        }

                        // Step 2: Add at specific priority
                        const toKey = 'blue_picks';
                        const toArray = [...(newScenario[toKey] || [])];
                        const currentChampions = normalizeChampions(toArray[index]);

                        // Check if already exists in this slot
                        const alreadyExists = currentChampions.some(c => c.champion_id === championId);

                        // Limit to max 5 priorities
                        if (!alreadyExists && currentChampions.length >= 5) {
                          setDraggedChampion(null);
                          setDraggedFromSlot(null);
                          return;
                        }

                        // Remove if already exists (for reordering)
                        const filtered = currentChampions.filter(c => c.champion_id !== championId);

                        // Insert at target priority position
                        const newChampion = {
                          champion_id: championId,
                          champion_key: championKey,
                          role: draggedChampion.isRolePlaceholder ? draggedChampion.role : (draggedChampion.role || getRoleForIndex(index)),
                          priority: priority,
                          isRolePlaceholder: draggedChampion.isRolePlaceholder || false
                        };

                        filtered.splice(priority - 1, 0, newChampion);

                        // Re-assign priorities
                        toArray[index] = filtered.map((c, i) => ({ ...c, priority: i + 1 }));
                        newScenario[toKey] = toArray;

                        // Update in one go
                        onUpdate(newScenario);
                        setUpdateTrigger(prev => prev + 1);
                        setDraggedChampion(null);
                        setDraggedFromSlot(null);
                      }
                    }}
                    slotInfo={{ type: 'pick', side: 'blue', index }}
                  />
                </div>
              );
            })}
          </div>

          {/* Champions Grid - Larger when collapsed, more compact when expanded */}
          <div
            className={`bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-y-auto transition-all ${
              showAllPrios
                ? 'p-2 max-h-[500px] w-[500px]'
                : 'p-4 max-h-[650px] w-[700px]'
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => {
              e.preventDefault();
              // If dragging from a slot, remove the champion
              if (draggedFromSlot) {
                const { type, side, index } = draggedFromSlot;
                removeChampion(type, side, index, draggedChampion.champion_id || draggedChampion.id);
                setDraggedChampion(null);
                setDraggedFromSlot(null);
                setUpdateTrigger(prev => prev + 1);
              }
            }}
          >
            <div className={`grid gap-2 ${showAllPrios ? 'grid-cols-7' : 'grid-cols-8'}`}>
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

          {/* Red Picks - Main picks INSIDE, prios expand OUTSIDE (right) */}
          <div className={`space-y-2 flex flex-col items-end transition-all ${showAllPrios ? 'w-[260px]' : 'w-[130px]'}`}>
            {[0, 1, 2, 3, 4].map(index => {
              const champions = normalizeChampions(scenario.red_picks?.[index]);
              const key = `red-pick-${index}-${updateTrigger}`;
              const isSelected = selectedSlot?.type === 'pick' && selectedSlot?.side === 'red' && selectedSlot?.index === index;
              const isExpanded = isSlotExpanded('pick', 'red', index);

              return (
                <div key={key} className={index === 3 ? 'mt-8' : ''}>
                  <PickSlotWithPrio
                    champions={champions}
                    side="red"
                    pickNumber={index + 1}
                    onSelect={() => handleSlotClick('pick', 'red', index)}
                    onRemoveChampion={(championId) => removeChampion('pick', 'red', index, championId)}
                    isSelected={isSelected}
                    isExpanded={isExpanded}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'pick', 'red', index)}
                    onDropAtPriority={(e, priority) => {
                      e.preventDefault();
                      if (draggedChampion && showAllPrios) {
                        const championId = draggedChampion.champion_id || draggedChampion.id;
                        const championKey = draggedChampion.champion_key || draggedChampion.key;

                        // Build complete new scenario state
                        let newScenario = { ...scenario };

                        // Step 1: Remove from old slot if dragged from a slot
                        if (draggedFromSlot) {
                          const { type: fromType, side: fromSide, index: fromIndex } = draggedFromSlot;
                          const fromKey = fromType === 'ban' ? `${fromSide}_bans` : `${fromSide}_picks`;
                          const fromArray = [...(newScenario[fromKey] || [])];
                          const fromChampions = normalizeChampions(fromArray[fromIndex]);

                          // Remove the dragged champion
                          const filtered = fromChampions.filter(c => c.champion_id !== championId);
                          fromArray[fromIndex] = filtered.length > 0 ? filtered.map((c, i) => ({ ...c, priority: i + 1 })) : null;
                          newScenario[fromKey] = fromArray;
                        }

                        // Step 2: Add at specific priority
                        const toKey = 'red_picks';
                        const toArray = [...(newScenario[toKey] || [])];
                        const currentChampions = normalizeChampions(toArray[index]);

                        // Check if already exists in this slot
                        const alreadyExists = currentChampions.some(c => c.champion_id === championId);

                        // Limit to max 5 priorities
                        if (!alreadyExists && currentChampions.length >= 5) {
                          setDraggedChampion(null);
                          setDraggedFromSlot(null);
                          return;
                        }

                        // Remove if already exists (for reordering)
                        const filtered = currentChampions.filter(c => c.champion_id !== championId);

                        // Insert at target priority position
                        const newChampion = {
                          champion_id: championId,
                          champion_key: championKey,
                          role: draggedChampion.isRolePlaceholder ? draggedChampion.role : (draggedChampion.role || getRoleForIndex(index)),
                          priority: priority,
                          isRolePlaceholder: draggedChampion.isRolePlaceholder || false
                        };

                        filtered.splice(priority - 1, 0, newChampion);

                        // Re-assign priorities
                        toArray[index] = filtered.map((c, i) => ({ ...c, priority: i + 1 }));
                        newScenario[toKey] = toArray;

                        // Update in one go
                        onUpdate(newScenario);
                        setUpdateTrigger(prev => prev + 1);
                        setDraggedChampion(null);
                        setDraggedFromSlot(null);
                      }
                    }}
                    slotInfo={{ type: 'pick', side: 'red', index }}
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

      {selectedSlot && (
        <div className="text-center text-sm text-purple-400 font-semibold">
          Slot selected - Click champions to add priorities
        </div>
      )}
    </div>
  );
}

// Ban Slot with Priority System
function BanSlotWithPrio({ champions, side, onSelect, onRemoveChampion, isSelected, isExpanded, onDragStart, onDragOver, onDrop, onDropAtPriority, slotInfo }) {
  const hasChampions = champions.length > 0;
  const firstPrio = champions[0];
  const otherPrios = champions.slice(1);
  const hasPrios = otherPrios.length > 0;
  const banNumber = slotInfo.index + 1; // 1-5

  return (
    <div className="relative flex flex-col items-center">
      {/* Prios expand UPWARD */}
      {isExpanded && (
        <div className="flex flex-col-reverse gap-0.5 mb-1 animate-fadeIn">
          {[...Array(4)].map((_, idx) => {
            const champion = otherPrios[idx];
            const priority = idx + 2; // Priority 2-5
            return (
              <div key={idx} className="relative group">
                <div
                  className="w-8 h-8 rounded border border-slate-600 overflow-hidden bg-slate-800/50"
                  onDragOver={onDragOver}
                  onDrop={(e) => onDropAtPriority(e, priority)}
                >
                  {champion ? (
                    <>
                      {champion.isRolePlaceholder ? (
                        <div
                          className="w-full h-full flex items-center justify-center bg-slate-700/30 opacity-50 cursor-move"
                          draggable
                          onDragStart={(e) => onDragStart(e, champion, slotInfo)}
                        >
                          <RoleIcon role={champion.role || champion.champion_key?.toUpperCase()} size={12} />
                        </div>
                      ) : (
                        <img
                          src={getChampionIcon(champion.champion_key)}
                          alt={champion.champion_key}
                          className="w-full h-full object-cover opacity-50 scale-120"
                          draggable
                          onDragStart={(e) => onDragStart(e, champion, slotInfo)}
                        />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveChampion(champion.champion_id);
                        }}
                        className="absolute top-0.5 right-0.5 w-3 h-3 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <X className="w-2 h-2 text-white" />
                      </button>
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-[8px] px-1 rounded">
                        {priority}
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-slate-600/40" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Slot - Priority 1 */}
      <div
        onClick={onSelect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`
          rounded-lg border-2 cursor-pointer
          flex items-center justify-center relative overflow-hidden
          transition-all
          ${isSelected ? 'border-primary ring-2 ring-primary' : 'border-slate-700 hover:border-primary/50'}
          ${hasChampions ? 'bg-slate-800' : 'bg-slate-900/50'}
          ${isExpanded ? 'w-12 h-12' : 'w-16 h-16'}
        `}
      >
        {firstPrio ? (
          <div className="relative w-full h-full group">
            {firstPrio.isRolePlaceholder ? (
              // Role Placeholder Display
              <>
                <div
                  className="w-full h-full flex items-center justify-center bg-slate-700/30 opacity-50 cursor-move"
                  draggable
                  onDragStart={(e) => onDragStart(e, firstPrio, slotInfo)}
                >
                  <RoleIcon role={firstPrio.role || firstPrio.champion_key?.toUpperCase()} size={isExpanded ? 20 : 28} />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveChampion(firstPrio.champion_id);
                  }}
                  className={`absolute top-1 right-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center ${
                    isExpanded ? 'w-3.5 h-3.5' : 'w-4 h-4'
                  }`}
                >
                  <X className={`text-white ${isExpanded ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} />
                </button>
              </>
            ) : (
              // Champion Display
              <>
                <img
                  src={getChampionIcon(firstPrio.champion_key)}
                  alt={firstPrio.champion_key}
                  className="w-full h-full object-cover opacity-40 scale-120"
                  draggable
                  onDragStart={(e) => onDragStart(e, firstPrio, slotInfo)}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveChampion(firstPrio.champion_id);
                  }}
                  className={`absolute top-1 right-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center ${
                    isExpanded ? 'w-3.5 h-3.5' : 'w-4 h-4'
                  }`}
                >
                  <X className={`text-white ${isExpanded ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} />
                </button>
              </>
            )}
          </div>
        ) : (
          <span className={`${isExpanded ? 'text-[8px]' : 'text-[10px]'} text-slate-500`}>Ban {banNumber}</span>
        )}

        {/* Priority indicator - only visible when NOT expanded */}
        {hasPrios && !isExpanded && (
          <div className="absolute bottom-1 right-1 bg-purple-500/20 border-2 border-purple-500 text-purple-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-lg shadow-purple-500/30 flex items-center gap-0.5">
            +{otherPrios.length}
          </div>
        )}
      </div>
    </div>
  );
}

// Pick Slot with Priority System
function PickSlotWithPrio({ champions, side, pickNumber, onSelect, onRemoveChampion, isSelected, isExpanded, onDragStart, onDragOver, onDrop, onDropAtPriority, slotInfo }) {
  const hasChampions = champions.length > 0;
  const firstPrio = champions[0];
  const otherPrios = champions.slice(1);
  const label = side === 'blue' ? `B${pickNumber}` : `R${pickNumber}`;
  const expandLeft = side === 'blue';
  const hasPrios = otherPrios.length > 0;

  return (
    <div className={`relative flex items-center transition-all duration-300 ${expandLeft ? 'flex-row' : 'flex-row-reverse'}`} style={{ overflow: 'visible' }}>
      {/* Prios expand OUTSIDE - Blue: to the left (reversed) / Red: to the right */}
      {isExpanded && (
        <div className={`flex gap-0.5 animate-fadeIn ${expandLeft ? 'mr-1 flex-row-reverse' : 'ml-1'}`}>
          {[...Array(4)].map((_, idx) => {
            const champion = otherPrios[idx];
            const priority = idx + 2; // Priority 2-5
            return (
              <div key={idx} className="relative group">
                <div
                  className="w-10 h-10 rounded border border-slate-600 overflow-hidden bg-slate-800/50"
                  onDragOver={onDragOver}
                  onDrop={(e) => onDropAtPriority(e, priority)}
                >
                  {champion ? (
                    <>
                      {champion.isRolePlaceholder ? (
                        <div
                          className="w-full h-full flex items-center justify-center bg-slate-700/30 cursor-move"
                          draggable
                          onDragStart={(e) => onDragStart(e, champion, slotInfo)}
                        >
                          <RoleIcon role={champion.role || champion.champion_key?.toUpperCase()} size={16} />
                        </div>
                      ) : (
                        <img
                          src={getChampionIcon(champion.champion_key)}
                          alt={champion.champion_key}
                          className="w-full h-full object-cover scale-120"
                          draggable
                          onDragStart={(e) => onDragStart(e, champion, slotInfo)}
                        />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveChampion(champion.champion_id);
                        }}
                        className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-[10px] px-1.5 rounded font-semibold">
                        {priority}
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600/50" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Slot - Priority 1 */}
      <div
        onClick={onSelect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`
          rounded-lg border-2 cursor-pointer
          flex items-center justify-center relative overflow-hidden
          transition-all
          ${isSelected ? 'border-primary ring-2 ring-primary' : 'border-slate-700 hover:border-primary/50'}
          ${hasChampions ? 'bg-slate-800' : 'bg-slate-900/50'}
          ${isExpanded ? 'w-20 h-20' : 'w-28 h-28'}
        `}
      >
        {firstPrio ? (
          <div className="relative w-full h-full group">
            {firstPrio.isRolePlaceholder ? (
              // Role Placeholder Display
              <>
                <div
                  className="w-full h-full flex items-center justify-center bg-slate-700/30 cursor-move"
                  draggable
                  onDragStart={(e) => onDragStart(e, firstPrio, slotInfo)}
                >
                  <RoleIcon role={firstPrio.role || firstPrio.champion_key?.toUpperCase()} size={isExpanded ? 32 : 48} />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveChampion(firstPrio.champion_id);
                  }}
                  className={`absolute top-1 right-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center ${
                    isExpanded ? 'w-4 h-4' : 'w-5 h-5'
                  }`}
                >
                  <X className={`text-white ${isExpanded ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
                </button>
                <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-slate-700 px-2 py-0.5 rounded font-semibold text-slate-300 ${
                  isExpanded ? 'text-[10px]' : 'text-xs'
                }`}>
                  {label}
                </div>
              </>
            ) : (
              // Champion Display
              <>
                <img
                  src={getChampionIcon(firstPrio.champion_key)}
                  alt={firstPrio.champion_key}
                  className="w-full h-full object-cover scale-120"
                  draggable
                  onDragStart={(e) => onDragStart(e, firstPrio, slotInfo)}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveChampion(firstPrio.champion_id);
                  }}
                  className={`absolute top-1 right-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center ${
                    isExpanded ? 'w-4 h-4' : 'w-5 h-5'
                  }`}
                >
                  <X className={`text-white ${isExpanded ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
                </button>
                <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-slate-700 px-2 py-0.5 rounded font-semibold text-slate-300 ${
                  isExpanded ? 'text-[10px]' : 'text-xs'
                }`}>
                  {label}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className={`${isExpanded ? 'text-xs' : 'text-base'} text-slate-400`}>{label}</div>
          </div>
        )}
      </div>

      {/* Priority indicator - OUTSIDE the pick slot, only visible when NOT expanded */}
      {hasPrios && !isExpanded && (
        <div
          className="absolute top-1/2 -translate-y-1/2 bg-purple-500/20 border-2 border-purple-500 text-purple-300 text-[11px] px-2 py-1 rounded-full font-bold shadow-lg shadow-purple-500/30 z-50 whitespace-nowrap"
          style={{
            [side === 'blue' ? 'left' : 'right']: '-3rem'
          }}
        >
          +{otherPrios.length}
        </div>
      )}
    </div>
  );
}

// Champion Icon Component
function ChampionIcon({ champion, onClick, onDragStart, isSelected }) {
  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      className="relative group cursor-pointer hover:scale-105 transition-transform overflow-hidden rounded"
      title={champion.name}
    >
      <img
        src={getChampionIcon(champion.key)}
        alt={champion.name}
        className={`w-full aspect-square rounded border-2 object-cover scale-120 transition-colors ${
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

// Player Card with Champion Pool Hover
function PlayerCardWithChampionPool({ player, isLocked = true }) {
  const [showChampionPool, setShowChampionPool] = useState(false);

  // Fetch champion pool with SWR (prefetch immediately, not on hover)
  const { data, isLoading } = useSWR(
    `/players/${player.player_id}/champions/tournament`,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  );

  const championPool = data?.champions || [];

  // Rank data
  const hasRank = player.soloq_tier;
  const tier = player.soloq_tier;
  const division = player.soloq_division;

  return (
    <Link
      to={`/players/${player.player_id}`}
      className={`rounded-lg p-3 transition-all group relative ${
        isLocked
          ? 'bg-slate-800/50 border border-purple-500/30 hover:border-purple-500 hover:bg-slate-800/70'
          : 'bg-slate-800/30 border border-dashed border-yellow-500/30 hover:border-yellow-500 hover:bg-slate-800/50'
      }`}
      onMouseEnter={() => setShowChampionPool(true)}
      onMouseLeave={() => setShowChampionPool(false)}
    >
      {/* Role Icon and Elo - Centered with Divider */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <RoleIcon role={player.role} size={20} />
        {hasRank && (
          <>
            <div className="h-4 w-px bg-slate-600"></div>
            <div className="flex items-center gap-1">
              <img
                src={getRankIconUrl(tier, division)}
                alt={tier}
                className="w-5 h-5"
                onError={(e) => e.target.style.display = 'none'}
              />
              {division && !['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier) && (
                <span className="text-xs font-semibold text-slate-300">
                  {divisionToRoman(division)}
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
          className={`w-10 h-10 rounded-full border-2 transition-colors ${
            isLocked
              ? 'border-purple-500/50 group-hover:border-purple-500'
              : 'border-yellow-500/50 group-hover:border-yellow-500'
          }`}
        />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold text-white transition-colors truncate ${
            isLocked ? 'group-hover:text-purple-300' : 'group-hover:text-yellow-300'
          }`}>
            {player.summoner_name}
          </div>
        </div>
      </div>

      {/* Champion Pool Popup */}
      {showChampionPool && (
        <div className={`absolute left-0 top-full mt-2 bg-slate-900 border-2 rounded-lg p-3 shadow-xl z-50 w-full overflow-y-auto ${
          isLocked
            ? 'border-purple-500/50 shadow-purple-500/20'
            : 'border-yellow-500/50 shadow-yellow-500/20'
        }`} style={{ maxHeight: '290px' }}>
          <div className={`text-xs font-semibold mb-2 ${isLocked ? 'text-purple-300' : 'text-yellow-300'}`}>Champion Pool (PL)</div>
          {isLoading ? (
            <div className="text-xs text-slate-400">Loading...</div>
          ) : championPool.length > 0 ? (
            <div className="space-y-2">
              {championPool.map((champ, idx) => (
                <div key={champ.champion_id || idx} className="flex items-center gap-2 bg-slate-800/50 rounded p-2">
                  <img
                    src={getChampionIconById(champ.champion_id)}
                    alt={champ.champion_name}
                    className="w-8 h-8 rounded"
                    onError={(e) => {
                      console.error('Failed to load champion icon:', champ.champion_id, champ.champion_name);
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">
                      {champ.champion_name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {champ.games_played} games • {champ.winrate?.toFixed(0) || 0}% WR
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400">No data available</div>
          )}
        </div>
      )}
    </Link>
  );
}
