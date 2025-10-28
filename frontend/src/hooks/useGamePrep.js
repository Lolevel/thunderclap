/**
 * Game Prep API Hooks
 */
import { useState, useEffect } from 'react';
import api from '../lib/api';

/**
 * Fetch rosters for a team
 */
export function useRosters(teamId) {
  const [rosters, setRosters] = useState([]);
  const [lockedRoster, setLockedRoster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRosters = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/game-prep/teams/${teamId}/rosters`);
      setRosters(response.data.rosters);
      setLockedRoster(response.data.locked_roster);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) fetchRosters();
  }, [teamId]);

  const createRoster = async (rosterData) => {
    const response = await api.post(`/game-prep/teams/${teamId}/rosters`, rosterData);
    await fetchRosters();
    return response.data;
  };

  const updateRoster = async (rosterId, rosterData) => {
    const response = await api.put(`/game-prep/rosters/${rosterId}`, rosterData);
    await fetchRosters();
    return response.data;
  };

  const deleteRoster = async (rosterId) => {
    await api.delete(`/game-prep/rosters/${rosterId}`);
    await fetchRosters();
  };

  const lockRoster = async (rosterId, username = 'User') => {
    const response = await api.post(`/game-prep/rosters/${rosterId}/lock`, { username });
    await fetchRosters();
    return response.data;
  };

  const unlockRoster = async (rosterId) => {
    const response = await api.post(`/game-prep/rosters/${rosterId}/unlock`);
    await fetchRosters();
    return response.data;
  };

  return {
    rosters,
    lockedRoster,
    loading,
    error,
    createRoster,
    updateRoster,
    deleteRoster,
    lockRoster,
    unlockRoster,
    refresh: fetchRosters
  };
}

/**
 * Fetch scenarios for a roster
 */
export function useScenarios(rosterId) {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchScenarios = async () => {
    if (!rosterId) {
      setScenarios([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/game-prep/rosters/${rosterId}/scenarios`);
      setScenarios(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, [rosterId]);

  const createScenario = async (scenarioData) => {
    const response = await api.post(`/game-prep/rosters/${rosterId}/scenarios`, scenarioData);
    await fetchScenarios();
    return response.data;
  };

  const updateScenario = async (scenarioId, scenarioData) => {
    const response = await api.put(`/game-prep/scenarios/${scenarioId}`, scenarioData);
    await fetchScenarios();
    return response.data;
  };

  const deleteScenario = async (scenarioId) => {
    await api.delete(`/game-prep/scenarios/${scenarioId}`);
    await fetchScenarios();
  };

  return {
    scenarios,
    loading,
    error,
    createScenario,
    updateScenario,
    deleteScenario,
    refresh: fetchScenarios
  };
}

/**
 * Fetch comments for a team
 */
export function useComments(teamId, level = null, rosterId = null, scenarioId = null) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchComments = async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (level) params.append('level', level);
      if (rosterId) params.append('roster_id', rosterId);
      if (scenarioId) params.append('scenario_id', scenarioId);

      const response = await api.get(`/game-prep/teams/${teamId}/comments?${params}`);
      setComments(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [teamId, level, rosterId, scenarioId]);

  const createComment = async (commentData) => {
    const response = await api.post(`/game-prep/teams/${teamId}/comments`, commentData);
    await fetchComments();
    return response.data;
  };

  const updateComment = async (commentId, content) => {
    const response = await api.put(`/game-prep/comments/${commentId}`, { content });
    await fetchComments();
    return response.data;
  };

  const deleteComment = async (commentId) => {
    await api.delete(`/game-prep/comments/${commentId}`);
    await fetchComments();
  };

  return {
    comments,
    loading,
    error,
    createComment,
    updateComment,
    deleteComment,
    refresh: fetchComments
  };
}
