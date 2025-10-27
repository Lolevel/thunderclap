import { useSWRConfig } from 'swr';
import api from '../../lib/api';
import { cacheKeys, getTeamRelatedKeys } from '../../lib/cacheKeys';
import { useWebSocket } from '../useWebSocket';

/**
 * Mutation hooks for team operations
 */

/**
 * Hook for adding a player to team roster
 */
export function useAddPlayer(teamId) {
  const { mutate } = useSWRConfig();
  const { socket } = useWebSocket();

  const addPlayer = async (opggUrl) => {
    try {
      await api.post(`/teams/${teamId}/roster/add`, {
        opgg_url: opggUrl,
      });

      // Invalidate all team-related caches
      const keys = getTeamRelatedKeys(teamId);
      keys.forEach(key => mutate(key));

      // Emit WebSocket event
      socket.emit('data:update', {
        resource: 'team',
        id: teamId,
        updatedBy: 'Current User',
      });
    } catch (error) {
      throw error;
    }
  };

  return { addPlayer };
}

/**
 * Hook for removing a player from team roster
 */
export function useRemovePlayer(teamId) {
  const { mutate } = useSWRConfig();
  const { socket } = useWebSocket();

  const removePlayer = async (playerId, deleteFromDb = false) => {
    try {
      await api.delete(
        `/teams/${teamId}/roster/${playerId}?delete_player=${deleteFromDb}`
      );

      // Invalidate all team-related caches
      const keys = getTeamRelatedKeys(teamId);
      keys.forEach(key => mutate(key));

      // Emit WebSocket event
      socket.emit('data:update', {
        resource: 'team',
        id: teamId,
        updatedBy: 'Current User',
      });
    } catch (error) {
      throw error;
    }
  };

  return { removePlayer };
}

/**
 * Hook for syncing roster from OP.GG
 */
export function useSyncRoster(teamId) {
  const { mutate } = useSWRConfig();
  const { socket } = useWebSocket();

  const syncRoster = async (opggUrl) => {
    try {
      const response = await api.post(`/teams/${teamId}/sync-from-opgg`, {
        opgg_url: opggUrl,
      });

      // Invalidate all team-related caches
      const keys = getTeamRelatedKeys(teamId);
      keys.forEach(key => mutate(key));

      // Emit WebSocket event
      socket.emit('data:update', {
        resource: 'team',
        id: teamId,
        updatedBy: 'Current User',
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  };

  return { syncRoster };
}

/**
 * Hook for deleting a team
 */
export function useDeleteTeam() {
  const { mutate } = useSWRConfig();
  const { socket } = useWebSocket();

  const deleteTeam = async (teamId, deletePlayers = false) => {
    try {
      const response = await api.delete(
        `/teams/${teamId}?delete_players=${deletePlayers}`
      );

      // Invalidate teams list
      mutate(cacheKeys.teams());

      // Emit WebSocket event
      socket.emit('data:update', {
        resource: 'team',
        id: teamId,
        updatedBy: 'Current User',
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  };

  return { deleteTeam };
}

/**
 * Hook for refreshing team data
 */
export function useRefreshTeamData(teamId) {
  const { mutate } = useSWRConfig();

  const refreshTeamData = async () => {
    // Invalidate all team-related caches to trigger refetch
    const keys = getTeamRelatedKeys(teamId);
    keys.forEach(key => mutate(key));
  };

  return { refreshTeamData };
}
