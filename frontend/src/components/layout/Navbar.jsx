import { useState, useEffect, useRef } from 'react';
import { Search, Users, User, LogOut } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import ImportTeamModal from '../ImportTeamModal';
import { useTeams } from '../../hooks/api/useTeam';
import { usePlayers } from '../../hooks/api/usePlayer';
import TeamLogo from '../TeamLogo';
import { getSummonerIconUrl, handleSummonerIconError } from '../../utils/summonerHelper';

const Navbar = () => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState({ teams: [], players: [] });
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  // Fetch data with SWR (cached globally)
  const { teams, isLoading: teamsLoading } = useTeams();
  const { players, isLoading: playersLoading } = usePlayers();
  const loading = teamsLoading || playersLoading;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchDebounced = setTimeout(() => {
      if (searchTerm.length >= 2 && teams && players) {
        performSearch();
      } else {
        setSearchResults({ teams: [], players: [] });
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(searchDebounced);
  }, [searchTerm, teams, players]);

  const performSearch = () => {
    const term = searchTerm.toLowerCase();

    const filteredTeams = (teams || []).filter(team =>
      team.name.toLowerCase().includes(term) ||
      (team.tag && team.tag.toLowerCase().includes(term))
    ).slice(0, 5);

    const filteredPlayers = (players || []).filter(player =>
      player.summoner_name.toLowerCase().includes(term)
    ).slice(0, 5);

    setSearchResults({ teams: filteredTeams, players: filteredPlayers });
    setShowResults(true);
  };

  const handleResultClick = (type, id) => {
    setShowResults(false);
    setSearchTerm('');
    navigate(`/${type}/${id}`);
  };

  const handleImportSuccess = (data) => {
    // Navigate to team detail page if team was imported
    if (data.team_id) {
      navigate(`/teams/${data.team_id}`);
    } else if (data.player_id) {
      navigate(`/players/${data.player_id}`);
    } else {
      // Fallback: refresh if no ID provided
      window.location.reload();
    }
  };

  return (
		<>
			<nav className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-700/50 h-14 md:h-16 flex items-center px-3 sm:px-4 md:px-6 sticky top-0 z-50">
				<div className="flex items-center justify-between w-full max-w-screen-2xl mx-auto gap-2 md:gap-4">
					{/* Logo / Brand */}
					<Link to="/" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity duration-200 cursor-pointer flex-shrink-0">
						<img
							src="/thunderclap-logo.png"
							alt="Thunderclap Logo"
							className="w-7 h-7 md:w-8 md:h-8 object-cover scale-120 rounded-md"
						/>
						<h1 className="text-base md:text-xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent hidden sm:block">
							Thunderclap
						</h1>
					</Link>

					{/* Search Bar */}
					<div
						className="flex-1 max-w-md mx-2 md:mx-8 relative"
						ref={searchRef}>
						<div className="relative">
							<Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none z-10" />
							<input
								type="text"
								placeholder="Search..."
								className="w-full pl-9 md:pl-12 pr-3 md:pr-4 py-1.5 md:py-2 text-sm md:text-base bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								onFocus={() =>
									searchTerm.length >= 2 &&
									setShowResults(true)
								}
							/>
						</div>

						{/* Search Results Dropdown */}
						{showResults &&
							(searchResults.teams.length > 0 ||
								searchResults.players.length > 0) && (
								<div className="absolute top-full mt-2 w-full bg-slate-800/95 backdrop-blur border border-slate-700/50 rounded-lg shadow-xl shadow-black/30 max-h-96 overflow-y-auto z-50">
									{searchResults.teams.length > 0 && (
										<div className="p-2">
											<div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 uppercase">
												<Users className="w-4 h-4" />
												Teams
											</div>
											{searchResults.teams.map((team) => (
												<button
													key={team.id}
													onClick={() =>
														handleResultClick(
															'teams',
															team.id
														)
													}
													className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-700/50 rounded-lg transition-colors text-left cursor-pointer">
													<div className="flex-shrink-0">
														<TeamLogo
															logoUrl={team.logo_url}
															teamName={team.name}
															size="sm"
															className="!w-8 !h-8 !text-sm"
														/>
													</div>
													<div>
														<p className="font-medium text-white">
															{team.name}
														</p>
														{team.tag && (
															<p className="text-sm text-slate-400">
																{team.tag}
															</p>
														)}
													</div>
												</button>
											))}
										</div>
									)}

									{searchResults.players.length > 0 && (
										<div className="p-2 border-t border-slate-700/50">
											<div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 uppercase">
												<User className="w-4 h-4" />
												Players
											</div>
											{searchResults.players.map(
												(player) => (
													<button
														key={player.id}
														onClick={() =>
															handleResultClick(
																'players',
																player.id
															)
														}
														className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-700/50 rounded-lg transition-colors text-left cursor-pointer">
														<div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-cyan-500/30">
															<img
																src={getSummonerIconUrl(player.profile_icon_id)}
																alt={player.summoner_name}
																className="w-full h-full object-cover"
																onError={handleSummonerIconError}
															/>
														</div>
														<div>
															<p className="font-medium text-white">
																{
																	player.summoner_name
																}
															</p>
															{player.soloq && (
																<p className="text-sm text-slate-400">
																	{
																		player.soloq.display
																	}
																</p>
															)}
														</div>
													</button>
												)
											)}
										</div>
									)}
								</div>
							)}

						{/* No Results */}
						{showResults &&
							!loading &&
							searchResults.teams.length === 0 &&
							searchResults.players.length === 0 &&
							searchTerm.length >= 2 && (
								<div className="absolute top-full mt-2 w-full bg-slate-800/95 backdrop-blur border border-slate-700/50 rounded-lg shadow-xl shadow-black/30 p-4 z-50">
									<p className="text-slate-400 text-center">
										No results found
									</p>
								</div>
							)}
					</div>

					{/* Right Actions */}
					<div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
						<button
							className="px-2.5 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 font-medium cursor-pointer text-xs md:text-sm"
							onClick={() => setIsImportModalOpen(true)}>
							<span className="hidden sm:inline">Import</span>
							<span className="sm:hidden">+</span>
						</button>

						<button
							onClick={() => {
								localStorage.removeItem('access_token');
								navigate('/login');
							}}
							className="px-2 md:px-3 py-1.5 md:py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-lg transition-all duration-300 border border-slate-700/50 hover:border-slate-600 flex items-center gap-1.5 md:gap-2 cursor-pointer"
							title="Logout">
							<LogOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
							<span className="text-xs md:text-sm font-medium hidden md:inline">Logout</span>
						</button>
					</div>
				</div>
			</nav>

			<ImportTeamModal
				isOpen={isImportModalOpen}
				onClose={() => setIsImportModalOpen(false)}
				onSuccess={handleImportSuccess}
			/>
		</>
  );
};

export default Navbar;
