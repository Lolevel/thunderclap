import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, Clock, Download, Link2 } from 'lucide-react';

const RefreshProgressModal = ({ teamId, onComplete, onError }) => {
  const [status, setStatus] = useState('connecting'); // connecting, running, completed, error
  const [progress, setProgress] = useState({
    matches_fetched: 0,
    matches_linked: 0,
    players_processed: 0,
    champions_updated: 0,
    current_player: '',
    total_players: 0,
    message: 'Verbinde...',
  });
  const [isRateLimited, setIsRateLimited] = useState(false);

  useEffect(() => {
    // Get base URL from axios config
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    // Remove trailing /api if present, then add our endpoint
    const cleanBaseURL = baseURL.replace(/\/api\/?$/, '');
    const eventSource = new EventSource(
      `${cleanBaseURL}/api/teams/${teamId}/refresh-stream`
    );

    eventSource.onopen = () => {
      console.log('SSE connection opened');
      setStatus('running');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Progress update:', data);

        if (data.type === 'progress') {
          setProgress((prev) => ({
            ...prev,
            ...data.data,
          }));
        } else if (data.type === 'rate_limit') {
          setIsRateLimited(true);
          setProgress((prev) => ({
            ...prev,
            message: `Rate Limit erreicht - Warte ${data.wait_seconds}s...`,
          }));
          setTimeout(() => setIsRateLimited(false), data.wait_seconds * 1000);
        } else if (data.type === 'complete') {
          setStatus('completed');
          setProgress((prev) => ({
            ...prev,
            ...data.data,
            message: 'Abgeschlossen!',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {status === 'completed' ? (
            <CheckCircle className="w-8 h-8 text-success" />
          ) : status === 'error' ? (
            <XCircle className="w-8 h-8 text-error" />
          ) : (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          )}
          <div>
            <h3 className="text-xl font-bold text-text-primary">
              {status === 'completed'
                ? 'Abgeschlossen'
                : status === 'error'
                ? 'Fehler'
                : 'Daten werden aktualisiert...'}
            </h3>
            <p className="text-sm text-text-secondary">{progress.message}</p>
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

        {/* Progress Stats */}
        {status === 'running' && (
          <div className="space-y-4 mb-6">
            {/* Current Player */}
            {progress.current_player && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Aktueller Spieler:</span>
                <span className="text-text-primary font-semibold">
                  {progress.current_player}
                </span>
              </div>
            )}

            {/* Players Processed */}
            {progress.total_players > 0 && (
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-text-muted">Spieler verarbeitet:</span>
                  <span className="text-text-primary font-semibold">
                    {progress.players_processed} / {progress.total_players}
                  </span>
                </div>
                <div className="w-full bg-surface-hover rounded-full h-2">
                  <div
                    className="bg-primary rounded-full h-2 transition-all duration-300"
                    style={{
                      width: `${
                        (progress.players_processed / progress.total_players) * 100
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
                  <p className="text-xs text-text-muted">Matches geladen</p>
                  <p className="text-lg font-bold text-text-primary">
                    {progress.matches_fetched}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link2 className="w-5 h-5 text-accent" />
                <div>
                  <p className="text-xs text-text-muted">Matches verknüpft</p>
                  <p className="text-lg font-bold text-text-primary">
                    {progress.matches_linked}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Completion Stats */}
        {status === 'completed' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-success/10 rounded-lg">
              <p className="text-2xl font-bold text-success">
                {progress.matches_fetched + progress.matches_linked}
              </p>
              <p className="text-xs text-text-muted">Gesamt Matches</p>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {progress.champions_updated}
              </p>
              <p className="text-xs text-text-muted">Champions aktualisiert</p>
            </div>
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
