import { Link, useLocation } from 'react-router-dom';
import { Home, Users, TrendingUp, FileText } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/teams', icon: Users, label: 'Teams' },
    { path: '/players', icon: TrendingUp, label: 'Spieler' },
    { path: '/reports', icon: FileText, label: 'Reports' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-64 bg-surface border-r border-border min-h-[calc(100vh-4rem)] p-4">
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                ${active
                  ? 'bg-primary text-white shadow-glow-sm'
                  : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
