import { useEffect, useState } from 'react';
import {
	Loader2,
	CheckCircle,
	XCircle,
	Clock,
	Download,
	Link2,
} from 'lucide-react';

const RefreshProgressModal = ({ teamId, onComplete, onError, onStatusUpdate }) => {
	const [status, setStatus] = useState('connecting'); // connecting, running, completed, background, background_complete, error
	const [progress, setProgress] = useState({
		matches_fetched: 0,
		matches_linked: 0,
		players_processed: 0,
		champions_updated: 0,
		current_player: '',
		total_players: 0,
		message: 'Verbinde...',
		phase: 'connecting',
		progress_percent: 0,
	});
	const [isRateLimited, setIsRateLimited] = useState(false);
	const [backgroundProgress, setBackgroundProgress] = useState({
		current_player: '',
		player_index: 0,
		total_players: 0,
		message: '',
	});
	const [showBackgroundInModal, setShowBackgroundInModal] = useState(true);

	useEffect(() => {
		// Get base URL from axios config
		const baseURL =
			import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
		// Remove trailing /api if present, then add our endpoint
		const cleanBaseURL = baseURL.replace(/\/api\/?$/, '');

		const accessToken =
			localStorage.getItem('access_token') ||
			import.meta.env.VITE_ACCESS_TOKEN;

		const eventSourceUrl = `${cleanBaseURL}/api/teams/${teamId}/refresh-stream?token=${accessToken}`;

		const eventSource = new EventSource(eventSourceUrl);

		eventSource.onopen = () => {
			console.log('SSE connection opened');
			setStatus('running');
		};

		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				console.log('Progress update:', data);

				if (data.type === 'progress') {
					const newProgress = {
						...progress,
						...data.data,
					};
					setProgress(newProgress);

					// Send status update to parent for status bar
					if (onStatusUpdate) {
						onStatusUpdate({
							status: 'running',
							phase: data.data.step || 'processing',
							progress_percent: data.data.progress_percent || 0,
							is_rate_limited: false,
						});
					}
				} else if (data.type === 'rate_limit') {
					setIsRateLimited(true);
					setProgress((prev) => ({
						...prev,
						message: `Rate Limit erreicht - Warte ${data.wait_seconds}s...`,
					}));

					// Send rate limit status to parent
					if (onStatusUpdate) {
						onStatusUpdate({
							status: 'running',
							phase: 'rate_limit',
							progress_percent: progress.progress_percent || 0,
							is_rate_limited: true,
							wait_seconds: data.wait_seconds,
						});
					}

					setTimeout(() => {
						setIsRateLimited(false);
						// Clear rate limit status
						if (onStatusUpdate) {
							onStatusUpdate({
								status: 'running',
								phase: progress.phase || 'processing',
								progress_percent: progress.progress_percent || 0,
								is_rate_limited: false,
							});
						}
					}, data.wait_seconds * 1000);
				} else if (data.type === 'complete') {
					// Team stats are complete, but background tasks continue
					setStatus('completed');
					setProgress((prev) => ({
						...prev,
						...data.data,
						message: 'Team-Daten aktualisiert!',
					}));
					// Don't close eventSource yet - background tasks are still running
				} else if (data.type === 'background_progress') {
					// Update background progress
					setStatus('background');
					setBackgroundProgress(data.data);
				} else if (data.type === 'background_complete') {
					// Everything is done - close modal and reload
					setStatus('background_complete');
					setBackgroundProgress((prev) => ({
						...prev,
						message: data.data.message,
					}));
					eventSource.close();
					setTimeout(() => onComplete(data.data), 1500);
				} else if (data.type === 'error') {
					setStatus('error');
					setProgress((prev) => ({
						...prev,
						message: data.message,
					}));
					eventSource.close();
					setTimeout(() => onError(data.message), 2000);
				}
			} catch (err) {
				console.error('Failed to parse SSE data:', err);
			}
		};

		eventSource.onerror = (err) => {
			console.error('SSE error:', err);
			setStatus('error');
			setProgress((prev) => ({
				...prev,
				message: 'Verbindungsfehler',
			}));
			eventSource.close();
			setTimeout(() => onError('Connection failed'), 2000);
		};

		return () => {
			eventSource.close();
		};
	}, [teamId, onComplete, onError]);

	const handleContinueInBackground = () => {
		setShowBackgroundInModal(false);
		// Keep eventSource open but close modal visually
		// The page will auto-refresh when background_complete is received
	};

	// Don't show modal if user clicked "Continue in background"
	// This hides the modal during all states after user clicks the button
	if (
		!showBackgroundInModal &&
		status !== 'connecting' &&
		status !== 'error'
	) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
			<div className="card max-w-lg w-full">
				{/* Header */}
				<div className="flex items-center gap-3 mb-6">
					{status === 'completed' ||
					status === 'background' ||
					status === 'background_complete' ? (
						<CheckCircle className="w-8 h-8 text-success" />
					) : status === 'error' ? (
						<XCircle className="w-8 h-8 text-error" />
					) : (
						<Loader2 className="w-8 h-8 text-primary animate-spin" />
					)}
					<div className="flex-1">
						<h3 className="text-xl font-bold text-text-primary">
							{status === 'completed'
								? 'Team-Daten aktualisiert!'
								: status === 'background' ||
								  status === 'background_complete'
								? 'Lade Spieler-Statistiken...'
								: status === 'error'
								? 'Fehler'
								: 'Daten werden aktualisiert...'}
						</h3>
						<p className="text-sm text-text-secondary">
							{status === 'background' ||
							status === 'background_complete'
								? backgroundProgress.message
								: progress.message}
						</p>
					</div>
				</div>

				{/* Rate Limit Warning */}
				{isRateLimited && (
					<div className="mb-6 p-3 bg-warning/20 border border-warning rounded-lg flex items-center gap-3">
						<Clock className="w-5 h-5 text-warning" />
						<div>
							<p className="text-sm font-semibold text-warning">
								Riot API Rate Limit erreicht
							</p>
							<p className="text-xs text-text-secondary">
								Warte auf Rate Limit Reset...
							</p>
						</div>
					</div>
				)}

				{/* Unified Progress Display - Works for all phases */}
				{status === 'running' && (
					<div className="space-y-4 mb-6">
						{/* Team Match Loading Progress */}
						{progress.total_players > 0 && (
							<div>
								<div className="flex items-center justify-between text-sm mb-2">
									<span className="text-text-muted">
										Team-Games:
									</span>
									<span className="text-text-primary font-semibold">
										{progress.players_processed} /{' '}
										{progress.total_players} Spieler
									</span>
								</div>
								<div className="w-full bg-surface-hover rounded-full h-2">
									<div
										className="bg-primary rounded-full h-2 transition-all duration-300"
										style={{
											width: `${
												(progress.players_processed /
													progress.total_players) *
												100
											}%`,
										}}
									/>
								</div>
							</div>
						)}

						{/* Stats Grid */}
						<div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
							<div className="flex items-center gap-3">
								<Download className="w-5 h-5 text-primary" />
								<div>
									<p className="text-xs text-text-muted">
										Matches geladen
									</p>
									<p className="text-lg font-bold text-text-primary">
										{progress.matches_fetched}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<Link2 className="w-5 h-5 text-accent" />
								<div>
									<p className="text-xs text-text-muted">
										Matches verknüpft
									</p>
									<p className="text-lg font-bold text-text-primary">
										{progress.matches_linked}
									</p>
								</div>
							</div>
						</div>

						{/* Continue in background button - available during running phase too */}
						<button
							onClick={handleContinueInBackground}
							className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg transition-all duration-300 font-semibold shadow-lg">
							Im Hintergrund fortsetzen
						</button>
					</div>
				)}

				{/* Team Completion + Background Loading (Combined) */}
				{(status === 'completed' ||
					status === 'background' ||
					status === 'background_complete') && (
					<div className="space-y-4">
						{/* Team Stats Summary */}
						<div className="grid grid-cols-2 gap-4">
							<div className="text-center p-4 bg-success/10 rounded-lg">
								<p className="text-2xl font-bold text-success">
									{progress.matches_fetched +
										progress.matches_linked}
								</p>
								<p className="text-xs text-text-muted">
									Team Matches
								</p>
							</div>
							<div className="text-center p-4 bg-primary/10 rounded-lg">
								<p className="text-2xl font-bold text-primary">
									{progress.champions_updated}
								</p>
								<p className="text-xs text-text-muted">
									Champions
								</p>
							</div>
							{progress.ranks_updated !== undefined &&
								progress.ranks_updated > 0 && (
									<div className="text-center p-4 bg-accent/10 rounded-lg">
										<p className="text-2xl font-bold text-accent">
											{progress.ranks_updated}
										</p>
										<p className="text-xs text-text-muted">
											Ränge aktualisiert
										</p>
									</div>
								)}
						</div>

						{/* Player Individual Stats Progress */}
						{(status === 'background' ||
							status === 'background_complete') &&
							backgroundProgress.total_players > 0 && (
								<div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-3">
									<div className="flex items-center justify-between">
										<p className="text-sm font-semibold text-blue-400">
											<Loader2 className="w-4 h-4 inline animate-spin mr-2" />
											Lade Spieler-Statistiken
										</p>
										<span className="text-xs text-blue-300">
											{backgroundProgress.player_index +
												1}{' '}
											/ {backgroundProgress.total_players}
										</span>
									</div>
									<div className="w-full bg-blue-900/30 rounded-full h-2">
										<div
											className="bg-blue-500 rounded-full h-2 transition-all duration-300"
											style={{
												width: `${
													((backgroundProgress.player_index +
														1) /
														backgroundProgress.total_players) *
													100
												}%`,
											}}
										/>
									</div>
								</div>
							)}

						{/* Background completion message */}
						{status === 'background_complete' && (
							<div className="p-4 bg-success/10 border border-success rounded-lg text-center">
								<CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
								<p className="text-sm text-success font-semibold">
									Alle Daten erfolgreich geladen!
								</p>
								<p className="text-xs text-text-muted mt-1">
									Seite wird aktualisiert...
								</p>
							</div>
						)}

						{/* Continue in background button - only show when just completed */}
						{status === 'completed' && (
							<button
								onClick={handleContinueInBackground}
								className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg transition-all duration-300 font-semibold shadow-lg">
								Im Hintergrund fortsetzen
							</button>
						)}
					</div>
				)}

				{/* Error Message */}
				{status === 'error' && (
					<div className="p-4 bg-error/10 border border-error rounded-lg">
						<p className="text-sm text-error">{progress.message}</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default RefreshProgressModal;
