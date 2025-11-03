import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, ChevronRight, MessageSquare } from 'lucide-react';
import RosterManager from './GamePrep/RosterManager';
import DraftBoard from './GamePrep/DraftBoard';
import CommentSystem from './GamePrep/CommentSystem';
import { useRosters, useScenarios, useComments } from '../hooks/useGamePrep';
import { getChampionIcon } from '../lib/championsComplete';
import RoleIcon from './RoleIcon';

/**
 * Game Prep Tab - Improved Workflow
 * 1. Roster Selection (with Global Comments visible)
 * 2. Select Roster → Show Scenarios (with Roster Comments)
 * 3. Select Scenario → Show Draft Board (with Scenario Comments)
 */
export default function GamePrepTab({ teamId, team, roster, predictions }) {
  // State
  const [currentRoster, setCurrentRoster] = useState(null);
  const [currentScenario, setCurrentScenario] = useState(null);
  const [editingScenarioName, setEditingScenarioName] = useState(null);

  // Ref for scrolling to comments
  const scenarioCommentsRef = useRef(null);

  // API Hooks
  const {
    rosters,
    lockedRoster,
    loading: rostersLoading,
    createRoster,
    updateRoster,
    deleteRoster,
    lockRoster,
    unlockRoster
  } = useRosters(teamId);

  const {
    scenarios,
    loading: scenariosLoading,
    createScenario,
    updateScenario,
    deleteScenario
  } = useScenarios(currentRoster?.id);

  // Comments (3 levels)
  const { comments: globalComments, createComment: createGlobal, updateComment: updateGlobal, deleteComment: deleteGlobal } = useComments(teamId, 'global');
  const { comments: rosterComments, createComment: createRosterComment, updateComment: updateRosterComment, deleteComment: deleteRosterComment } = useComments(teamId, 'roster', currentRoster?.id);
  const { comments: scenarioComments, createComment: createScenarioComment, updateComment: updateScenarioComment, deleteComment: deleteScenarioComment } = useComments(teamId, 'scenario', null, currentScenario?.id);

  // Auto-select roster when data loads
  useEffect(() => {
    // ALWAYS use locked roster if it exists
    if (lockedRoster) {
      setCurrentRoster(lockedRoster);
      return;
    }

    // Auto-select first roster if rosters exist and none selected
    if (rosters.length > 0 && !currentRoster) {
      setCurrentRoster(rosters[0]);
    }
  }, [lockedRoster, rosters, currentRoster]);

  // Handle comment operations
  const handleAddComment = async (level, content, rosterId = null, scenarioId = null) => {
    const commentData = {
      level,
      content,
      roster_id: rosterId,
      scenario_id: scenarioId,
      author: 'User' // TODO: Get from auth
    };

    if (level === 'global') {
      await createGlobal(commentData);
    } else if (level === 'roster') {
      await createRosterComment(commentData);
    } else {
      await createScenarioComment(commentData);
    }
  };

  const handleUpdateComment = async (commentId, content) => {
    await fetch(`/api/game-prep/comments/${commentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    window.location.reload();
  };

  const handleDeleteComment = async (commentId) => {
    await fetch(`/api/game-prep/comments/${commentId}`, {
      method: 'DELETE'
    });
    window.location.reload();
  };

  // Scenario management
  const handleCreateScenario = async (side) => {
    if (!currentRoster) return;

    const scenario = await createScenario({
      side,
      blue_bans: [],
      red_bans: [],
      blue_picks: [],
      red_picks: []
    });

    setCurrentScenario(scenario);
  };

  const handleUpdateScenarioName = async (scenarioId, newName) => {
    await updateScenario(scenarioId, { name: newName });
    setEditingScenarioName(null);
  };

  // Scroll to scenario comments
  const scrollToScenarioComments = () => {
    scenarioCommentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (rostersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-slate-400">Loading Draft Preparation...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Phase 1: Roster Management + Global Comments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roster Selection (2/3 width) */}
        <div className="lg:col-span-2 card">
          <RosterManager
            rosters={rosters}
            lockedRoster={lockedRoster}
            availablePlayers={roster}
            predictions={predictions}
            onCreateRoster={createRoster}
            onUpdateRoster={updateRoster}
            onDeleteRoster={deleteRoster}
            onLockRoster={lockRoster}
            onUnlockRoster={unlockRoster}
            onSelectRoster={(rosterId) => {
              // Prevent roster change if one is locked
              if (lockedRoster) return;

              const selectedRoster = rosters.find(r => r.id === rosterId);
              setCurrentRoster(selectedRoster);
              setCurrentScenario(null); // Reset scenario when changing roster
            }}
            currentRoster={currentRoster}
          />
        </div>

        {/* Global Comments (1/3 width) */}
        <div className="lg:col-span-1 relative">
          {globalComments.length > 0 && (
            <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1 bg-purple-500 text-white text-xs px-2 py-1 rounded-full shadow-lg">
              <MessageSquare className="w-3 h-3" />
              {globalComments.length}
            </div>
          )}
          <CommentSystem
            globalComments={globalComments}
            rosterComments={[]}
            scenarioComments={[]}
            currentRoster={null}
            currentScenario={null}
            onAddComment={handleAddComment}
            onUpdateComment={handleUpdateComment}
            onDeleteComment={handleDeleteComment}
            showOnlyGlobal={true}
          />
        </div>
      </div>

      {/* Phase 2 & 3: Scenarios + Draft (only if roster selected) */}
      {currentRoster && (
        <div className="space-y-6">
          {/* Scenario Selection + Roster Comments */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Scenarios (2/3 width) */}
            <div className="lg:col-span-2 card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Phase 2: Draft Scenarios</h2>
                  <p className="text-sm text-slate-400">
                    For roster: <span className="text-purple-400">{currentRoster.name}</span>
                    {lockedRoster && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                        🔒 Locked - All scenarios linked to this lineup
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Create Scenario Buttons */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => handleCreateScenario('blue')}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Blue Side Scenario
                </button>
                <button
                  onClick={() => handleCreateScenario('red')}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Red Side Scenario
                </button>
              </div>

              {/* Scenario List */}
              {scenarios.length > 0 ? (
                <div className="space-y-2">
                  {scenarios.map(scenario => {
                    // Bans/Picks are arrays of arrays (one array per slot)
                    // Get first priority from each slot, preserving position (slots 0-2 for first 3 bans)
                    const getBansFromSlots = (banSlots) => {
                      if (!Array.isArray(banSlots)) return [null, null, null];
                      const bans = [];
                      for (let i = 0; i < 3; i++) {
                        const slot = banSlots[i];
                        if (Array.isArray(slot) && slot.length > 0) {
                          const firstPrio = slot.find(ban => ban && ban.priority === 1);
                          bans.push(firstPrio && firstPrio.champion_key ? firstPrio : null);
                        } else {
                          bans.push(null);
                        }
                      }
                      return bans;
                    };

                    const blueBans = getBansFromSlots(scenario.blue_bans);
                    const redBans = getBansFromSlots(scenario.red_bans);

                    // Get B1 pick (first slot, first priority)
                    const getB1Pick = (pickSlots) => {
                      if (!Array.isArray(pickSlots) || pickSlots.length === 0) return null;
                      const firstSlot = pickSlots.find(slot => Array.isArray(slot) && slot.length > 0);
                      if (!firstSlot) return null;
                      return firstSlot.find(pick => pick && pick.priority === 1);
                    };

                    const b1Pick = getB1Pick(scenario.blue_picks);

                    return (
                      <div
                        key={scenario.id}
                        onClick={() => setCurrentScenario(scenario)}
                        className={`
                          p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                          ${currentScenario?.id === scenario.id
                            ? 'bg-purple-500/10 border-purple-500 shadow-lg shadow-purple-500/20'
                            : 'bg-slate-700/30 border-slate-700 hover:border-slate-600'}
                        `}
                      >
                        <div className="flex items-center justify-between gap-4">
                          {/* Left Section: Side Badge */}
                          <div className="flex-shrink-0">
                            <div className={`px-2 py-1 rounded text-xs font-semibold ${
                              scenario.side === 'blue' ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'
                            }`}>
                              {scenario.side === 'blue' ? 'Blue Side' : 'Red Side'}
                            </div>
                          </div>

                          {/* Middle Section: Name (flexible width) */}
                          <div className="flex-1 min-w-0">
                            {editingScenarioName === scenario.id ? (
                              <input
                                type="text"
                                defaultValue={scenario.name}
                                onBlur={(e) => handleUpdateScenarioName(scenario.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateScenarioName(scenario.id, e.target.value);
                                  if (e.key === 'Escape') setEditingScenarioName(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white outline-none focus:border-purple-500 w-full"
                                autoFocus
                              />
                            ) : (
                              <span className="font-medium text-white truncate block">{scenario.name}</span>
                            )}
                          </div>

                          {/* Right Section: Visual Clues (fixed width) */}
                          <div className="flex items-center gap-4 flex-shrink-0">
                            {/* Visual Clues: Bans + B1 Pick */}
                            <div className="flex items-center gap-2">
                              {/* Blue Bans - preserve position */}
                              <div className="flex items-center gap-0.5">
                                {blueBans.map((ban, idx) => (
                                  <div key={idx} className="w-6 h-6 rounded border border-blue-500/30 overflow-hidden bg-slate-800">
                                    {ban ? (
                                      <img
                                        src={getChampionIcon(ban.champion_key)}
                                        alt=""
                                        className="w-full h-full object-cover opacity-50"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-slate-800/50"></div>
                                    )}
                                  </div>
                                ))}
                              </div>

                              <div className="h-4 w-px bg-slate-600"></div>

                              {/* Red Bans - preserve position */}
                              <div className="flex items-center gap-0.5">
                                {redBans.map((ban, idx) => (
                                  <div key={idx} className="w-6 h-6 rounded border border-red-500/30 overflow-hidden bg-slate-800">
                                    {ban ? (
                                      <img
                                        src={getChampionIcon(ban.champion_key)}
                                        alt=""
                                        className="w-full h-full object-cover opacity-50"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-slate-800/50"></div>
                                    )}
                                  </div>
                                ))}
                              </div>

                              <div className="h-4 w-px bg-slate-600"></div>

                              {/* B1 Pick */}
                              <div className="w-6 h-6 rounded border border-purple-500/30 overflow-hidden bg-slate-800 flex items-center justify-center">
                                {b1Pick ? (
                                  b1Pick.isRolePlaceholder ? (
                                    <RoleIcon role={b1Pick.role || b1Pick.champion_key?.toUpperCase()} size={16} />
                                  ) : (
                                    <img
                                      src={getChampionIcon(b1Pick.champion_key)}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  )
                                ) : (
                                  <span className="text-[8px] text-slate-500">B1</span>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingScenarioName(scenario.id); }}
                                className="p-2 hover:bg-slate-600/50 rounded transition-colors"
                              >
                                <Edit2 className="w-4 h-4 text-slate-400" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteScenario(scenario.id); }}
                                className="p-2 hover:bg-slate-600/50 rounded text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <ChevronRight className="w-5 h-5 text-slate-400" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p>No scenarios yet. Create one to start drafting!</p>
                </div>
              )}
            </div>

            {/* Roster Comments (1/3 width) */}
            <div className="lg:col-span-1 relative">
              {rosterComments.length > 0 && (
                <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1 bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow-lg">
                  <MessageSquare className="w-3 h-3" />
                  {rosterComments.length}
                </div>
              )}
              <CommentSystem
                globalComments={[]}
                rosterComments={rosterComments}
                scenarioComments={[]}
                currentRoster={currentRoster}
                currentScenario={null}
                onAddComment={handleAddComment}
                onUpdateComment={handleUpdateComment}
                onDeleteComment={handleDeleteComment}
                showOnlyRoster={true}
              />
            </div>
          </div>

          {/* Phase 3: Draft Board + Scenario Comments (only if scenario selected) */}
          {currentScenario && (
            <div className="space-y-6">
              {/* Draft Board (Full Width) */}
              <div className="card relative">
                {/* Prominent Comment Badge - Click to scroll */}
                {scenarioComments.length > 0 && (
                  <button
                    onClick={scrollToScenarioComments}
                    className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="font-semibold">{scenarioComments.length} Comment{scenarioComments.length !== 1 ? 's' : ''}</span>
                  </button>
                )}
                <DraftBoard
                  scenario={currentScenario}
                  lockedRoster={lockedRoster}
                  onUpdate={(updates) => {
                    // Optimistic update - update local state immediately
                    setCurrentScenario(prev => ({ ...prev, ...updates }));
                    // Then update server
                    updateScenario(currentScenario.id, updates);
                  }}
                  teamName={team?.name || 'Unknown Team'}
                />
              </div>

              {/* Scenario Comments (Below Draft) */}
              <div className="card" ref={scenarioCommentsRef}>
                <CommentSystem
                  globalComments={[]}
                  rosterComments={[]}
                  scenarioComments={scenarioComments}
                  currentRoster={null}
                  currentScenario={currentScenario}
                  onAddComment={handleAddComment}
                  onUpdateComment={handleUpdateComment}
                  onDeleteComment={handleDeleteComment}
                  showOnlyScenario={true}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
