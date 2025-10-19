import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
	Users,
	TrendingUp,
	Target,
	FileText,
	ArrowLeft,
	Trophy,
	Clock,
	Swords,
	Trash2,
	UserPlus,
	RefreshCw,
	X,
} from 'lucide-react';
import api from '../config/api';

const TeamDetail = () => {
	const { id } = useParams();
	const [team, setTeam] = useState(null);
	const [roster, setRoster] = useState([]);
	const [stats, setStats] = useState(null);
	const [activeTab, setActiveTab] = useState('overview');
	const [loading, setLoading] = useState(true);
	const [statsLoading, setStatsLoading] = useState(false);

	// Roster management states
	const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
	const [showSyncModal, setShowSyncModal] = useState(false);
	const [showRemoveConfirm, setShowRemoveConfirm] = useState(null);
	const [addPlayerUrl, setAddPlayerUrl] = useState('');
	const [syncUrl, setSyncUrl] = useState('');
	const [addingPlayer, setAddingPlayer] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [removingPlayer, setRemovingPlayer] = useState(false);

	useEffect(() => {
		fetchTeamData();
	}, [id]);

	const fetchTeamData = async () => {
		try {
			const [teamRes, rosterRes, statsRes] = await Promise.all([
				api.get(`/teams/${id}`),
				api.get(`/teams/${id}/roster`),
				api.get(`/teams/${id}/stats?stat_type=tournament`),
			]);

			setTeam(teamRes.data);
			setRoster(rosterRes.data.roster || []);
			setStats(statsRes.data.stats);
			setSyncUrl(teamRes.data.opgg_url || '');
		} catch (error) {
			console.error('Failed to fetch team data:', error);
		} finally {
			setLoading(false);
		}
	};

	const fetchAndCalculateStats = async () => {
		setStatsLoading(true);
		try {
			await api.post(`/teams/${id}/fetch-matches`, {
				count_per_player: 50,
			});

			await api.post(`/teams/${id}/link-matches`);
			await api.post(`/teams/${id}/calculate-stats`);

			const statsRes = await api.get(
				`/teams/${id}/stats?stat_type=tournament`
			);
			setStats(statsRes.data.stats);
		} catch (error) {
			console.error('Failed to fetch and calculate stats:', error);
		} finally {
			setStatsLoading(false);
		}
	};

	const handleAddPlayer = async () => {
		if (!addPlayerUrl.trim()) {
			alert('Bitte OP.GG URL eingeben');
			return;
		}

		setAddingPlayer(true);
		try {
			await api.post(`/teams/${id}/roster/add`, {
				opgg_url: addPlayerUrl,
			});

			await fetchTeamData();
			setShowAddPlayerModal(false);
			setAddPlayerUrl('');
		} catch (error) {
			console.error('Failed to add player:', error);
			alert(
				error.response?.data?.error ||
					'Fehler beim Hinzufügen des Spielers'
			);
		} finally {
			setAddingPlayer(false);
		}
	};

	const handleSyncFromOpgg = async () => {
		if (!syncUrl.trim()) {
			alert('Bitte OP.GG URL eingeben');
			return;
		}

		setSyncing(true);
		try {
			const response = await api.post(`/teams/${id}/sync-from-opgg`, {
				opgg_url: syncUrl,
			});

			alert(
				`Roster synchronisiert!\n${response.data.players_added} hinzugefügt, ${response.data.players_removed} entfernt`
			);

			await fetchTeamData();
			setShowSyncModal(false);
		} catch (error) {
			console.error('Failed to sync roster:', error);
			alert(error.response?.data?.error || 'Fehler beim Synchronisieren');
		} finally {
			setSyncing(false);
		}
	};

	const handleRemovePlayer = async (playerId, deleteFromDb = false) => {
		setRemovingPlayer(true);
		try {
			await api.delete(
				`/teams/${id}/roster/${playerId}?delete_player=${deleteFromDb}`
			);

			await fetchTeamData();
			setShowRemoveConfirm(null);
		} catch (error) {
			console.error('Failed to remove player:', error);
			alert(
				error.response?.data?.error ||
					'Fehler beim Entfernen des Spielers'
			);
		} finally {
			setRemovingPlayer(false);
		}
	};

	const formatDuration = (seconds) => {
		if (!seconds) return 'N/A';
		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${minutes}:${String(secs).padStart(2, '0')}`;
	};

	const getRoleColor = (role) => {
		const colors = {
			TOP: 'bg-blue-500',
			JUNGLE: 'bg-green-500',
			MIDDLE: 'bg-purple-500',
			BOTTOM: 'bg-red-500',
			UTILITY: 'bg-yellow-500',
		};
		return colors[role] || 'bg-gray-500';
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
					<div className="flex gap-3">
						{!stats && (
							<button
								onClick={fetchAndCalculateStats}
								disabled={statsLoading}
								className="btn btn-primary">
								{statsLoading
									? 'Lädt Stats...'
									: 'Stats berechnen'}
							</button>
						)}
						{stats && (
							<button
								onClick={fetchAndCalculateStats}
								disabled={statsLoading}
								className="btn btn-secondary">
								{statsLoading
									? 'Aktualisiert...'
									: 'Stats aktualisieren'}
							</button>
						)}
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
				{activeTab === 'overview' && (
					<>
						{stats ? (
							<div className="space-y-6">
								<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
									<div className="card">
										<div className="flex items-center gap-3 mb-2">
											<Trophy className="w-5 h-5 text-primary" />
											<span className="text-text-muted text-sm">
												Spiele
											</span>
										</div>
										<p className="text-2xl font-bold text-text-primary">
											{stats.games_played}
										</p>
										<p className="text-sm text-text-secondary mt-1">
											{stats.wins}W - {stats.losses}L
										</p>
									</div>

									<div className="card">
										<div className="flex items-center gap-3 mb-2">
											<TrendingUp className="w-5 h-5 text-success" />
											<span className="text-text-muted text-sm">
												Winrate
											</span>
										</div>
										<p className="text-2xl font-bold text-success">
											{stats.winrate}%
										</p>
									</div>

									<div className="card">
										<div className="flex items-center gap-3 mb-2">
											<Clock className="w-5 h-5 text-accent" />
											<span className="text-text-muted text-sm">
												Avg. Spieldauer
											</span>
										</div>
										<p className="text-2xl font-bold text-text-primary">
											{formatDuration(
												stats.average_game_duration
											)}
										</p>
									</div>

									<div className="card">
										<div className="flex items-center gap-3 mb-2">
											<Swords className="w-5 h-5 text-error" />
											<span className="text-text-muted text-sm">
												First Blood
											</span>
										</div>
										<p className="text-2xl font-bold text-text-primary">
											{stats.first_blood_rate?.toFixed(
												1
											) || 0}
											%
										</p>
									</div>
								</div>

								<div className="card">
									<h2 className="text-xl font-bold text-text-primary mb-4">
										Tournament Stats
									</h2>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<div>
											<h3 className="text-sm font-medium text-text-muted mb-3">
												Early Game
											</h3>
											<div className="space-y-3">
												<div className="flex items-center justify-between">
													<span className="text-text-secondary">
														First Blood Rate
													</span>
													<span className="font-semibold text-text-primary">
														{stats.first_blood_rate?.toFixed(
															1
														) || 0}
														%
													</span>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-text-secondary">
														First Tower Rate
													</span>
													<span className="font-semibold text-text-primary">
														{stats.first_tower_rate?.toFixed(
															1
														) || 0}
														%
													</span>
												</div>
												{stats.first_dragon_rate && (
													<div className="flex items-center justify-between">
														<span className="text-text-secondary">
															First Dragon Rate
														</span>
														<span className="font-semibold text-text-primary">
															{stats.first_dragon_rate.toFixed(
																1
															)}
															%
														</span>
													</div>
												)}
											</div>
										</div>

										<div>
											<h3 className="text-sm font-medium text-text-muted mb-3">
												Gold Differentials
											</h3>
											<div className="space-y-3">
												{stats.average_gold_diff_at_10 !==
												null ? (
													<>
														<div className="flex items-center justify-between">
															<span className="text-text-secondary">
																Gold @10
															</span>
															<span
																className={`font-semibold ${
																	stats.average_gold_diff_at_10 >=
																	0
																		? 'text-success'
																		: 'text-error'
																}`}>
																{stats.average_gold_diff_at_10 >=
																0
																	? '+'
																	: ''}
																{
																	stats.average_gold_diff_at_10
																}
															</span>
														</div>
														{stats.average_gold_diff_at_15 !==
															null && (
															<div className="flex items-center justify-between">
																<span className="text-text-secondary">
																	Gold @15
																</span>
																<span
																	className={`font-semibold ${
																		stats.average_gold_diff_at_15 >=
																		0
																			? 'text-success'
																			: 'text-error'
																	}`}>
																	{stats.average_gold_diff_at_15 >=
																	0
																		? '+'
																		: ''}
																	{
																		stats.average_gold_diff_at_15
																	}
																</span>
															</div>
														)}
														{stats.comeback_win_rate !==
															null &&
															stats.comeback_win_rate >
																0 && (
																<div className="flex items-center justify-between">
																	<span className="text-text-secondary">
																		Comeback
																		Win Rate
																	</span>
																	<span className="font-semibold text-success">
																		{stats.comeback_win_rate.toFixed(
																			1
																		)}
																		%
																	</span>
																</div>
															)}
													</>
												) : (
													<div className="text-sm text-text-muted">
														Keine Timeline-Daten
														verfügbar
													</div>
												)}
											</div>
										</div>
									</div>
								</div>
							</div>
						) : (
							<div className="card text-center py-12">
								<Target className="w-12 h-12 text-text-muted mx-auto mb-4" />
								<p className="text-text-secondary mb-4">
									Noch keine Stats verfügbar
								</p>
								<button
									onClick={fetchAndCalculateStats}
									disabled={statsLoading}
									className="btn btn-primary">
									{statsLoading
										? 'Lädt Stats...'
										: 'Stats jetzt berechnen'}
								</button>
							</div>
						)}
					</>
				)}

				{activeTab === 'players' && (
					<>
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-bold text-text-primary">
								Roster ({roster.length})
							</h2>
							<div className="flex gap-3">
								<button
									onClick={() => setShowSyncModal(true)}
									className="btn btn-secondary flex items-center gap-2">
									<RefreshCw className="w-4 h-4" />
									Mit OP.GG synchronisieren
								</button>
								<button
									onClick={() => setShowAddPlayerModal(true)}
									className="btn btn-primary flex items-center gap-2">
									<UserPlus className="w-4 h-4" />
									Spieler hinzufügen
								</button>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{roster.map((entry) => (
								<div
									key={entry.id}
									className="card hover:bg-surface-hover transition-all duration-200 group">
									<div className="flex items-center gap-4">
										<div
											className={`w-3 h-3 rounded-full ${getRoleColor(
												entry.role
											)}`}
										/>
										<Link
											to={`/players/${entry.player.id}`}
											className="flex-1">
											<h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors">
												{entry.player.summoner_name}
											</h3>
											<p className="text-sm text-text-muted">
												{entry.role || 'Unknown'}
											</p>
										</Link>
										{entry.player.current_rank && (
											<span className="text-sm text-text-secondary">
												{entry.player.current_rank}
											</span>
										)}
										<button
											onClick={() =>
												setShowRemoveConfirm(entry)
											}
											className="p-2 hover:bg-error/10 rounded-lg transition-colors"
											title="Spieler entfernen">
											<Trash2 className="w-4 h-4 text-error" />
										</button>
									</div>
								</div>
							))}
						</div>
					</>
				)}

				{activeTab === 'drafts' && (
					<div className="card text-center py-12">
						<Target className="w-12 h-12 text-text-muted mx-auto mb-4" />
						<p className="text-text-secondary">
							Draft Analyse wird geladen...
						</p>
					</div>
				)}

				{activeTab === 'report' && (
					<div className="card text-center py-12">
						<FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
						<p className="text-text-secondary">
							Scouting Report wird generiert...
						</p>
					</div>
				)}
			</div>

			{/* Add Player Modal */}
			{showAddPlayerModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
					<div className="card max-w-md w-full">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-xl font-bold text-text-primary">
								Spieler hinzufügen
							</h3>
							<button
								onClick={() => setShowAddPlayerModal(false)}
								className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
								<X className="w-5 h-5 text-text-muted" />
							</button>
						</div>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-text-secondary mb-2">
									OP.GG Spieler URL
								</label>
								<input
									type="url"
									value={addPlayerUrl}
									onChange={(e) =>
										setAddPlayerUrl(e.target.value)
									}
									placeholder="https://op.gg/summoners/euw/Faker-KR1"
									className="input w-full"
								/>
							</div>
							<div className="flex gap-3">
								<button
									onClick={() => setShowAddPlayerModal(false)}
									className="btn btn-secondary flex-1"
									disabled={addingPlayer}>
									Abbrechen
								</button>
								<button
									onClick={handleAddPlayer}
									className="btn btn-primary flex-1"
									disabled={addingPlayer}>
									{addingPlayer
										? 'Fügt hinzu...'
										: 'Hinzufügen'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Sync from OP.GG Modal */}
			{showSyncModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
					<div className="card max-w-md w-full">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-xl font-bold text-text-primary">
								Mit OP.GG synchronisieren
							</h3>
							<button
								onClick={() => setShowSyncModal(false)}
								className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
								<X className="w-5 h-5 text-text-muted" />
							</button>
						</div>
						<p className="text-sm text-text-secondary mb-4">
							Das Roster wird mit dem OP.GG Multisearch
							synchronisiert. Spieler die nicht mehr im OP.GG sind
							werden entfernt, neue Spieler werden hinzugefügt.
						</p>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-text-secondary mb-2">
									OP.GG Multisearch URL
								</label>
								<input
									type="url"
									value={syncUrl}
									onChange={(e) => setSyncUrl(e.target.value)}
									placeholder="https://op.gg/multisearch/euw?summoners=..."
									className="input w-full"
								/>
							</div>
							<div className="flex gap-3">
								<button
									onClick={() => setShowSyncModal(false)}
									className="btn btn-secondary flex-1"
									disabled={syncing}>
									Abbrechen
								</button>
								<button
									onClick={handleSyncFromOpgg}
									className="btn btn-primary flex-1"
									disabled={syncing}>
									{syncing
										? 'Synchronisiert...'
										: 'Synchronisieren'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Remove Player Confirmation Modal */}
			{showRemoveConfirm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
					<div className="card max-w-md w-full">
						<h3 className="text-xl font-bold text-text-primary mb-4">
							Spieler entfernen
						</h3>
						<p className="text-text-secondary mb-6">
							Was möchtest du mit{' '}
							{showRemoveConfirm.player.summoner_name} machen?
						</p>
						<div className="space-y-3">
							<button
								onClick={() =>
									handleRemovePlayer(
										showRemoveConfirm.player.id,
										false
									)
								}
								className="btn btn-secondary w-full"
								disabled={removingPlayer}>
								Nur aus Team entfernen (Spieler bleibt in DB)
							</button>
							<button
								onClick={() =>
									handleRemovePlayer(
										showRemoveConfirm.player.id,
										true
									)
								}
								className="btn bg-error hover:bg-error/80 text-white w-full"
								disabled={removingPlayer}>
								Aus Team entfernen UND aus Datenbank löschen
							</button>
							<button
								onClick={() => setShowRemoveConfirm(null)}
								className="btn btn-secondary w-full"
								disabled={removingPlayer}>
								Abbrechen
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default TeamDetail;
