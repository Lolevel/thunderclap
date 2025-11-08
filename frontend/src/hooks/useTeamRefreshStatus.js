import { useEffect, useRef, useState } from 'react';
import { getTeamRefreshStatus } from '../lib/api';

/**
 * Custom hook to poll team refresh status
 * Returns current status and calls callbacks
 */
export function useTeamRefreshStatus(teamId, { onComplete, onFailed, enabled = false }) {
  const pollIntervalRef = useRef(null);
  const lastStatusRef = useRef(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!enabled) {
      // Stop polling if disabled
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      lastStatusRef.current = null;
      setStatus(null);
      return;
    }

    console.log('🔄 Starting to poll refresh status for team:', teamId);

    const checkStatus = async () => {
      try {
        const response = await getTeamRefreshStatus(teamId);
        const statusData = response.data;
        
        setStatus(statusData);
        console.log(`📊 Refresh status: ${statusData.status} (${statusData.progress_percent}%) - Phase: ${statusData.phase}`);

        // Check if status changed to completed
        if (statusData.status === 'completed' && lastStatusRef.current !== 'completed') {
          console.log('✅ Refresh completed! Calling onComplete...');
          if (onComplete) {
            onComplete();
          }
          // Stop polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }

        // Check if status changed to failed
        if (statusData.status === 'failed' && lastStatusRef.current !== 'failed') {
          console.log('❌ Refresh failed! Calling onFailed...');
          if (onFailed) {
            onFailed();
          }
          // Stop polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }

        lastStatusRef.current = statusData.status;
      } catch (error) {
        console.error('❌ Failed to fetch refresh status:', error);
      }
    };

    // Start polling immediately
    checkStatus();
    pollIntervalRef.current = setInterval(checkStatus, 2000); // Poll every 2 seconds

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [teamId, enabled, onComplete, onFailed]);

  return status;
}
