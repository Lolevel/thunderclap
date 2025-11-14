/**
 * Custom React hook for WebSocket connections to team events
 * Handles real-time updates for team imports and refreshes
 */
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// Derive WebSocket URL from API URL (remove /api suffix if present)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const WS_URL = API_URL.replace(/\/api$/, '');

console.log('[WebSocket Config] API URL:', API_URL);
console.log('[WebSocket Config] WS URL:', WS_URL);

/**
 * Hook to connect to team events WebSocket
 * @param {Object} callbacks - Event callbacks
 * @param {Function} callbacks.onTeamImportStarted - Called when a team import starts
 * @param {Function} callbacks.onTeamImportProgress - Called when team import progresses
 * @param {Function} callbacks.onTeamImportCompleted - Called when team import completes
 * @param {Function} callbacks.onTeamImportFailed - Called when team import fails
 * @param {Function} callbacks.onTeamRefreshStarted - Called when a team refresh starts
 * @param {Function} callbacks.onTeamRefreshProgress - Called when team refresh progresses
 * @param {Function} callbacks.onTeamRefreshCompleted - Called when team refresh completes
 * @param {Function} callbacks.onTeamRefreshFailed - Called when team refresh fails
 * @param {string|null} teamId - Optional team ID to join specific team room
 */
export function useTeamSocket(callbacks = {}, teamId = null) {
  const socketRef = useRef(null);
  const callbacksRef = useRef(callbacks);

  // Keep callbacks up to date without reconnecting
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    console.log('[WebSocket] Connecting to:', WS_URL);

    // Determine the correct socket.io path based on the API URL
    // If API URL has a path (like /thunderclap), include it in the socket.io path
    const apiPath = new URL(WS_URL.startsWith('http') ? WS_URL : `http://${WS_URL}`).pathname;
    const socketPath = apiPath === '/' ? '/socket.io' : `${apiPath}/socket.io`;

    console.log('[WebSocket] Socket.IO path:', socketPath);

    // Connect to WebSocket with /teams namespace
    // Socket.IO automatically handles wss:// for https:// URLs
    const socket = io(`${WS_URL}/teams`, {
      path: socketPath,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      // For production with reverse proxy
      secure: WS_URL.startsWith('https'),
    });

    socketRef.current = socket;

    // Connection handlers
    socket.on('connect', () => {
      console.log('[WebSocket] Connected to /teams namespace with ID:', socket.id);

      // Join team-specific room if teamId provided
      if (teamId) {
        socket.emit('join_team', { team_id: teamId });
        console.log(`[WebSocket] Joining team room: ${teamId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });

    socket.on('connected', (data) => {
      console.log('[WebSocket] Connection confirmed:', data);
    });

    // Team import events
    socket.on('team_import_started', (data) => {
      console.log('[WebSocket] Team import started:', data);
      callbacksRef.current.onTeamImportStarted?.(data);
    });

    socket.on('team_import_progress', (data) => {
      console.log('[WebSocket] Team import progress:', data);
      callbacksRef.current.onTeamImportProgress?.(data);
    });

    socket.on('team_import_completed', (data) => {
      console.log('[WebSocket] Team import completed:', data);
      console.log('[WebSocket] Callbacks ref:', callbacksRef.current);
      console.log('[WebSocket] Has callback?', !!callbacksRef.current?.onTeamImportCompleted);
      if (callbacksRef.current?.onTeamImportCompleted) {
        console.log('[WebSocket] Calling onTeamImportCompleted callback');
        callbacksRef.current.onTeamImportCompleted(data);
      } else {
        console.warn('[WebSocket] No onTeamImportCompleted callback found!');
      }
    });

    socket.on('team_import_failed', (data) => {
      console.error('[WebSocket] Team import failed:', data);
      callbacksRef.current.onTeamImportFailed?.(data);
    });

    // Team refresh events
    socket.on('team_refresh_started', (data) => {
      console.log('[WebSocket] Team refresh started:', data);
      callbacksRef.current.onTeamRefreshStarted?.(data);
    });

    socket.on('team_refresh_progress', (data) => {
      console.log('[WebSocket] Team refresh progress:', data);
      callbacksRef.current.onTeamRefreshProgress?.(data);
    });

    socket.on('team_refresh_completed', (data) => {
      console.log('[WebSocket] Team refresh completed:', data);
      callbacksRef.current.onTeamRefreshCompleted?.(data);
    });

    socket.on('team_refresh_failed', (data) => {
      console.error('[WebSocket] Team refresh failed:', data);
      callbacksRef.current.onTeamRefreshFailed?.(data);
    });

    // Cleanup on unmount
    return () => {
      console.log('[WebSocket] Disconnecting...');

      // Leave team room if joined
      if (teamId) {
        socket.emit('leave_team', { team_id: teamId });
      }

      socket.disconnect();
    };
  }, [teamId]); // Only reconnect if teamId changes

  // Helper to manually join a team room
  const joinTeam = useCallback((newTeamId) => {
    if (socketRef.current && newTeamId) {
      socketRef.current.emit('join_team', { team_id: newTeamId });
      console.log(`[WebSocket] Joining team room: ${newTeamId}`);
    }
  }, []);

  // Helper to manually leave a team room
  const leaveTeam = useCallback((oldTeamId) => {
    if (socketRef.current && oldTeamId) {
      socketRef.current.emit('leave_team', { team_id: oldTeamId });
      console.log(`[WebSocket] Leaving team room: ${oldTeamId}`);
    }
  }, []);

  return {
    socket: socketRef.current,
    joinTeam,
    leaveTeam,
  };
}
