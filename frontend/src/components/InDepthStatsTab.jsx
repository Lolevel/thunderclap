import { useEffect, useState } from 'react';
import { FileText, Clock, Swords, Shield, Target, TrendingUp } from 'lucide-react';
import api from '../config/api';

const InDepthStatsTab = ({ teamId }) => {
	const [report, setReport] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetchScoutingReport();
	}, [teamId]);

	const fetchScoutingReport = async () => {
		try {
			setLoading(true);
			const response = await api.get(`/teams/${teamId}/scouting-report`);
			setReport(response.data);
		} catch (err) {
			console.error('Failed to fetch in-depth stats:', err);
			setError('Failed to load in-depth statistics');
		} finally {
			setLoading(false);
		}
	};

	const formatDuration = (seconds) => {
		if (!seconds) return 'N/A';
		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${minutes}:${String(secs).padStart(2, '0')}`;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-pulse text-text-muted">
					Loading In-Depth Stats...
				</div>
			</div>
		);
	}

	if (error || !report) {
		return (
			<div className="card text-center py-12">
				<p className="text-text-secondary">{error || 'No data available'}</p>
			</div>
		);
	}

	const {
		side_performance,
		avg_game_duration,
		first_blood_rate,
		first_tower_rate,
		objective_control,
		timeline_data,
		total_games
	} = report;

	// Show message if no games available
	if (!total_games || total_games === 0) {
		return (
			<div className="card text-center py-12">
				<FileText className="w-16 h-16 text-text-muted mx-auto mb-4" />
				<h3 className="text-xl font-bold text-text-primary mb-2">
					Keine Spiele gefunden
				</h3>
				<p className="text-text-secondary">
					Bitte lade zuerst Spieldaten für dieses Team, um Statistiken zu erstellen.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="card bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20">
				<div className="flex items-center gap-4">
					<FileText className="w-12 h-12 text-accent" />
					<div>
						<h2 className="text-xl font-bold text-text-primary mb-1">
							In Depth Info
						</h2>
						<p className="text-text-secondary">
							Detaillierte Spielstatistiken basierend auf {total_games} Spielen
						</p>
					</div>
				</div>
			</div>

			{/* Side Performance */}
			{side_performance && (
				<div className="card">
					<h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
						<Shield className="w-5 h-5 text-primary" />
						Seiten-Performance
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
							<div className="flex items-center justify-between mb-4">
								<h4 className="font-bold text-text-primary text-lg">Blue Side</h4>
								<span className={`text-2xl font-bold ${
									(side_performance.blue.winrate || 0) >= 50 ? 'text-success' : 'text-error'
								}`}>
									{(side_performance.blue.winrate || 0).toFixed(1)}%
								</span>
							</div>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-text-muted">Spiele:</span>
									<span className="font-semibold text-text-primary">
										{side_performance.blue.games}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-text-muted">Siege:</span>
									<span className="font-semibold text-success">
										{side_performance.blue.wins}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-text-muted">Niederlagen:</span>
									<span className="font-semibold text-error">
										{side_performance.blue.losses}
									</span>
								</div>
							</div>
						</div>

						<div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
							<div className="flex items-center justify-between mb-4">
								<h4 className="font-bold text-text-primary text-lg">Red Side</h4>
								<span className={`text-2xl font-bold ${
									(side_performance.red.winrate || 0) >= 50 ? 'text-success' : 'text-error'
								}`}>
									{(side_performance.red.winrate || 0).toFixed(1)}%
								</span>
							</div>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-text-muted">Spiele:</span>
									<span className="font-semibold text-text-primary">
										{side_performance.red.games}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-text-muted">Siege:</span>
									<span className="font-semibold text-success">
										{side_performance.red.wins}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-text-muted">Niederlagen:</span>
									<span className="font-semibold text-error">
										{side_performance.red.losses}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Game Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="card">
					<div className="flex items-center gap-3 mb-2">
						<Clock className="w-5 h-5 text-accent" />
						<span className="text-text-muted text-sm">Durchschn. Spieldauer</span>
					</div>
					<p className="text-2xl font-bold text-text-primary">
						{formatDuration(avg_game_duration)}
					</p>
				</div>

				<div className="card">
					<div className="flex items-center gap-3 mb-2">
						<Swords className="w-5 h-5 text-error" />
						<span className="text-text-muted text-sm">First Blood Rate</span>
					</div>
					<p className="text-2xl font-bold text-text-primary">
						{first_blood_rate.toFixed(1)}%
					</p>
				</div>

				<div className="card">
					<div className="flex items-center gap-3 mb-2">
						<Target className="w-5 h-5 text-primary" />
						<span className="text-text-muted text-sm">First Tower Rate</span>
					</div>
					<p className="text-2xl font-bold text-text-primary">
						{first_tower_rate.toFixed(1)}%
					</p>
				</div>
			</div>

			{/* Objective Control */}
			{objective_control && (
				<div className="card">
					<h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
						<Target className="w-5 h-5 text-accent" />
						Objective Control
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="p-4 bg-surface-hover rounded-lg">
							<div className="text-text-muted text-sm mb-1">Durchschn. Dragons/Game</div>
							<div className="text-2xl font-bold text-text-primary">
								{objective_control.avg_dragons.toFixed(1)}
							</div>
						</div>

						<div className="p-4 bg-surface-hover rounded-lg">
							<div className="text-text-muted text-sm mb-1">Durchschn. Barons/Game</div>
							<div className="text-2xl font-bold text-text-primary">
								{objective_control.avg_barons.toFixed(1)}
							</div>
						</div>

						<div className="p-4 bg-surface-hover rounded-lg">
							<div className="text-text-muted text-sm mb-1">Durchschn. Heralds/Game</div>
							<div className="text-2xl font-bold text-text-primary">
								{objective_control.avg_heralds.toFixed(1)}
							</div>
						</div>
					</div>
					{(objective_control.avg_dragons === 0 && objective_control.avg_barons === 0) && (
						<div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
							<p className="text-sm text-text-secondary">
								<strong>Hinweis:</strong> Objective-Daten werden aus Timeline-Daten extrahiert.
								Diese Statistiken werden in zukünftigen Versionen verfügbar sein.
							</p>
						</div>
					)}
				</div>
			)}

			{/* Timeline Data */}
			{timeline_data && (timeline_data.avg_gold_diff_15 !== null || timeline_data.avg_gold_diff_10 !== null) && (
				<div className="card">
					<h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
						<TrendingUp className="w-5 h-5 text-success" />
						Timeline Data (Early Game)
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{timeline_data.avg_gold_diff_10 !== null && (
							<div className="p-4 bg-surface-hover rounded-lg">
								<div className="text-text-muted text-sm mb-1">Durchschn. Gold Diff @ 10min</div>
								<div className={`text-2xl font-bold ${
									timeline_data.avg_gold_diff_10 >= 0 ? 'text-success' : 'text-error'
								}`}>
									{timeline_data.avg_gold_diff_10 >= 0 ? '+' : ''}
									{timeline_data.avg_gold_diff_10}
								</div>
							</div>
						)}

						{timeline_data.avg_gold_diff_15 !== null && (
							<div className="p-4 bg-surface-hover rounded-lg">
								<div className="text-text-muted text-sm mb-1">Durchschn. Gold Diff @ 15min</div>
								<div className={`text-2xl font-bold ${
									timeline_data.avg_gold_diff_15 >= 0 ? 'text-success' : 'text-error'
								}`}>
									{timeline_data.avg_gold_diff_15 >= 0 ? '+' : ''}
									{timeline_data.avg_gold_diff_15}
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Summary */}
			<div className="card bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
				<h3 className="text-lg font-bold text-text-primary mb-3">Zusammenfassung</h3>
				<div className="space-y-2 text-text-secondary">
					<p>
						• Das Team bevorzugt <strong className="text-text-primary">
							{side_performance && side_performance.blue.winrate > side_performance.red.winrate ? 'Blue Side' : 'Red Side'}
						</strong> mit einer Winrate von{' '}
						<strong className="text-text-primary">
							{side_performance && Math.max(side_performance.blue.winrate, side_performance.red.winrate).toFixed(1)}%
						</strong>
					</p>
					<p>
						• Durchschnittliche Spieldauer: <strong className="text-text-primary">{formatDuration(avg_game_duration)}</strong>
					</p>
					<p>
						• First Blood Rate: <strong className="text-text-primary">{first_blood_rate.toFixed(1)}%</strong>{' '}
						{first_blood_rate >= 60 ? '(Aggressiv)' : '(Passiv)'}
					</p>
					<p>
						• First Tower Rate: <strong className="text-text-primary">{first_tower_rate.toFixed(1)}%</strong>{' '}
						{first_tower_rate >= 60 ? '(Gute Early Game Kontrolle)' : ''}
					</p>
				</div>
			</div>
		</div>
	);
};

export default InDepthStatsTab;
