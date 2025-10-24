import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, ChevronRight, Search } from 'lucide-react';
import api from "../config/api";

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams');
      setTeams(response.data.teams || []);
    } catch (error) {
      console.error("Failed to fetch teams:", error);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter(
    (team) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (team.tag && team.tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="animate-pulse text-slate-400">Lädt...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
            Teams
          </h1>
          <p className="text-slate-400">Verwalte und analysiere deine Teams</p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Teams durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
          />
        </div>

        {filteredTeams.length === 0 ? (
          <div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 text-center py-12">
            <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-300 mb-2">
              {searchTerm
                ? "Keine Teams gefunden"
                : "Noch keine Teams importiert"}
            </p>
            <p className="text-slate-500 text-sm">
              {!searchTerm && 'Nutze den "Team Importieren" Button zum Starten'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeams.map((team) => (
              <a
                key={team.id}
                href={`/teams/${team.id}`}
                className="group relative overflow-hidden rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 p-5 hover:bg-slate-800/60"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 via-blue-500/0 to-purple-500/0 group-hover:from-cyan-500/10 group-hover:via-blue-500/10 group-hover:to-purple-500/10 transition-all duration-300 pointer-events-none" />

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-105">
                      <span className="text-white font-bold text-lg">
                        {team.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {team.division && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-slate-700/50 text-slate-300 group-hover:bg-cyan-500/20 group-hover:text-cyan-300 transition-colors duration-300">
                        {team.division}
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors mb-1">
                    {team.name}
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">{team.tag}</p>

                  <div className="flex items-center justify-between text-slate-400 group-hover:text-cyan-400 transition-colors text-sm">
                    <span>Zum Team →</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Teams;
