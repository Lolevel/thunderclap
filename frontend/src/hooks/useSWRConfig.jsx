import { SWRConfig } from 'swr';
import api from '../lib/api';

// Global fetcher function
const fetcher = (url) => api.get(url).then(res => res.data);

// Default SWR configuration
export const swrConfig = {
  fetcher,

  // Revalidation options
  revalidateOnFocus: true,              // Refetch when window regains focus
  revalidateOnReconnect: true,          // Refetch when network reconnects
  refreshInterval: 180000,              // Auto-refresh every 3 minutes (180s)
  dedupingInterval: 2000,               // Dedupe requests within 2 seconds

  // Error handling
  shouldRetryOnError: true,             // Retry on error
  errorRetryCount: 3,                   // Max 3 retries
  errorRetryInterval: 5000,             // 5 seconds between retries

  // Loading states
  revalidateIfStale: true,              // Always show stale data first
  keepPreviousData: true,               // Keep previous data during revalidation

  // Performance
  suspense: false,                      // No React Suspense (for now)
};

// SWR Provider Component
export function SWRProvider({ children }) {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  );
}
