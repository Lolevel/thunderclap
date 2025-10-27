import { Loader2 } from 'lucide-react';

/**
 * Subtle indicator showing background data prefetching
 * Only shows during initial prefetch, disappears once complete
 */
export function PrefetchIndicator({ prefetchStatus }) {
  // Count how many are still loading
  const loading = Object.values(prefetchStatus).filter(
    status => status === 'loading' || status === 'pending'
  ).length;

  // Don't show anything if all loaded
  if (loading === 0) return null;

  const total = Object.keys(prefetchStatus).length;
  const loaded = total - loading;
  const progress = Math.round((loaded / total) * 100);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-slate-800/90 backdrop-blur border border-slate-700/50 rounded-lg shadow-lg">
      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
      <span className="text-xs text-slate-300">
        Lade Daten... {progress}%
      </span>
    </div>
  );
}
