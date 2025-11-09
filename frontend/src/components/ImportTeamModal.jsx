import { useState } from 'react';
import { X, AlertCircle, CheckCircle, Users, User } from 'lucide-react';
import api from '../lib/api';

const ImportTeamModal = ({ isOpen, onClose, onSuccess }) => {
  const [importType, setImportType] = useState('team'); // 'team' or 'player'
  const [primeleagueUrl, setPrimeleagueUrl] = useState('');
  const [opggUrl, setOpggUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [urlWarning, setUrlWarning] = useState(null);

  if (!isOpen) return null;

  // Validate Prime League URL format
  const validatePrimeleagueUrl = (url) => {
    if (!url) {
      setUrlWarning(null);
      return true;
    }

    // Correct format: /de/leagues/prm/.../teams/...
    // Wrong format: /de/leagues/teams/...
    const correctPattern = /primeleague\.gg\/de\/leagues\/[^/]+\/[^/]+\/teams\//;
    const wrongPattern = /primeleague\.gg\/de\/leagues\/teams\//;

    if (wrongPattern.test(url) && !correctPattern.test(url)) {
      setUrlWarning('Falsches URL-Format! Bitte den Link aus der Liga-Ansicht verwenden.');
      return false;
    }

    if (!correctPattern.test(url)) {
      setUrlWarning('Ungültiges URL-Format. Bitte Link aus Liga-Ansicht verwenden.');
      return false;
    }

    setUrlWarning(null);
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      let response;

      if (importType === 'team') {
        // Validate URL before submitting
        if (!validatePrimeleagueUrl(primeleagueUrl)) {
          setError('Bitte korrigiere die URL und versuche es erneut.');
          setLoading(false);
          return;
        }

        response = await api.post('/teams/import', {
          primeleague_url: primeleagueUrl,
        });
      } else {
        // Player import
        response = await api.post('/players/import', {
          opgg_url: opggUrl,
        });
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess(response.data);
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || `Fehler beim Importieren ${importType === 'team' ? 'des Teams' : 'des Spielers'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setImportType('team');
    setPrimeleagueUrl('');
    setOpggUrl('');
    setError(null);
    setSuccess(false);
    setUrlWarning(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="card max-w-2xl w-full animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-text-primary">
            {importType === 'team' ? 'Team Importieren' : 'Spieler Importieren'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Import Type Toggle */}
        <div className="flex gap-2 mb-6 p-1 bg-surface rounded-lg">
          <button
            type="button"
            onClick={() => setImportType('team')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all cursor-pointer ${
              importType === 'team'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Users className="w-4 h-4" />
            Team
          </button>
          <button
            type="button"
            onClick={() => setImportType('player')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all cursor-pointer ${
              importType === 'player'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <User className="w-4 h-4" />
            Spieler
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Conditional Input based on import type */}
          {importType === 'team' ? (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                PrimeLeague Team URL
              </label>
              <input
                type="url"
                value={primeleagueUrl}
                onChange={(e) => {
                  setPrimeleagueUrl(e.target.value);
                  validatePrimeleagueUrl(e.target.value);
                }}
                placeholder="https://www.primeleague.gg/de/leagues/prm/.../teams/..."
                className={`input w-full ${urlWarning ? 'border-yellow-500 focus:border-yellow-500' : ''}`}
                required
              />
              {urlWarning && (
                <div className="flex items-center gap-2 mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  <p className="text-xs text-yellow-500">{urlWarning}</p>
                </div>
              )}
              <p className="text-xs text-text-muted mt-1">
                Füge den Link zur PrimeLeague Team-Seite ein (aus der Liga-Ansicht, nicht die generische Team-Seite).
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                OP.GG Spieler URL
              </label>
              <input
                type="url"
                value={opggUrl}
                onChange={(e) => setOpggUrl(e.target.value)}
                placeholder="https://op.gg/summoners/euw/Faker-KR1"
                className="input w-full"
                required
              />
              <p className="text-xs text-text-muted mt-1">
                Füge die URL eines einzelnen Spielers von OP.GG ein
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-error/10 border border-error/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
              <p className="text-sm text-success">
                {importType === 'team' ? 'Team erfolgreich importiert!' : 'Spieler erfolgreich importiert!'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-secondary flex-1 cursor-pointer"
              disabled={loading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1 cursor-pointer"
              disabled={loading || success}
            >
              {loading ? 'Importiere...' : 'Importieren'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportTeamModal;
