import React, { useState, useEffect, useRef } from 'react';
import {
	FileText,
	Ban,
	Target,
	Plus,
	Trash2,
	Save,
	Check,
	Edit2,
	Lock,
	Unlock,
	Users,
	ChevronDown,
	AlertCircle
} from 'lucide-react';
import { useTeamRoster, useRosterPredictions } from '../hooks/api/useTeam';
import { useDraftScenarios, useSaveDraftScenario, useDeleteDraftScenario, useUpdateRoster } from '../hooks/api/useDraft';
import { RefreshIndicator } from './ui/RefreshIndicator';
import ChampionInput from './ChampionInput';
import RoleIcon from './RoleIcon';
import { getSummonerIconUrl, handleSummonerIconError } from '../utils/summonerHelper';

// Jungle monster names for roster naming
const JUNGLE_MONSTERS = [
	'Gromp', 'Krug', 'Raptors', 'Wolves', 'Scuttle',
	'Blue Buff', 'Red Buff', 'Baron', 'Dragon', 'Herald'
];

const GamePrepTab = ({ teamId }) => {
	// Use SWR hooks for data fetching
	const { roster: rosterData, isLoading: rosterLoading, isValidating: rosterValidating } = useTeamRoster(teamId);
	const { predictions: predictionsData, isLoading: predictionsLoading } = useRosterPredictions(teamId);
	const {
		blueScenarios: blueScenariosData,
		redScenarios: redScenariosData,
		lockedRoster: lockedRosterData,
		isLoading: scenariosLoading,
		isValidating: scenariosValidating
	} = useDraftScenarios(teamId);

	// Mutation hooks
	const { saveDraftScenario } = useSaveDraftScenario(teamId);
	const { deleteDraftScenario } = useDeleteDraftScenario(teamId);
	const { updateRoster } = useUpdateRoster(teamId);

	const [activeSide, setActiveSide] = useState('blue'); // 'blue' or 'red'
	const [selectedScenario, setSelectedScenario] = useState(null);
	const [saving, setSaving] = useState(false);
	const [lastSaved, setLastSaved] = useState(null);
	const [autoSaveTimer, setAutoSaveTimer] = useState(null);

	// Roster management
	const [currentRoster, setCurrentRoster] = useState([]);
	const [openDropdown, setOpenDropdown] = useState(null); // Track which role dropdown is open
	const dropdownContainerRef = useRef(null);

	// Extract data from SWR hooks
	const roster = rosterData || [];
	const predictions = predictionsData;
	const blueScenarios = blueScenariosData;
	const redScenarios = redScenariosData;
	const lockedRoster = lockedRosterData;

	// Initialize roster and scenarios when data is loaded
	useEffect(() => {
		// Set predicted roster as default if available
		if (predictions && predictions.length > 0 && roster.length > 0) {
			const predictedLineup = predictions[0].predicted_lineup;
			const defaultRoster = Object.entries(predictedLineup).map(([role, playerData]) => {
				// Find the roster entry to get profile_icon_id
				const rosterEntry = roster.find(r => r.player_id === playerData.player_id);
				return {
					player_id: playerData.player_id,
					summoner_name: playerData.player_name,
					role: role,
					profile_icon_id: rosterEntry?.player?.profile_icon_id
				};
			});
			if (currentRoster.length === 0) {
				setCurrentRoster(defaultRoster);
			}
		}
	}, [predictions, roster]);

	// Auto-select first scenario when scenarios are loaded
	useEffect(() => {
		const scenarios = activeSide === 'blue' ? blueScenarios : redScenarios;
		if (scenarios && scenarios.length > 0 && !selectedScenario) {
			setSelectedScenario(scenarios[0]);
			// Update current roster from selected scenario
			if (scenarios[0].roster && scenarios[0].roster.length > 0) {
				// Enrich roster with profile_icon_id from full roster data
				const enrichedRoster = scenarios[0].roster.map(rosterPlayer => {
					const fullPlayer = roster.find(r => r.player_id === rosterPlayer.player_id);
					return {
						...rosterPlayer,
						profile_icon_id: fullPlayer?.player?.profile_icon_id || rosterPlayer.profile_icon_id
					};
				});
				setCurrentRoster(enrichedRoster);
			}
		}
	}, [blueScenarios, redScenarios, activeSide, roster]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target)) {
				setOpenDropdown(null);
			}
		};

		if (openDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [openDropdown]);

	const createNewScenario = async () => {
		try {
			const scenarios = activeSide === 'blue' ? blueScenarios : redScenarios;
			const scenarioName = `Scenario ${scenarios.length + 1}`;

			const newScenario = await saveDraftScenario({
				scenario_name: scenarioName,
				side: activeSide,
				roster: currentRoster,
				bans: ['', '', '', '', ''],
				picks: ['', '', '', '', ''],
				notes: ''
			});

			setSelectedScenario(newScenario);
		} catch (error) {
			console.error('Failed to create scenario:', error);
		}
	};

	const handleDeleteScenario = async (scenarioId) => {
		if (!confirm('Are you sure you want to delete this scenario?')) return;

		try {
			await deleteDraftScenario(scenarioId, activeSide);

			// Select another scenario after deletion
			const scenarios = activeSide === 'blue' ? blueScenarios : redScenarios;
			const updated = scenarios.filter(s => s.id !== scenarioId);
			setSelectedScenario(updated.length > 0 ? updated[0] : null);
		} catch (error) {
			console.error('Failed to delete scenario:', error);
		}
	};

	const saveScenario = async () => {
		if (!selectedScenario) return;

		try {
			setSaving(true);
			const updatedScenario = await saveDraftScenario({
				id: selectedScenario.id,
				scenario_name: selectedScenario.scenario_name,
				side: selectedScenario.side,
				roster: currentRoster,
				bans: selectedScenario.bans,
				picks: selectedScenario.picks,
				notes: selectedScenario.notes
			});

			setLastSaved(new Date(updatedScenario.updated_at));
		} catch (error) {
			console.error('Failed to save scenario:', error);
		} finally {
			setSaving(false);
		}
	};

	// Auto-save with 2 second debounce - only save if roster has 5 players
	const triggerAutoSave = () => {
		// Only auto-save if roster is complete (5 players) or if roster is empty (for initial scenarios)
		if (currentRoster.length !== 5 && currentRoster.length !== 0) {
			return;
		}

		if (autoSaveTimer) {
			clearTimeout(autoSaveTimer);
		}

		const timer = setTimeout(() => {
			saveScenario();
		}, 2000);

		setAutoSaveTimer(timer);
	};

	useEffect(() => {
		if (selectedScenario && !scenariosLoading) {
			triggerAutoSave();
		}

		return () => {
			if (autoSaveTimer) {
				clearTimeout(autoSaveTimer);
			}
		};
	}, [selectedScenario?.bans, selectedScenario?.picks, selectedScenario?.notes, currentRoster]);

	const lockRoster = async () => {
		try {
			await updateRoster(currentRoster);
		} catch (error) {
			console.error('Failed to lock roster:', error);
		}
	};

	const unlockRoster = async () => {
		try {
			await updateRoster(null);
		} catch (error) {
			console.error('Failed to unlock roster:', error);
		}
	};

	const loadPredictedRoster = () => {
		if (predictions && predictions.length > 0) {
			const predictedLineup = predictions[0].predicted_lineup;
			const predictedRoster = Object.entries(predictedLineup).map(([role, playerData]) => ({
				player_id: playerData.player_id,
				summoner_name: playerData.player_name,
				role: role,
				profile_icon_id: roster.find(r => r.player_id === playerData.player_id)?.player?.profile_icon_id
			}));
			setCurrentRoster(predictedRoster);
		}
	};

	const selectPlayerForRole = (role, playerData) => {
		const newRoster = currentRoster.filter(p => p.role !== role);
		newRoster.push({
			player_id: playerData.player_id,
			summoner_name: playerData.summoner_name,
			role: role,
			profile_icon_id: playerData.profile_icon_id
		});
		setCurrentRoster(newRoster);
		setOpenDropdown(null);
	};

	const getRosterPlayerForRole = (role) => {
		return currentRoster.find(p => p.role === role);
	};

	const getAvailablePlayersForRole = (role) => {
		// Get all roster players
		return roster.map(r => ({
			player_id: r.player_id,
			summoner_name: r.player?.summoner_name || 'Unknown',
			profile_icon_id: r.player?.profile_icon_id,
			role: r.role
		}));
	};

	// Get unique rosters from all scenarios
	const getUniqueRosters = () => {
		const allScenarios = [...blueScenarios, ...redScenarios];
		const rosterMap = new Map();

		allScenarios.forEach(scenario => {
			if (scenario.roster && scenario.roster.length === 5) {
				// Create a key from sorted player IDs
				const key = scenario.roster.map(p => p.player_id).sort().join(',');

				if (!rosterMap.has(key)) {
					rosterMap.set(key, {
						roster: scenario.roster,
						scenarioCount: 1
					});
				} else {
					rosterMap.get(key).scenarioCount++;
				}
			}
		});

		return Array.from(rosterMap.values()).map((config, idx) => ({
			...config,
			name: JUNGLE_MONSTERS[idx % JUNGLE_MONSTERS.length]
		}));
	};

	const isSameRoster = (roster1, roster2) => {
		if (!roster1 || !roster2 || roster1.length !== roster2.length) return false;
		const ids1 = roster1.map(p => p.player_id).sort();
		const ids2 = roster2.map(p => p.player_id).sort();
		return ids1.join(',') === ids2.join(',');
	};

	const switchToRoster = (newRoster) => {
		setCurrentRoster(newRoster);
	};

	const updateScenarioField = (field, value) => {
		if (!selectedScenario) return;
		setSelectedScenario({
			...selectedScenario,
			[field]: value
		});
	};

	const updateBan = (index, value) => {
		const newBans = [...selectedScenario.bans];
		newBans[index] = value;
		updateScenarioField('bans', newBans);
	};

	const updatePick = (index, value) => {
		const newPicks = [...selectedScenario.picks];
		newPicks[index] = value;
		updateScenarioField('picks', newPicks);
	};

	// Show loading skeleton
	if (rosterLoading || predictionsLoading || scenariosLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-pulse text-text-muted">
					Loading Draft Preparation...
				</div>
			</div>
		);
	}

	const currentScenarios = activeSide === 'blue' ? blueScenarios : redScenarios;

	return (
		<>
			{/* Background refresh indicator */}
			<RefreshIndicator isValidating={rosterValidating || scenariosValidating} />

			<div className="space-y-6">
			{/* Header */}
			<div className="card bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-xl font-bold text-text-primary mb-1">
							Draft Preparation
						</h2>
						<p className="text-text-secondary">
							Prepare your draft strategy for Blue and Red side
						</p>
					</div>
					<div className="flex items-center gap-3">
						{lastSaved && (
							<div className="text-sm text-text-muted flex items-center gap-2">
								<Check className="w-4 h-4 text-success" />
								Saved {new Date(lastSaved).toLocaleTimeString()}
							</div>
						)}
						<button
							onClick={saveScenario}
							disabled={saving || !selectedScenario}
							className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 flex items-center gap-2 disabled:opacity-50"
						>
							<Save className="w-4 h-4" />
							{saving ? 'Saving...' : 'Save Now'}
						</button>
					</div>
				</div>
			</div>

			{/* Roster Selection */}
			<div className={`card ${openDropdown ? 'relative z-50 overflow-visible' : ''}`}>
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						<Users className="w-5 h-5 text-primary" />
						<h3 className="text-lg font-bold text-text-primary">Current Roster</h3>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={loadPredictedRoster}
							disabled={lockedRoster !== null}
							className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-300 text-sm disabled:opacity-50"
						>
							Load Predicted
						</button>
						{lockedRoster ? (
							<button
								onClick={unlockRoster}
								className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-300 flex items-center gap-2"
							>
								<Unlock className="w-4 h-4" />
								Unlock
							</button>
						) : (
							<button
								onClick={lockRoster}
								disabled={currentRoster.length !== 5}
								className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
							>
								<Lock className="w-4 h-4" />
								Lock
							</button>
						)}
					</div>
				</div>

				{lockedRoster && (
					<div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
						<p className="text-sm text-yellow-200 flex items-center gap-2">
							<Lock className="w-4 h-4" />
							Roster is locked. Only scenarios with this roster will be shown.
						</p>
					</div>
				)}

				<div className={`grid grid-cols-5 gap-3 ${openDropdown ? 'relative z-[60]' : ''}`} ref={dropdownContainerRef}>
					{['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'].map((role) => {
						const player = getRosterPlayerForRole(role);
						const availablePlayers = getAvailablePlayersForRole(role);
						const isOpen = openDropdown === role;

						return (
							<div key={role} className="relative z-10">
								<button
									onClick={() => !lockedRoster && setOpenDropdown(isOpen ? null : role)}
									disabled={lockedRoster !== null}
									className={`w-full p-4 rounded-xl border-2 transition-all duration-300 ${
										lockedRoster
											? 'bg-slate-800/40 border-slate-700/50 cursor-not-allowed'
											: isOpen
											? 'bg-slate-700/50 border-cyan-500 shadow-lg shadow-cyan-500/20'
											: 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600 hover:bg-slate-700/30'
									}`}
								>
									{/* Role Icon */}
									<div className="flex items-center justify-center mb-3">
										<RoleIcon role={role} size={24} className="opacity-80" />
									</div>

									{/* Player Info */}
									{player ? (
										<div className="flex flex-col items-center">
											{/* Player Icon */}
											<div className="w-12 h-12 rounded-full overflow-hidden mb-2 border-2 border-slate-600">
												<img
													src={getSummonerIconUrl(player.profile_icon_id)}
													alt={player.summoner_name}
													className="w-full h-full object-cover"
													onError={handleSummonerIconError}
												/>
											</div>
											{/* Player Name */}
											<div className="text-sm text-white font-medium text-center truncate w-full">
												{player.summoner_name}
											</div>
										</div>
									) : (
										<div className="flex flex-col items-center">
											<div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mb-2">
												<Plus className="w-6 h-6 text-slate-500" />
											</div>
											<div className="text-sm text-slate-400">Select</div>
										</div>
									)}

									{!lockedRoster && (
										<div className="flex items-center justify-center mt-2">
											<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
										</div>
									)}
								</button>

								{/* Dropdown Menu */}
								{isOpen && !lockedRoster && (
									<div className="absolute left-0 top-full mt-2 w-full z-[100] bg-slate-800 border border-slate-700 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
										{availablePlayers.map((p) => (
											<button
												key={p.player_id}
												onClick={() => selectPlayerForRole(role, p)}
												className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-700 transition-colors text-left"
											>
												<div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-slate-600">
													<img
														src={getSummonerIconUrl(p.profile_icon_id)}
														alt={p.summoner_name}
														className="w-full h-full object-cover"
														onError={handleSummonerIconError}
													/>
												</div>
												<div className="flex-1">
													<div className="text-sm font-medium text-white">{p.summoner_name}</div>
													<div className="text-xs text-slate-400">{p.role === 'MIDDLE' ? 'Mid' : p.role === 'UTILITY' ? 'Support' : p.role.charAt(0) + p.role.slice(1).toLowerCase()}</div>
												</div>
											</button>
										))}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>

			{/* Roster Overview */}
			{getUniqueRosters().length > 1 && (
				<div className="card">
					<div className="flex items-center gap-3 mb-4">
						<Users className="w-5 h-5 text-primary" />
						<h3 className="text-lg font-bold text-text-primary">Roster Configurations</h3>
						<span className="text-sm text-slate-400">({getUniqueRosters().length} rosters in use)</span>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
						{getUniqueRosters().map((rosterConfig, idx) => {
							const isActive = isSameRoster(rosterConfig.roster, currentRoster);

							return (
								<button
									key={idx}
									onClick={() => !lockedRoster && switchToRoster(rosterConfig.roster)}
									disabled={lockedRoster !== null}
									className={`p-3 rounded-lg border-2 transition-all text-left ${
										lockedRoster
											? 'bg-slate-800/40 border-slate-700/50 cursor-not-allowed opacity-60'
											: isActive
											? 'bg-cyan-500/10 border-cyan-500 shadow-lg shadow-cyan-500/20'
											: 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600 hover:bg-slate-700/30'
									}`}
								>
									<div className="flex items-center justify-between mb-2">
										<span className="text-xs font-medium text-slate-400">
											{rosterConfig.name}
										</span>
										<span className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-300">
											{rosterConfig.scenarioCount} scenario{rosterConfig.scenarioCount !== 1 ? 's' : ''}
										</span>
									</div>

									<div className="flex items-center gap-1">
										{['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'].map((role) => {
											const player = rosterConfig.roster.find(p => p.role === role);

											return (
												<div key={role} className="flex flex-col items-center flex-1">
													<div className="w-8 h-8 rounded-full overflow-hidden border border-slate-600 mb-1">
														<img
															src={getSummonerIconUrl(player?.profile_icon_id)}
															alt={player?.summoner_name || 'Empty'}
															className="w-full h-full object-cover"
															onError={handleSummonerIconError}
														/>
													</div>
													<RoleIcon role={role} size={12} className="opacity-60" />
												</div>
											);
										})}
									</div>

									{isActive && (
										<div className="mt-2 flex items-center gap-1 text-xs text-cyan-400">
											<Check className="w-3 h-3" />
											Active
										</div>
									)}
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Side Selection */}
			<div className="flex justify-center">
				<div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 p-1.5 inline-flex gap-1">
					<button
						onClick={() => {
							setActiveSide('blue');
							const blueScen = blueScenarios[0];
							setSelectedScenario(blueScen || null);
						}}
						className={`px-8 py-3 rounded-lg transition-all duration-300 font-semibold ${
							activeSide === 'blue'
								? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
								: 'text-slate-400 hover:text-white hover:bg-slate-700/50'
						}`}
					>
						Blue Side
					</button>
					<button
						onClick={() => {
							setActiveSide('red');
							const redScen = redScenarios[0];
							setSelectedScenario(redScen || null);
						}}
						className={`px-8 py-3 rounded-lg transition-all duration-300 font-semibold ${
							activeSide === 'red'
								? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30'
								: 'text-slate-400 hover:text-white hover:bg-slate-700/50'
						}`}
					>
						Red Side
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				{/* Scenario List */}
				<div className="lg:col-span-1">
					<div className="card">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-bold text-text-primary">
								Scenarios
							</h3>
							<button
								onClick={createNewScenario}
								className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
							>
								<Plus className="w-4 h-4" />
							</button>
						</div>

						<div className="space-y-2">
							{currentScenarios.length === 0 ? (
								<p className="text-sm text-text-muted text-center py-8">
									No scenarios yet. Create one!
								</p>
							) : (
								currentScenarios.map((scenario) => (
									<div
										key={scenario.id}
										className={`p-3 rounded-lg border transition-all cursor-pointer ${
											selectedScenario?.id === scenario.id
												? 'bg-primary/10 border-primary/50 text-text-primary'
												: 'bg-surface-hover border-border/30 text-text-secondary hover:bg-surface'
										}`}
										onClick={() => setSelectedScenario(scenario)}
									>
										<div className="flex items-center justify-between">
											<span className="font-medium">{scenario.scenario_name}</span>
											<button
												onClick={(e) => {
													e.stopPropagation();
													handleDeleteScenario(scenario.id);
												}}
												className="p-1 text-error/60 hover:text-error hover:bg-error/10 rounded transition-colors"
											>
												<Trash2 className="w-3.5 h-3.5" />
											</button>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				</div>

				{/* Draft Planning */}
				{selectedScenario && (
					<div className="lg:col-span-3 space-y-6">
						{/* Scenario Name */}
						<div className="card">
							<label className="block text-sm font-medium text-text-muted mb-2">
								Scenario Name
							</label>
							<div className="flex items-center gap-2">
								<Edit2 className="w-4 h-4 text-text-muted" />
								<input
									type="text"
									value={selectedScenario.scenario_name}
									onChange={(e) => updateScenarioField('scenario_name', e.target.value)}
									className="flex-1 px-3 py-2 bg-surface border border-border/50 rounded-lg text-text-primary focus:border-primary focus:outline-none transition-colors"
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{/* Bans */}
							<div className="card">
								<h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
									<Ban className="w-5 h-5 text-error" />
									Bans (1-5)
								</h3>
								<div className="space-y-3">
									{[0, 1, 2, 3, 4].map((index) => (
										<div key={index}>
											<label className="block text-xs font-medium text-text-muted mb-1.5">
												Ban {index + 1} {index < 3 ? '(Phase 1)' : '(Phase 2)'}
											</label>
											<ChampionInput
												key={`${selectedScenario.id}-ban-${index}`}
												teamId={teamId}
												value={selectedScenario.bans[index]}
												onChange={(value) => updateBan(index, value)}
												placeholder={`Ban ${index + 1}`}
											/>
										</div>
									))}
								</div>
							</div>

							{/* Picks */}
							<div className="card">
								<h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
									<Target className="w-5 h-5 text-accent" />
									Picks (1-5) {activeSide === 'blue' ? '(First Pick)' : '(Counter Pick)'}
								</h3>
								<div className="space-y-3">
									{[0, 1, 2, 3, 4].map((index) => (
										<div key={index}>
											<label className="block text-xs font-medium text-text-muted mb-1.5">
												Pick {index + 1}
											</label>
											<ChampionInput
												key={`${selectedScenario.id}-pick-${index}`}
												teamId={teamId}
												value={selectedScenario.picks[index]}
												onChange={(value) => updatePick(index, value)}
												placeholder={`Pick ${index + 1}`}
											/>
										</div>
									))}
								</div>
							</div>
						</div>

						{/* Notes */}
						<div className="card">
							<h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
								<FileText className="w-5 h-5 text-primary" />
								Strategy Notes
							</h3>
							<textarea
								value={selectedScenario.notes}
								onChange={(e) => updateScenarioField('notes', e.target.value)}
								placeholder="Add your strategy notes here...&#10;&#10;Example:&#10;- Priority picks if available&#10;- Key matchups to avoid&#10;- Team composition goals"
								className="w-full h-48 px-4 py-3 bg-surface border border-border/50 rounded-lg text-text-primary placeholder-text-muted focus:border-primary focus:outline-none transition-colors resize-none font-mono text-sm"
							/>
						</div>
					</div>
				)}

				{!selectedScenario && currentScenarios.length === 0 && (
					<div className="lg:col-span-3">
						<div className="card text-center py-16">
							<p className="text-text-muted mb-4">
								No scenarios for {activeSide} side yet
							</p>
							<button
								onClick={createNewScenario}
								className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-lg shadow-blue-500/20 inline-flex items-center gap-2"
							>
								<Plus className="w-5 h-5" />
								Create First Scenario
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
		</>
	);
};

export default GamePrepTab;
