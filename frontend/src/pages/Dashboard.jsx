import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Users,
	TrendingUp,
	Calendar,
	ChevronRight,
	Search,
} from 'lucide-react';
import api from '../config/api';
import ImportTeamModal from '../components/ImportTeamModal';

const Dashboard = () => {
	const [teams, setTeams] = useState([]);
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();
	const [stats, setStats] = useState({
		totalTeams: 0,
		totalPlayers: 0,
		recentMatches: 0,
	});
	const [isImportModalOpen, setIsImportModalOpen] = useState(false);

	useEffect(() => {
		fetchDashboardData();
	}, []);

	const fetchDashboardData = async () => {
		try {
			const [teamsRes, dashboardStatsRes] = await Promise.all([
				api.get('/teams'),
				api.get('/dashboard/stats'),
			]);

			const teamsData = teamsRes.data;
			const dashboardStats = dashboardStatsRes.data;

			const teamsArray = teamsData.teams || [];

			setTeams(teamsArray.slice(0, 6));
			setStats({
				totalTeams: dashboardStats.total_teams || 0,
				totalPlayers: dashboardStats.total_players || 0,
				recentMatches: dashboardStats.tournament_matches || 0,
			});
		} catch (error) {
			console.error('Failed to fetch dashboard data:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleImportSuccess = (data) => {
		// Navigate to team detail page if team was imported
		if (data.team_id) {
			navigate(`/teams/${data.team_id}`);
		} else if (data.player_id) {
			navigate(`/players/${data.player_id}`);
		} else {
			// Fallback: refresh if no ID provided
			window.location.reload();
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center flex-1">
				<div className="animate-pulse text-slate-400">Lädt...</div>
			</div>
		);
	}

	return (
		<div className="p-6">
			<div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
				<ImportTeamModal
					isOpen={isImportModalOpen}
					onClose={() => setIsImportModalOpen(false)}
					onSuccess={handleImportSuccess}
				/>
				<div>
					<h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
						Dashboard
					</h1>
					<p className="text-slate-400">
						Überblick über alle Teams und Spieler
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{[
						{
							label: 'Teams',
							value: stats.totalTeams,
							icon: Users,
							color: 'from-blue-500 to-blue-600',
						},
						{
							label: 'Spieler',
							value: stats.totalPlayers,
							icon: TrendingUp,
							color: 'from-cyan-500 to-cyan-600',
						},
						{
							label: 'Games in DB 🎮',
							value: stats.recentMatches,
							icon: Calendar,
							color: 'from-purple-500 to-purple-600',
						},
					].map((stat, idx) => {
						const Icon = stat.icon;
						return (
							<div
								key={idx}
								className="group relative overflow-hidden rounded-xl bg-slate-800/50 backdrop-blur border border-slate-700/50 hover:border-slate-600 transition-all duration-300 p-5">
								<div
									className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
								/>

								<div className="relative flex items-center justify-between">
									<div>
										<p className="text-slate-400 text-sm mb-1">
											{stat.label}
										</p>
										<p className="text-3xl font-bold text-white">
											{stat.value}
										</p>
									</div>
									<div
										className={`p-3 rounded-lg bg-gradient-to-br ${stat.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
										<Icon className="w-5 h-5 text-white" />
									</div>
								</div>
							</div>
						);
					})}
				</div>

				<div>
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-xl font-bold text-white">
							Deine Teams
						</h2>
						<a
							href="/teams"
							className="text-cyan-400 hover:text-cyan-300 text-sm font-medium flex items-center gap-1 transition-colors">
							Alle anzeigen <ChevronRight className="w-4 h-4" />
						</a>
					</div>

					{teams.length === 0 ? (
						<div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 text-center py-12">
							<Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
							<p className="text-slate-300 mb-4">
								Noch keine Teams importiert
							</p>
							<button
								onClick={() => setIsImportModalOpen(true)}
								className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 font-medium shadow-lg shadow-blue-500/20 cursor-pointer">
								Erstes Team importieren
							</button>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{teams.map((team) => (
								<a
									key={team.id}
									href={`/teams/${team.id}`}
									className="group relative overflow-hidden rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 p-4 hover:bg-slate-800/60">
									<div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/5 transition-all duration-300" />

									<div className="relative flex items-center justify-between">
										<div className="flex items-center gap-3 flex-1 min-w-0">
											<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow duration-300">
												<span className="text-white font-bold text-sm">
													{team.name
														.charAt(0)
														.toUpperCase()}
												</span>
											</div>
											<div className="min-w-0 flex-1">
												<h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">
													{team.name}
												</h3>
												<div className="flex items-center gap-2 mt-0.5">
													<p className="text-xs text-slate-400">
														{team.tag}
													</p>
													{team.average_rank && (
														<>
															<span className="text-slate-600">•</span>
															{team.average_rank_icon && (
																<img
																	src={team.average_rank_icon}
																	alt={team.average_rank}
																	className="w-4 h-4"
																/>
															)}
															<span className="text-xs text-slate-500 font-medium">
																Ø {team.average_rank}
															</span>
														</>
													)}
												</div>
											</div>
										</div>
										<ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0 ml-2" />
									</div>
								</a>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Dashboard;
