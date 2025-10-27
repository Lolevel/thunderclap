import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
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
import { useLineupPrediction } from '../hooks/api/useDraft';
import {
	useAddPlayer,
	useRemovePlayer,
	useSyncRoster,
	useDeleteTeam,
	useRefreshTeamData,
} from '../hooks/api/useTeamMutations';
import { cacheKeys } from '../lib/cacheKeys';
import { useTeamDataPrefetch } from '../hooks/useTeamDataPrefetch';
import TeamOverviewTab from '../components/TeamOverviewTab';
import ChampionPoolTab from '../components/ChampionPoolTab';
import InDepthStatsTab from '../components/InDepthStatsTab';
import PlayersTab from '../components/PlayersTab';
import MatchHistoryTab from '../components/MatchHistoryTab';
import GamePrepTab from '../components/GamePrepTab';
import RefreshProgressModal from '../components/RefreshProgressModal';
import { RefreshIndicator } from '../components/ui/RefreshIndicator';
import { PrefetchIndicator } from '../components/ui/PrefetchIndicator';
import { useToast } from '../components/ToastContainer';

const TeamDetail = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const toast = useToast();

	// Fetch team basic info
	const { data: team, error: teamError, isLoading: teamLoading } = useSWR(
		id ? cacheKeys.team(id) : null
	);

	// Fetch roster with SWR
	const { roster, isLoading: rosterLoading, isValidating: rosterValidating, refresh: refreshRoster } = useTeamRoster(id);

	// Fetch lineup predictions
	const { prediction: predictions } = useLineupPrediction(id);

	// Prefetch data for all tabs sequentially (runs in background, one after another)
	// This prevents lag while ensuring all data is ready when switching tabs
	const prefetchStatus = useTeamDataPrefetch(id, !teamLoading && !teamError);

	// Mutation hooks
	const { addPlayer } = useAddPlayer(id);
	const { removePlayer } = useRemovePlayer(id);
	const { syncRoster } = useSyncRoster(id);
	const { deleteTeam } = useDeleteTeam();
	const { refreshTeamData } = useRefreshTeamData(id);

	const [activeTab, setActiveTab] = useState('overview');
	const [refreshing, setRefreshing] = useState(false);
	const [showProgressModal, setShowProgressModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deletingTeam, setDeletingTeam] = useState(false);
	const [deletePlayersOption, setDeletePlayersOption] = useState(false);

	const handleAddPlayer = async (opggUrl) => {
		await addPlayer(opggUrl);
	};

	const handleSyncRoster = async (opggUrl) => {
		return await syncRoster(opggUrl);
	};

	const handleRemovePlayer = async (playerId, deleteFromDb = false) => {
		await removePlayer(playerId, deleteFromDb);
	};

	const handleRefreshData = () => {
		setRefreshing(true);
		setShowProgressModal(true);
	};

	const handleRefreshComplete = async (data) => {
		setShowProgressModal(false);
		setRefreshing(false);

		// Show success toast
		toast.success(
			`Erfolgreich aktualisiert! ${data.matches_fetched + data.matches_linked} Matches, ${data.champions_updated} Champions`,
			8000
		);

		// Refresh all team data
		await refreshTeamData();
	};

	const handleRefreshError = (errorMessage) => {
		setShowProgressModal(false);
		setRefreshing(false);

		// Show error toast
		toast.error(`Fehler beim Aktualisieren: ${errorMessage}`, 8000);
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
		<div className="p-6">
			{/* Background refresh indicator */}
			<RefreshIndicator isValidating={rosterValidating} />

			{/* Background prefetch indicator */}
			<PrefetchIndicator prefetchStatus={prefetchStatus} />

			<div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
				<Link
					to="/teams"
					className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors">
					<ArrowLeft className="w-4 h-4" />
					Zurück zu Teams
				</Link>

				{/* Team Header */}
				<div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 p-6">
					<div className="flex items-center gap-6">
						<div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
							<span className="text-white font-bold text-3xl">
								{team.name.charAt(0).toUpperCase()}
							</span>
						</div>
						<div className="flex-1">
							<h1 className="text-3xl font-bold text-white mb-1">
								{team.name}
							</h1>
							<p className="text-slate-400 text-lg">{team.tag}</p>
						</div>
						<div className="flex gap-3">
							<button
								onClick={handleRefreshData}
								disabled={refreshing}
								className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 flex items-center gap-2 cursor-pointer">
								<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
								{refreshing ? 'Aktualisiere...' : 'Daten aktualisieren'}
							</button>
							<button
								onClick={() => setShowDeleteModal(true)}
								className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-300 flex items-center gap-2 cursor-pointer">
								<Trash2 className="w-4 h-4" />
								Team löschen
							</button>
						</div>
					</div>
				</div>

				{/* Tabs */}
				<div className="border-b border-slate-700/50">
					<nav className="flex gap-6">
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
										flex items-center gap-2 px-4 py-3 border-b-2 transition-colors duration-300 cursor-pointer
										${
											activeTab === tab.id
												? 'border-cyan-400 text-cyan-400'
												: 'border-transparent text-slate-400 hover:text-white'
										}
									`}>
									<Icon className="w-4 h-4" />
									{tab.label}
								</button>
							);
						})}
					</nav>
				</div>

				{/* Tab Content */}
				<div>
					{activeTab === 'overview' && <TeamOverviewTab teamId={id} />}

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

					{activeTab === 'matches' && <MatchHistoryTab teamId={id} />}

					{activeTab === 'drafts' && <ChampionPoolTab teamId={id} predictions={predictions} />}

					{activeTab === 'report' && <InDepthStatsTab teamId={id} />}

					{activeTab === 'gameprep' && (
						<GamePrepTab
							teamId={id}
						/>
					)}
				</div>

				{/* Progress Modal */}
				{showProgressModal && (
					<RefreshProgressModal
						teamId={id}
						onComplete={handleRefreshComplete}
						onError={handleRefreshError}
					/>
				)}

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
