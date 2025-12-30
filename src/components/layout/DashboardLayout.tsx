import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import OfflineStatusBar from './OfflineStatusBar';

const SIDEBAR_STATE_KEY = 'pixelmart_sidebar_collapsed';

const DashboardLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
    return stored === 'true';
  });

  // Persist sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex">
      {/* Offline Status Bar */}
      <OfflineStatusBar />

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
