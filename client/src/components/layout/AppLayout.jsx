import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar.jsx';
import { MobileNav } from './MobileNav.jsx';

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[var(--surface-1)]">
      <Topbar onMenuToggle={() => setMobileNavOpen(true)} />
      {mobileNavOpen && <MobileNav onClose={() => setMobileNavOpen(false)} />}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

export function ChannelLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-[var(--surface-1)]">
      <Topbar onMenuToggle={() => setMobileNavOpen(true)} />
      {mobileNavOpen && <MobileNav onClose={() => setMobileNavOpen(false)} />}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
