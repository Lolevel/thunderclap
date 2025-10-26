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
	ChevronDown
} from 'lucide-react';
import api from '../config/api';
import ChampionInput from './ChampionInput';
import RoleIcon from './RoleIcon';
import { getSummonerIconUrl, handleSummonerIconError } from '../utils/summonerHelper';

const GamePrepTab = ({ teamId }) => {
	const [activeSide, setActiveSide] = useState('blue'); // 'blue' or 'red'
	const [blueScenarios, setBlueScenarios] = useState([]);
	const [redScenarios, setRedScenarios] = useState([]);
	const [selectedScenario, setSelectedScenario] = useState(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [lastSaved, setLastSaved] = useState(null);
	const [autoSaveTimer, setAutoSaveTimer] = useState(null);

	// Roster management
	const [roster, setRoster] = useState([]);
	const [predictions, setPredictions] = useState(null);
	const [currentRoster, setCurrentRoster] = useState([]);
	const [lockedRoster, setLockedRoster] = useState(null);
	const [openDropdown, setOpenDropdown] = useState(null); // Track which role dropdown is open
	const dropdownRef = useRef(null);

	useEffect(() => {
		loadRosterAndPredictions();
		loadScenarios();
	}, [teamId]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setOpenDropdown(null);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const loadRosterAndPredictions = async () => {
		try {
			const [rosterRes, predictionRes] = await Promise.all([
				api.get(`/teams/${teamId}/roster`),
				api.get(`/teams/${teamId}/roster/predictions`)
			]);

			setRoster(rosterRes.data.roster || []);
			setPredictions(predictionRes.data.predictions);

			// Set predicted roster as default if available
			if (predictionRes.data.predictions && predictionRes.data.predictions.length > 0) {
				const predictedLineup = predictionRes.data.predictions[0].predicted_lineup;
				const defaultRoster = Object.entries(predictedLineup).map(([role, playerData]) => ({
					player_id: playerData.player_id,
					summoner_name: playerData.player_name,
					role: role
				}));
				setCurrentRoster(defaultRoster);
			}
		} catch (error) {
			console.error('Failed to load roster and predictions:', error);
		}
	};

	const loadScenarios = async () => {
		try {
			setLoading(true);
			const response = await api.get(`/teams/${teamId}/draft-scenarios`);
			setBlueScenarios(response.data.blue_scenarios || []);
			setRedScenarios(response.data.red_scenarios || []);
			setLockedRoster(response.data.locked_roster || null);

			// Auto-select first scenario of active side
			const scenarios = activeSide === 'blue' ? response.data.blue_scenarios : response.data.red_scenarios;
			if (scenarios && scenarios.length > 0) {
				setSelectedScenario(scenarios[0]);
				// Update current roster from selected scenario
				if (scenarios[0].roster && scenarios[0].roster.length > 0) {
					setCurrentRoster(scenarios[0].roster);
				}
			}
		} catch (error) {
			console.error('Failed to load draft scenarios:', error);
		} finally {
			setLoading(false);
		}
	};

	const createNewScenario = async () => {
		try {
			const scenarios = activeSide === 'blue' ? blueScenarios : redScenarios;
			const scenarioName = `Scenario ${scenarios.length + 1}`;

			const response = await api.post(`/teams/${teamId}/draft-scenarios`, {
				scenario_name: scenarioName,
				side: activeSide,
				roster: currentRoster,
				bans: ['', '', '', '', ''],
				picks: ['', '', '', '', ''],
				notes: ''
			});

			const newScenario = response.data;

			if (activeSide === 'blue') {
				setBlueScenarios([...blueScenarios, newScenario]);
			} else {
				setRedScenarios([...redScenarios, newScenario]);
			}

			setSelectedScenario(newScenario);
		} catch (error) {
			console.error('Failed to create scenario:', error);
		}
	};

	const deleteScenario = async (scenarioId) => {
		if (!confirm('Are you sure you want to delete this scenario?')) return;

		try {
			await api.delete(`/teams/${teamId}/draft-scenarios/${scenarioId}`);

			if (activeSide === 'blue') {
				const updated = blueScenarios.filter(s => s.id !== scenarioId);
				setBlueScenarios(updated);
				setSelectedScenario(updated.length > 0 ? updated[0] : null);
			} else {
				const updated = redScenarios.filter(s => s.id !== scenarioId);
				setRedScenarios(updated);
				setSelectedScenario(updated.length > 0 ? updated[0] : null);
			}
		} catch (error) {
			console.error('Failed to delete scenario:', error);
		}
	};

	const saveScenario = async () => {
		if (!selectedScenario) return;

		try {
			setSaving(true);
			const response = await api.put(`/teams/${teamId}/draft-scenarios/${selectedScenario.id}`, {
				scenario_name: selectedScenario.scenario_name,
				roster: currentRoster,
				bans: selectedScenario.bans,
				picks: selectedScenario.picks,
				notes: selectedScenario.notes
			});

			setLastSaved(new Date(response.data.updated_at));

			// Update in list
			if (activeSide === 'blue') {
				setBlueScenarios(blueScenarios.map(s => s.id === selectedScenario.id ? response.data : s));
			} else {
				setRedScenarios(redScenarios.map(s => s.id === selectedScenario.id ? response.data : s));
			}
		} catch (error) {
			console.error('Failed to save scenario:', error);
		} finally {
			setSaving(false);
		}
	};

	// Auto-save with 2 second debounce
	const triggerAutoSave = () => {
		if (autoSaveTimer) {
			clearTimeout(autoSaveTimer);
		}

		const timer = setTimeout(() => {
			saveScenario();
		}, 2000);

		setAutoSaveTimer(timer);
	};

	useEffect(() => {
		if (selectedScenario && !loading) {
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
			await api.post(`/teams/${teamId}/roster/lock`, {
				roster: currentRoster
			});
			setLockedRoster(currentRoster);
			await loadScenarios();
		} catch (error) {
			console.error('Failed to lock roster:', error);
		}
	};

	const unlockRoster = async () => {
		try {
			await api.delete(`/teams/${teamId}/roster/lock`);
			setLockedRoster(null);
			await loadScenarios();
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

		return Array.from(rosterMap.values());
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

	if (loading) {
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
			<div className="card">
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

				<div className="grid grid-cols-5 gap-3">
					{['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'].map((role) => {
						const player = getRosterPlayerForRole(role);
						const availablePlayers = getAvailablePlayersForRole(role);
						const isOpen = openDropdown === role;

						return (
							<div key={role} className="relative" ref={isOpen ? dropdownRef : null}>
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
									<div className="absolute z-[100] w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
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
											Roster {idx + 1}
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
													deleteScenario(scenario.id);
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
	);
};

export default GamePrepTab;
