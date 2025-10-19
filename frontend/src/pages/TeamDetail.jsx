import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
	Users,
	TrendingUp,
	Target,
	FileText,
	ArrowLeft,
	RefreshCw,
	History,
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
	const toast = useToast();
	const [team, setTeam] = useState(null);
	const [roster, setRoster] = useState([]);
	const [stats, setStats] = useState(null);
	const [activeTab, setActiveTab] = useState('overview');
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [showProgressModal, setShowProgressModal] = useState(false);

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

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="animate-pulse text-text-muted">Lädt...</div>
			</div>
		);
	}

	if (!team) {
		return (
			<div className="card text-center py-12">
				<p className="text-text-secondary">Team nicht gefunden</p>
			</div>
		);
	}

	return (
		<div className="space-y-6 animate-fade-in">
			<Link
				to="/teams"
				className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
				<ArrowLeft className="w-4 h-4" />
				Zurück zu Teams
			</Link>

			{/* Team Header */}
			<div className="card">
				<div className="flex items-center gap-6">
					<div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
						<span className="text-white font-bold text-3xl">
							{team.name.charAt(0).toUpperCase()}
						</span>
					</div>
					<div className="flex-1">
						<h1 className="text-3xl font-bold text-text-primary mb-1">
							{team.name}
						</h1>
						<p className="text-text-muted text-lg">{team.tag}</p>
					</div>
					<div>
						<button
							onClick={handleRefreshData}
							disabled={refreshing}
							className="btn btn-primary flex items-center gap-2">
							<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
							{refreshing ? 'Aktualisiere...' : 'Daten aktualisieren'}
						</button>
					</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="border-b border-border">
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
                  flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
                  ${
						activeTab === tab.id
							? 'border-primary text-primary'
							: 'border-transparent text-text-muted hover:text-text-primary'
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
		</div>
	);
};

export default TeamDetail;
