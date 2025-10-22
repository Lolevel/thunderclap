import { Link, useLocation } from 'react-router-dom';
import { Home, Users, TrendingUp } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/teams', icon: Users, label: 'Teams' },
    { path: '/players', icon: TrendingUp, label: 'Spieler' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 backdrop-blur-sm border-r border-slate-800/50 p-4 overflow-hidden">
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
                  ? 'bg-gradient-to-r from-primary to-accent text-white shadow-glow-sm'
                  : 'text-text-secondary hover:bg-slate-800/50 hover:text-text-primary'
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
