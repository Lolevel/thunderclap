import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, ChevronRight, Search, AlertCircle } from 'lucide-react';
import { useSWRConfig } from 'swr';
import { useTeams } from '../hooks/api/useTeam';
import { useTeamSocket } from '../hooks/useTeamSocket';
import { useToast } from '../components/ToastContainer';
import { cacheKeys } from '../lib/cacheKeys';
import { useImportTracking } from '../contexts/ImportContext';
import TeamLogo from '../components/TeamLogo';

const Teams = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { mutate: globalMutate } = useSWRConfig();
  const { isImportingTeam, clearImportingTeam } = useImportTracking();

  // Use SWR hook for data fetching
  const { teams, isLoading, isError, isValidating, refresh } = useTeams();
  const [searchTerm, setSearchTerm] = useState("");

  // WebSocket integration for live updates
  useTeamSocket({
    onTeamImportStarted: (data) => {
      console.log('[Teams] Team import started:', data);
      toast.info(`${data.team_name} wird importiert...`);
    },
    onTeamImportProgress: (data) => {
      console.log('[Teams] Team import progress:', data);
    },
    onTeamImportCompleted: (data) => {
      console.log('[Teams] Team import completed:', data);
      console.log('[Teams] Invalidating teams cache globally');

      // Show clickable toast
      toast.success(
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate(`/teams/${data.team_id}`)}
        >
          <span className="text-sm">{data.message}</span>
          <span className="text-cyan-400 text-xs">→ Zum Team</span>
        </div>,
        8000
      );

      // Globally invalidate teams cache to trigger refetch in ALL components
      console.log('[Teams] Calling globalMutate for:', cacheKeys.teams());
      globalMutate(cacheKeys.teams());
    },
    onTeamImportFailed: (data) => {
      console.error('[Teams] Team import failed:', data);
      toast.error(`Import fehlgeschlagen: ${data.error}`);
    },
  });

  const filteredTeams = (teams || []).filter(
    (team) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (team.tag && team.tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div className="animate-pulse text-slate-400">Lädt...</div>
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 text-center py-12">
          <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <p className="text-slate-400">Failed to load teams</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
            Teams
          </h1>
          <p className="text-slate-400">Manage and analyze your teams</p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
          />
        </div>

        {filteredTeams.length === 0 ? (
          <div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 text-center py-12">
            <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-300 mb-2">
              {searchTerm
                ? "No teams found"
                : "No teams imported yet"}
            </p>
            <p className="text-slate-500 text-sm">
              {!searchTerm && 'Use the "Import" button to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTeams.map((team) => (
              <Link
                key={team.id}
                to={`/teams/${team.id}`}
                className="group relative h-48 rounded-2xl bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-900/50 backdrop-blur-2xl border border-slate-700/30 hover:border-cyan-500/40 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10 overflow-hidden"
              >
                {/* Outer glow effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/0 via-blue-500/0 to-purple-500/0 group-hover:from-cyan-500/20 group-hover:via-blue-500/20 group-hover:to-purple-500/20 rounded-2xl blur-xl transition-all duration-500 opacity-0 group-hover:opacity-100 -z-10" />

                {/* Large logo on right side - flush with edge, grows on hover */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 opacity-60 pointer-events-none z-5 group-hover:scale-125 transition-all duration-500">
                  <div className="relative w-full h-full">
                    {/* Main logo - sharper */}
                    <TeamLogo
                      logoUrl={team.logo_url}
                      teamName={team.name}
                      size="lg"
                      className="w-full h-full"
                    />
                  </div>
                </div>

                {/* Multiple blur layers for smooth transition */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 opacity-25 pointer-events-none z-4 group-hover:scale-125 transition-all duration-500">
                  <div className="relative w-full h-full blur-lg">
                    <TeamLogo
                      logoUrl={team.logo_url}
                      teamName={team.name}
                      size="lg"
                      className="w-full h-full"
                    />
                  </div>
                </div>

                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 opacity-20 pointer-events-none z-3 group-hover:scale-125 transition-all duration-500">
                  <div className="relative w-full h-full blur-2xl">
                    <TeamLogo
                      logoUrl={team.logo_url}
                      teamName={team.name}
                      size="lg"
                      className="w-full h-full"
                    />
                  </div>
                </div>

                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 opacity-15 pointer-events-none z-2 group-hover:scale-125 transition-all duration-500">
                  <div className="relative w-full h-full blur-3xl">
                    <TeamLogo
                      logoUrl={team.logo_url}
                      teamName={team.name}
                      size="lg"
                      className="w-full h-full"
                    />
                  </div>
                </div>

                {/* Soft gradient overlay - allows logo colors to bleed through */}
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-slate-900/60 pointer-events-none mix-blend-multiply" />

                {/* Division badge - floating top right */}
                {team.division && (
                  <div className="absolute top-4 right-4 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900/70 backdrop-blur-lg text-slate-300 border border-slate-700/40 group-hover:bg-cyan-500/20 group-hover:text-cyan-300 group-hover:border-cyan-500/50 group-hover:shadow-lg group-hover:shadow-cyan-500/20 transition-all duration-300 z-20">
                    {team.division}
                  </div>
                )}

                {/* Content - Foreground */}
                <div className="relative h-full flex flex-col p-6 z-10">
                  {/* Top section: Tag and Name - Always centered */}
                  <div className="flex-1 flex flex-col justify-center max-w-[55%]">
                    <div className="text-4xl font-black text-white/90 drop-shadow-2xl transition-colors duration-300 mb-2">
                      {team.tag || team.name.substring(0, 3).toUpperCase()}
                    </div>
                    <div className="text-sm font-bold text-white/80 drop-shadow-lg transition-colors duration-300 break-words">
                      {team.name}
                    </div>
                  </div>

                  {/* Bottom section: Average Rank */}
                  {team.average_rank && (
                    <div className="flex items-center gap-2 bg-slate-900/40 backdrop-blur-md rounded-lg px-3 py-2 w-fit">
                      {team.average_rank_icon && (
                        <img
                          src={team.average_rank_icon}
                          alt={team.average_rank}
                          className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                        />
                      )}
                      <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors duration-300">
                        Ø {team.average_rank}
                      </span>
                    </div>
                  )}

                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Teams;
