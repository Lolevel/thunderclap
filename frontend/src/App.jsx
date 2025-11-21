import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SWRProvider } from './hooks/useSWRConfig';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ImportProvider } from './contexts/ImportContext';
import { SidebarProvider } from './contexts/SidebarContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import TeamSchedule from './pages/TeamSchedule';
import Players from './pages/Players';
import PlayerDetail from './pages/PlayerDetail';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/ToastContainer';

function App() {
  return (
    <SWRProvider>
      <WebSocketProvider>
        <ImportProvider>
          <SidebarProvider>
            <ToastProvider>
              <Router>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="teams" element={<Teams />} />
                <Route path="teams/:id" element={<TeamDetail />} />
                <Route path="players" element={<Players />} />
                <Route path="players/:id" element={<PlayerDetail />} />
                <Route path="schedule" element={<TeamSchedule />} />
              </Route>
            </Routes>
          </Router>

            {/* React Hot Toast notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#1a1d29',
                  color: '#e5e7eb',
                  border: '1px solid #374151',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#1a1d29',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#1a1d29',
                  },
                },
              }}
            />
            </ToastProvider>
          </SidebarProvider>
        </ImportProvider>
      </WebSocketProvider>
    </SWRProvider>
  );
}

export default App;
