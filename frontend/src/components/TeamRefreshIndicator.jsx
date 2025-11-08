import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getTeamRefreshStatus } from '../lib/api';

const PHASE_LABELS = {
  'collecting_matches': 'Match-IDs sammeln',
  'filtering_matches': 'Matches filtern',
  'fetching_matches': 'Matches laden',
  'linking_data': 'Daten verknüpfen',
  'calculating_stats': 'Stats berechnen',
  'updating_ranks': 'Ränge aktualisieren',
  'player_details': 'Spieler-Details laden'
};

export default function TeamRefreshIndicator({ teamId, onRefreshComplete }) {
  const [refreshStatus, setRefreshStatus] = useState(null);
  const [visible, setVisible] = useState(false);
  const pollIntervalRef = useRef(null);
  const lastPhaseRef = useRef(null);
  const completedCallbackFiredRef = useRef(false);

  const fetchRefreshStatus = useCallback(async () => {
    try {
      const response = await getTeamRefreshStatus(teamId);
      const status = response.data;
      setRefreshStatus(status);

      // Show indicator only if refresh is running or just completed
      if (status.status === 'running') {
        setVisible(true);

        // Check if we just completed the "calculating_stats" phase
        // This means team data is ready and we should trigger auto-reload
        if (lastPhaseRef.current === 'linking_data' && status.phase === 'calculating_stats') {
          console.log('✅ Team data ready! Triggering auto-reload...');
          if (onRefreshComplete && !completedCallbackFiredRef.current) {
            completedCallbackFiredRef.current = true;
            onRefreshComplete();
          }
        }

        lastPhaseRef.current = status.phase;
      } else if (status.status === 'completed') {
        setVisible(true);

        // Trigger callback if we haven't already done so
        console.log('✅ Refresh completed! Triggering callback...');
        if (onRefreshComplete && !completedCallbackFiredRef.current) {
          completedCallbackFiredRef.current = true;
          onRefreshComplete();
        }

        // Hide after 3 seconds
        setTimeout(() => {
          setVisible(false);
          lastPhaseRef.current = null;
        }, 3000);
        stopPolling();
      } else if (status.status === 'failed') {
        setVisible(true);
        stopPolling();

        // Reset refreshing state on failure
        console.log('❌ Refresh failed! Triggering callback to reset state...');
        if (onRefreshComplete && !completedCallbackFiredRef.current) {
          completedCallbackFiredRef.current = true;
          onRefreshComplete();
        }
      } else {
        // idle - don't start polling if already idle
        setVisible(false);
        lastPhaseRef.current = null;
        if (status.status === 'idle') {
          stopPolling();
        }
      }
    } catch (error) {
      console.error('Failed to fetch refresh status:', error);
    }
  }, [teamId, onRefreshComplete]);

  const startPolling = useCallback(() => {
    // Poll every 2 seconds
    if (!pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(fetchRefreshStatus, 2000);
    }
  }, [fetchRefreshStatus]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Reset callback flag when component mounts
    completedCallbackFiredRef.current = false;
    
    // Start polling for refresh status
    fetchRefreshStatus();
    startPolling();

    return () => {
      stopPolling();
    };
  }, [fetchRefreshStatus, startPolling, stopPolling]);

  const handleRetry = async () => {
    // Retry logic could be added here
    setVisible(false);
  };

  if (!visible || !refreshStatus) {
    return null;
  }

  const { status, phase, progress_percent, error_message } = refreshStatus;

  return (
    <div className="flex items-center gap-3 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
      {/* Icon */}
      {status === 'running' && (
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      )}
      {status === 'completed' && (
        <CheckCircle2 className="w-5 h-5 text-green-500" />
      )}
      {status === 'failed' && (
        <AlertCircle className="w-5 h-5 text-red-500" />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Phase Label */}
        {status === 'running' && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-gray-300">
              {PHASE_LABELS[phase] || phase || 'Lädt...'}
            </span>
            <span className="text-xs text-gray-500">
              {progress_percent}%
            </span>
          </div>
        )}

        {status === 'completed' && (
          <span className="text-sm text-green-400">Daten aktualisiert</span>
        )}

        {status === 'failed' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-400">Fehler beim Laden</span>
            <button
              onClick={handleRetry}
              className="text-xs text-gray-400 hover:text-gray-200 underline"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {/* Progress Bar */}
        {status === 'running' && (
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress_percent}%` }}
            />
          </div>
        )}

        {/* Error Message */}
        {status === 'failed' && error_message && (
          <div className="text-xs text-gray-500 mt-1 truncate">
            {error_message}
          </div>
        )}
      </div>
    </div>
  );
}
