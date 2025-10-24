import { Shield, Sword, Wand2, Target, Heart } from 'lucide-react';

/**
 * Role icon component that displays the appropriate icon for each role
 * Uses Lucide React icons
 */
const RoleIcon = ({ role, size = 16, className = '' }) => {
  const iconProps = {
    size,
    className: `${className}`,
    strokeWidth: 2
  };

  // Normalize role to uppercase for comparison
  const normalizedRole = (role || '').toUpperCase();

  switch (normalizedRole) {
    case 'TOP':
      return <Shield {...iconProps} className={`${className} text-blue-400`} title="Top" />;

    case 'JUNGLE':
      return <Sword {...iconProps} className={`${className} text-green-400`} title="Jungle" />;

    case 'MID':
    case 'MIDDLE':
      return <Wand2 {...iconProps} className={`${className} text-purple-400`} title="Mid" />;

    case 'BOT':
    case 'BOTTOM':
    case 'ADC':
      return <Target {...iconProps} className={`${className} text-red-400`} title="Bot" />;

    case 'SUPPORT':
    case 'UTILITY':
      return <Heart {...iconProps} className={`${className} text-yellow-400`} title="Support" />;

    default:
      return <span className={`${className} text-xs text-slate-400`}>?</span>;
  }
};

export default RoleIcon;
