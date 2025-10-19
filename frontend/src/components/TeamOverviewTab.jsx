import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Users, Target } from 'lucide-react';
import api from '../config/api';

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

	const { pl_stats, top_5_champions, average_rank, player_count } = overview;

	return (
		<div className="space-y-6">
			{/* Prime League Stats */}
			<div className="card">
				<h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
					<Trophy className="w-5 h-5 text-primary" />
					Prime League Statistiken
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div className="bg-surface-hover p-4 rounded-lg">
						<div className="text-text-muted text-sm mb-1">Spiele</div>
						<div className="text-2xl font-bold text-text-primary">
							{pl_stats.games}
						</div>
						<div className="text-sm text-text-secondary mt-1">
							{pl_stats.wins}W - {pl_stats.losses}L
						</div>
					</div>

					<div className="bg-surface-hover p-4 rounded-lg">
						<div className="text-text-muted text-sm mb-1">Winrate</div>
						<div className={`text-2xl font-bold ${
							pl_stats.winrate >= 50 ? 'text-success' : 'text-error'
						}`}>
							{pl_stats.winrate.toFixed(1)}%
						</div>
					</div>

					<div className="bg-surface-hover p-4 rounded-lg">
						<div className="text-text-muted text-sm mb-1">Durchschnitts-Rank</div>
						<div className="text-2xl font-bold text-text-primary">
							{average_rank}
						</div>
					</div>

					<div className="bg-surface-hover p-4 rounded-lg">
						<div className="text-text-muted text-sm mb-1">Spieleranzahl</div>
						<div className="text-2xl font-bold text-text-primary flex items-center gap-2">
							<Users className="w-5 h-5" />
							{player_count}
						</div>
					</div>
				</div>
			</div>

			{/* Top 5 Team Champions */}
			<div className="card">
				<h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
					<Target className="w-5 h-5 text-accent" />
					Top 5 Team Champions
				</h2>
				{top_5_champions && top_5_champions.length > 0 ? (
					<div className="space-y-3">
						{top_5_champions.map((champ, index) => (
							<div
								key={index}
								className="flex items-center justify-between p-3 bg-surface-hover rounded-lg hover:bg-surface-hover/80 transition-colors">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
										<span className="text-primary font-bold text-sm">
											{index + 1}
										</span>
									</div>
									<div>
										<div className="font-semibold text-text-primary">
											{champ.champion}
										</div>
										<div className="text-sm text-text-muted">
											gespielt von {champ.player}
										</div>
									</div>
								</div>
								<div className="flex items-center gap-6">
									<div className="text-right">
										<div className="text-sm text-text-muted">Picks</div>
										<div className="font-semibold text-text-primary">
											{champ.picks}
										</div>
									</div>
									<div className="text-right">
										<div className="text-sm text-text-muted">Winrate</div>
										<div className={`font-semibold ${
											champ.winrate >= 50 ? 'text-success' : 'text-error'
										}`}>
											{champ.winrate.toFixed(1)}%
										</div>
									</div>
									<div className="text-right">
										<div className="text-sm text-text-muted">W-L</div>
										<div className="font-semibold text-text-secondary">
											{champ.wins}-{champ.picks - champ.wins}
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

			{/* Summary Card */}
			<div className="card bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
				<div className="flex items-center gap-4">
					<TrendingUp className="w-12 h-12 text-primary" />
					<div>
						<h3 className="text-lg font-bold text-text-primary mb-1">
							Team Performance
						</h3>
						<p className="text-text-secondary">
							{pl_stats.games > 0 ? (
								<>
									Das Team hat <span className="font-semibold text-text-primary">{pl_stats.games}</span> Prime League Spiele
									mit einer Winrate von <span className={`font-semibold ${pl_stats.winrate >= 50 ? 'text-success' : 'text-error'}`}>
										{pl_stats.winrate.toFixed(1)}%
									</span> gespielt.
								</>
							) : (
								'Noch keine Prime League Spiele verfügbar.'
							)}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TeamOverviewTab;
