import { useState } from 'react';

/**
 * TeamLogo component - Displays team logo with fallback to first letter
 * @param {string} logoUrl - URL to team logo
 * @param {string} teamName - Team name (used for fallback)
 * @param {string} size - Size variant: 'sm' (48px), 'md' (80px), 'lg' (120px)
 * @param {string} className - Additional CSS classes
 */
const TeamLogo = ({ logoUrl, teamName, size = 'md', className = '' }) => {
  const [imageError, setImageError] = useState(false);

  // Size mappings
  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-20 h-20 text-3xl',
    lg: 'w-32 h-32 text-5xl',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  // Show logo if available and not errored
  if (logoUrl && !imageError) {
    return (
      <div className={`${sizeClass} rounded-xl overflow-hidden flex-shrink-0 bg-slate-800/50 ${className}`}>
        <img
          src={logoUrl}
          alt={`${teamName} Logo`}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Fallback to gradient with first letter
  return (
    <div className={`${sizeClass} rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20 ${className}`}>
      <span className="text-white font-bold">
        {teamName?.charAt(0).toUpperCase() || '?'}
      </span>
    </div>
  );
};

export default TeamLogo;
