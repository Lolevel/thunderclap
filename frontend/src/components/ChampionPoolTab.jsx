import React, { useEffect, useState } from 'react';
import { Target, Ban, TrendingUp, Award, Users, List, Columns, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../config/api';
import { displayRole } from '../utils/roleMapping';
import { getSummonerIconUrl, handleSummonerIconError } from '../utils/summonerHelper';

const ChampionPoolTab = ({ teamId, predictions }) => {
	const [draftData, setDraftData] = useState(null);
	const [playerPools, setPlayerPools] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeView, setActiveView] = useState('team'); // 'team' or 'players'
	const [playerViewMode, setPlayerViewMode] = useState('overview'); // 'overview' or 'comparison'
	const [expandedChampions, setExpandedChampions] = useState(new Set());
	const [expandedBansPhase1, setExpandedBansPhase1] = useState(false);
	const [expandedBansPhase2, setExpandedBansPhase2] = useState(false);

	useEffect(() => {
		fetchDraftAnalysis();
		fetchPlayerPools();
	}, [teamId]);

	const toggleChampion = (championId) => {
		setExpandedChampions(prev => {
			const newSet = new Set(prev);
			if (newSet.has(championId)) {
				newSet.delete(championId);
			} else {
				newSet.add(championId);
			}
			return newSet;
		});
	};

	const fetchDraftAnalysis = async () => {
		try {
			setLoading(true);
			const response = await api.get(`/teams/${teamId}/draft-analysis`);
			setDraftData(response.data);
		} catch (err) {
			console.error('Failed to fetch champion pool:', err);
			setError('Failed to load champion pool');
		} finally {
			setLoading(false);
		}
	};

	const fetchPlayerPools = async () => {
		try {
			const response = await api.get(`/teams/${teamId}/player-champion-pools`);
			setPlayerPools(response.data);
		} catch (err) {
			console.error('Failed to fetch player champion pools:', err);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-pulse text-text-muted">
					Loading Champion Pool...
				</div>
			</div>
		);
	}

	if (error || !draftData) {
		return (
			<div className="card text-center py-12">
				<p className="text-text-secondary">
					{error || 'No data available'}
				</p>
			</div>
		);
	}

	const {
		team_champion_pool,
		favorite_bans,
		bans_against,
		first_pick_priority,
		side_performance,
		matches_analyzed,
	} = draftData;

	return (
		<div className="space-y-6">
			{/* Header Info */}
			<div className="card bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-xl font-bold text-text-primary mb-1">
							Champion Pool & Draft Patterns
						</h2>
						<p className="text-text-secondary">
							Based on {matches_analyzed} matches analyzed
						</p>
					</div>
					{side_performance && (
						<div className="flex gap-4">
							<div className="text-center">
								<div className="text-sm text-text-muted mb-1">
									Blue Side
								</div>
								<div
									className={`text-lg font-bold ${
										side_performance.blue.winrate >= 50
											? 'text-success'
											: 'text-error'
									}`}>
									{side_performance.blue.winrate.toFixed(1)}%
								</div>
								<div className="text-xs text-text-secondary">
									{side_performance.blue.wins}-
									{side_performance.blue.losses}
								</div>
							</div>
							<div className="text-center">
								<div className="text-sm text-text-muted mb-1">
									Red Side
								</div>
								<div
									className={`text-lg font-bold ${
										side_performance.red.winrate >= 50
											? 'text-success'
											: 'text-error'
									}`}>
									{side_performance.red.winrate.toFixed(1)}%
								</div>
								<div className="text-xs text-text-secondary">
									{side_performance.red.wins}-
									{side_performance.red.losses}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* View Toggle */}
			<div className="flex justify-center">
				<div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 p-1.5 inline-flex gap-1">
					<button
						onClick={() => setActiveView('team')}
						className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all duration-300 font-medium ${
							activeView === 'team'
								? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20'
								: 'text-slate-400 hover:text-white hover:bg-slate-700/50'
						}`}
					>
						<Target className="w-4 h-4" />
						Team Champion Pool
					</button>
					<button
						onClick={() => setActiveView('players')}
						className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all duration-300 font-medium ${
							activeView === 'players'
								? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20'
								: 'text-slate-400 hover:text-white hover:bg-slate-700/50'
						}`}
					>
						<Users className="w-4 h-4" />
						Player Champion Pools
					</button>
				</div>
			</div>

			{/* Team Champion Pool View */}
			{activeView === 'team' && (
				<>
			{/* Team Champion Pool */}
			<div className="card">
				<h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
					<Target className="w-5 h-5 text-primary" />
					Team Champion Pool
				</h3>
				{team_champion_pool && team_champion_pool.length > 0 ? (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-border">
									<th className="text-left py-2 px-3 text-text-muted font-medium">
										Champion
									</th>
									<th className="text-left py-2 px-3 text-text-muted font-medium">
										Player
									</th>
									<th className="text-center py-2 px-3 text-text-muted font-medium">
										Picks
									</th>
									<th className="text-center py-2 px-3 text-text-muted font-medium">
										Bans
									</th>
									<th className="text-center py-2 px-3 text-text-muted font-medium">
										W-L
									</th>
									<th className="text-center py-2 px-3 text-text-muted font-medium">
										Winrate
									</th>
								</tr>
							</thead>
							<tbody>
								{team_champion_pool
									.slice(0, 15)
									.map((champ, index) => {
										const isExpanded = expandedChampions.has(champ.champion_id);
										const hasMultiplePlayers = champ.has_multiple_players;

										return (
											<React.Fragment key={index}>
												{/* Main Row */}
												<tr
													className={`border-b border-border/50 transition-colors ${
														hasMultiplePlayers ? 'cursor-pointer hover:bg-surface-hover' : 'hover:bg-surface-hover/50'
													}`}
													onClick={() => hasMultiplePlayers && toggleChampion(champ.champion_id)}
												>
													<td className="py-3 px-3">
														<div className="flex items-center gap-2">
															{hasMultiplePlayers && (
																<div className="flex-shrink-0">
																	{isExpanded ? (
																		<ChevronDown className="w-4 h-4 text-primary" />
																	) : (
																		<ChevronRight className="w-4 h-4 text-text-muted" />
																	)}
																</div>
															)}
															{champ.champion_icon && (
																<div className="w-8 h-8 rounded-full overflow-hidden">
																	<img
																		src={champ.champion_icon}
																		alt={champ.champion}
																		className="w-full h-full object-cover scale-110"
																		onError={(e) => {
																			e.target.style.display = 'none';
																		}}
																	/>
																</div>
															)}
															<span className="font-semibold text-text-primary">
																{champ.champion}
															</span>
														</div>
													</td>
													<td className="py-3 px-3 text-text-secondary">
														{champ.player || 'N/A'}
													</td>
													<td className="py-3 px-3 text-center font-medium text-text-primary">
														{champ.picks}
													</td>
													<td className="py-3 px-3 text-center font-medium text-error/80">
														{champ.picks >= 1 && champ.bans_against ? champ.bans_against : '-'}
													</td>
													<td className="py-3 px-3 text-center text-text-secondary">
														{champ.wins}-{champ.losses}
													</td>
													<td className="py-3 px-3 text-center">
														<span
															className={`font-semibold ${
																champ.winrate >= 50
																	? 'text-success'
																	: 'text-error'
															}`}>
															{champ.winrate.toFixed(1)}%
														</span>
													</td>
												</tr>

												{/* Expanded Player Details */}
												{hasMultiplePlayers && isExpanded && (
													<tr className="bg-surface-lighter/50">
														<td colSpan="6" className="px-3 py-4">
															<div className="ml-8 space-y-2">
																<p className="text-xs font-semibold text-text-muted uppercase mb-3">
																	Player Details
																</p>
																<div className="grid grid-cols-1 gap-2">
																	{champ.players.map((player) => (
																		<div
																			key={player.player_id}
																			className="flex items-center justify-between p-3 bg-surface/40 rounded-lg border border-border/50"
																		>
																			<div className="flex items-center gap-3">
																				<span className="font-medium text-text-primary">
																					{player.player_name}
																				</span>
																			</div>
																			<div className="flex items-center gap-6 text-sm">
																				<div className="text-center">
																					<p className="font-medium text-text-primary">
																						{player.picks}
																					</p>
																					<p className="text-xs text-text-muted">Picks</p>
																				</div>
																				<div className="text-center">
																					<p className="text-text-secondary">
																						{player.wins}-{player.losses}
																					</p>
																					<p className="text-xs text-text-muted">W-L</p>
																				</div>
																				<div className="text-center">
																					<p
																						className={`font-semibold ${
																							player.winrate >= 50
																								? 'text-success'
																								: 'text-error'
																						}`}
																					>
																						{player.winrate}%
																					</p>
																					<p className="text-xs text-text-muted">Winrate</p>
																				</div>
																			</div>
																		</div>
																	))}
																</div>
															</div>
														</td>
													</tr>
												)}
											</React.Fragment>
										);
									})}
							</tbody>
						</table>
					</div>
				) : (
					<p className="text-center py-8 text-text-muted">
						No champion data available
					</p>
				)}
			</div>

			{/* First Pick Priority */}
			{first_pick_priority && first_pick_priority.length > 0 && (
				<div className="card">
					<h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
						<Award className="w-5 h-5 text-accent" />
						First Pick Priority
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{first_pick_priority.map((pick, index) => (
							<div
								key={index}
								className="p-4 bg-surface-hover rounded-lg">
								<div className="flex items-center justify-between mb-2">
									<span className="font-bold text-text-primary">
										{pick.champion}
									</span>
									<span className="text-sm px-2 py-1 bg-primary/20 text-primary rounded">
										#{index + 1}
									</span>
								</div>
								<div className="text-sm text-text-secondary mb-1">
									{pick.player || 'Team'}
								</div>
								<div className="flex items-center justify-between text-sm">
									<span className="text-text-muted">
										{pick.frequency}x picked
									</span>
									<span
										className={`font-semibold ${
											pick.winrate >= 50
												? 'text-success'
												: 'text-error'
										}`}>
										{pick.winrate.toFixed(1)}% WR
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Ban Analysis */}
			{(favorite_bans || bans_against) && (
				<div className="card">
					<h3 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
						<Ban className="w-5 h-5 text-error" />
						Ban Analysis
					</h3>

					<div className="space-y-6">
						{/* Phase 1 */}
						<div>
							<div className="flex items-center justify-between mb-4">
								<h4 className="font-semibold text-text-primary">
									First Ban Phase (3 Bans)
								</h4>
								<button
									onClick={() => setExpandedBansPhase1(!expandedBansPhase1)}
									className="flex items-center gap-2 px-3 py-1 bg-surface-hover rounded-lg text-sm text-primary hover:bg-surface-lighter transition-colors"
								>
									{expandedBansPhase1 ? (
										<>
											<ChevronDown className="w-4 h-4" />
											Show Less
										</>
									) : (
										<>
											<ChevronRight className="w-4 h-4" />
											Show All
										</>
									)}
								</button>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Our Bans */}
								<div className="p-4 bg-surface-hover/50 rounded-lg border border-border/50">
									<h5 className="text-sm font-semibold text-primary mb-3">
										Team Ban Priority
									</h5>
									{favorite_bans?.phase_1 && favorite_bans.phase_1.length > 0 ? (
										<div className="space-y-2">
											{favorite_bans.phase_1.slice(0, expandedBansPhase1 ? undefined : 5).map((ban, idx) => (
												<div
													key={idx}
													className="flex items-center gap-3 p-2 bg-surface/40 rounded hover:bg-surface transition-colors"
												>
													{ban.champion_icon && (
														<div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
															<img
																src={ban.champion_icon}
																alt={ban.champion}
																className="w-full h-full object-cover scale-110"
																onError={(e) => e.target.style.display = 'none'}
															/>
														</div>
													)}
													<span className="flex-1 text-sm text-text-secondary">
														{ban.champion}
													</span>
													<span className="text-sm text-text-muted font-medium">
														{ban.frequency}x
													</span>
												</div>
											))}
										</div>
									) : (
										<p className="text-sm text-text-muted text-center py-4">No data</p>
									)}
								</div>

								{/* Bans Against Us */}
								<div className="p-4 bg-error/5 rounded-lg border border-error/20">
									<h5 className="text-sm font-semibold text-error mb-3">
										Target Bans (Against Team)
									</h5>
									{bans_against?.phase_1 && bans_against.phase_1.length > 0 ? (
										<div className="space-y-2">
											{bans_against.phase_1.slice(0, expandedBansPhase1 ? undefined : 5).map((ban, idx) => (
												<div
													key={idx}
													className="flex items-center gap-3 p-2 bg-surface/40 rounded hover:bg-surface transition-colors"
												>
													{ban.champion_icon && (
														<div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
															<img
																src={ban.champion_icon}
																alt={ban.champion}
																className="w-full h-full object-cover scale-110"
																onError={(e) => e.target.style.display = 'none'}
															/>
														</div>
													)}
													<span className="flex-1 text-sm text-text-secondary">
														{ban.champion}
													</span>
													<span className="text-sm text-text-muted font-medium">
														{ban.frequency}x
													</span>
												</div>
											))}
										</div>
									) : (
										<p className="text-sm text-text-muted text-center py-4">No data</p>
									)}
								</div>
							</div>
						</div>

						{/* Phase 2 */}
						<div>
							<div className="flex items-center justify-between mb-4">
								<h4 className="font-semibold text-text-primary">
									Second Ban Phase (2 Bans)
								</h4>
								<button
									onClick={() => setExpandedBansPhase2(!expandedBansPhase2)}
									className="flex items-center gap-2 px-3 py-1 bg-surface-hover rounded-lg text-sm text-primary hover:bg-surface-lighter transition-colors"
								>
									{expandedBansPhase2 ? (
										<>
											<ChevronDown className="w-4 h-4" />
											Show Less
										</>
									) : (
										<>
											<ChevronRight className="w-4 h-4" />
											Show All
										</>
									)}
								</button>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Our Bans */}
								<div className="p-4 bg-surface-hover/50 rounded-lg border border-border/50">
									<h5 className="text-sm font-semibold text-primary mb-3">
										Team Ban Priority
									</h5>
									{favorite_bans?.phase_2 && favorite_bans.phase_2.length > 0 ? (
										<div className="space-y-2">
											{favorite_bans.phase_2.slice(0, expandedBansPhase2 ? undefined : 5).map((ban, idx) => (
												<div
													key={idx}
													className="flex items-center gap-3 p-2 bg-surface/40 rounded hover:bg-surface transition-colors"
												>
													{ban.champion_icon && (
														<div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
															<img
																src={ban.champion_icon}
																alt={ban.champion}
																className="w-full h-full object-cover scale-110"
																onError={(e) => e.target.style.display = 'none'}
															/>
														</div>
													)}
													<span className="flex-1 text-sm text-text-secondary">
														{ban.champion}
													</span>
													<span className="text-sm text-text-muted font-medium">
														{ban.frequency}x
													</span>
												</div>
											))}
										</div>
									) : (
										<p className="text-sm text-text-muted text-center py-4">No data</p>
									)}
								</div>

								{/* Bans Against Us */}
								<div className="p-4 bg-error/5 rounded-lg border border-error/20">
									<h5 className="text-sm font-semibold text-error mb-3">
										Target Bans (Against Team)
									</h5>
									{bans_against?.phase_2 && bans_against.phase_2.length > 0 ? (
										<div className="space-y-2">
											{bans_against.phase_2.slice(0, expandedBansPhase2 ? undefined : 5).map((ban, idx) => (
												<div
													key={idx}
													className="flex items-center gap-3 p-2 bg-surface/40 rounded hover:bg-surface transition-colors"
												>
													{ban.champion_icon && (
														<div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
															<img
																src={ban.champion_icon}
																alt={ban.champion}
																className="w-full h-full object-cover scale-110"
																onError={(e) => e.target.style.display = 'none'}
															/>
														</div>
													)}
													<span className="flex-1 text-sm text-text-secondary">
														{ban.champion}
													</span>
													<span className="text-sm text-text-muted font-medium">
														{ban.frequency}x
													</span>
												</div>
											))}
										</div>
									) : (
										<p className="text-sm text-text-muted text-center py-4">No data</p>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
			</>
			)}

			{/* Player Champion Pools View */}
			{activeView === 'players' && (
				<div className="card">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h3 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
								<Users className="w-5 h-5 text-primary" />
								Player Champion Pools
							</h3>
							<p className="text-sm text-text-muted">
								Shows champion statistics for all players on the roster
							</p>
						</div>

						{/* View Mode Toggle */}
						<div className="rounded-lg bg-slate-700/30 p-1 inline-flex gap-1">
							<button
								onClick={() => setPlayerViewMode('overview')}
								className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-300 text-sm font-medium ${
									playerViewMode === 'overview'
										? 'bg-slate-600 text-white shadow-md'
										: 'text-slate-400 hover:text-white'
								}`}
							>
								<List className="w-4 h-4" />
								Overview
							</button>
							<button
								onClick={() => setPlayerViewMode('comparison')}
								className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-300 text-sm font-medium ${
									playerViewMode === 'comparison'
										? 'bg-slate-600 text-white shadow-md'
										: 'text-slate-400 hover:text-white'
								}`}
							>
								<Columns className="w-4 h-4" />
								Comparison
							</button>
						</div>
					</div>

					{!playerPools || !playerPools.players || playerPools.players.length === 0 ? (
						<p className="text-center py-8 text-text-muted">
							No player data available
						</p>
					) : playerViewMode === 'overview' ? (
						<div className="space-y-6">
							{playerPools.players.map((player) => (
								<div key={player.player_id} className="space-y-3">
									{/* Player Header */}
									<div className="flex items-center gap-3 pb-2 border-b border-border/50">
										{/* Player Icon */}
										<div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-border/50">
											<img
												src={getSummonerIconUrl(player.profile_icon_id)}
												alt={player.player_name}
												className="w-full h-full object-cover"
												onError={handleSummonerIconError}
											/>
										</div>
										<h4 className="text-lg font-bold text-text-primary">
											{player.player_name}
										</h4>
										{player.role && player.role !== 'UNKNOWN' && (
											<span className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded">
												{displayRole(player.role)}
											</span>
										)}
										{player.champions && player.champions.length > 0 && (
											<span className="text-sm text-text-muted">
												{player.champions.length} Champions
											</span>
										)}
									</div>

									{/* Champion Table */}
									{player.champions && player.champions.length > 0 ? (
										<div className="overflow-x-auto">
											<table className="w-full">
												<thead>
													<tr className="border-b border-border">
														<th className="text-left py-2 px-3 text-text-muted font-medium text-sm">
															Champion
														</th>
														<th className="text-center py-2 px-3 text-text-muted font-medium text-sm">
															Games
														</th>
														<th className="text-center py-2 px-3 text-text-muted font-medium text-sm">
															W-L
														</th>
														<th className="text-center py-2 px-3 text-text-muted font-medium text-sm">
															Winrate
														</th>
														<th className="text-center py-2 px-3 text-text-muted font-medium text-sm">
															KDA
														</th>
														<th className="text-center py-2 px-3 text-text-muted font-medium text-sm">
															CS/min
														</th>
													</tr>
												</thead>
												<tbody>
													{player.champions.map((champ) => (
														<tr
															key={`${player.player_id}-${champ.champion_id}`}
															className="border-b border-border/50 hover:bg-surface-hover transition-colors"
														>
															{/* Champion */}
															<td className="py-3 px-3">
																<div className="flex items-center gap-2">
																	{champ.champion_icon && (
																		<div className="w-8 h-8 rounded-full overflow-hidden">
																			<img
																				src={champ.champion_icon}
																				alt={champ.champion}
																				className="w-full h-full object-cover scale-110"
																				onError={(e) => {
																					e.target.style.display = 'none';
																				}}
																			/>
																		</div>
																	)}
																	<span className="font-semibold text-text-primary">
																		{champ.champion}
																	</span>
																</div>
															</td>

															{/* Games */}
															<td className="py-3 px-3 text-center">
																<span className="font-bold text-primary text-base">
																	{champ.games}
																</span>
															</td>

															{/* W-L */}
															<td className="py-3 px-3 text-center text-text-secondary">
																{champ.wins}-{champ.losses}
															</td>

															{/* Winrate */}
															<td className="py-3 px-3 text-center">
																<span
																	className={`font-semibold ${
																		champ.winrate >= 50
																			? 'text-green-400/60'
																			: 'text-red-400/60'
																	}`}
																>
																	{champ.winrate}%
																</span>
															</td>

															{/* KDA */}
															<td className="py-3 px-3 text-center">
																<span className="text-text-primary font-medium">
																	{champ.kda}
																</span>
															</td>

															{/* CS/min */}
															<td className="py-3 px-3 text-center">
																<span className="text-text-primary font-medium">
																	{champ.cs_per_min}
																</span>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									) : (
										<p className="text-sm text-text-muted text-center py-6 bg-surface-hover rounded">
											No champion data available
										</p>
									)}
								</div>
							))}
						</div>
					) : (
						/* Comparison View - Players Side by Side */
						<div className="overflow-x-auto pb-2">
							<div className="flex gap-3 pt-2" style={{ width: 'fit-content', minWidth: '100%' }}>
								{(() => {
									// Sort players: first 5 from predicted lineup, then rest by role
									const roleOrder = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];
									let sortedPlayers = [...playerPools.players];

									// If we have predictions, sort first 5 by predicted lineup
									if (predictions && predictions.length > 0 && predictions[0].predicted_lineup) {
										const predictedLineup = predictions[0].predicted_lineup;
										const predictedPlayerIds = roleOrder.map(role =>
											predictedLineup[role]?.player_id
										).filter(id => id);

										// Separate predicted and non-predicted players
										const predictedPlayers = [];
										const otherPlayers = [];

										sortedPlayers.forEach(player => {
											if (predictedPlayerIds.includes(player.player_id)) {
												predictedPlayers.push(player);
											} else {
												otherPlayers.push(player);
											}
										});

										// Sort predicted players by role order
										predictedPlayers.sort((a, b) => {
											const aIndex = roleOrder.indexOf(a.role);
											const bIndex = roleOrder.indexOf(b.role);
											return aIndex - bIndex;
										});

										// Sort other players by role
										otherPlayers.sort((a, b) => {
											const aIndex = roleOrder.indexOf(a.role);
											const bIndex = roleOrder.indexOf(b.role);
											return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
										});

										sortedPlayers = [...predictedPlayers, ...otherPlayers];
									} else {
										// No predictions: sort by role
										sortedPlayers.sort((a, b) => {
											const aIndex = roleOrder.indexOf(a.role);
											const bIndex = roleOrder.indexOf(b.role);
											return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
										});
									}

									return sortedPlayers.map((player, idx) => (
									<div
										key={player.player_id}
										className="flex-shrink-0"
										style={{
											width: '234px',
											minWidth: '234px'
										}}>
										{/* Player Header */}
										<div className="sticky top-0 bg-slate-700/50 backdrop-blur rounded-t-xl p-4 border border-slate-600/50 border-b-0">
											<div className="flex items-center gap-3 mb-2">
												{/* Player Icon */}
												<div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-border/50">
													<img
														src={getSummonerIconUrl(player.profile_icon_id)}
														alt={player.player_name}
														className="w-full h-full object-cover"
														onError={handleSummonerIconError}
													/>
												</div>
												<h4 className="text-base font-bold text-text-primary truncate flex-1">
													{player.player_name}
												</h4>
											</div>
											<div className="flex items-center gap-2">
												{player.role && player.role !== 'UNKNOWN' && (
													<span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded">
														{displayRole(player.role)}
													</span>
												)}
												{player.champions && player.champions.length > 0 && (
													<span className="text-xs text-text-muted">
														{player.champions.length} Champions
													</span>
												)}
											</div>
										</div>

										{/* Champion List */}
										<div className="bg-slate-800/40 rounded-b-xl border border-slate-600/50 border-t-0 max-h-[700px] overflow-y-auto">
											{player.champions && player.champions.length > 0 ? (
												<div className="divide-y divide-border/30 p-2 pr-1">
													{player.champions.map((champ) => (
														<div
															key={`${player.player_id}-${champ.champion_id}`}
															className="p-3 hover:bg-surface-hover transition-colors rounded-lg"
														>
															<div className="flex items-center gap-3">
																{champ.champion_icon && (
																	<div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
																		<img
																			src={champ.champion_icon}
																			alt={champ.champion}
																			className="w-full h-full object-cover scale-110"
																			onError={(e) => {
																				e.target.style.display = 'none';
																			}}
																		/>
																	</div>
																)}
																<div className="flex-1 min-w-0">
																	<p className="font-semibold text-text-primary text-sm truncate">
																		{champ.champion}
																	</p>
																	<div className="flex items-center gap-3 mt-1">
																		<div className="flex items-center gap-1.5">
																			<span className="text-lg font-bold text-cyan-400">
																				{champ.games}
																			</span>
																			<span className="text-xs text-text-muted">
																				Games
																			</span>
																		</div>
																		<span
																			className={`text-sm font-semibold ${
																				champ.winrate >= 50
																					? 'text-green-400/60'
																					: 'text-red-400/60'
																			}`}>
																			{champ.winrate}%
																		</span>
																	</div>
																</div>
															</div>
														</div>
													))}
												</div>
											) : (
												<p className="text-xs text-text-muted text-center py-8">
													No champion data
												</p>
											)}
										</div>
									</div>
									));
								})()}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default ChampionPoolTab;
