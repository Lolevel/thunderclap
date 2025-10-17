import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, TrendingUp, Calendar, ChevronRight } from 'lucide-react';
import api from '../config/api';

const Dashboard = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalPlayers: 0,
    recentMatches: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [teamsRes, playersRes] = await Promise.all([
        api.get('/teams'),
        api.get('/players'),
      ]);

      // Backend returns { teams: [...], total: 0 }
      const teamsArray = teamsRes.data.teams || [];
      const playersArray = playersRes.data.players || [];

      setTeams(teamsArray.slice(0, 10)); // Show first 10 teams
      setStats({
        totalTeams: teamsRes.data.total || teamsArray.length,
        totalPlayers: playersRes.data.total || playersArray.length,
        recentMatches: 0, // TODO: Add matches count
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-text-muted">Lädt...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Dashboard</h1>
        <p className="text-text-secondary">
          Überblick über alle Teams und Spieler
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-text-muted text-sm">Teams</p>
              <p className="text-2xl font-bold text-text-primary">{stats.totalTeams}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-secondary/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-text-muted text-sm">Spieler</p>
              <p className="text-2xl font-bold text-text-primary">{stats.totalPlayers}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/10 rounded-lg">
              <Calendar className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-text-muted text-sm">Letzte Matches</p>
              <p className="text-2xl font-bold text-text-primary">{stats.recentMatches}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Teams */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary">Neueste Teams</h2>
          <Link to="/teams" className="text-primary hover:text-primary-light text-sm font-medium">
            Alle anzeigen →
          </Link>
        </div>

        {teams.length === 0 ? (
          <div className="card text-center py-12">
            <Users className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-secondary mb-4">Noch keine Teams importiert</p>
            <button className="btn btn-primary">
              Erstes Team importieren
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((team) => (
              <Link
                key={team.id}
                to={`/teams/${team.id}`}
                className="card hover:bg-surface-hover transition-all duration-200 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {team.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                        {team.name}
                      </h3>
                      <p className="text-sm text-text-muted">{team.tag}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
