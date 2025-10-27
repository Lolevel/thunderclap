import { RefreshCw } from 'lucide-react';

/**
 * Background refresh indicator
 * Shows when data is being revalidated in the background
 */
export function RefreshIndicator({ isValidating }) {
  if (!isValidating) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg backdrop-blur-sm shadow-lg animate-fade-in">
      <RefreshCw className="w-4 h-4 text-primary animate-spin" />
      <span className="text-sm text-primary font-medium">Updating data...</span>
    </div>
  );
}

/**
 * Connection status indicator
 * Shows WebSocket connection status
 */
export function ConnectionIndicator({ isConnected }) {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm shadow-lg transition-all ${
          isConnected
            ? 'bg-success/10 border border-success/30'
            : 'bg-error/10 border border-error/30'
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-success animate-pulse' : 'bg-error'
          }`}
        />
        <span className={`text-xs font-medium ${isConnected ? 'text-success' : 'text-error'}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  );
}
