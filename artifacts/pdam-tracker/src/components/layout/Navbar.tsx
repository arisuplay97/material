import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePdamData } from '@/hooks/usePdamData';
import { useLocation } from 'wouter';
import { Sun, Moon, CalendarDays, LayoutDashboard, MapPin, Settings as SettingsIcon, Search } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ROLE_LABEL } from '@/lib/privacy';
import { formatDate } from '@/lib/constants';

export function Navbar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { activeSnapshot } = usePdamData();
  const [location] = useLocation();

  const getPageInfo = (path: string) => {
    if (path.startsWith('/gis')) return { title: 'Peta GIS', icon: MapPin };
    if (path.startsWith('/settings')) return { title: 'Pengaturan', icon: SettingsIcon };
    return { title: 'Dashboard', icon: LayoutDashboard };
  };

  const pageInfo = getPageInfo(location);
  const PageIcon = pageInfo.icon;
  const roleText = user?.role ? ROLE_LABEL[user.role] : 'Petugas';

  return (
    <header className="sticky top-0 z-30 flex h-[62px] shrink-0 items-center justify-between border-b border-neutral-200/80 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 px-4 sm:px-6 md:px-8 backdrop-blur-xl">
      {/* Left: Breadcrumb / Current View */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1 h-8 w-8 rounded-lg border-0 bg-transparent text-neutral-500 shadow-none hover:bg-neutral-100 hover:text-neutral-900 md:hidden" />
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
            <PageIcon className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-sm text-neutral-900 dark:text-white tracking-tight">
            {pageInfo.title}
          </span>
        </div>
      </div>

      {/* Center: Search Bar (FlowAI Style) */}
      <div className="hidden md:flex items-center flex-1 max-w-sm mx-6">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari kode, nama pelanggan..."
            className="w-full h-8.5 pl-9 pr-3 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/60 border border-neutral-200/40 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-300 dark:focus:border-neutral-700 transition-all"
            onClick={() => {
              const el = document.getElementById('dashboard-search-input');
              if (el) el.focus();
            }}
            readOnly
          />
        </div>
      </div>

      {/* Right: Date info & actions */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/70 py-1.5 px-3 text-xs text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-800">
          <CalendarDays className="h-3.5 w-3.5 text-neutral-400" />
          <span className="hidden sm:inline text-neutral-400">Data per</span>
          <span className="font-medium text-neutral-800 dark:text-neutral-200">{formatDate(activeSnapshot?.uploaded_at)}</span>
          {activeSnapshot?.is_demo && (
            <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 border border-amber-200/50">
              Demo
            </span>
          )}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Ganti Tema"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-neutral-600" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          </TooltipContent>
        </Tooltip>

        <div className="hidden items-center gap-2.5 border-l border-neutral-200 dark:border-neutral-800 pl-3 md:flex">
          <div className="flex flex-col text-right leading-none">
            <span className="text-xs font-semibold text-neutral-900 dark:text-white">{user?.name || 'Petugas'}</span>
            <span className="mt-1 text-[10px] text-neutral-400">{roleText}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
