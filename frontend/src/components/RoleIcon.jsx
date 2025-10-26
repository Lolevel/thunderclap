/**
 * Role icon component that displays the appropriate icon for each role
 * Uses official League of Legends role SVGs from CommunityDragon
 */
const RoleIcon = ({ role, size = 16, className = '' }) => {
  // Normalize role to uppercase for comparison
  const normalizedRole = (role || '').toUpperCase();

  // Map roles to CommunityDragon position names
  const getRolePosition = () => {
    switch (normalizedRole) {
      case 'TOP':
        return 'top';
      case 'JUNGLE':
        return 'jungle';
      case 'MID':
      case 'MIDDLE':
        return 'middle';
      case 'BOT':
      case 'BOTTOM':
      case 'ADC':
        return 'bottom';
      case 'SUPPORT':
      case 'UTILITY':
        return 'utility';
      default:
        return null;
    }
  };

  const position = getRolePosition();

  if (!position) {
    return (
      <span
        className={`${className} inline-flex items-center justify-center text-slate-400 font-bold`}
        style={{ width: size, height: size, fontSize: size * 0.75 }}
        title="Unknown Role"
      >
        ?
      </span>
    );
  }

  const svgUrl = `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/svg/position-${position}.svg`;

  return (
    <img
      src={svgUrl}
      alt={normalizedRole}
      title={normalizedRole.charAt(0) + normalizedRole.slice(1).toLowerCase()}
      style={{ width: size, height: size }}
      className={`inline-block ${className}`}
    />
  );
};

export default RoleIcon;
