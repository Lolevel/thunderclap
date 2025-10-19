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
	Square
} from 'lucide-react';
import { displayRole, sortByRole } from '../utils/roleMapping';
import { openPlayerOpgg, openTeamOpgg } from '../utils/opggHelper';

const PlayersTab = ({
	roster,
	teamId,
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

	const sortedRoster = sortByRole(roster);

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
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
					<Users className="w-5 h-5" />
					Roster ({roster.length})
				</h2>
				<div className="flex gap-3">
					{selectedPlayers.length > 0 && (
						<button
							onClick={handleOpenMultiOpgg}
							className="btn btn-accent flex items-center gap-2">
							<ExternalLink className="w-4 h-4" />
							Ausgewählte in OP.GG öffnen ({selectedPlayers.length})
						</button>
					)}
					<button
						onClick={handleOpenFullTeamOpgg}
						className="btn btn-secondary flex items-center gap-2">
						<ExternalLink className="w-4 h-4" />
						Team OP.GG
					</button>
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

			{/* Roster Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{sortedRoster.map((entry) => (
					<div
						key={entry.id}
						className="card hover:bg-surface-hover transition-all duration-200 group">
						<div className="flex items-center gap-4">
							{/* Checkbox for selection */}
							<button
								onClick={() => togglePlayerSelection(entry.player.id)}
								className="p-1 hover:bg-surface-hover rounded transition-colors">
								{selectedPlayers.includes(entry.player.id) ? (
									<CheckSquare className="w-5 h-5 text-primary" />
								) : (
									<Square className="w-5 h-5 text-text-muted" />
								)}
							</button>

							{/* Role indicator */}
							<div
								className={`w-3 h-3 rounded-full ${getRoleColor(entry.role)}`}
								title={displayRole(entry.role)}
							/>

							{/* Player info */}
							<Link
								to={`/players/${entry.player.id}`}
								className="flex-1 min-w-0">
								<h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors truncate">
									{entry.player.summoner_name}
								</h3>
								<p className="text-sm text-text-muted">
									{displayRole(entry.role) || 'Unknown'}
								</p>
							</Link>

							{/* Rank */}
							{entry.player.current_rank && (
								<span className="text-sm text-text-secondary px-2 py-1 bg-surface-hover rounded">
									{entry.player.current_rank}
								</span>
							)}

							{/* Actions */}
							<div className="flex items-center gap-2">
								<button
									onClick={() => openPlayerOpgg(entry.player.id)}
									className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
									title="OP.GG öffnen">
									<ExternalLink className="w-4 h-4 text-primary" />
								</button>
								<button
									onClick={() => setShowRemoveConfirm(entry)}
									className="p-2 hover:bg-error/10 rounded-lg transition-colors"
									title="Spieler entfernen">
									<Trash2 className="w-4 h-4 text-error" />
								</button>
							</div>
						</div>
					</div>
				))}
			</div>

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
