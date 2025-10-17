import { useState, useEffect, useRef } from 'react';
import { Search, Users, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ImportTeamModal from '../ImportTeamModal';
import api from '../../config/api';

const Navbar = () => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState({ teams: [], players: [] });
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

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
      if (searchTerm.length >= 2) {
        performSearch();
      } else {
        setSearchResults({ teams: [], players: [] });
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(searchDebounced);
  }, [searchTerm]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const [teamsRes, playersRes] = await Promise.all([
        api.get('/teams/'),
        api.get('/players/')
      ]);

      const teams = teamsRes.data.teams || [];
      const players = playersRes.data.players || [];

      const term = searchTerm.toLowerCase();

      const filteredTeams = teams.filter(team =>
        team.name.toLowerCase().includes(term) ||
        (team.tag && team.tag.toLowerCase().includes(term))
      ).slice(0, 5);

      const filteredPlayers = players.filter(player =>
        player.summoner_name.toLowerCase().includes(term)
      ).slice(0, 5);

      setSearchResults({ teams: filteredTeams, players: filteredPlayers });
      setShowResults(true);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (type, id) => {
    setShowResults(false);
    setSearchTerm('');
    navigate(`/${type}/${id}`);
  };

  const handleImportSuccess = () => {
    // Refresh the page or update the teams list
    window.location.reload();
  };

  return (
    <>
      <nav className="bg-surface border-b border-border h-16 flex items-center px-6 sticky top-0 z-50">
        <div className="flex items-center justify-between w-full max-w-screen-2xl mx-auto">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <h1 className="text-xl font-bold text-text-primary">
              Prime League <span className="text-gradient">Scout</span>
            </h1>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8 relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Team oder Spieler suchen..."
                className="input w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
              />
            </div>

            {/* Search Results Dropdown */}
            {showResults && (searchResults.teams.length > 0 || searchResults.players.length > 0) && (
              <div className="absolute top-full mt-2 w-full bg-surface-elevated border border-border rounded-lg shadow-card max-h-96 overflow-y-auto z-50">
                {searchResults.teams.length > 0 && (
                  <div className="p-2">
                    <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-muted uppercase">
                      <Users className="w-4 h-4" />
                      Teams
                    </div>
                    {searchResults.teams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => handleResultClick('teams', team.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-hover rounded-lg transition-colors text-left"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-sm">
                            {team.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">{team.name}</p>
                          {team.tag && <p className="text-sm text-text-muted">{team.tag}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.players.length > 0 && (
                  <div className="p-2 border-t border-border">
                    <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-muted uppercase">
                      <User className="w-4 h-4" />
                      Spieler
                    </div>
                    {searchResults.players.map((player) => (
                      <button
                        key={player.id}
                        onClick={() => handleResultClick('players', player.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-hover rounded-lg transition-colors text-left"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-accent to-primary rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">{player.summoner_name}</p>
                          {player.current_rank && (
                            <p className="text-sm text-text-muted">{player.current_rank}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* No Results */}
            {showResults && !loading && searchResults.teams.length === 0 && searchResults.players.length === 0 && searchTerm.length >= 2 && (
              <div className="absolute top-full mt-2 w-full bg-surface-elevated border border-border rounded-lg shadow-card p-4 z-50">
                <p className="text-text-muted text-center">Keine Ergebnisse gefunden</p>
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <button
              className="btn btn-primary"
              onClick={() => setIsImportModalOpen(true)}
            >
              Importieren
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
