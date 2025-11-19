import { Link, useLocation } from 'react-router-dom';
import { Home, Users, TrendingUp } from 'lucide-react';
import { useSidebarContext } from '../../contexts/SidebarContext';

const Sidebar = () => {
  const location = useLocation();
  const { contextContent } = useSidebarContext();

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/teams', icon: Users, label: 'Teams' },
    { path: '/players', icon: TrendingUp, label: 'Players' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden lg:block fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 backdrop-blur-sm border-r border-slate-800/50 overflow-y-auto">
        {/* Main Navigation */}
        <nav className="p-4 space-y-2 border-b border-slate-800/50">
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

        {/* Context Area */}
        {contextContent && (
          <div className="p-4">
            {contextContent}
          </div>
        )}
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/50 z-50">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 flex-1
                  ${active
                    ? 'text-cyan-400'
                    : 'text-slate-400 hover:text-slate-200'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${active ? 'scale-110' : ''}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
