import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />
      <Sidebar />
      <main className="ml-64 w-[calc(100%-16rem)]">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
