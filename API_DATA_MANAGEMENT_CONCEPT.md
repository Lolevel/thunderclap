# API Data Management Concept
## Prime League Scout - Standardized Data Fetching & Real-Time Sync

---

## 1. Overview

This document defines the standard approach for all API data fetching in the Prime League Scout application. The goals are:

1. **Minimize Frontend Downtime**: Show data immediately, update in background
2. **Efficient Caching**: Avoid redundant API calls across components
3. **Real-Time Synchronization**: Multiple users always see the latest data
4. **Excellent UX**: Skeleton screens, stale data display, clear loading states
5. **Consistency**: Same pattern everywhere for maintainability

---

## 2. Technology Stack

### 2.1 SWR (Stale-While-Revalidate)
**Library**: `swr` by Vercel

**Why SWR?**
- Built-in caching with automatic revalidation
- Stale-while-revalidate pattern out of the box
- Focus detection (refetch on window focus)
- Network detection (refetch on reconnect)
- Automatic deduplication of requests
- Optimistic UI updates
- TypeScript support
- Small bundle size (~5KB)

**Installation**:
```bash
npm install swr
```

### 2.2 WebSocket for Real-Time Updates
**Library**: `socket.io-client`

**Why WebSocket?**
- Bi-directional real-time communication
- Efficient for pushing updates from server
- Automatic reconnection handling
- Room-based broadcasting (per team/player)

**Installation**:
```bash
npm install socket.io-client
```

**Backend**: Add `socket.io` to FastAPI/Flask backend

---

## 3. Architecture

### 3.1 Folder Structure

```
frontend/src/
├── hooks/
│   ├── api/
│   │   ├── useTeam.js          # Team-related data hooks
│   │   ├── usePlayer.js        # Player-related data hooks
│   │   ├── useMatches.js       # Match history hooks
│   │   ├── useChampions.js     # Champion pool hooks
│   │   ├── useDraft.js         # Draft scenarios hooks
│   │   └── useStats.js         # Statistics hooks
│   ├── useWebSocket.js         # WebSocket connection hook
│   └── useSWRConfig.js         # Global SWR configuration
├── lib/
│   ├── api.js                  # Axios instance with interceptors
│   ├── cacheKeys.js            # Centralized cache key functions
│   └── socket.js               # Socket.io client instance
├── components/
│   ├── ui/
│   │   ├── Skeleton.jsx        # Skeleton loading components
│   │   ├── DataUpdateToast.jsx # Real-time update notification
│   │   └── RefreshIndicator.jsx # Background refresh indicator
└── contexts/
    └── WebSocketContext.jsx    # WebSocket provider
```

### 3.2 Data Flow Diagram

```
┌─────────────────┐
│   Component     │
└────────┬────────┘
         │ 1. Call custom hook (e.g., useTeam)
         ↓
┌─────────────────┐
│  Custom Hook    │  ← SWR handles caching, deduplication
│  (uses SWR)     │  ← Returns cached data immediately (stale)
└────────┬────────┘  ← Triggers background revalidation
         │
         │ 2. SWR fetches data via fetcher function
         ↓
┌─────────────────┐
│   API Client    │  ← Axios instance with interceptors
│   (lib/api.js)  │  ← Handles auth, errors, rate limiting
└────────┬────────┘
         │
         │ 3. HTTP Request
         ↓
┌─────────────────┐
│  Backend API    │
└────────┬────────┘
         │
         │ 4. Response with data
         ↓
┌─────────────────┐
│  SWR Cache      │  ← Data stored in cache
└────────┬────────┘  ← Component re-renders with fresh data
         │
         │ 5. WebSocket event (when data changes)
         ↓
┌─────────────────┐
│  WebSocket      │  ← Listens for "data:updated" events
│  Connection     │  ← Triggers SWR revalidation
└────────┬────────┘  ← Shows toast notification
         │
         │ 6. Mutate cache (trigger revalidation)
         ↓
┌─────────────────┐
│   Component     │  ← Updates with fresh data
│   Re-renders    │  ← Shows "Data updated" notification
└─────────────────┘
```

---

## 4. Implementation Details

### 4.1 Global SWR Configuration

**File**: `frontend/src/hooks/useSWRConfig.js`

