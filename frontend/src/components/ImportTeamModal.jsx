import { useState } from 'react';
import { X, AlertCircle, CheckCircle, Users, User } from 'lucide-react';
import api from '../config/api';

const ImportTeamModal = ({ isOpen, onClose, onSuccess }) => {
  const [importType, setImportType] = useState('team'); // 'team' or 'player'
  const [opggUrl, setOpggUrl] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      let response;

      if (importType === 'team') {
        response = await api.post('/teams/import', {
          opgg_url: opggUrl,
          team_name: teamName,
          team_tag: teamTag,
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
    setOpggUrl('');
    setTeamName('');
    setTeamTag('');
    setError(null);
    setSuccess(false);
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
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Import Type Toggle */}
        <div className="flex gap-2 mb-6 p-1 bg-surface rounded-lg">
          <button
            type="button"
            onClick={() => setImportType('team')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
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
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
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
          {/* OP.GG URL */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              {importType === 'team' ? 'OP.GG Multisearch URL' : 'OP.GG Spieler URL'}
            </label>
            <input
              type="url"
              value={opggUrl}
              onChange={(e) => setOpggUrl(e.target.value)}
              placeholder={
                importType === 'team'
                  ? 'https://op.gg/multisearch/euw?summoners=...'
                  : 'https://op.gg/summoners/euw/Faker-KR1'
              }
              className="input w-full"
              required
            />
            <p className="text-xs text-text-muted mt-1">
              {importType === 'team'
                ? 'Füge die URL von OP.GG Multisearch mit allen 5 Spielern ein'
                : 'Füge die URL eines einzelnen Spielers von OP.GG ein'}
            </p>
          </div>

          {/* Team-specific fields */}
          {importType === 'team' && (
            <>
              {/* Team Name */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="z.B. BIG Academy"
                  className="input w-full"
                  required
                />
              </div>

              {/* Team Tag */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Team Tag
                </label>
                <input
                  type="text"
                  value={teamTag}
                  onChange={(e) => setTeamTag(e.target.value)}
                  placeholder="z.B. BIGA"
                  className="input w-full"
                  required
                  maxLength={10}
                />
              </div>
            </>
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
              className="btn btn-secondary flex-1"
              disabled={loading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
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
