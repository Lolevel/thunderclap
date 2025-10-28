import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, ChevronRight } from 'lucide-react';
import RosterManager from './GamePrep/RosterManager';
import DraftBoard from './GamePrep/DraftBoard';
import CommentSystem from './GamePrep/CommentSystem';
import { useRosters, useScenarios, useComments } from '../hooks/useGamePrep';

/**
 * Game Prep Tab - Improved Workflow
 * 1. Roster Selection (with Global Comments visible)
 * 2. Select Roster → Show Scenarios (with Roster Comments)
 * 3. Select Scenario → Show Draft Board (with Scenario Comments)
 */
export default function GamePrepTabNew({ teamId, team, roster, predictions }) {
  // State
  const [currentRoster, setCurrentRoster] = useState(null);
  const [currentScenario, setCurrentScenario] = useState(null);
  const [editingScenarioName, setEditingScenarioName] = useState(null);

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

  // Auto-select locked roster OR create predicted roster on mount (only once)
  const hasCreatedPredicted = useRef(false);

  useEffect(() => {
    if (lockedRoster) {
      setCurrentRoster(lockedRoster);
      return;
    }

    if (rosters.length > 0 && !currentRoster) {
      setCurrentRoster(rosters[0]);
      return;
    }

    // Create predicted roster ONCE when no rosters exist
    if (
      rosters.length === 0 &&
      predictions &&
      predictions.length > 0 &&
      roster.length > 0 &&
      !hasCreatedPredicted.current
    ) {
      hasCreatedPredicted.current = true;

      const predictedLineup = predictions[0].predicted_lineup;

      // Convert to array with correct role order: Top, Jungle, Mid, Bot, Support
      const roleOrder = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];
      const rosterArray = roleOrder
        .filter(role => predictedLineup[role])
        .map(role => ({
          player_id: predictedLineup[role].player_id,
          summoner_name: predictedLineup[role].player_name,
          role: role
        }));

      const rosterData = {
        roster: rosterArray
      };

      createRoster(rosterData).then((newRoster) => {
        setCurrentRoster(newRoster);
      });
    }
  }, [lockedRoster, rosters, predictions, roster, currentRoster, createRoster]);

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
            onCreateRoster={createRoster}
            onUpdateRoster={updateRoster}
            onDeleteRoster={deleteRoster}
            onLockRoster={lockRoster}
            onUnlockRoster={unlockRoster}
            onSelectRoster={(rosterId) => {
              const selectedRoster = rosters.find(r => r.id === rosterId);
              setCurrentRoster(selectedRoster);
              setCurrentScenario(null); // Reset scenario when changing roster
            }}
            currentRoster={currentRoster}
          />
        </div>

        {/* Global Comments (1/3 width) */}
        <div className="lg:col-span-1">
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
                  {scenarios.map(scenario => (
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`px-2 py-1 rounded text-xs font-semibold ${
                            scenario.side === 'blue' ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'
                          }`}>
                            {scenario.side === 'blue' ? 'Blue Side' : 'Red Side'}
                          </div>
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
                              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white outline-none focus:border-purple-500"
                              autoFocus
                            />
                          ) : (
                            <span className="font-medium text-white">{scenario.name}</span>
                          )}
                        </div>
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
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p>No scenarios yet. Create one to start drafting!</p>
                </div>
              )}
            </div>

            {/* Roster Comments (1/3 width) */}
            <div className="lg:col-span-1">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Draft Board (2/3 width) */}
              <div className="lg:col-span-2">
                <DraftBoard
                  scenario={currentScenario}
                  onUpdate={(updates) => updateScenario(currentScenario.id, updates)}
                  teamName={team?.name || 'Unknown Team'}
                />
              </div>

              {/* Scenario Comments (1/3 width) */}
              <div className="lg:col-span-1">
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
