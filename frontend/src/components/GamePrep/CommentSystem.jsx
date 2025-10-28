import { useState } from 'react';
import { MessageSquare, ChevronDown, ChevronRight, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

/**
 * 3-Level Comment System
 * - Global: Team-wide notes
 * - Roster: Roster-specific notes
 * - Scenario: Scenario-specific notes
 *
 * Multiple sections can be open simultaneously (accordion)
 */
export default function CommentSystem({
  globalComments,
  rosterComments,
  scenarioComments,
  currentRoster,
  currentScenario,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  showOnlyGlobal = false,
  showOnlyRoster = false,
  showOnlyScenario = false
}) {
  const [expandedSections, setExpandedSections] = useState(['global', 'roster', 'scenario']); // All open by default

  const toggleSection = (section) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-purple-400" />
        Notes & Comments
      </h2>

      {/* Global Comments */}
      {!showOnlyRoster && !showOnlyScenario && (
        <CommentSection
          title="Global Notes"
          subtitle="Team-wide preparation notes"
          level="global"
          comments={globalComments}
          isExpanded={expandedSections.includes('global')}
          onToggle={() => toggleSection('global')}
          onAddComment={(content) => onAddComment('global', content)}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
        />
      )}

      {/* Roster Comments */}
      {!showOnlyGlobal && !showOnlyScenario && currentRoster && (
        <CommentSection
          title={`Roster: ${currentRoster.name}`}
          subtitle="Notes for this specific roster"
          level="roster"
          rosterId={currentRoster.id}
          comments={rosterComments}
          isExpanded={expandedSections.includes('roster')}
          onToggle={() => toggleSection('roster')}
          onAddComment={(content) => onAddComment('roster', content, currentRoster.id)}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
        />
      )}

      {/* Scenario Comments */}
      {!showOnlyGlobal && !showOnlyRoster && currentScenario && (
        <CommentSection
          title={`Scenario: ${currentScenario.name}`}
          subtitle="Draft-specific notes and strategy"
          level="scenario"
          scenarioId={currentScenario.id}
          comments={scenarioComments}
          isExpanded={expandedSections.includes('scenario')}
          onToggle={() => toggleSection('scenario')}
          onAddComment={(content) => onAddComment('scenario', content, null, currentScenario.id)}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
        />
      )}
    </div>
  );
}

// Comment Section (Accordion)
function CommentSection({
  title,
  subtitle,
  level,
  rosterId,
  scenarioId,
  comments,
  isExpanded,
  onToggle,
  onAddComment,
  onUpdateComment,
  onDeleteComment
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    onAddComment(newCommentText);
    setNewCommentText('');
    setIsAdding(false);
  };

  return (
    <div className="rounded-xl bg-slate-800/40 backdrop-blur border border-slate-700/50 overflow-hidden">
      {/* Header (clickable to expand/collapse) */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
          <div className="text-left">
            <div className="font-medium text-white">{title}</div>
            <div className="text-xs text-slate-400">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <MessageSquare className="w-4 h-4" />
          {comments.length}
        </div>
      </button>

      {/* Content (expanded) */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/50">
          {/* Comments List */}
          {comments.length > 0 ? (
            <div className="space-y-2 mt-3">
              {comments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onUpdate={onUpdateComment}
                  onDelete={onDeleteComment}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-slate-400">
              No comments yet
            </div>
          )}

          {/* Add Comment Form */}
          {isAdding ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write your note..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-slate-400 resize-none transition-colors"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddComment}
                  className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-sm shadow-purple-500/20 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Save
                </button>
                <button
                  onClick={() => { setIsAdding(false); setNewCommentText(''); }}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-all duration-300 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="mt-3 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-sm rounded-lg transition-all duration-300 flex items-center gap-2 w-full justify-center border border-slate-600"
            >
              <Plus className="w-3 h-3" />
              Add Note
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Comment Item
function CommentItem({ comment, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);

  const handleSave = () => {
    if (!editText.trim()) return;
    onUpdate(comment.id, editText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(comment.content);
    setIsEditing(false);
  };

  return (
    <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-700/50">
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:border-purple-500 text-white resize-none transition-colors"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-sm shadow-purple-500/20 flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-all duration-300 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="text-xs text-slate-400">
              {comment.author} • {new Date(comment.created_at).toLocaleDateString()}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 hover:bg-slate-600/50 rounded transition-colors"
                title="Edit"
              >
                <Edit2 className="w-3 h-3 text-slate-400" />
              </button>
              <button
                onClick={() => onDelete(comment.id)}
                className="p-1 hover:bg-slate-600/50 rounded text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-200 whitespace-pre-wrap">{comment.content}</p>
        </>
      )}
    </div>
  );
}
