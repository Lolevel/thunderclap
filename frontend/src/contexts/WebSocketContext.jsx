import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSWRConfig } from 'swr';
import socket from '../lib/socket';
import { cacheKeys, getRelatedKeys } from '../lib/cacheKeys';
import toast from 'react-hot-toast';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const { mutate } = useSWRConfig();

  useEffect(() => {
    // TODO: WebSocket temporarily disabled until backend is implemented
    console.log('[WebSocket] Disabled - Backend WebSocket server not yet implemented');

    // Connect socket
    // socket.connect();

    // Connection status
    const handleConnect = () => {
      setIsConnected(true);
      console.log('[WebSocket] Connected successfully');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      console.log('[WebSocket] Disconnected');
    };

    // socket.on('connect', handleConnect);
    // socket.on('disconnect', handleDisconnect);

    // TODO: All event listeners disabled until WebSocket backend is ready
    /*
    // Listen for data update events from other users
    socket.on('data:updated', (payload) => {
      const { resource, id, updatedBy } = payload;

      console.log(`[WebSocket] Data updated: ${resource}/${id} by ${updatedBy}`);

      // Invalidate relevant cache keys based on resource type
      if (resource === 'team') {
        // Invalidate all team-related caches
        const keys = getRelatedKeys('team', id);
        keys.forEach(key => mutate(key));

        // Show notification
        toast.success(`Team data updated by ${updatedBy}`, {
          duration: 3000,
          icon: '🔄',
        });
      } else if (resource === 'player') {
        // Invalidate all player-related caches
        const keys = getRelatedKeys('player', id);
        keys.forEach(key => mutate(key));

        toast.success(`Player data updated by ${updatedBy}`, {
          duration: 3000,
          icon: '🔄',
        });
      } else if (resource === 'draft_scenario') {
        // For draft scenarios, id is actually the team_id
        mutate(cacheKeys.draftScenarios(id));

        toast.success(`Draft scenario updated by ${updatedBy}`, {
          duration: 3000,
          icon: '🎯',
        });
      } else if (resource === 'roster') {
        // Roster update
        mutate(cacheKeys.teamRoster(id));
        mutate(cacheKeys.teamOverview(id));

        toast.success(`Roster updated by ${updatedBy}`, {
          duration: 3000,
          icon: '👥',
        });
      }
    });

    // Listen for match import completion
    socket.on('import:completed', (payload) => {
      const { teamId, playerId, message } = payload;

      if (teamId) {
        mutate(cacheKeys.teamStats(teamId));
        mutate(cacheKeys.teamMatches(teamId));
        mutate(cacheKeys.teamOverview(teamId));
        mutate(cacheKeys.teamChampions(teamId));
        toast.success(message || 'New matches imported!', { icon: '✅' });
      }

      if (playerId) {
        mutate(cacheKeys.playerMatches(playerId));
        mutate(cacheKeys.playerChampions(playerId, 'tournament'));
        mutate(cacheKeys.playerChampions(playerId, 'soloqueue'));
        toast.success(message || 'Player matches updated!', { icon: '✅' });
      }
    });

    // Listen for bulk analysis completion
    socket.on('analysis:completed', (payload) => {
      const { teamId, message } = payload;

      if (teamId) {
        mutate(cacheKeys.teamStats(teamId));
        mutate(cacheKeys.teamMatches(teamId));
        mutate(cacheKeys.teamOverview(teamId));
        toast.success(message || 'Team analysis completed!', { icon: '📊' });
      }
    });
    */

    // Cleanup
    return () => {
      // socket.off('connect', handleConnect);
      // socket.off('disconnect', handleDisconnect);
      // socket.off('data:updated');
      // socket.off('import:completed');
      // socket.off('analysis:completed');
      // socket.disconnect();
    };
  }, [mutate]);

  const value = {
    socket,
    isConnected,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}
