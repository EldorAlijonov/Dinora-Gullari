import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { GlobalLoadingIndicator } from './GlobalLoadingIndicator';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(collapsed));
  }, [collapsed]);

  return (
    <div className="flex min-h-screen bg-transparent text-slate-100">
      <GlobalLoadingIndicator />
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="min-w-0 flex-1">
        <Topbar collapsed={collapsed} onToggleSidebar={() => setCollapsed((value) => !value)} onOpenMobile={() => setMobileOpen(true)} />
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mx-auto max-w-[1430px] px-4 py-5 lg:px-6"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
