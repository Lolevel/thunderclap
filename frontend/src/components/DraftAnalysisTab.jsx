import { useEffect, useState } from 'react';
import { Target, Ban, TrendingUp, Award } from 'lucide-react';
import api from '../config/api';

const DraftAnalysisTab = ({ teamId }) => {
	const [draftData, setDraftData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetchDraftAnalysis();
	}, [teamId]);

	const fetchDraftAnalysis = async () => {
		try {
			setLoading(true);
			const response = await api.get(`/teams/${teamId}/draft-analysis`);
			setDraftData(response.data);
		} catch (err) {
			console.error('Failed to fetch draft analysis:', err);
			setError('Fehler beim Laden der Draft-Analyse');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-pulse text-text-muted">
					Lädt Draft-Analyse...
				</div>
			</div>
		);
	}

	if (error || !draftData) {
		return (
			<div className="card text-center py-12">
				<p className="text-text-secondary">
					{error || 'Keine Daten verfügbar'}
				</p>
			</div>
		);
	}

	const {
		team_champion_pool,
		favorite_bans,
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
							Draft Analyse
						</h2>
						<p className="text-text-secondary">
							Basierend auf {matches_analyzed} analysierten
							Spielen
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
										Spieler
									</th>
									<th className="text-center py-2 px-3 text-text-muted font-medium">
										Picks
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
									.map((champ, index) => (
										<tr
											key={index}
											className="border-b border-border/50 hover:bg-surface-hover transition-colors">
											<td className="py-3 px-3">
												<div className="flex items-center gap-2">
													{champ.champion_icon && (
														<div className="w-8 h-8 rounded-full overflow-hidden">
															<img
																src={
																	champ.champion_icon
																}
																alt={
																	champ.champion
																}
																className="w-full h-full object-cover scale-110"
																onError={(
																	e
																) => {
																	e.target.style.display =
																		'none';
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
									))}
							</tbody>
						</table>
					</div>
				) : (
					<p className="text-center py-8 text-text-muted">
						Keine Champion-Daten verfügbar
					</p>
				)}
			</div>

			{/* First Pick Priority */}
			{first_pick_priority && first_pick_priority.length > 0 && (
				<div className="card">
					<h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
						<Award className="w-5 h-5 text-accent" />
						First Pick Priorität
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
										{pick.frequency}x gepickt
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

			{/* Favorite Bans */}
			{favorite_bans && (
				<div className="card">
					<h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
						<Ban className="w-5 h-5 text-error" />
						Lieblings-Bans (Nach Rotation)
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{['rotation_1', 'rotation_2'].map(
							(rotation, rotIdx) => (
								<div
									key={rotation}
									className="p-4 bg-surface-hover rounded-lg">
									<h4 className="font-semibold text-text-primary mb-3">
										Rotation {rotIdx + 1}
									</h4>
									{favorite_bans[rotation] &&
									favorite_bans[rotation].length > 0 ? (
										<div className="space-y-2">
											{favorite_bans[rotation].map(
												(ban, idx) => (
													<div
														key={idx}
														className="flex items-center justify-between text-sm">
														<span className="text-text-secondary">
															{ban.champion}
														</span>
														<span className="text-text-muted">
															{ban.frequency}x
														</span>
													</div>
												)
											)}
										</div>
									) : (
										<p className="text-sm text-text-muted">
											Keine Daten
										</p>
									)}
								</div>
							)
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default DraftAnalysisTab;
