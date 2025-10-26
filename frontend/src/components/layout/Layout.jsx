import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      <Navbar />
      <Sidebar />
      <main className="ml-64 w-[calc(100%-16rem)] flex-1 flex flex-col">
        <Outlet />
      </main>
      <footer className="ml-64 w-[calc(100%-16rem)] py-4 border-t border-slate-800/50">
        <div className="px-6">
          <p className="text-center text-sm text-slate-500">
            made with &lt;3 by lolevel
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