```javascript
import { SWRConfig } from 'swr';
import api from '../lib/api';

// Global fetcher function
const fetcher = (url) => api.get(url).then(res => res.data);

// Default SWR configuration
export const swrConfig = {
  fetcher,

  // Revalidation options
  revalidateOnFocus: true,              // Refetch when window regains focus
  revalidateOnReconnect: true,          // Refetch when network reconnects
  refreshInterval: 180000,              // Auto-refresh every 3 minutes (180s)
  dedupingInterval: 2000,               // Dedupe requests within 2 seconds

  // Error handling
  shouldRetryOnError: true,             // Retry on error
  errorRetryCount: 3,                   // Max 3 retries
  errorRetryInterval: 5000,             // 5 seconds between retries

  // Loading states
  revalidateIfStale: true,              // Always show stale data first
  keepPreviousData: true,               // Keep previous data during revalidation

  // Performance
  suspense: false,                      // No React Suspense (for now)
};

// SWR Provider Component
export function SWRProvider({ children }) {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  );
}
```

**Usage in App**:
```javascript
// frontend/src/App.jsx
import { SWRProvider } from './hooks/useSWRConfig';
import { WebSocketProvider } from './contexts/WebSocketContext';

function App() {
  return (
    <SWRProvider>
      <WebSocketProvider>
        {/* Rest of app */}
      </WebSocketProvider>
    </SWRProvider>
  );
}
```

### 4.2 API Client with Interceptors

**File**: `frontend/src/lib/api.js`

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (add auth token, etc.)
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (error handling)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }

    if (error.response?.status === 429) {
      // Rate limited - show notification
      console.warn('Rate limited by API');
    }

    return Promise.reject(error);
  }
);

export default api;
```

### 4.3 Cache Key System

**File**: `frontend/src/lib/cacheKeys.js`

Centralized cache key functions ensure consistency and make cache invalidation easier.

```javascript
// Cache key factory functions
export const cacheKeys = {
  // Teams
  teams: () => '/api/teams',
  team: (teamId) => `/api/teams/${teamId}`,
  teamStats: (teamId) => `/api/teams/${teamId}/stats`,
  teamRoster: (teamId) => `/api/teams/${teamId}/roster`,
  teamOverview: (teamId) => `/api/teams/${teamId}/overview`,
  teamChampions: (teamId) => `/api/teams/${teamId}/champions`,
  teamDraftPatterns: (teamId) => `/api/teams/${teamId}/draft-patterns`,

  // Players
  player: (playerId) => `/api/players/${playerId}`,
  playerChampions: (playerId, type) => `/api/players/${playerId}/champions?type=${type}`,
  playerMatches: (playerId, limit = 20) => `/api/players/${playerId}/matches?limit=${limit}`,
  playerStats: (playerId) => `/api/players/${playerId}/stats`,

  // Matches
  matches: (teamId) => `/api/teams/${teamId}/matches`,
  match: (matchId) => `/api/matches/${matchId}`,

  // Draft Scenarios
  draftScenarios: (teamId) => `/api/teams/${teamId}/draft-scenarios`,
  draftScenario: (scenarioId) => `/api/draft-scenarios/${scenarioId}`,

  // Scouting
  lineupPrediction: (teamId) => `/api/scout/predict-lineup/${teamId}`,
  scoutingReport: (teamId) => `/api/scout/report/${teamId}`,
};

// Helper to invalidate related keys
export function getRelatedKeys(resource, id) {
  const related = {
    team: [
      cacheKeys.team(id),
      cacheKeys.teamStats(id),
      cacheKeys.teamRoster(id),
      cacheKeys.teamOverview(id),
      cacheKeys.teamChampions(id),
      cacheKeys.teamDraftPatterns(id),
      cacheKeys.matches(id),
      cacheKeys.draftScenarios(id),
      cacheKeys.lineupPrediction(id),
    ],
    player: [
      cacheKeys.player(id),
      cacheKeys.playerChampions(id, 'tournament'),
      cacheKeys.playerChampions(id, 'soloqueue'),
      cacheKeys.playerMatches(id),
      cacheKeys.playerStats(id),
    ],
  };

  return related[resource] || [];
}
```

### 4.4 WebSocket Setup

**File**: `frontend/src/lib/socket.js`

```javascript
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: false, // Manual connection control
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

