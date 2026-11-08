import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePdamData } from '@/hooks/usePdamData';
import { useLocation } from 'wouter';
import { Sun, Moon, CalendarDays, LayoutDashboard, MapPin, Settings as SettingsIcon, Search, SearchCheck } from 'lucide-react';
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
    if (path.startsWith('/data-correction')) return { title: 'Koreksi Data', icon: SearchCheck };
    if (path.startsWith('/settings')) return { title: 'Pengaturan', icon: SettingsIcon };
    return { title: 'Dashboard', icon: LayoutDashboard };
  };

  const pageInfo = getPageInfo(location);
  const PageIcon = pageInfo.icon;
  const roleText = user?.role ? ROLE_LABEL[user.role] : 'Petugas';

  return (
    <header className="sticky top-0 z-40 flex h-13 shrink-0 items-center justify-between border-b border-border bg-card px-3.5 sm:px-6">
      {/* Left: Mobile Trigger + Kumo Breadcrumb */}
      <div className="flex items-center gap-2.5">
        <SidebarTrigger className="-ml-1 h-8 w-8 rounded-md border border-border bg-card text-muted-foreground shadow-2xs hover:bg-muted hover:text-foreground md:hidden" />
        <div className="flex items-center gap-2">
          <div className="flex h-6.5 w-6.5 items-center justify-center rounded-md border border-border bg-muted/60 text-foreground">
            <PageIcon className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-semibold text-xs sm:text-sm text-foreground tracking-tight">
            {pageInfo.title}
          </span>
        </div>
      </div>

      {/* Center: Quick Search Bar (Kumo Input Style) */}
      <div className="hidden md:flex items-center flex-1 max-w-xs mx-6">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari kode atau nama pelanggan..."
            className="w-full h-8 pl-8 pr-3 rounded-md bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground hover:border-neutral-300 dark:hover:border-neutral-700 focus:outline-none focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            onClick={() => {
              const el = document.getElementById('dashboard-search-input');
              if (el) el.focus();
            }}
            readOnly
          />
        </div>
      </div>

      {/* Right: Snapshot Status & Theme Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-md bg-muted/50 py-1 px-2.5 text-xs text-muted-foreground border border-border">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="hidden sm:inline text-muted-foreground">Data:</span>
          <span className="font-mono font-medium text-[11px] text-foreground tabular">
            {formatDate(activeSnapshot?.uploaded_at)}
          </span>
          {activeSnapshot?.is_demo && (
            <span className="rounded-[4px] bg-amber-500/15 px-1.5 py-0.5 text-[9.5px] font-mono font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 border border-amber-500/30">
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
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted/80 hover:text-foreground shadow-[0_1px_1px_rgba(0,0,0,0.03)] transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          </TooltipContent>
        </Tooltip>

        <div className="hidden items-center gap-2.5 border-l border-border pl-3 md:flex">
          <div className="flex flex-col text-right leading-none">
            <span className="text-xs font-medium text-foreground">{user?.name || 'Petugas'}</span>
            <span className="mt-1 font-mono text-[10px] text-muted-foreground">{roleText}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
