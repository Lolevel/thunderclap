import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import {
	Users,
	TrendingUp,
	Target,
	FileText,
	ArrowLeft,
	RefreshCw,
	History,
	Trash2,
	Clipboard,
	AlertCircle,
} from 'lucide-react';
import { useTeamRoster, useTeamOverview } from '../hooks/api/useTeam';
import { useTeamFullData } from '../hooks/api/useTeamFullData';
import { useLineupPrediction } from '../hooks/api/useDraft';
import {
	useAddPlayer,
	useRemovePlayer,
	useSyncRoster,
	useDeleteTeam,
	useRefreshTeamData,
} from '../hooks/api/useTeamMutations';
import { cacheKeys, getTeamRelatedKeys } from '../lib/cacheKeys';
import TeamOverviewTab from '../components/TeamOverviewTab';
import ChampionPoolTab from '../components/ChampionPoolTab';
import InDepthStatsTab from '../components/InDepthStatsTab';
import PlayersTab from '../components/PlayersTab';
import MatchHistoryTab from '../components/MatchHistoryTab';
import GamePrepTab from '../components/GamePrepTab';
import { useToast } from '../components/ToastContainer';
import TeamLogo from '../components/TeamLogo';
import { triggerTeamRefresh } from '../lib/api';
import { useTeamSocket } from '../hooks/useTeamSocket';
import { useImportTracking } from '../contexts/ImportContext';

