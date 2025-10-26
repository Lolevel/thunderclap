import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
	Users,
	TrendingUp,
	Target,
	FileText,
	ArrowLeft,
	RefreshCw,
	History,
	Trash2,
} from 'lucide-react';
import api from '../config/api';
import TeamOverviewTab from '../components/TeamOverviewTab';
import DraftAnalysisTab from '../components/DraftAnalysisTab';
import ScoutingReportTab from '../components/ScoutingReportTab';
import PlayersTab from '../components/PlayersTab';
import MatchHistoryTab from '../components/MatchHistoryTab';
import RefreshProgressModal from '../components/RefreshProgressModal';
import { useToast } from '../components/ToastContainer';

const TeamDetail = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const toast = useToast();
	const [team, setTeam] = useState(null);
	const [roster, setRoster] = useState([]);
	const [stats, setStats] = useState(null);
	const [activeTab, setActiveTab] = useState('overview');
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [showProgressModal, setShowProgressModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deletingTeam, setDeletingTeam] = useState(false);
	const [deletePlayersOption, setDeletePlayersOption] = useState(false);

	useEffect(() => {
		fetchTeamData();
	}, [id]);

	const fetchTeamData = async () => {
		try {
			const [teamRes, rosterRes] = await Promise.all([
				api.get(`/teams/${id}`),
				api.get(`/teams/${id}/roster`),
			]);

			setTeam(teamRes.data);
			setRoster(rosterRes.data.roster || []);
		} catch (error) {
			console.error('Failed to fetch team data:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleAddPlayer = async (opggUrl) => {
		await api.post(`/teams/${id}/roster/add`, {
			opgg_url: opggUrl,
		});
		await fetchTeamData();
	};

	const handleSyncRoster = async (opggUrl) => {
		const response = await api.post(`/teams/${id}/sync-from-opgg`, {
			opgg_url: opggUrl,
		});
		await fetchTeamData();
		return response.data;
	};

	const handleRemovePlayer = async (playerId, deleteFromDb = false) => {
		await api.delete(
			`/teams/${id}/roster/${playerId}?delete_player=${deleteFromDb}`
		);
		await fetchTeamData();
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

		// Auto-refresh data
		await fetchTeamData();
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
			const response = await api.delete(
				`/teams/${id}?delete_players=${deletePlayersOption}`
			);
			toast.success(
				`Team "${response.data.team_name}" wurde gelöscht. ${
					response.data.players_deleted > 0
						? `${response.data.players_deleted} Spieler ebenfalls gelöscht.`
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

	if (loading) {
		return (
			<div className="flex items-center justify-center flex-1">
				<div className="animate-pulse text-slate-400">Lädt...</div>
			</div>
		);
	}

	if (!team) {
		return (
			<div className="p-6">
				<div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 text-center py-12">
					<p className="text-slate-400">Team nicht gefunden</p>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6">
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
							{ id: 'drafts', label: 'Draft Analyse', icon: Target },
							{
								id: 'report',
								label: 'Scouting Report',
								icon: FileText,
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
							onRefresh={fetchTeamData}
							onRemovePlayer={handleRemovePlayer}
							onAddPlayer={handleAddPlayer}
							onSyncRoster={handleSyncRoster}
						/>
					)}

					{activeTab === 'matches' && <MatchHistoryTab teamId={id} />}

					{activeTab === 'drafts' && <DraftAnalysisTab teamId={id} />}

					{activeTab === 'report' && <ScoutingReportTab teamId={id} />}
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
