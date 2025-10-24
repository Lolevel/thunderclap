import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Users, Target } from 'lucide-react';
import api from '../config/api';
import { getChampionSplashUrl, handleSplashError } from '../utils/championHelper';

const TeamOverviewTab = ({ teamId }) => {
	const [overview, setOverview] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetchOverview();
	}, [teamId]);

	const fetchOverview = async () => {
		try {
			setLoading(true);
			const response = await api.get(`/teams/${teamId}/overview`);
			setOverview(response.data);
		} catch (err) {
			console.error('Failed to fetch team overview:', err);
			setError('Fehler beim Laden der Übersicht');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-pulse text-text-muted">
					Lädt Übersicht...
				</div>
			</div>
		);
	}

	if (error || !overview) {
		return (
			<div className="card text-center py-12">
				<p className="text-text-secondary">{error || 'Keine Daten verfügbar'}</p>
			</div>
		);
	}

	const { pl_stats, top_5_champions, average_rank, average_rank_info, peak_rank_info, lowest_rank_info, player_count } = overview;

	return (
		<div className="space-y-6">
			{/* Prime League Stats */}
			<div className="card">
				<h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
					<Trophy className="w-5 h-5 text-primary" />
					Prime League Statistiken
				</h2>
				<div className="flex items-center gap-6">
					<div className="flex items-baseline gap-2">
						<div className="text-4xl font-bold text-text-primary">
							{pl_stats.games}
						</div>
						<div className="text-text-muted text-sm">Spiele</div>
					</div>
					<div className="h-8 w-px bg-border"></div>
					<div className="flex items-baseline gap-2">
						<div className="text-2xl font-semibold text-success">
							{pl_stats.wins}
						</div>
						<div className="text-text-muted text-sm">Siege</div>
					</div>
					<div className="flex items-baseline gap-2">
						<div className="text-2xl font-semibold text-error">
							{pl_stats.losses}
						</div>
						<div className="text-text-muted text-sm">Niederlagen</div>
					</div>
					<div className="h-8 w-px bg-border"></div>
					<div className="flex items-baseline gap-2">
						<div className={`text-3xl font-bold ${
							pl_stats.winrate >= 50 ? 'text-success' : 'text-error'
						}`}>
							{pl_stats.winrate.toFixed(0)}%
						</div>
						<div className="text-text-muted text-sm">Winrate</div>
					</div>
				</div>
			</div>

			{/* Team Rank Statistics */}
			{average_rank_info && (
				<div className="card">
					<h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
						<TrendingUp className="w-5 h-5 text-accent" />
						Team Rang-Statistiken
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{/* Average Rank */}
						<div className="bg-gradient-to-br from-primary/10 to-primary/5 p-5 rounded-lg border border-primary/20">
							<div className="text-text-muted text-sm mb-2 flex items-center gap-2">
								<TrendingUp className="w-4 h-4" />
								Durchschnitts-Rang
							</div>
							<div className="flex items-center gap-3">
								{average_rank_info.icon_url && (
									<img
										src={average_rank_info.icon_url}
										alt={average_rank_info.display}
										className="w-12 h-12 rounded-full"
										onError={(e) => {
											e.target.style.display = 'none';
										}}
									/>
								)}
								<div>
									<div className="text-xl font-bold text-text-primary">
										{average_rank_info.display}
									</div>
									<div className="text-xs text-text-muted">
										{average_rank_info.average_points} Punkte
									</div>
								</div>
							</div>
						</div>

						{/* Peak Rank */}
						{peak_rank_info && (
							<div className="bg-gradient-to-br from-success/10 to-success/5 p-5 rounded-lg border border-success/20">
								<div className="text-text-muted text-sm mb-2 flex items-center gap-2">
									<Trophy className="w-4 h-4 text-success" />
									Höchster Rang
								</div>
								<div className="flex items-center gap-3">
									{peak_rank_info.icon_url && (
										<img
											src={peak_rank_info.icon_url}
											alt={peak_rank_info.display}
											className="w-12 h-12 rounded-full"
											onError={(e) => {
												e.target.style.display = 'none';
											}}
										/>
									)}
									<div>
										<div className="text-xl font-bold text-success">
											{peak_rank_info.display}
										</div>
										<div className="text-xs text-text-muted">
											Bester Spieler
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Lowest Rank */}
						{lowest_rank_info && (
							<div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-5 rounded-lg border border-amber-500/20">
								<div className="text-text-muted text-sm mb-2">
									Niedrigster Rang
								</div>
								<div className="flex items-center gap-3">
									{lowest_rank_info.icon_url && (
										<img
											src={lowest_rank_info.icon_url}
											alt={lowest_rank_info.display}
											className="w-12 h-12 rounded-full"
											onError={(e) => {
												e.target.style.display = 'none';
											}}
										/>
									)}
									<div>
										<div className="text-xl font-bold text-amber-400">
											{lowest_rank_info.display}
										</div>
										<div className="text-xs text-text-muted">
											Niedrigster Spieler
										</div>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Top 5 Team Champions */}
			<div className="card">
				<h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
					<Target className="w-5 h-5 text-accent" />
					Top 5 Team Champions
				</h2>
				{top_5_champions && top_5_champions.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{top_5_champions.map((champ, index) => (
							<div
								key={index}
								className="relative overflow-hidden rounded-xl bg-gradient-to-br from-surface-hover to-surface border border-border hover:border-primary/50 transition-all duration-300 group">
								{/* Rank Badge */}
								<div className="absolute top-3 left-3 z-10 w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-lg">
									<span className="text-white font-bold text-lg">
										#{index + 1}
									</span>
								</div>

								{/* Champion Image Background */}
								<div className="relative h-40 overflow-hidden">
									{champ.champion_id ? (
										<>
											<img
												src={getChampionSplashUrl(champ.champion, 0)}
												alt={champ.champion}
												className="w-full h-full object-cover object-top opacity-60 group-hover:opacity-80 group-hover:scale-110 transition-all duration-700 ease-out"
												onError={(e) => handleSplashError(e, champ.champion)}
											/>
											<div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/70 to-transparent"></div>
										</>
									) : (
										<div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20"></div>
									)}

									{/* Champion Name Overlay */}
									<div className="absolute bottom-3 left-3 right-3">
										<h3 className="text-xl font-bold text-text-primary drop-shadow-lg">
											{champ.champion}
										</h3>
									</div>
								</div>

								{/* Stats Section */}
								<div className="p-4 space-y-3">
									{/* Player */}
									<div className="flex items-center gap-2 text-sm">
										<Users className="w-4 h-4 text-primary" />
										<span className="text-text-muted truncate">{champ.player}</span>
									</div>

									{/* Stats Grid */}
									<div className="grid grid-cols-3 gap-3">
										<div className="text-center p-2 bg-surface rounded-lg">
											<div className="text-xs text-text-muted mb-1">Picks</div>
											<div className="text-lg font-bold text-primary">
												{champ.picks}
											</div>
										</div>
										<div className="text-center p-2 bg-surface rounded-lg">
											<div className="text-xs text-text-muted mb-1">Winrate</div>
											<div className={`text-lg font-bold ${
												champ.winrate >= 50 ? 'text-success' : 'text-error'
											}`}>
												{champ.winrate.toFixed(0)}%
											</div>
										</div>
										<div className="text-center p-2 bg-surface rounded-lg">
											<div className="text-xs text-text-muted mb-1">W-L</div>
											<div className="text-sm font-bold text-text-primary">
												{champ.wins}-{champ.picks - champ.wins}
											</div>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-center py-8 text-text-muted">
						Keine Champion-Daten verfügbar
					</div>
				)}
			</div>

		</div>
	);
};

export default TeamOverviewTab;
