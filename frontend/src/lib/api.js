import axios from 'axios';

// Use environment variable or fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('[API Config] Base URL:', API_BASE_URL);
console.log('[API Config] Mode:', import.meta.env.MODE);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure credentials are sent with cross-origin requests
  withCredentials: false,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add access token to requests
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle errors globally
    console.error('API Error:', error.response?.data || error.message);

    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }

    // Handle 429 Rate Limited
    if (error.response?.status === 429) {
      console.warn('Rate limited by API - retrying after delay');
    }

    // Handle 500 Server Error
    if (error.response?.status === 500) {
      console.error('Server error:', error.response?.data);
    }

    return Promise.reject(error);
  }
);

export default api;

// Team Refresh APIs
export const triggerTeamRefresh = (teamId) => {
  return api.post(`/teams/${teamId}/refresh`, {});
};

export const getTeamRefreshStatus = (teamId) => {
  return api.get(`/teams/${teamId}/refresh-status`);
};

// ============================================================
// SCHEDULE APIs
// ============================================================

// Schedule APIs (no team_id - schedule is for the own team)
export const getAvailabilityWeeks = (activeOnly = true) => {
  return api.get('/schedule/availability/weeks', {
    params: { active_only: activeOnly }
  });
};

export const getAvailability = (weekId) => {
  return api.get('/schedule/availability', {
    params: { week_id: weekId }
  });
};

export const createWeek = (year, weekNumber) => {
  return api.post('/schedule/availability/week', {
    year,
    week_number: weekNumber
  });
};

export const setAvailability = (data) => {
  return api.post('/schedule/availability', data);
};

export const updateAvailability = (availabilityId, data) => {
  return api.put(`/schedule/availability/${availabilityId}`, data);
};

export const deleteAvailability = (availabilityId) => {
  return api.delete(`/schedule/availability/${availabilityId}`);
};

// Event APIs
export const getEvents = (params = {}) => {
  return api.get('/schedule/events', { params });
};

export const getEvent = (eventId) => {
  return api.get(`/schedule/events/${eventId}`);
};

export const createEvent = (data) => {
  return api.post('/schedule/events', data);
};

export const updateEvent = (eventId, data) => {
  return api.put(`/schedule/events/${eventId}`, data);
};

export const deleteEvent = (eventId) => {
  return api.delete(`/schedule/events/${eventId}`);
};

// Scrim APIs
export const getScrims = (params = {}) => {
  return api.get('/schedule/scrims', { params });
};

export const getScrim = (scrimId) => {
  return api.get(`/schedule/scrims/${scrimId}`);
};

export const createScrim = (data) => {
  return api.post('/schedule/scrims', data);
};

export const updateScrim = (scrimId, data) => {
  return api.put(`/schedule/scrims/${scrimId}`, data);
};

export const deleteScrim = (scrimId) => {
  return api.delete(`/schedule/scrims/${scrimId}`);
};

export const completeScrim = (scrimId, data) => {
  return api.post(`/schedule/scrims/${scrimId}/complete`, data);
};
