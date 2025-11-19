import { Trophy, TrendingUp, Users, Target, AlertCircle, Clock, Shield, Swords } from 'lucide-react';
import { useTeamOverview } from '../hooks/api/useTeam';
import { useScoutingReport } from '../hooks/api/useTeam';
import { TeamOverviewSkeleton } from './ui/Skeleton';
import { getChampionSplashUrl, handleSplashError } from '../utils/championHelper';

const TeamOverviewTab = ({ teamId, preloadedData }) => {
	// Use SWR hooks for data fetching (will use cache if preloadedData populated it)
	const { overview: overviewSWR, isLoading, isError, isValidating } = useTeamOverview(teamId);
	const { report: reportSWR, isLoading: reportLoading } = useScoutingReport(teamId);

	// Use preloaded data if available, otherwise use SWR result
	const overview = preloadedData || overviewSWR;
	const report = reportSWR; // Report is from scouting-report endpoint, might be in fullData too

	const formatDuration = (seconds) => {
		if (!seconds) return 'N/A';
		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${minutes}:${String(secs).padStart(2, '0')}`;
	};

	// Show skeleton on initial load (skip if we have preloaded data)
	if (!preloadedData && isLoading) {
		return <TeamOverviewSkeleton />;
	}

	// Show error state
	if (isError || !overview) {
		return (
			<div className="card text-center py-12">
				<div className="flex flex-col items-center gap-3">
					<AlertCircle className="w-12 h-12 text-error" />
					<p className="text-text-secondary">
						{isError ? 'Failed to load overview' : 'No data available'}
					</p>
				</div>
			</div>
		);
	}

	const { pl_stats, top_5_champions, average_rank, average_rank_info, peak_rank_info, lowest_rank_info, player_count } = overview || {};

	return (
		<div className="space-y-4 md:space-y-5">
			{/* Prime League Stats */}
			{pl_stats && pl_stats.games > 0 ? (
				<div className="card bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-indigo-500/10 border border-blue-500/20">
					<h2 className="text-base md:text-lg font-bold text-text-primary mb-3 md:mb-4 flex items-center justify-center gap-2">
						<Trophy className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
						Prime League Statistics
					</h2>
					{/* Mobile: 2x2 Grid */}
					<div className="grid grid-cols-2 gap-4 sm:hidden">
						<div className="text-center">
							<div className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 bg-clip-text text-transparent">
								{pl_stats.games}
							</div>
							<div className="text-text-muted text-xs mt-1">Games</div>
						</div>
						<div className="text-center">
							<div className={`text-2xl font-bold ${
								pl_stats.winrate >= 50 ? 'text-success' : 'text-error'
							}`}>
								{pl_stats.winrate.toFixed(0)}%
							</div>
							<div className="text-text-muted text-xs mt-1">Winrate</div>
						</div>
						<div className="text-center">
							<div className="text-xl font-bold text-success">
								{pl_stats.wins}
							</div>
							<div className="text-text-muted text-xs mt-1">Wins</div>
						</div>
						<div className="text-center">
							<div className="text-xl font-bold text-error">
								{pl_stats.losses}
							</div>
							<div className="text-text-muted text-xs mt-1">Losses</div>
						</div>
					</div>
					{/* Tablet+: Horizontal row */}
					<div className="hidden sm:flex items-center justify-center gap-4 md:gap-6">
						<div className="text-center">
							<div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 bg-clip-text text-transparent">
								{pl_stats.games}
							</div>
							<div className="text-text-muted text-xs mt-1">Games</div>
						</div>
						<div className="h-8 md:h-10 w-px bg-gradient-to-b from-blue-500/0 via-purple-500/50 to-blue-500/0"></div>
						<div className="text-center">
							<div className="text-xl md:text-2xl font-bold text-success">
								{pl_stats.wins}
							</div>
							<div className="text-text-muted text-xs mt-1">Wins</div>
						</div>
						<div className="text-center">
							<div className="text-xl md:text-2xl font-bold text-error">
								{pl_stats.losses}
							</div>
							<div className="text-text-muted text-xs mt-1">Losses</div>
						</div>
						<div className="h-8 md:h-10 w-px bg-gradient-to-b from-blue-500/0 via-purple-500/50 to-blue-500/0"></div>
						<div className="text-center">
							<div className={`text-2xl md:text-3xl font-bold ${
								pl_stats.winrate >= 50 ? 'text-success' : 'text-error'
							}`}>
								{pl_stats.winrate.toFixed(0)}%
							</div>
							<div className="text-text-muted text-xs mt-1">Winrate</div>
						</div>
					</div>
				</div>
			) : (
				<div className="card bg-gradient-to-br from-slate-700/20 to-slate-800/20 border border-slate-600/30 text-center py-8">
					<AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-3" />
					<p className="text-slate-400 mb-1">No Prime League statistics available</p>
					<p className="text-slate-500 text-sm">Refresh team data to load Prime League stats</p>
				</div>
			)}

			{/* Team Rank Statistics */}
			{average_rank_info && (
				<div className="card">
					<h2 className="text-lg font-bold text-text-primary mb-4 flex items-center justify-center gap-2">
						<TrendingUp className="w-5 h-5 text-purple-400" />
						Team Rank Statistics
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{/* Average Rank */}
						<div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-4 rounded-lg border border-blue-500/20">
							<div className="text-center">
								<div className="text-text-muted text-xs mb-2 flex items-center justify-center gap-2">
									<TrendingUp className="w-3 h-3" />
									Average Rank
								</div>
								<div className="flex flex-col items-center gap-2">
									{average_rank_info.icon_url && (
										<img
											src={average_rank_info.icon_url}
											alt={average_rank_info.display}
											className="w-12 h-12 rounded-full shadow-md shadow-blue-500/20"
											onError={(e) => {
												e.target.style.display = 'none';
											}}
										/>
									)}
									<div>
										<div className="text-base font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
											{average_rank_info.display}
										</div>
										<div className="text-xs text-text-muted">
											{average_rank_info.average_points} Points
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Peak Rank */}
						{peak_rank_info && (
							<div className="bg-gradient-to-br from-success/10 to-emerald-500/10 p-4 rounded-lg border border-success/20">
								<div className="text-center">
									<div className="text-text-muted text-xs mb-2 flex items-center justify-center gap-2">
										<Trophy className="w-3 h-3 text-success" />
										Highest Rank
									</div>
									<div className="flex flex-col items-center gap-2">
										{peak_rank_info.icon_url && (
											<img
												src={peak_rank_info.icon_url}
												alt={peak_rank_info.display}
												className="w-12 h-12 rounded-full shadow-md shadow-success/20"
												onError={(e) => {
													e.target.style.display = 'none';
												}}
											/>
										)}
										<div>
											<div className="text-base font-bold text-success">
												{peak_rank_info.display}
											</div>
											<div className="text-xs text-text-muted">
												Best Player
											</div>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Lowest Rank */}
						{lowest_rank_info && (
							<div className="bg-gradient-to-br from-red-500/10 to-rose-600/10 p-4 rounded-lg border border-red-500/20">
								<div className="text-center">
									<div className="text-text-muted text-xs mb-2">
										Lowest Rank
									</div>
									<div className="flex flex-col items-center gap-2">
										{lowest_rank_info.icon_url && (
											<img
												src={lowest_rank_info.icon_url}
												alt={lowest_rank_info.display}
												className="w-12 h-12 rounded-full shadow-md shadow-red-500/20"
												onError={(e) => {
													e.target.style.display = 'none';
												}}
											/>
										)}
										<div>
											<div className="text-base font-bold text-red-400">
												{lowest_rank_info.display}
											</div>
											<div className="text-xs text-text-muted">
												Lowest Player
											</div>
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
				<h2 className="text-base md:text-lg font-bold text-text-primary mb-3 md:mb-4 flex items-center justify-center gap-2">
					<Target className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
					Top 5 Team Champions
				</h2>
				{top_5_champions && top_5_champions.length > 0 ? (
					<div className="space-y-3">
						{/* Mobile: Simple vertical stack - all champions in same style, centered */}
						<div className="flex md:hidden flex-col gap-3 items-center">
							{top_5_champions.map((champ, index) => (
								<div key={index} className="w-full max-w-[320px]">
									<div className="flex items-center gap-3 p-3 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/20 rounded-lg transition-all duration-300 hover:border-purple-500/30">
										<div className="text-slate-400 font-semibold text-xs bg-slate-800/80 px-1.5 py-0.5 rounded flex-shrink-0">
											{index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : index === 3 ? '4th' : '5th'}
										</div>
										<div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-surface-lighter">
											<img src={champ.champion_icon} alt={champ.champion} className="w-full h-full object-cover" style={{ transform: 'scale(1.2)' }} onError={(e) => { e.target.style.display = 'none'; }} />
										</div>
										<div className="flex-1 min-w-0">
											<h4 className="font-semibold text-text-primary text-sm truncate">{champ.champion}</h4>
											<p className="text-xs text-text-muted truncate">{champ.player}</p>
										</div>
										<div className="text-right flex-shrink-0">
											<div className="text-xs text-text-muted">{champ.picks}x</div>
											<div className={`text-sm font-semibold ${champ.winrate >= 50 ? 'text-success' : 'text-error'}`}>{champ.winrate.toFixed(0)}%</div>
										</div>
									</div>
								</div>
							))}
						</div>

						{/* Desktop: Podium layout */}
						<div className="hidden md:block">
							<div className="flex justify-center items-end gap-3">
								{top_5_champions[1] && (
									<div className="flex-1 max-w-[280px]">
										<div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-600/50 transition-all duration-300 group">
											<div className="relative h-32 overflow-hidden">
												<img src={getChampionSplashUrl(top_5_champions[1].champion, 0)} alt={top_5_champions[1].champion} className="w-full h-full object-cover object-top group-hover:scale-105 transition-all duration-500" onError={(e) => handleSplashError(e, top_5_champions[1].champion)} />
												<div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent"></div>
											</div>
											<div className="p-3">
												<div className="flex items-center gap-2 mb-1">
													<div className="text-slate-400 font-bold text-xs bg-slate-900/60 px-1.5 py-0.5 rounded">2nd</div>
													<h3 className="font-bold text-text-primary text-sm truncate">{top_5_champions[1].champion}</h3>
												</div>
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
										<div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-indigo-600/20 border-2 border-purple-500/50 transition-all duration-300 group shadow-lg shadow-purple-500/20">
											<div className="relative h-40 overflow-hidden">
												<img src={getChampionSplashUrl(top_5_champions[0].champion, 0)} alt={top_5_champions[0].champion} className="w-full h-full object-cover object-top group-hover:scale-105 transition-all duration-500" onError={(e) => handleSplashError(e, top_5_champions[0].champion)} />
												<div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent"></div>
											</div>
											<div className="p-4">
												<div className="flex items-center gap-2 mb-1">
													<div className="text-yellow-300 font-bold text-xs bg-gradient-to-r from-yellow-500/80 to-amber-500/80 px-2 py-0.5 rounded shadow">1st</div>
													<h3 className="font-bold text-text-primary text-base truncate">{top_5_champions[0].champion}</h3>
												</div>
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
											<div className="relative h-32 overflow-hidden">
												<img src={getChampionSplashUrl(top_5_champions[2].champion, 0)} alt={top_5_champions[2].champion} className="w-full h-full object-cover object-top group-hover:scale-105 transition-all duration-500" onError={(e) => handleSplashError(e, top_5_champions[2].champion)} />
												<div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent"></div>
											</div>
											<div className="p-3">
												<div className="flex items-center gap-2 mb-1">
													<div className="text-amber-300 font-bold text-xs bg-amber-900/60 px-1.5 py-0.5 rounded">3rd</div>
													<h3 className="font-bold text-text-primary text-sm truncate">{top_5_champions[2].champion}</h3>
												</div>
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
								<div className="flex justify-center gap-3 mt-3">
									{[3, 4].map(i => top_5_champions[i] && (
										<div key={i} className="flex-1 max-w-[280px]">
											<div className="flex items-center gap-3 p-3 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/20 rounded-lg transition-all duration-300 hover:border-purple-500/30">
												<div className="text-slate-400 font-semibold text-xs bg-slate-800/80 px-1.5 py-0.5 rounded flex-shrink-0">
													{i === 3 ? '4th' : '5th'}
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
					</div>
				) : (
					<div className="text-center py-8 text-text-muted">No champion data available</div>
				)}
			</div>

			{/* Quick Stats Grid */}
			{report && !reportLoading && report.side_performance && report.side_performance.blue && report.side_performance.red ? (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{/* Side Preference */}
					<div className="card bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
						<div className="flex items-center justify-center gap-2 mb-2">
							<Shield className="w-4 h-4 text-indigo-400" />
							<span className="text-text-muted text-xs">Side Preference</span>
						</div>
						<div className="text-center">
							<p className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
								{report.side_performance.blue.winrate > report.side_performance.red.winrate ? 'Blue Side' : 'Red Side'}
							</p>
							<p className="text-xs text-text-muted mt-1">
								{Math.max(report.side_performance.blue.winrate, report.side_performance.red.winrate).toFixed(0)}% WR
							</p>
						</div>
					</div>

					{/* Average Game Duration */}
					<div className="card bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
						<div className="flex items-center justify-center gap-2 mb-2">
							<Clock className="w-4 h-4 text-cyan-400" />
							<span className="text-text-muted text-xs">Avg. Game Duration</span>
						</div>
						<div className="text-center">
							<p className="text-xl font-bold text-cyan-400">
								{report && report.avg_game_duration ? formatDuration(report.avg_game_duration) : 'N/A'}
							</p>
							<p className="text-xs text-text-muted mt-1">
								{report && report.avg_game_duration && report.avg_game_duration < 1800 ? 'Fast paced' : report && report.avg_game_duration && report.avg_game_duration > 2100 ? 'Slow paced' : 'Average'}
							</p>
						</div>
					</div>

					{/* First Blood Rate */}
					{report && report.first_blood_rate !== undefined && (
						<div className="card bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
							<div className="flex items-center justify-center gap-2 mb-2">
								<Swords className="w-4 h-4 text-purple-400" />
								<span className="text-text-muted text-xs">First Blood Rate</span>
							</div>
							<div className="text-center">
								<p className="text-xl font-bold text-purple-400">
									{report.first_blood_rate.toFixed(0)}%
								</p>
								<p className="text-xs text-text-muted mt-1">
									{report.first_blood_rate >= 60 ? 'Aggressive' : 'Passive'}
								</p>
							</div>
						</div>
					)}
				</div>
			) : !reportLoading && (
				<div className="card bg-gradient-to-br from-slate-700/20 to-slate-800/20 border border-slate-600/30 text-center py-8">
					<AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-3" />
					<p className="text-slate-400 mb-1">Additional statistics not yet available</p>
					<p className="text-slate-500 text-sm">Refresh team data to load in-depth statistics</p>
				</div>
			)}

		</div>
	);
};

export default TeamOverviewTab;