const TeamDetail = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const toast = useToast();
	const { isImportingTeam, clearImportingTeam } = useImportTracking();

	// OPTIMIZED: Fetch ALL team data in one request!
	const {
		fullData,
		overview,
		roster: rosterData,
		championPools,
		draftAnalysis,
		scoutingReport,
		matches,
		isLoading: fullDataLoading,
		isValidating: fullDataValidating,
		refresh: refreshFullData,
	} = useTeamFullData(id);

	// Fetch team basic info (still needed for team metadata)
	const { data: team, error: teamError, isLoading: teamLoading } = useSWR(
		id ? cacheKeys.team(id) : null
	);

	// Extract roster from full data
	const roster = rosterData?.roster || [];
	const rosterLoading = fullDataLoading;
	const rosterValidating = fullDataValidating;
	const refreshRoster = refreshFullData; // Use full data refresh for roster

	// Fetch lineup predictions
	const { prediction: predictions } = useLineupPrediction(id);

	// REMOVED: useTeamDataPrefetch - redundant since useTeamFullData already fetches all data
	// const prefetchStatus = useTeamDataPrefetch(id, !teamLoading && !teamError);

	// Mutation hooks
	const { addPlayer } = useAddPlayer(id);
	const { removePlayer } = useRemovePlayer(id);
	const { syncRoster } = useSyncRoster(id);
	const { deleteTeam } = useDeleteTeam();
	const { refreshTeamData } = useRefreshTeamData(id);

	const [activeTab, setActiveTab] = useState('overview');
	const [refreshing, setRefreshing] = useState(false);
	const [refreshStatus, setRefreshStatus] = useState(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deletingTeam, setDeletingTeam] = useState(false);
	const [deletePlayersOption, setDeletePlayersOption] = useState(false);
	const eventSourceRef = useRef(null);

	// WebSocket integration for live refresh sync across all clients
	useTeamSocket({
		// Team Import events (for when someone else imports a team)
		onTeamImportStarted: (data) => {
			console.log('[TeamDetail] Team import started:', data);
			toast.info(`${data.team_name} wird importiert...`, 3000);
		},
		onTeamImportCompleted: (data) => {
			console.log('[TeamDetail] Team import completed:', data);

			// Show clickable toast
			toast.success(
				<div
					className="flex items-center gap-3 cursor-pointer"
					onClick={() => navigate(`/teams/${data.team_id}`)}
				>
					<span className="text-sm">{data.message}</span>
					<span className="text-cyan-400 text-xs">→ Zum Team</span>
				</div>,
				8000
			);
		},
		onTeamImportFailed: (data) => {
			console.error('[TeamDetail] Team import failed:', data);
			toast.error(`Import fehlgeschlagen: ${data.error}`);
		},
		// Team Refresh events
		onTeamRefreshStarted: (data) => {
			if (data.team_id === id) {
				console.log('[TeamDetail] Refresh started (WebSocket):', data);
				setRefreshing(true);
				setRefreshStatus({
					status: 'running',
					phase: 'collecting_matches',
					progress_percent: 0,
					is_rate_limited: false,
				});
			}
		},
		onTeamRefreshProgress: (data) => {
			if (data.team_id === id) {
				console.log('[TeamDetail] Refresh progress (WebSocket):', data);
				setRefreshStatus({
					status: data.status,
					phase: data.phase,
					progress_percent: data.progress_percent,
					is_rate_limited: data.is_rate_limited || false,
				});
			}
		},
		onTeamRefreshCompleted: (data) => {
			if (data.team_id === id) {
				console.log('[TeamDetail] Refresh completed (WebSocket):', data);

				// Close SSE if it's still open
				if (eventSourceRef.current) {
					eventSourceRef.current.close();
					eventSourceRef.current = null;
				}

				setRefreshStatus({
					status: 'completed',
					phase: 'completed',
					progress_percent: 100,
					is_rate_limited: false,
				});

				// Invalidate all team-related caches and refetch
				console.log('🔄 Invalidating caches and refetching fresh data...');
				const keysToInvalidate = getTeamRelatedKeys(id);
				keysToInvalidate.forEach(key => {
					mutate(key);
				});

				toast.success('Teamdaten erfolgreich aktualisiert!');

				setTimeout(() => {
					setRefreshing(false);
					setRefreshStatus({
						status: 'idle',
						phase: 'idle',
						progress_percent: 0,
						is_rate_limited: false,
					});
				}, 1500);
			}
		},
		onTeamRefreshFailed: (data) => {
			if (data.team_id === id) {
				console.error('[TeamDetail] Refresh failed (WebSocket):', data);

				// Close SSE if it's still open
				if (eventSourceRef.current) {
					eventSourceRef.current.close();
					eventSourceRef.current = null;
				}

				setRefreshing(false);
				setRefreshStatus(null);
				toast.error(`Fehler: ${data.error}`, 5000);
			}
		},
	}, id); // Pass team ID to join team-specific room

	const handleAddPlayer = async (opggUrl) => {
		await addPlayer(opggUrl);
	};

	const handleSyncRoster = async (opggUrl) => {
		return await syncRoster(opggUrl);
	};

	const handleRemovePlayer = async (playerId, deleteFromDb = false) => {
		await removePlayer(playerId, deleteFromDb);
	};

	// REMOVED: useTeamRefreshStatus polling - we use SSE from RefreshProgressModal instead
	// This prevents duplicate onComplete calls and toast spam

	// Check on mount if a refresh is already running
	useEffect(() => {
		const checkInitialStatus = async () => {
			try {
				const { getTeamRefreshStatus } = await import('../lib/api');
				const response = await getTeamRefreshStatus(id);
				const status = response.data;
				console.log('📋 Initial refresh status:', status.status);

				if (status.status === 'running') {
					console.log('🔄 Refresh already running, starting to poll...');
					setRefreshing(true);
					setRefreshStatus(status);
				}
			} catch (error) {
				console.error('Failed to check initial status:', error);
			}
		};

		checkInitialStatus();
	}, [id]);

	// SSE connection for refresh progress
	useEffect(() => {
		if (!refreshing || !id) return;

		// Prevent multiple connections
		if (eventSourceRef.current) {
			console.log('SSE already connected, skipping...');
			return;
		}

		const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
		const cleanBaseURL = baseURL.replace(/\/api\/?$/, '');
		const accessToken = localStorage.getItem('access_token') || import.meta.env.VITE_ACCESS_TOKEN;
		const eventSourceUrl = `${cleanBaseURL}/api/teams/${id}/progress-stream?token=${accessToken}`;

		console.log('🔌 Opening SSE connection to:', eventSourceUrl);
		const eventSource = new EventSource(eventSourceUrl);
		eventSourceRef.current = eventSource;

		eventSource.onopen = () => {
			console.log('✅ SSE connection opened');
		};

		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				console.log('📊 Progress update:', data);

				if (data.type === 'progress') {
					setRefreshStatus((prev) => {
						const newProgress = data.data.progress_percent || 0;
						// Never go backwards - keep max progress
						const progressToShow = prev?.progress_percent ? Math.max(prev.progress_percent, newProgress) : newProgress;

						return {
							status: 'running',
							phase: data.data.step || 'processing',
							progress_percent: progressToShow,
							is_rate_limited: data.data.is_rate_limited || false,
							wait_seconds: data.data.wait_seconds || 0,
						};
					});
				} else if (data.type === 'rate_limit') {
					setRefreshStatus((prev) => ({
						status: 'running',
						phase: 'rate_limit',
						progress_percent: prev?.progress_percent || 0,
						is_rate_limited: true,
						wait_seconds: data.wait_seconds,
					}));

					setTimeout(() => {
						setRefreshStatus((prev) => ({
							...prev,
							is_rate_limited: false,
						}));
					}, data.wait_seconds * 1000);
				} else if (data.type === 'complete') {
					console.log('✅ Team data refresh completed!');
					eventSource.close();
					eventSourceRef.current = null;

					// Show 100% completion briefly
					setRefreshStatus({
						status: 'completed',
						phase: 'completed',
						progress_percent: 100,
						is_rate_limited: false,
					});

					// Invalidate all team-related caches and refetch
					console.log('🔄 Invalidating caches and refetching fresh data...');
					const keysToInvalidate = getTeamRelatedKeys(id);

					// Invalidate all related caches
					keysToInvalidate.forEach(key => {
						mutate(key);
					});

					// Show success toast
					toast.success('Teamdaten erfolgreich aktualisiert!');

					// Reset refresh state after a brief delay
					setTimeout(() => {
						setRefreshing(false);
						setRefreshStatus({
							status: 'idle',
							phase: 'idle',
							progress_percent: 0,
							is_rate_limited: false,
						});
					}, 1500);
				} else if (data.type === 'background_complete') {
					console.log('✅ Background tasks completed!');
					eventSource.close();
					eventSourceRef.current = null;

					// Show 100% completion briefly
					setRefreshStatus({
						status: 'completed',
						phase: 'completed',
						progress_percent: 100,
						is_rate_limited: false,
					});

					// Reload immediately to show fresh data
					console.log('🔄 Reloading page to fetch fresh data...');
					window.location.reload();
				} else if (data.type === 'error') {
					const errorMsg = data.data?.message || data.message || 'Unbekannter Fehler';
					console.error('❌ Refresh failed:', errorMsg);
					eventSource.close();
					eventSourceRef.current = null;
					setRefreshing(false);
					setRefreshStatus(null);
					toast.error(`Fehler: ${errorMsg}`, 5000);
				}
			} catch (err) {
				console.error('Failed to parse SSE data:', err);
			}
		};

		eventSource.onerror = (err) => {
			console.error('❌ SSE connection error:', err);

			// Check if the connection is in CLOSED state (not just reconnecting)
			if (eventSource.readyState === EventSource.CLOSED) {
				console.error('SSE connection permanently closed, starting polling fallback');
				eventSource.close();
				eventSourceRef.current = null;

				// DON'T set refreshing to false - let polling fallback take over
				// Just indicate that we're now polling
				console.log('📡 Switching to REST API polling fallback...');
			} else {
				// Connection is just reconnecting, don't close it
				console.log('SSE connection reconnecting...');
			}
		};

		return () => {
			console.log('🧹 Cleaning up SSE connection');
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
				eventSourceRef.current = null;
			}
		};
	}, [refreshing, id]);

	// Polling fallback: If SSE is not connected but refresh is running, poll status via REST API
	useEffect(() => {
		if (!refreshing || !id) return;

		// Only start polling if SSE is NOT connected
		if (eventSourceRef.current) return;

		console.log('🔄 Starting REST API polling fallback (SSE not available)');

		const pollInterval = setInterval(async () => {
			try {
				const { getTeamRefreshStatus } = await import('../lib/api');
				const response = await getTeamRefreshStatus(id);
				const status = response.data;

				console.log('📊 Polled status:', status.status, status.phase, status.progress_percent + '%');

				// Update UI with polled status
				if (status.status === 'running') {
					setRefreshStatus({
						status: status.status,
						phase: status.phase || 'processing',
						progress_percent: status.progress_percent || 0,
						is_rate_limited: status.phase?.startsWith('rate_limited_') || false,
					});
				} else if (status.status === 'completed') {
					console.log('✅ Refresh completed (detected via polling)');

					// Show 100% completion briefly
					setRefreshStatus({
						status: 'completed',
						phase: 'completed',
						progress_percent: 100,
						is_rate_limited: false,
					});

					// Stop polling
					clearInterval(pollInterval);

					// Invalidate all team-related caches and refetch
					console.log('🔄 Invalidating caches and refetching fresh data...');
					const keysToInvalidate = getTeamRelatedKeys(id);

					// Invalidate all related caches
					keysToInvalidate.forEach(key => {
						mutate(key);
					});

					// Show success toast
					toast.success('Teamdaten erfolgreich aktualisiert!');

					// Reset refresh state after a brief delay
					setTimeout(() => {
						setRefreshing(false);
						setRefreshStatus({
							status: 'idle',
							phase: 'idle',
							progress_percent: 0,
							is_rate_limited: false,
						});
					}, 1500);
				} else if (status.status === 'failed') {
					console.error('❌ Refresh failed (detected via polling)');
					setRefreshing(false);
					setRefreshStatus(null);
					clearInterval(pollInterval);
					toast.error('Daten-Refresh fehlgeschlagen', 5000);
				}
			} catch (error) {
				console.error('Failed to poll refresh status:', error);
			}
		}, 3000); // Poll every 3 seconds

		return () => {
			console.log('🧹 Stopping polling fallback');
			clearInterval(pollInterval);
		};
	}, [refreshing, id]);

	const handleRefreshData = async () => {
		try {
			console.log('🚀 Starting refresh...');

			// Start SSE connection immediately
			setRefreshing(true);
			setRefreshStatus({
				status: 'starting',
				phase: 'starting',
				progress_percent: 0,
				is_rate_limited: false,
			});

			// Trigger the refresh on the backend (this starts the background thread)
			await triggerTeamRefresh(id);
			console.log('✅ Refresh triggered, SSE will receive updates');
		} catch (error) {
			console.error('Failed to trigger refresh:', error);
			toast.error('Fehler beim Starten des Refresh', 5000);
			setRefreshing(false);
			setRefreshStatus(null);
		}
	};

	const handleDeleteTeam = async () => {
		setDeletingTeam(true);
		try {
			const response = await deleteTeam(id, deletePlayersOption);
			toast.success(
				`Team "${response.team_name}" wurde gelöscht. ${
					response.players_deleted > 0
						? `${response.players_deleted} Spieler ebenfalls gelöscht.`
						: 'Spieler blieben in der Datenbank.'
				}`,
				8000
			);
			navigate('/teams');
		} catch (error) {
			console.error('Failed to delete team:', error);
			toast.error('Fehler beim Löschen des Teams', 5000);
		} finally {
			setDeletingTeam(false);
			setShowDeleteModal(false);
		}
	};

	// Loading state
	if (teamLoading || rosterLoading) {
		return (
			<div className="flex items-center justify-center flex-1">
				<div className="animate-pulse text-slate-400">Lädt...</div>
			</div>
		);
	}

	// Error state
	if (teamError || !team) {
		return (
			<div className="p-6">
				<div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 text-center py-12">
					<AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
					<p className="text-slate-400">Team nicht gefunden</p>
				</div>
			</div>
		);
	}

	return (
		<div className="p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-4 md:space-y-8 animate-fade-in">
				<Link
					to="/teams"
					className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors text-sm md:text-base">
					<ArrowLeft className="w-3 h-3 md:w-4 md:h-4" />
					<span className="hidden sm:inline">Zurück zu Teams</span>
					<span className="sm:hidden">Zurück</span>
				</Link>

				{/* Team Header */}
				<div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 p-4 md:p-6 transition-all duration-500 ease-in-out">
					<div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 transition-all duration-500 ease-in-out">
						{/* Logo + Team Info */}
						<div className="flex items-center gap-4 md:gap-6 flex-1">
							<TeamLogo
								logoUrl={team.logo_url}
								teamName={team.name}
								size="md"
								className="shadow-lg shadow-blue-500/20 w-16 h-16 md:w-20 md:h-20"
							/>
							<div className="flex-1 min-w-0 flex flex-col justify-center transition-all duration-500 ease-in-out">
								{/* Name and Tag - Centered */}
								<div className="flex flex-col justify-center flex-1">
									<h1 className="text-xl md:text-3xl font-bold text-white mb-1 truncate">
										{team.name}
									</h1>
									<p className="text-slate-400 text-sm md:text-lg truncate">{team.tag}</p>
								</div>

								{/* Progress Bar - Below name/tag */}
								{refreshing && refreshStatus && (refreshStatus.status === 'running' || refreshStatus.status === 'completed') && (
									<div className="mt-3 md:mt-4 overflow-hidden transition-all duration-500 ease-in-out animate-slide-down">
										<div className="flex items-center gap-2 mb-1.5">
											{/* Phase Description */}
											<span className={`text-xs font-medium truncate ${
												refreshStatus.phase === 'completed'
													? 'text-green-400'
													: (refreshStatus.is_rate_limited || refreshStatus.phase?.startsWith('rate_limited_'))
													? 'text-yellow-400'
													: 'text-cyan-400'
											}`}>
												{(() => {
													const phase = refreshStatus.phase || '';

													// Completed
													if (phase === 'completed') {
														return '✅ Aktualisierung abgeschlossen!';
													}

													// Rate limit waiting (check both is_rate_limited flag and phase name)
													if (refreshStatus.is_rate_limited || phase.startsWith('rate_limited_')) {
														const waitTime = refreshStatus.wait_seconds ||
															phase.match(/rate_limited_(\d+)s/)?.[1] || '?';
														return `⏳ Riot API Rate Limit - Warte ${waitTime}s...`;
													}

													// Normal phases
													switch (phase) {
														case 'collecting_matches': return '📋 Match-IDs von Riot API sammeln';
														case 'filtering_matches': return '🔍 Prüfe welche Matches neu sind';
														case 'fetching_matches': return '📥 Lade neue Matches von Riot API';
														case 'linking_data': return '🔗 Verknüpfe Spieler mit Matches';
														case 'calculating_stats': return '📊 Berechne Team-Statistiken';
														case 'updating_ranks': return '🏆 Aktualisiere Ränge & Summoner-Namen';
														case 'player_details': return '👤 Lade individuelle Spieler-Details';
														case 'connecting': return '🔌 Verbinde...';
														case 'processing': return '⚙️ Verarbeite Daten...';
														default: return `⚙️ ${phase}`;
													}
												})()}
											</span>

											{/* Progress Percentage */}
											<span className="text-xs text-slate-400 font-mono flex-shrink-0">
												{refreshStatus.progress_percent}%
											</span>
										</div>

										{/* Progress Bar */}
										<div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden shadow-inner">
											<div
												className={`h-2 rounded-full transition-all duration-500 ease-out ${
													refreshStatus.phase === 'completed'
														? 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600'
														: (refreshStatus.is_rate_limited || refreshStatus.phase?.startsWith('rate_limited_'))
														? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 animate-pulse'
														: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-600'
												}`}
												style={{ width: `${refreshStatus.progress_percent}%` }}
											/>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex gap-2 md:gap-3 w-full md:w-auto">
							<button
								onClick={handleRefreshData}
								disabled={refreshing}
								className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 flex items-center justify-center gap-2 cursor-pointer text-sm md:text-base">
								<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
								<span className="hidden sm:inline">{refreshing ? 'Aktualisiere...' : 'Daten aktualisieren'}</span>
								<span className="sm:hidden">Refresh</span>
							</button>
							<button
								onClick={() => setShowDeleteModal(true)}
								className="px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer text-sm md:text-base">
								<Trash2 className="w-4 h-4" />
								<span className="hidden md:inline">Team löschen</span>
							</button>
						</div>
					</div>
				</div>

				{/* Tabs - Full width icons on mobile, normal tabs on desktop */}
				<div className="border-b border-slate-700/50 -mx-3 sm:-mx-4 md:mx-0">
					{/* Mobile: Icon-only tabs spanning full width */}
					<nav className="sm:hidden flex justify-around">
						{[
							{
								id: 'overview',
								label: 'Übersicht',
								icon: TrendingUp,
							},
							{ id: 'players', label: 'Spieler', icon: Users },
							{ id: 'matches', label: 'Match History', icon: History },
							{ id: 'drafts', label: 'Champion Pool', icon: Target },
							{
								id: 'report',
								label: 'In-Depth Stats',
								icon: FileText,
							},
							{
								id: 'gameprep',
								label: 'Game Prep',
								icon: Clipboard,
							},
						].map((tab) => {
							const Icon = tab.icon;
							return (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`
										flex-1 flex flex-col items-center justify-center py-3 border-b-2 transition-colors duration-300 cursor-pointer
										${
											activeTab === tab.id
												? 'border-cyan-400 text-cyan-400'
												: 'border-transparent text-slate-400 hover:text-white'
										}
									`}>
									<Icon className={`w-5 h-5 ${activeTab === tab.id ? 'scale-110' : ''} transition-transform`} />
								</button>
							);
						})}
					</nav>

					{/* Tablet+: Normal tabs with text */}
					<nav className="hidden sm:flex gap-2 md:gap-6 px-3 sm:px-4 md:px-0">
						{[
							{
								id: 'overview',
								label: 'Übersicht',
								icon: TrendingUp,
							},
							{ id: 'players', label: 'Spieler', icon: Users },
							{ id: 'matches', label: 'Match History', icon: History },
							{ id: 'drafts', label: 'Champion Pool', icon: Target },
							{
								id: 'report',
								label: 'In-Depth Stats',
								icon: FileText,
							},
							{
								id: 'gameprep',
								label: 'Game Prep',
								icon: Clipboard,
							},
						].map((tab) => {
							const Icon = tab.icon;
							return (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`
										flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 border-b-2 transition-colors duration-300 cursor-pointer whitespace-nowrap text-sm md:text-base
										${
											activeTab === tab.id
												? 'border-cyan-400 text-cyan-400'
												: 'border-transparent text-slate-400 hover:text-white'
										}
									`}>
									<Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
									{tab.label}
								</button>
							);
						})}
					</nav>
				</div>

				{/* Tab Content */}
				<div>
					{activeTab === 'overview' && (
						<TeamOverviewTab
							teamId={id}
							preloadedData={overview}
						/>
					)}

					{activeTab === 'players' && (
						<PlayersTab
							roster={roster}
							teamId={id}
							predictions={predictions}
							onRefresh={refreshRoster}
							onRemovePlayer={handleRemovePlayer}
							onAddPlayer={handleAddPlayer}
							onSyncRoster={handleSyncRoster}
						/>
					)}

					{activeTab === 'matches' && (
						<MatchHistoryTab
							teamId={id}
							preloadedData={matches}
						/>
					)}

					{activeTab === 'drafts' && (
						<ChampionPoolTab
							teamId={id}
							predictions={predictions}
							preloadedData={{
								championPools,
								draftAnalysis
							}}
						/>
					)}

					{activeTab === 'report' && (
						<InDepthStatsTab
							teamId={id}
							preloadedData={scoutingReport}
						/>
					)}

					{activeTab === 'gameprep' && (
						<GamePrepTab teamId={id} team={team} roster={roster} predictions={predictions} />
					)}
				</div>

				{/* Delete Confirmation Modal */}
				{showDeleteModal && (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
						<div className="rounded-xl bg-slate-800/90 backdrop-blur border border-slate-700/50 p-6 max-w-md w-full">
							<h3 className="text-xl font-bold text-white mb-4">
								Team "{team.name}" löschen?
							</h3>
							<p className="text-slate-300 mb-6">
								Diese Aktion kann nicht rückgängig gemacht werden. Alle Team-Daten,
								Roster-Einträge und Match-Verknüpfungen werden gelöscht.
							</p>

							{/* Checkbox for deleting players */}
							<div className="mb-6 p-4 bg-slate-700/30 rounded-lg">
								<label className="flex items-start gap-3 cursor-pointer">
									<input
										type="checkbox"
										checked={deletePlayersOption}
										onChange={(e) => setDeletePlayersOption(e.target.checked)}
										className="mt-1 w-4 h-4 text-red-600 bg-slate-700 border-slate-600 rounded focus:ring-red-500"
									/>
									<div className="flex-1">
										<p className="text-white font-semibold mb-1">
											Spieler aus Datenbank löschen
										</p>
										<p className="text-sm text-slate-400">
											Wenn aktiviert, werden auch alle {roster.length} Spieler dieses
											Teams aus der Datenbank gelöscht (inkl. Match-Daten und
											Statistiken). Wenn nicht aktiviert, bleiben die Spieler in der
											Datenbank.
										</p>
									</div>
								</label>
							</div>

							<div className="flex gap-3">
								<button
									onClick={() => {
										setShowDeleteModal(false);
										setDeletePlayersOption(false);
									}}
									className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-300 cursor-pointer"
									disabled={deletingTeam}>
									Abbrechen
								</button>
								<button
									onClick={handleDeleteTeam}
									className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
									disabled={deletingTeam}>
									{deletingTeam ? (
										<>
											<RefreshCw className="w-4 h-4 animate-spin" />
											Lösche...
										</>
									) : (
										<>
											<Trash2 className="w-4 h-4" />
											Team löschen
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default TeamDetail;