// Connection lifecycle logging
socket.on('connect', () => {
  console.log('[WebSocket] Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[WebSocket] Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('[WebSocket] Connection error:', error);
});

export default socket;
```

**File**: `frontend/src/contexts/WebSocketContext.jsx`

```javascript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSWRConfig } from 'swr';
import socket from '../lib/socket';
import { cacheKeys } from '../lib/cacheKeys';
import { toast } from 'react-hot-toast';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const { mutate } = useSWRConfig();

  useEffect(() => {
    // Connect socket
    socket.connect();

    // Connection status
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    // Listen for data update events
    socket.on('data:updated', (payload) => {
      const { resource, id, updatedBy } = payload;

      console.log(`[WebSocket] Data updated: ${resource}/${id} by ${updatedBy}`);

      // Invalidate relevant cache keys
      if (resource === 'team') {
        mutate(cacheKeys.team(id));
        mutate(cacheKeys.teamStats(id));
        mutate(cacheKeys.teamRoster(id));
        mutate(cacheKeys.teamOverview(id));

        // Show notification
        toast.success(`Team data updated by ${updatedBy}`, {
          duration: 3000,
          icon: '🔄',
        });
      } else if (resource === 'player') {
        mutate(cacheKeys.player(id));
        mutate(cacheKeys.playerChampions(id, 'tournament'));
        mutate(cacheKeys.playerChampions(id, 'soloqueue'));

        toast.success(`Player data updated by ${updatedBy}`, {
          duration: 3000,
          icon: '🔄',
        });
      } else if (resource === 'draft_scenario') {
        mutate(cacheKeys.draftScenarios(id));

        toast.success(`Draft scenario updated by ${updatedBy}`, {
          duration: 3000,
          icon: '🎯',
        });
      }
    });

    // Listen for match import completion
    socket.on('import:completed', (payload) => {
      const { teamId, playerId } = payload;

      if (teamId) {
        mutate(cacheKeys.teamStats(teamId));
        mutate(cacheKeys.matches(teamId));
        toast.success('New matches imported!', { icon: '✅' });
      }

      if (playerId) {
        mutate(cacheKeys.playerMatches(playerId));
        toast.success('Player matches updated!', { icon: '✅' });
      }
    });

    // Cleanup
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('data:updated');
      socket.off('import:completed');
      socket.disconnect();
    };
  }, [mutate]);

  return (
    <WebSocketContext.Provider value={{ socket, isConnected }}>
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
```

### 4.5 Custom Hooks Examples

**File**: `frontend/src/hooks/api/useTeam.js`

```javascript
import useSWR from 'swr';
import { cacheKeys } from '../../lib/cacheKeys';
import api from '../../lib/api';

/**
 * Fetch team overview data
 * @param {string} teamId - Team UUID
 * @returns {object} { data, error, isLoading, isValidating, mutate }
 */
export function useTeamOverview(teamId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? cacheKeys.teamOverview(teamId) : null,
    {
      // Custom options for this specific query
      refreshInterval: 300000, // 5 minutes
      revalidateOnMount: true,
    }
  );

  return {
    overview: data,
    isLoading,
    isError: error,
    isValidating, // True when revalidating in background
    refresh: mutate, // Manual refresh function
  };
}

/**
 * Fetch team roster with role information
 */
