import useSWR, { useSWRConfig } from 'swr';
import { cacheKeys } from '../../lib/cacheKeys';
import api from '../../lib/api';
import { useWebSocket } from '../useWebSocket';

/**
 * Fetch draft scenarios for a team
 * @param {string} teamId - Team UUID
 * @returns {object} { blueScenarios, redScenarios, lockedRoster, isLoading, isError, isValidating, refresh }
 */
export function useDraftScenarios(teamId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? cacheKeys.draftScenarios(teamId) : null,
    {
      refreshInterval: 300000, // 5 minutes
    }
  );

  return {
    blueScenarios: data?.blue_scenarios || [],
    redScenarios: data?.red_scenarios || [],
    lockedRoster: data?.locked_roster || null,
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Mutation hook for saving draft scenarios with optimistic updates
 * @param {string} teamId - Team UUID
 * @returns {object} { saveDraftScenario, isLoading, error }
 */
export function useSaveDraftScenario(teamId) {
  const { mutate } = useSWRConfig();
  const { socket } = useWebSocket();

  const saveDraftScenario = async (scenarioData) => {
    try {
      const side = scenarioData.side;
      const sideKey = side === 'blue' ? 'blue_scenarios' : 'red_scenarios';

      // Optimistic update - update UI immediately
      mutate(
        cacheKeys.draftScenarios(teamId),
        (currentData) => {
          if (!currentData) return currentData;

          // If updating existing scenario
          if (scenarioData.id) {
            return {
              ...currentData,
              [sideKey]: currentData[sideKey].map((s) =>
                s.id === scenarioData.id ? { ...s, ...scenarioData } : s
              ),
            };
          }

          // If creating new scenario
          return {
            ...currentData,
            [sideKey]: [...currentData[sideKey], scenarioData],
          };
        },
        { revalidate: false } // Don't revalidate yet
      );

      // Make API call
      const response = scenarioData.id
        ? await api.put(`/teams/${teamId}/draft-scenarios/${scenarioData.id}`, scenarioData)
        : await api.post(`/teams/${teamId}/draft-scenarios`, scenarioData);

      // TODO: WebSocket disabled until backend is implemented
      // Emit WebSocket event to notify other users
      // socket.emit('data:update', {
      //   resource: 'draft_scenario',
      //   id: teamId,
      //   updatedBy: 'Current User', // TODO: Replace with actual user name from auth context
      // });

      // Revalidate to get server state
      mutate(cacheKeys.draftScenarios(teamId));

      return response.data;
    } catch (error) {
      // Rollback optimistic update on error
      mutate(cacheKeys.draftScenarios(teamId));
      throw error;
    }
  };

  return { saveDraftScenario };
}

/**
 * Mutation hook for deleting draft scenarios
 * @param {string} teamId - Team UUID
 * @returns {object} { deleteDraftScenario }
 */
export function useDeleteDraftScenario(teamId) {
  const { mutate } = useSWRConfig();
  const { socket } = useWebSocket();

  const deleteDraftScenario = async (scenarioId, side) => {
    try {
      const sideKey = side === 'blue' ? 'blue_scenarios' : 'red_scenarios';

      // Optimistic update - remove from UI immediately
      mutate(
        cacheKeys.draftScenarios(teamId),
        (currentData) => {
          if (!currentData) return currentData;

          return {
            ...currentData,
            [sideKey]: currentData[sideKey].filter((s) => s.id !== scenarioId),
          };
        },
        { revalidate: false }
      );

      // Make API call
      await api.delete(`/teams/${teamId}/draft-scenarios/${scenarioId}`);

      // TODO: WebSocket disabled until backend is implemented
      // Emit WebSocket event
      // socket.emit('data:update', {
      //   resource: 'draft_scenario',
      //   id: teamId,
      //   updatedBy: 'Current User',
      // });

      // Revalidate
      mutate(cacheKeys.draftScenarios(teamId));
    } catch (error) {
      // Rollback on error
      mutate(cacheKeys.draftScenarios(teamId));
      throw error;
    }
  };

  return { deleteDraftScenario };
}

/**
 * Mutation hook for updating team roster
 * @param {string} teamId - Team UUID
 * @returns {object} { updateRoster }
 */
export function useUpdateRoster(teamId) {
  const { mutate } = useSWRConfig();
  const { socket } = useWebSocket();

  const updateRoster = async (rosterData) => {
    try {
      // Optimistic update
      mutate(
        cacheKeys.teamRoster(teamId),
        (currentData) => {
          if (!currentData) return currentData;

          return {
            ...currentData,
            locked_roster: rosterData,
          };
        },
        { revalidate: false }
      );

      // Make API call
      const response = await api.put(`/teams/${teamId}/roster`, {
        locked_roster: rosterData,
      });

      // TODO: WebSocket disabled until backend is implemented
      // Emit WebSocket event
      // socket.emit('data:update', {
      //   resource: 'roster',
      //   id: teamId,
      //   updatedBy: 'Current User',
      // });

      // Revalidate
      mutate(cacheKeys.teamRoster(teamId));
      mutate(cacheKeys.teamOverview(teamId));

      return response.data;
    } catch (error) {
      // Rollback on error
      mutate(cacheKeys.teamRoster(teamId));
      throw error;
    }
  };

  return { updateRoster };
}

/**
 * Fetch lineup prediction for a team
 * @param {string} teamId - Team UUID
 * @returns {object} { prediction, isLoading, isError, isValidating, refresh }
 */
export function useLineupPrediction(teamId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? cacheKeys.lineupPrediction(teamId) : null,
    {
      refreshInterval: 600000, // 10 minutes
    }
  );

  return {
    prediction: data,
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}
