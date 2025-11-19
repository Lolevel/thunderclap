import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
	Users,
	ExternalLink,
	Trash2,
	UserPlus,
	RefreshCw,
	X,
	CheckSquare,
	Square,
	Target,
	TrendingUp
} from 'lucide-react';
import { displayRole, sortByRole } from '../utils/roleMapping';
import { openPlayerOpgg, openTeamOpgg } from '../utils/opggHelper';
import { getSummonerIconUrl, handleSummonerIconError } from '../utils/summonerHelper';
import RoleIcon from './RoleIcon';

const PlayersTab = ({
	roster,
	teamId,
	predictions,
	onRefresh,
	onRemovePlayer,
	onAddPlayer,
	onSyncRoster
}) => {
	const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
	const [showSyncModal, setShowSyncModal] = useState(false);
	const [showRemoveConfirm, setShowRemoveConfirm] = useState(null);
	const [addPlayerUrl, setAddPlayerUrl] = useState('');
	const [syncUrl, setSyncUrl] = useState('');
	const [addingPlayer, setAddingPlayer] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [removingPlayer, setRemovingPlayer] = useState(false);
	const [selectedPlayers, setSelectedPlayers] = useState([]);
	const [showAllPredictions, setShowAllPredictions] = useState(false);

	const sortedRoster = sortByRole(roster);

	// Calculate max games for visual scaling
	const maxGames = Math.max(...roster.map(r => r.tournament_games || 0), 1);
	const avgGames = roster.length > 0
		? roster.reduce((sum, r) => sum + (r.tournament_games || 0), 0) / roster.length
		: 0;

	const getRoleColor = (role) => {
		const colors = {
			TOP: 'bg-blue-500',
			JUNGLE: 'bg-green-500',
			MIDDLE: 'bg-purple-500',
			BOTTOM: 'bg-red-500',
			UTILITY: 'bg-yellow-500',
		};
		return colors[role?.toUpperCase()] || 'bg-gray-500';
	};

	const handleAddPlayer = async () => {
		if (!addPlayerUrl.trim()) {
			alert('Bitte OP.GG URL eingeben');
			return;
		}

		setAddingPlayer(true);
		try {
			await onAddPlayer(addPlayerUrl);
			setShowAddPlayerModal(false);
			setAddPlayerUrl('');
		} catch (error) {
			console.error('Failed to add player:', error);
			alert(error.response?.data?.error || 'Fehler beim Hinzufügen des Spielers');
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
			const response = await onSyncRoster(syncUrl);
			alert(
				`Roster synchronisiert!\n${response.players_added} hinzugefügt, ${response.players_removed} entfernt`
			);
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
			await onRemovePlayer(playerId, deleteFromDb);
			setShowRemoveConfirm(null);
		} catch (error) {
			console.error('Failed to remove player:', error);
			alert(error.response?.data?.error || 'Fehler beim Entfernen des Spielers');
		} finally {
			setRemovingPlayer(false);
		}
	};

	const togglePlayerSelection = (playerId) => {
		setSelectedPlayers(prev =>
			prev.includes(playerId)
				? prev.filter(id => id !== playerId)
				: [...prev, playerId]
		);
	};

	const handleOpenMultiOpgg = async () => {
		if (selectedPlayers.length === 0) {
			alert('Bitte wähle mindestens einen Spieler aus');
			return;
		}
		await openTeamOpgg(teamId, selectedPlayers);
	};

	const handleOpenFullTeamOpgg = async () => {
		await openTeamOpgg(teamId);
	};

	return (
		<div>
			{/* Header with Actions */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4 mb-4">
				<h2 className="text-lg md:text-xl font-bold text-text-primary flex items-center gap-2">
					<Users className="w-4 h-4 md:w-5 md:h-5" />
					Roster ({roster.length})
				</h2>
				<div className="flex flex-wrap gap-2 md:gap-3">
					{selectedPlayers.length > 0 && (
						<button
							onClick={handleOpenMultiOpgg}
							className="btn btn-accent flex items-center gap-1.5 md:gap-2 text-xs md:text-sm px-2.5 md:px-4 py-1.5 md:py-2">
							<ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4" />
							<span className="hidden sm:inline">Ausgewählte in OP.GG öffnen ({selectedPlayers.length})</span>
							<span className="sm:hidden">Auswahl ({selectedPlayers.length})</span>
						</button>
					)}
					<button
						onClick={handleOpenFullTeamOpgg}
						className="btn btn-secondary flex items-center gap-1.5 md:gap-2 text-xs md:text-sm px-2.5 md:px-4 py-1.5 md:py-2">
						<ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4" />
						<span className="hidden sm:inline">Team OP.GG</span>
						<span className="sm:hidden">OP.GG</span>
					</button>
					<button
						onClick={() => setShowSyncModal(true)}
						className="btn btn-secondary flex items-center gap-1.5 md:gap-2 text-xs md:text-sm px-2.5 md:px-4 py-1.5 md:py-2">
						<RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4" />
						<span className="hidden sm:inline">Mit OP.GG synchronisieren</span>
						<span className="sm:hidden">Sync</span>
					</button>
					<button
						onClick={() => setShowAddPlayerModal(true)}
						className="btn btn-primary flex items-center gap-1.5 md:gap-2 text-xs md:text-sm px-2.5 md:px-4 py-1.5 md:py-2">
						<UserPlus className="w-3.5 h-3.5 md:w-4 md:h-4" />
						<span className="hidden sm:inline">Spieler hinzufügen</span>
						<span className="sm:hidden">+</span>
					</button>
				</div>
			</div>

			{/* Roster Table - Fixed Width Layout */}
			<div className="grid grid-cols-1 gap-2">
				{sortedRoster.map((entry) => (
					<div
						key={`${entry.id}-${entry.player.id}`}
						className="flex items-center gap-2 md:gap-3 px-2 sm:px-3 md:px-4 py-2 md:py-2.5 bg-surface/40 hover:bg-surface-hover rounded-lg border border-border/50 hover:border-primary/30 transition-all duration-200 group">
						{/* Checkbox - Fixed */}
						<button
							onClick={() => togglePlayerSelection(entry.player.id)}
							className="w-3.5 md:w-4 flex-shrink-0">
							{selectedPlayers.includes(entry.player.id) ? (
								<CheckSquare className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
							) : (
								<Square className="w-3.5 h-3.5 md:w-4 md:h-4 text-text-muted" />
							)}
						</button>

						{/* Role icon - Fixed */}
						<div className="w-4 md:w-5 flex-shrink-0">
							<RoleIcon role={entry.role} size={16} className="md:w-5 md:h-5" />
						</div>

						{/* Player Icon - Fixed */}
						<div className="w-7 h-7 md:w-8 md:h-8 rounded-lg overflow-hidden flex-shrink-0 border border-border/50">
							<img
								src={getSummonerIconUrl(entry.player.profile_icon_id)}
								alt={entry.player.summoner_name}
								className="w-full h-full object-cover"
								onError={handleSummonerIconError}
							/>
						</div>

						{/* Player Name - Flexible */}
						<Link
							to={`/players/${entry.player.id}`}
							className="flex-1 min-w-0">
							<h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors truncate text-sm md:text-base">
								{entry.player.summoner_name}
							</h3>
						</Link>

						{/* Tournament Games Count - Hidden on mobile */}
						<div className="hidden md:flex w-[100px] flex-shrink-0">
							<div className="flex flex-col items-center gap-0.5 w-full">
								<div className="flex items-center gap-1.5">
									<span className="text-sm font-bold text-text-primary">
										{entry.tournament_games || 0}
									</span>
									<span className="text-xs text-text-muted">
										Games
									</span>
								</div>
								{/* Visual progress bar */}
								<div className="w-full h-1 bg-surface-lighter rounded-full overflow-hidden">
									<div
										className={`h-full transition-all duration-300 ${
											entry.tournament_games >= avgGames
												? 'bg-gradient-to-r from-success to-primary'
												: 'bg-gradient-to-r from-slate-600 to-slate-500'
										}`}
										style={{
											width: `${Math.min((entry.tournament_games / maxGames) * 100, 100)}%`
										}}
									/>
								</div>
							</div>
						</div>

						{/* Rank Display - Compact on mobile */}
						<div className="w-auto sm:w-[140px] md:w-[180px] flex-shrink-0">
							<div className="flex items-center gap-1 md:gap-2 px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-primary/5 rounded border border-primary/20 justify-center">
								{entry.player.soloq?.icon_url && (
									<div className="w-4 h-4 md:w-5 md:h-5 rounded-full overflow-hidden flex-shrink-0">
										<img
											src={entry.player.soloq.icon_url}
											alt={entry.player.soloq.display}
											className="w-full h-full object-cover scale-110"
											onError={(e) => {
												e.target.style.display = 'none';
											}}
										/>
									</div>
								)}
								<div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
									<span className="text-xs font-semibold text-text-primary whitespace-nowrap">
										{entry.player.soloq?.display || 'Unranked'}
									</span>
									{entry.player.soloq?.lp !== undefined && (
										<span className="text-xs text-text-muted">
											{entry.player.soloq.lp}LP
										</span>
									)}
								</div>
							</div>
						</div>

						{/* Actions - Fixed */}
						<div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
							<button
								onClick={() => openPlayerOpgg(entry.player.id)}
								className="p-1 md:p-1.5 hover:bg-primary/10 rounded transition-colors"
								title="OP.GG öffnen">
								<ExternalLink className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary" />
							</button>
							<button
								onClick={() => setShowRemoveConfirm(entry)}
								className="p-1 md:p-1.5 hover:bg-error/10 rounded transition-colors"
								title="Spieler entfernen">
								<Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5 text-error" />
							</button>
						</div>
					</div>
				))}
			</div>

			{/* Lineup Predictions */}
			{roster.length >= 5 && (
				<div className="mt-8">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
							<Target className="w-5 h-5 text-accent" />
							Predicted Starting Lineups
						</h3>
						{predictions && predictions.length > 2 && (
							<button
								onClick={() => setShowAllPredictions(!showAllPredictions)}
								className="btn btn-secondary text-xs md:text-sm px-2.5 md:px-4 py-1.5 md:py-2">
								{showAllPredictions ? 'Weniger anzeigen' : `Alle ${predictions.length} anzeigen`}
							</button>
						)}
					</div>

					{!predictions ? (
						<div className="card text-center py-8">
							<div className="animate-pulse text-text-muted">
								Calculating predictions...
							</div>
						</div>
					) : predictions.length > 0 ? (
						<div className="space-y-4">
							{(showAllPredictions ? predictions : predictions.slice(0, 2)).map((prediction, idx) => (
								<div
									key={idx}
									className={`card ${
										idx === 0
											? 'bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30'
											: 'bg-surface/40'
									}`}>
									<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 md:mb-4">
										<div className="flex items-center gap-2 md:gap-3">
											<div
												className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-base md:text-lg ${
													idx === 0
														? 'bg-gradient-to-br from-primary to-accent text-white'
														: 'bg-surface-lighter text-text-secondary'
												}`}>
												{idx + 1}
											</div>
											<div>
												<h4 className="font-semibold text-text-primary text-sm md:text-base">
													{idx === 0
														? 'Most Likely Lineup'
														: `Alternative ${idx}`}
												</h4>
												<div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-text-muted">
													<TrendingUp className="w-3 h-3 md:w-3.5 md:h-3.5" />
													<span>{prediction.overall_confidence}% Confidence</span>
												</div>
											</div>
										</div>

										{/* Confidence Bar */}
										<div className="w-full sm:w-32">
											<div className="h-1.5 md:h-2 bg-slate-700/50 rounded-full overflow-hidden">
												<div
													className={`h-full transition-all ${
														prediction.overall_confidence >= 80
															? 'bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500'
															: prediction.overall_confidence >= 60
															? 'bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500'
															: 'bg-gradient-to-r from-yellow-400 via-orange-400 to-amber-500'
													}`}
													style={{
														width: `${prediction.overall_confidence}%`
													}}
												/>
											</div>
										</div>
									</div>

									{/* Lineup Players */}
									<div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
										{['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'].map((role) => {
											const playerInfo = prediction.predicted_lineup[role];
											if (!playerInfo) return null;

											const rosterEntry = roster.find(
												(r) => r.player.id === playerInfo.player_id
											);

											return (
												<div
													key={role}
													className="flex flex-col items-center gap-2 p-2 md:p-3 bg-surface/40 rounded-lg border border-border/50">
													{/* Role Icon */}
													<div className="flex items-center gap-1.5 md:gap-2">
														<RoleIcon role={role} size={14} className="md:w-4 md:h-4" />
														<span className="text-xs font-semibold text-text-muted">
															{displayRole(role)}
														</span>
													</div>

													{/* Player Icon */}
													{rosterEntry && (
														<div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden border border-border/50">
															<img
																src={getSummonerIconUrl(
																	rosterEntry.player.profile_icon_id
																)}
																alt={playerInfo.player_name}
																className="w-full h-full object-cover"
																onError={handleSummonerIconError}
															/>
														</div>
													)}

													{/* Player Name */}
													<div className="text-center w-full">
														<p className="text-xs md:text-sm font-semibold text-text-primary truncate">
															{playerInfo.player_name}
														</p>
														<p className="text-xs text-text-muted">
															{playerInfo.confidence}%
														</p>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="card text-center py-8 text-text-muted">
							Not enough data to predict lineups
						</div>
					)}
				</div>
			)}

			{roster.length === 0 && (
				<div className="card text-center py-12">
					<Users className="w-12 h-12 text-text-muted mx-auto mb-4" />
					<p className="text-text-secondary mb-4">Noch keine Spieler im Roster</p>
					<button
						onClick={() => setShowAddPlayerModal(true)}
						className="btn btn-primary">
						Ersten Spieler hinzufügen
					</button>
				</div>
			)}

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
									onChange={(e) => setAddPlayerUrl(e.target.value)}
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
									{addingPlayer ? 'Fügt hinzu...' : 'Hinzufügen'}
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
							Das Roster wird mit dem OP.GG Multisearch synchronisiert.
							Spieler die nicht mehr im OP.GG sind werden entfernt, neue
							Spieler werden hinzugefügt.
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
									{syncing ? 'Synchronisiert...' : 'Synchronisieren'}
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
							Was möchtest du mit {showRemoveConfirm.player.summoner_name}{' '}
							machen?
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

export default PlayersTab;
