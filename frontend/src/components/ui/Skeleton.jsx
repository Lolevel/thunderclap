/**
 * Skeleton loading components for better UX during data fetching
 * Shows placeholder UI while data is loading
 */

export function Skeleton({ className = '', variant = 'default' }) {
  const variants = {
    default: 'h-4 w-full',
    text: 'h-4 w-3/4',
    title: 'h-8 w-1/2',
    avatar: 'h-12 w-12 rounded-full',
    card: 'h-32 w-full rounded-lg',
    circle: 'h-10 w-10 rounded-full',
  };

  return (
    <div
      className={`animate-pulse bg-surface-hover ${variants[variant]} ${className}`}
    />
  );
}

/**
 * Skeleton for team overview card
 */
export function TeamOverviewSkeleton() {
  return (
    <div className="card p-6 space-y-4">
      <Skeleton variant="title" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" />
        <Skeleton variant="text" />
      </div>
    </div>
  );
}

/**
 * Skeleton for roster list
 */
export function RosterSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-surface rounded-lg">
          <Skeleton variant="avatar" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for champion pool cards
 */
export function ChampionPoolSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton variant="circle" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for match history
 */
export function MatchHistorySkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="flex gap-2">
            {[...Array(5)].map((_, j) => (
              <Skeleton key={j} variant="circle" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for stats cards
 */
export function StatsCardSkeleton() {
  return (
    <div className="card p-6 space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

/**
 * Skeleton for table rows
 */
export function TableRowSkeleton({ columns = 4 }) {
  return (
    <tr>
      {[...Array(columns)].map((_, i) => (
        <td key={i} className="p-3">
          <Skeleton className="h-4" />
        </td>
      ))}
    </tr>
  );
}