export function useTeamRoster(teamId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? cacheKeys.teamRoster(teamId) : null
  );

  return {
    roster: data?.roster || [],
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Fetch team statistics
 */
export function useTeamStats(teamId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? cacheKeys.teamStats(teamId) : null
  );

  return {
    stats: data,
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Fetch team champion pool
 */
export function useTeamChampions(teamId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? cacheKeys.teamChampions(teamId) : null,
    {
      refreshInterval: 600000, // 10 minutes (champion pool changes slowly)
    }
  );

  return {
    champions: data?.champions || [],
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Fetch draft patterns (bans/picks)
 */
export function useTeamDraftPatterns(teamId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? cacheKeys.teamDraftPatterns(teamId) : null
  );

  return {
    bans: data?.bans || {},
    picks: data?.picks || {},
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}
```

**File**: `frontend/src/hooks/api/usePlayer.js`

```javascript
import useSWR from 'swr';
import { cacheKeys } from '../../lib/cacheKeys';

/**
 * Fetch player champion pool
 * @param {string} playerId - Player UUID
 * @param {string} type - 'tournament' or 'soloqueue'
 */
export function usePlayerChampions(playerId, type = 'tournament') {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    playerId ? cacheKeys.playerChampions(playerId, type) : null
  );

  return {
    champions: data?.champions || [],
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Fetch player match history
 */
export function usePlayerMatches(playerId, limit = 20) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    playerId ? cacheKeys.playerMatches(playerId, limit) : null
  );

  return {
    matches: data?.matches || [],
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}
```

**File**: `frontend/src/hooks/api/useDraft.js`

```javascript
import useSWR, { useSWRConfig } from 'swr';
import { cacheKeys } from '../../lib/cacheKeys';
import api from '../../lib/api';
import { useWebSocket } from '../useWebSocket';

/**
 * Fetch draft scenarios for a team
 */
export function useDraftScenarios(teamId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    teamId ? cacheKeys.draftScenarios(teamId) : null
  );

  return {
    scenarios: data?.scenarios || [],
    isLoading,
    isError: error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Mutation hook for saving draft scenarios
 */
export function useSaveDraftScenario(teamId) {
  const { mutate } = useSWRConfig();
  const { socket } = useWebSocket();

  const saveDraftScenario = async (scenarioData) => {
    try {
      // Optimistic update - update UI immediately
      mutate(
        cacheKeys.draftScenarios(teamId),
        (currentData) => {
          if (!currentData) return currentData;

          // If updating existing scenario
          if (scenarioData.id) {
            return {
              ...currentData,
              scenarios: currentData.scenarios.map((s) =>
                s.id === scenarioData.id ? { ...s, ...scenarioData } : s
              ),
            };
          }

          // If creating new scenario
          return {
            ...currentData,
            scenarios: [...currentData.scenarios, scenarioData],
          };
        },
        { revalidate: false } // Don't revalidate yet
      );

      // Make API call
      const response = scenarioData.id
        ? await api.put(`/api/draft-scenarios/${scenarioData.id}`, scenarioData)
        : await api.post(`/api/teams/${teamId}/draft-scenarios`, scenarioData);

      // Emit WebSocket event to notify other users
      socket.emit('data:update', {
        resource: 'draft_scenario',
        id: teamId,
        updatedBy: 'Current User', // Replace with actual user name
      });

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
```

### 4.6 UI Components for Loading States

**File**: `frontend/src/components/ui/Skeleton.jsx`

```javascript
export function Skeleton({ className = '', variant = 'default' }) {
  const variants = {
    default: 'h-4 w-full',
    text: 'h-4 w-3/4',
    title: 'h-8 w-1/2',
    avatar: 'h-12 w-12 rounded-full',
    card: 'h-32 w-full rounded-lg',
  };

  return (
    <div
      className={`animate-pulse bg-surface-hover ${variants[variant]} ${className}`}
    />
  );
}

// Skeleton for team overview card
export function TeamOverviewSkeleton() {
  return (
    <div className="card p-6 space-y-4">
      <Skeleton variant="title" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" />
        <Skeleton variant="text" />
      </div>
    </div>
  );
}

// Skeleton for roster list
export function RosterSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-surface rounded-lg">
          <Skeleton variant="avatar" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

**File**: `frontend/src/components/ui/RefreshIndicator.jsx`

```javascript
import { RefreshCw } from 'lucide-react';

export function RefreshIndicator({ isValidating }) {
  if (!isValidating) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg backdrop-blur-sm">
      <RefreshCw className="w-4 h-4 text-primary animate-spin" />
      <span className="text-sm text-primary">Updating data...</span>
    </div>
  );
}
```

### 4.7 Component Usage Example

**File**: `frontend/src/components/TeamOverview.jsx`

```javascript
import { useParams } from 'react-router-dom';
import { useTeamOverview, useTeamStats } from '../hooks/api/useTeam';
import { TeamOverviewSkeleton } from './ui/Skeleton';
import { RefreshIndicator } from './ui/RefreshIndicator';
import { AlertCircle } from 'lucide-react';

export default function TeamOverview() {
  const { teamId } = useParams();

  // Fetch data with custom hooks
  const { overview, isLoading, isError, isValidating } = useTeamOverview(teamId);
  const { stats } = useTeamStats(teamId);

  // Show skeleton on initial load
  if (isLoading) {
    return <TeamOverviewSkeleton />;
  }

  // Show error state
  if (isError) {
    return (
      <div className="card p-6 flex items-center gap-3 text-error">
        <AlertCircle className="w-5 h-5" />
        <span>Failed to load team overview. Please try again.</span>
      </div>
    );
  }

  return (
    <>
      {/* Background refresh indicator */}
      <RefreshIndicator isValidating={isValidating} />

      {/* Actual content - shows stale data during revalidation */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-4">{overview?.team_name}</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="stat-card">
            <span className="text-text-secondary">Prime League Games</span>
            <span className="text-3xl font-bold">{stats?.total_games || 0}</span>
          </div>

          <div className="stat-card">
            <span className="text-text-secondary">Winrate</span>
            <span className="text-3xl font-bold">
              {stats?.winrate ? `${(stats.winrate * 100).toFixed(1)}%` : 'N/A'}
            </span>
          </div>
        </div>

        {/* More overview data */}
      </div>
    </>
  );
}
```

---

## 5. Backend WebSocket Implementation

### 5.1 Socket.IO Server Setup

**File**: `backend/app/socket_manager.py`

```python
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request

socketio = SocketIO(cors_allowed_origins="*")

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")
    emit('connected', {'message': 'Connected to server'})

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")

@socketio.on('join_team_room')
def handle_join_team_room(data):
    """Join a room for a specific team to receive team-specific updates"""
    team_id = data.get('team_id')
    if team_id:
        join_room(f"team_{team_id}")
        print(f"Client {request.sid} joined team room: {team_id}")

@socketio.on('leave_team_room')
def handle_leave_team_room(data):
    """Leave a team room"""
    team_id = data.get('team_id')
    if team_id:
        leave_room(f"team_{team_id}")
        print(f"Client {request.sid} left team room: {team_id}")

def notify_data_update(resource: str, resource_id: str, updated_by: str = "System"):
    """
    Broadcast data update to all connected clients

    Args:
        resource: 'team', 'player', 'draft_scenario', etc.
        resource_id: UUID of the resource
        updated_by: Username or identifier of who made the update
    """
    payload = {
        'resource': resource,
        'id': resource_id,
        'updatedBy': updated_by,
        'timestamp': datetime.utcnow().isoformat()
    }

    # Broadcast to all clients
    socketio.emit('data:updated', payload, broadcast=True)

    # Also emit to specific room if it's a team resource
    if resource == 'team':
        socketio.emit('data:updated', payload, room=f"team_{resource_id}")

def notify_import_completed(team_id: str = None, player_id: str = None):
    """Notify when match import is completed"""
    payload = {
        'teamId': team_id,
        'playerId': player_id,
        'timestamp': datetime.utcnow().isoformat()
    }

    socketio.emit('import:completed', payload, broadcast=True)
```

### 5.2 Integration in API Endpoints

**Example**: `backend/app/routes/teams.py`

```python
from app.socket_manager import notify_data_update

@teams_bp.route('/api/teams/<team_id>', methods=['PUT'])
def update_team(team_id):
    """Update team data"""
    data = request.json

    # Update team in database
    team = Team.query.get(team_id)
    team.name = data.get('name', team.name)
    team.tag = data.get('tag', team.tag)
    db.session.commit()

    # Notify connected clients via WebSocket
    updated_by = request.headers.get('X-User-Name', 'System')
    notify_data_update('team', team_id, updated_by)

    return jsonify({'success': True, 'team': team.to_dict()})

@teams_bp.route('/api/teams/<team_id>/roster', methods=['PUT'])
def update_roster(team_id):
    """Update team roster"""
    data = request.json

    # Update roster logic
    # ...

    # Notify via WebSocket
    notify_data_update('team', team_id, request.headers.get('X-User-Name', 'System'))

    return jsonify({'success': True})
```

---

## 6. Migration Strategy

### 6.1 Phase 1: Setup Infrastructure (Week 1)
1. Install dependencies (`swr`, `socket.io-client`, `react-hot-toast`)
2. Create folder structure
3. Set up global SWR configuration
4. Implement API client with interceptors
5. Create cache key system
6. Set up WebSocket connection and context

### 6.2 Phase 2: Backend WebSocket (Week 1)
1. Install `flask-socketio` or `socket.io` (for Node.js)
2. Implement socket manager
3. Add WebSocket notifications to existing API endpoints
4. Test real-time updates between multiple clients

### 6.3 Phase 3: Migrate Components (Week 2-3)
**Priority Order**:
1. **Team Overview** - High usage, simple data structure
2. **Team Roster** - Moderate complexity, important for collaboration
3. **Draft Scenarios** - Complex, benefits from real-time sync
4. **Player Stats** - Independent, can be done in parallel
5. **Match History** - Large data, benefits from caching

**Migration Pattern for Each Component**:
1. Create custom hook in `hooks/api/`
2. Add loading skeleton component
3. Replace `useEffect` + `fetch` with custom hook
4. Add background refresh indicator
5. Test stale-while-revalidate behavior
6. Test WebSocket updates with multiple users

### 6.4 Phase 4: Advanced Features (Week 4)
1. Implement optimistic updates for mutations
2. Add retry logic for failed requests
3. Fine-tune refresh intervals per resource
4. Add error boundaries
5. Performance testing and optimization

---

## 7. Testing Strategy

### 7.1 Manual Testing Checklist
- [ ] Initial load shows skeleton
- [ ] Data appears after successful fetch
- [ ] Stale data shown during background revalidation
- [ ] Background refresh indicator appears
- [ ] Multiple tabs share cached data (no duplicate requests)
- [ ] Window focus triggers revalidation
- [ ] Network reconnect triggers revalidation
- [ ] Error state displays correctly
- [ ] Manual refresh works
- [ ] WebSocket connection establishes
- [ ] Data update notification appears when another user changes data
- [ ] Cache invalidation works correctly

### 7.2 Multi-User Testing
**Scenario**: Two users viewing the same team
1. User A opens team page
2. User B opens same team page (should use cached data)
3. User A updates roster
4. User B should see notification: "Team data updated by User A"
5. User B's UI should update automatically

### 7.3 Performance Testing
- Measure time to first render (should show skeleton immediately)
- Measure cache hit rate (should be >80% for repeated views)
- Check network tab for duplicate requests (should be 0 with deduplication)
- Monitor WebSocket connection stability

---

## 8. Best Practices & Guidelines

### 8.1 When to Use Custom Hooks
✅ **Always use custom hooks for**:
- Fetching data from API
- Mutations that affect server state
- Shared data across components

❌ **Don't use custom hooks for**:
- Local component state (use `useState`)
- One-off API calls (use `api.post()` directly)
- Non-reactive data (use normal functions)

### 8.2 Cache Invalidation Rules
**Invalidate cache when**:
1. User explicitly saves/updates data (mutate specific key)
2. WebSocket event received (mutate affected keys)
3. User navigates back to page (automatic with revalidateOnMount)

**Example**:
```javascript
// After saving roster
mutate(cacheKeys.teamRoster(teamId)); // Invalidate roster
mutate(cacheKeys.teamStats(teamId));  // Stats might change too
```

### 8.3 Loading State Priority
1. **Initial load**: Show skeleton (no data yet)
2. **Background refresh**: Show stale data + refresh indicator
3. **Error**: Show error message with retry button
4. **No data**: Show empty state with CTA

### 8.4 Refresh Interval Guidelines
- **Fast-changing data** (match imports, live games): 1-2 minutes
- **Medium-changing data** (team stats, rosters): 3-5 minutes
- **Slow-changing data** (champion pools, draft patterns): 10-15 minutes
- **Static data** (champion list, items): No auto-refresh

### 8.5 WebSocket Event Naming
Use consistent naming convention:
- `data:updated` - General data update
- `data:created` - New resource created
- `data:deleted` - Resource deleted
- `import:started` - Import job started
- `import:completed` - Import job finished
- `import:failed` - Import job failed

---

## 9. Future Enhancements

### 9.1 Offline Support
- Use `swr`'s built-in support for persisting cache to localStorage
- Queue mutations when offline, sync when online
- Show offline indicator

### 9.2 Pagination
- Implement infinite scroll with SWR's `useSWRInfinite`
- Example: Match history with "Load More"

### 9.3 Prefetching
- Prefetch data on hover (e.g., player cards)
- Prefetch next page in pagination

### 9.4 Analytics
- Track cache hit rate
- Monitor revalidation frequency
- Measure performance improvements

---

## 10. Resources & Documentation

### Official Docs
- **SWR**: https://swr.vercel.app/
- **Socket.IO**: https://socket.io/docs/v4/
- **Flask-SocketIO**: https://flask-socketio.readthedocs.io/

### Examples
- SWR with TypeScript: https://swr.vercel.app/docs/typescript
- Optimistic UI: https://swr.vercel.app/docs/mutation#optimistic-updates
- Real-time with SWR: https://swr.vercel.app/examples/real-time

---

## 11. Summary

This concept provides a complete, production-ready approach for API data management in the Prime League Scout application. Key benefits:

✅ **Zero Downtime**: Stale data shown instantly, updates in background
✅ **Efficient**: Smart caching, request deduplication, automatic revalidation
✅ **Real-Time**: WebSocket sync between multiple users with visual feedback
✅ **Great UX**: Skeleton screens, loading indicators, optimistic updates
✅ **Maintainable**: Consistent patterns, centralized configuration
✅ **Scalable**: Easy to add new endpoints following established patterns

**All future features should follow this standardized approach.**
