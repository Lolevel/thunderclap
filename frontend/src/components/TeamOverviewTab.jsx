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

	const { pl_stats, top_5_champions, average_rank, average_rank_info, peak_rank_info, lowest_rank_info, player_count } = overview;

	return (
		<div className="space-y-6">
			{/* Prime League Stats */}
			<div className="card">
				<h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
					<Trophy className="w-5 h-5 text-primary" />
					Prime League Statistiken
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
							<div className="bg-gradient-to-br from-surface-hover to-surface p-5 rounded-lg border border-border">
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
										<div className="text-xl font-bold text-text-primary">
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
					<div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
						<p className="text-sm text-text-secondary">
							<strong>Info:</strong> Rang-Statistiken basieren auf Solo/Duo Queue Rängen.
							Team-Durchschnitt: {player_count} Spieler analysiert.
							Klicke auf "Daten aktualisieren" um die neuesten Ränge zu laden.
						</p>
					</div>
				</div>
			)}

			{/* Unranked Message */}
			{!average_rank_info && (
				<div className="card bg-surface-hover border border-border">
					<div className="flex items-center gap-3">
						<Users className="w-10 h-10 text-text-muted" />
						<div>
							<h3 className="font-semibold text-text-primary mb-1">
								Keine Rang-Daten verfügbar
							</h3>
							<p className="text-sm text-text-secondary">
								Klicke auf "Daten aktualisieren" um die Ränge der Spieler zu laden.
							</p>
						</div>
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
