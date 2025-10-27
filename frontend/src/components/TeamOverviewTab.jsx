import { Trophy, TrendingUp, Users, Target, AlertCircle } from 'lucide-react';
import { useTeamOverview } from '../hooks/api/useTeam';
import { RefreshIndicator } from './ui/RefreshIndicator';
import { TeamOverviewSkeleton } from './ui/Skeleton';
import { getChampionSplashUrl, handleSplashError } from '../utils/championHelper';

const TeamOverviewTab = ({ teamId }) => {
	// Use SWR hook for data fetching
	const { overview, isLoading, isError, isValidating } = useTeamOverview(teamId);

	// Show skeleton on initial load
	if (isLoading) {
		return <TeamOverviewSkeleton />;
	}

	// Show error state
	if (isError || !overview) {
		return (
			<div className="card text-center py-12">
				<div className="flex flex-col items-center gap-3">
					<AlertCircle className="w-12 h-12 text-error" />
					<p className="text-text-secondary">
						{isError ? 'Fehler beim Laden der Übersicht' : 'Keine Daten verfügbar'}
					</p>
				</div>
			</div>
		);
	}

	const { pl_stats, top_5_champions, average_rank, average_rank_info, peak_rank_info, lowest_rank_info, player_count } = overview;

	return (
		<>
			{/* Background refresh indicator */}
			<RefreshIndicator isValidating={isValidating} />

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

			{/* Top 5 Team Champions - Podium */}
			<div className="card">
				<h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
					<Target className="w-5 h-5 text-accent" />
					Top 5 Team Champions
				</h2>
				{top_5_champions && top_5_champions.length > 0 ? (
					<div className="space-y-4">
						<div className="flex items-end justify-center gap-3">
							{top_5_champions[1] && (
								<div className="flex-1 max-w-[280px]">
									<div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-600/50 transition-all duration-300 group">
										<div className="absolute top-2 right-2 z-10 w-8 h-8 bg-gradient-to-br from-slate-300 to-slate-400 rounded-full flex items-center justify-center shadow-lg">
											<span className="text-slate-900 font-bold text-sm">#2</span>
										</div>
										<div className="relative h-32 overflow-hidden">
											<img src={getChampionSplashUrl(top_5_champions[1].champion, 0)} alt={top_5_champions[1].champion} className="w-full h-full object-cover object-top group-hover:scale-105 transition-all duration-500" onError={(e) => handleSplashError(e, top_5_champions[1].champion)} />
											<div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent"></div>
										</div>
										<div className="p-3">
											<h3 className="font-bold text-text-primary text-sm truncate">{top_5_champions[1].champion}</h3>
											<p className="text-xs text-text-muted truncate mb-2">{top_5_champions[1].player}</p>
											<div className="flex items-center justify-between text-xs">
												<span className="text-text-muted">{top_5_champions[1].picks} Picks</span>
												<span className={`font-semibold ${top_5_champions[1].winrate >= 50 ? 'text-success' : 'text-error'}`}>{top_5_champions[1].winrate.toFixed(0)}%</span>
											</div>
										</div>
									</div>
								</div>
							)}
							{top_5_champions[0] && (
								<div className="flex-1 max-w-[300px]">
									<div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-600/20 border-2 border-yellow-500/50 transition-all duration-300 group shadow-lg shadow-yellow-500/20">
										<div className="absolute top-2 right-2 z-10 w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-xl animate-pulse">
											<span className="text-yellow-950 font-bold text-base">#1</span>
										</div>
										<div className="relative h-40 overflow-hidden">
											<img src={getChampionSplashUrl(top_5_champions[0].champion, 0)} alt={top_5_champions[0].champion} className="w-full h-full object-cover object-top group-hover:scale-105 transition-all duration-500" onError={(e) => handleSplashError(e, top_5_champions[0].champion)} />
											<div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent"></div>
										</div>
										<div className="p-4">
											<h3 className="font-bold text-text-primary text-base truncate">{top_5_champions[0].champion}</h3>
											<p className="text-xs text-text-muted truncate mb-2">{top_5_champions[0].player}</p>
											<div className="flex items-center justify-between text-sm">
												<span className="text-text-muted font-medium">{top_5_champions[0].picks} Picks</span>
												<span className={`font-bold ${top_5_champions[0].winrate >= 50 ? 'text-success' : 'text-error'}`}>{top_5_champions[0].winrate.toFixed(0)}%</span>
											</div>
										</div>
									</div>
								</div>
							)}
							{top_5_champions[2] && (
								<div className="flex-1 max-w-[280px]">
									<div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-700/30 to-amber-900/30 border border-amber-700/40 transition-all duration-300 group">
										<div className="absolute top-2 right-2 z-10 w-8 h-8 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center shadow-lg">
											<span className="text-amber-950 font-bold text-sm">#3</span>
										</div>
										<div className="relative h-32 overflow-hidden">
											<img src={getChampionSplashUrl(top_5_champions[2].champion, 0)} alt={top_5_champions[2].champion} className="w-full h-full object-cover object-top group-hover:scale-105 transition-all duration-500" onError={(e) => handleSplashError(e, top_5_champions[2].champion)} />
											<div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent"></div>
										</div>
										<div className="p-3">
											<h3 className="font-bold text-text-primary text-sm truncate">{top_5_champions[2].champion}</h3>
											<p className="text-xs text-text-muted truncate mb-2">{top_5_champions[2].player}</p>
											<div className="flex items-center justify-between text-xs">
												<span className="text-text-muted">{top_5_champions[2].picks} Picks</span>
												<span className={`font-semibold ${top_5_champions[2].winrate >= 50 ? 'text-success' : 'text-error'}`}>{top_5_champions[2].winrate.toFixed(0)}%</span>
											</div>
										</div>
									</div>
								</div>
							)}
						</div>
						{(top_5_champions[3] || top_5_champions[4]) && (
							<div className="flex justify-center gap-3">
								{[3, 4].map(i => top_5_champions[i] && (
									<div key={i} className="flex-1 max-w-[280px]">
										<div className="flex items-center gap-3 p-3 bg-surface/50 border border-border/50 rounded-lg transition-all duration-300">
											<div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
												<span className="text-slate-300 font-bold text-xs">#{i+1}</span>
											</div>
											<div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-surface-lighter">
												<img src={top_5_champions[i].champion_icon} alt={top_5_champions[i].champion} className="w-full h-full object-cover" style={{ transform: 'scale(1.2)' }} onError={(e) => { e.target.style.display = 'none'; }} />
											</div>
											<div className="flex-1 min-w-0">
												<h4 className="font-semibold text-text-primary text-sm truncate">{top_5_champions[i].champion}</h4>
												<p className="text-xs text-text-muted truncate">{top_5_champions[i].player}</p>
											</div>
											<div className="text-right flex-shrink-0">
												<div className="text-xs text-text-muted">{top_5_champions[i].picks}x</div>
												<div className={`text-sm font-semibold ${top_5_champions[i].winrate >= 50 ? 'text-success' : 'text-error'}`}>{top_5_champions[i].winrate.toFixed(0)}%</div>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				) : (
					<div className="text-center py-8 text-text-muted">Keine Champion-Daten verfügbar</div>
				)}
			</div>
		</div>
		</>
	);
};

export default TeamOverviewTab;
