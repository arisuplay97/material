import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocation } from 'wouter';
import { Sun, Moon } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ROLE_LABEL } from '@/lib/privacy';

/**
 * Exact Cloudflare Top Breadcrumb Bar:
 * Clean white bar, 1px bottom hairline, simple text breadcrumb ("PDAM Tirta Ardhia Rinjani  /  Ringkasan utama"),
 * zero decorative icon boxes.
 */
export function Navbar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();

  const getPageTitle = (path: string) => {
    if (path.startsWith('/gis')) return 'Pemetaan GIS';
    if (path.startsWith('/data-correction')) return 'Koreksi data';
    if (path.startsWith('/settings')) return 'Master & database';
    return 'Ringkasan utama';
  };

  const pageTitle = getPageTitle(location);
  const roleText = user?.role ? ROLE_LABEL[user.role] : 'Petugas';

  return (
    <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center justify-between border-b border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 sm:px-6">
      {/* Left: Mobile Trigger + Clean Text Breadcrumb */}
      <div className="flex items-center gap-2.5 text-[13px]">
        <SidebarTrigger className="-ml-1 h-8 w-8 rounded-lg border border-[#e4e4e7] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#52525b] hover:bg-[#f4f4f5] md:hidden" />
        <span className="hidden sm:inline text-[#71717a] dark:text-zinc-400 font-normal">
          PDAM Tirta Ardhia Rinjani
        </span>
        <span className="hidden sm:inline text-[#d4d4d8] dark:text-zinc-700">/</span>
        <span className="font-medium text-[#18181b] dark:text-zinc-100">
          {pageTitle}
        </span>
      </div>

      {/* Right: Theme Toggle & Account Info */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Ganti Tema"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4e4e7] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#52525b] dark:text-zinc-400 hover:bg-[#f4f4f5] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#e5e7eb] dark:border-zinc-800 text-[12.5px]">
          <span className="font-medium text-[#18181b] dark:text-zinc-100">{user?.name || 'Petugas'}</span>
          <span className="text-[#71717a] dark:text-zinc-400">({roleText})</span>
        </div>
      </div>
    </header>
  );
}
