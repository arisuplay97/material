import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'wouter';
import {
  Home,
  Globe,
  Activity,
  Database,
  LogOut,
  Lock,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  PanelLeft,
} from 'lucide-react';
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ROLE_LABEL } from '@/lib/privacy';
import { cn } from '@/lib/utils';

/**
 * Exact Cloudflare Dashboard Sidebar (matching Reference Image 1):
 * - Top account switcher bar: Logo (no box) + Account name + ChevronsUpDown
 * - Quick search input with "Ctrl K" right below header
 * - Expandable tree group with vertical hairline on left (like "Domains -> Overview, Registrations, Transfers")
 * - Soft grey active pill (#f4f4f5), thin neutral grey icons (#71717a), dark text (#18181b), zero blue active background
 * - Section label ("Operasional") in normal sentence case 12px grey
 * - Bottom bar with PanelLeft collapse icon on the left
 */
export function Sidebar() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const isAdmin = user?.role === 'admin';
  const [gisExpanded, setGisExpanded] = useState(true);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const roleText = user?.role ? ROLE_LABEL[user.role] : 'Petugas';

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isDashboard = location === '/dashboard' || location === '/';
  const isGis = location.startsWith('/gis');
  const isCorrection = location.startsWith('/data-correction');
  const isSettings = location.startsWith('/settings');

  return (
    <SidebarPrimitive
      collapsible="icon"
      className="z-50 border-r border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 select-none"
    >
      {/* 1. Top Account Header (Cloudflare Reference: Logo + Account Name + ChevronsUpDown) */}
      <SidebarHeader className="h-14 justify-center border-b border-[#e5e7eb] dark:border-zinc-800 px-3.5 relative">
        <button
          type="button"
          onClick={() => setShowAccountMenu((v) => !v)}
          className="flex items-center justify-between w-full gap-2.5 rounded-lg py-1.5 px-1.5 hover:bg-[#f4f4f5] dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/slip.png"
              alt="PDAM"
              className="h-6 w-6 shrink-0 object-contain"
            />
            <span className="truncate text-[13.5px] font-medium text-[#18181b] dark:text-zinc-100 group-data-[collapsible=icon]:hidden">
              {user?.name || 'PDAM Tirta Ardhia'}
            </span>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-[#71717a] shrink-0 group-data-[collapsible=icon]:hidden" />
        </button>

        {/* Dropdown Account Menu */}
        {showAccountMenu && (
          <div className="absolute top-13 left-3 right-3 z-50 rounded-lg border border-[#e4e4e7] dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1.5 shadow-lg text-[12.5px] space-y-1">
            <div className="px-2.5 py-1.5 border-b border-[#f4f4f5] dark:border-zinc-800">
              <div className="font-medium text-[#18181b] dark:text-zinc-100 truncate">
                PDAM Tirta Ardhia Rinjani
              </div>
              <div className="text-[11.5px] text-[#71717a] truncate">
                {roleText} • Kab. Lombok Tengah
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAccountMenu(false);
                logout();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[#dc2626] hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar akun</span>
            </button>
          </div>
        )}
      </SidebarHeader>

      {/* 2. Sidebar Body */}
      <SidebarContent className="px-3 py-3.5 space-y-4">
        {/* Quick Search Bar (Cloudflare Reference: "Quick search... Ctrl K") */}
        <div className="group-data-[collapsible=icon]:hidden">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('dashboard-search-input');
              if (el) {
                el.focus();
              } else {
                setLocation('/dashboard');
                if (isMobile) setOpenMobile(false);
                setTimeout(() => {
                  document.getElementById('dashboard-search-input')?.focus();
                }, 120);
              }
            }}
            className="flex h-9 w-full items-center justify-between rounded-lg border border-[#e4e4e7] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-[13px] text-[#a1a1aa] hover:border-[#d4d4d8] transition-colors cursor-text"
          >
            <span className="flex items-center gap-2.5 truncate">
              <Search className="h-3.5 w-3.5 text-[#a1a1aa] shrink-0" strokeWidth={1.75} />
              <span>Quick search...</span>
            </span>
            <span className="text-[11.5px] text-[#a1a1aa] font-normal shrink-0">
              Ctrl K
            </span>
          </button>
        </div>

        {/* Primary Navigation Group */}
        <SidebarMenu className="gap-0.5">
          {/* Account home -> Ringkasan utama */}
          <SidebarMenuItem>
            <Link href="/dashboard" onClick={handleNavClick}>
              <div
                className={cn(
                  'flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-[13.5px] transition-colors cursor-pointer group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0',
                  isDashboard
                    ? 'bg-[#f4f4f5] dark:bg-zinc-800 font-medium text-[#18181b] dark:text-zinc-100'
                    : 'text-[#18181b] dark:text-zinc-300 hover:bg-[#f4f4f5]/70 dark:hover:bg-zinc-800/50 font-normal',
                )}
              >
                <Home className="h-4 w-4 shrink-0 text-[#71717a]" strokeWidth={1.65} />
                <span className="truncate group-data-[collapsible=icon]:hidden">Ringkasan utama</span>
              </div>
            </Link>
          </SidebarMenuItem>

          {/* Expandable Tree Item (Cloudflare "Domains -> Overview, Registrations, Transfers" pattern) */}
          <SidebarMenuItem>
            <button
              type="button"
              onClick={() => {
                if (isMobile) {
                  setLocation('/gis');
                  setOpenMobile(false);
                } else {
                  setGisExpanded((v) => !v);
                  if (!isGis) setLocation('/gis');
                }
              }}
              className={cn(
                'flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-[13.5px] transition-colors cursor-pointer group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0',
                isGis && !gisExpanded
                  ? 'bg-[#f4f4f5] dark:bg-zinc-800 font-medium text-[#18181b] dark:text-zinc-100'
                  : 'text-[#18181b] dark:text-zinc-300 hover:bg-[#f4f4f5]/70 dark:hover:bg-zinc-800/50 font-normal',
              )}
            >
              <Globe className="h-4 w-4 shrink-0 text-[#71717a]" strokeWidth={1.65} />
              <span className="truncate group-data-[collapsible=icon]:hidden">Pemetaan GIS</span>
              <ChevronDown
                className={cn(
                  'ml-auto h-3.5 w-3.5 text-[#71717a] transition-transform duration-150 group-data-[collapsible=icon]:hidden',
                  !gisExpanded && '-rotate-90',
                )}
                strokeWidth={1.75}
              />
            </button>

            {/* Sub-menu with left vertical line (Cloudflare Tree Style) */}
            {gisExpanded && (
              <div className="ml-[18px] mt-0.5 pl-2.5 border-l border-[#e4e4e7] dark:border-zinc-800 space-y-0.5 group-data-[collapsible=icon]:hidden">
                <Link href="/gis" onClick={handleNavClick}>
                  <div
                    className={cn(
                      'flex h-8.5 w-full items-center rounded-lg px-3 text-[13.5px] transition-colors cursor-pointer',
                      isGis && !window.location.search.includes('kual=')
                        ? 'bg-[#f4f4f5] dark:bg-zinc-800 font-medium text-[#18181b] dark:text-zinc-100'
                        : 'text-[#18181b] dark:text-zinc-300 hover:bg-[#f4f4f5]/60 dark:hover:bg-zinc-800/50 font-normal',
                    )}
                  >
                    <span className="truncate">Peta sebaran</span>
                  </div>
                </Link>
                <Link href="/gis?kual=anomaly" onClick={handleNavClick}>
                  <div
                    className={cn(
                      'flex h-8.5 w-full items-center rounded-lg px-3 text-[13.5px] transition-colors cursor-pointer',
                      isGis && window.location.search.includes('kual=anomaly')
                        ? 'bg-[#f4f4f5] dark:bg-zinc-800 font-medium text-[#18181b] dark:text-zinc-100'
                        : 'text-[#18181b] dark:text-zinc-300 hover:bg-[#f4f4f5]/60 dark:hover:bg-zinc-800/50 font-normal',
                    )}
                  >
                    <span className="truncate">Anomali batas</span>
                  </div>
                </Link>
                <Link href="/gis?kual=colocation" onClick={handleNavClick}>
                  <div
                    className={cn(
                      'flex h-8.5 w-full items-center rounded-lg px-3 text-[13.5px] transition-colors cursor-pointer',
                      isGis && window.location.search.includes('kual=colocation')
                        ? 'bg-[#f4f4f5] dark:bg-zinc-800 font-medium text-[#18181b] dark:text-zinc-100'
                        : 'text-[#18181b] dark:text-zinc-300 hover:bg-[#f4f4f5]/60 dark:hover:bg-zinc-800/50 font-normal',
                    )}
                  >
                    <span className="truncate">Titik dobel</span>
                  </div>
                </Link>
              </div>
            )}
          </SidebarMenuItem>

          {/* Observability -> Koreksi data (with Cloudflare dashed "New" pill) */}
          <SidebarMenuItem>
            <Link href="/data-correction" onClick={handleNavClick}>
              <div
                className={cn(
                  'flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-[13.5px] transition-colors cursor-pointer group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0',
                  isCorrection
                    ? 'bg-[#f4f4f5] dark:bg-zinc-800 font-medium text-[#18181b] dark:text-zinc-100'
                    : 'text-[#18181b] dark:text-zinc-300 hover:bg-[#f4f4f5]/70 dark:hover:bg-zinc-800/50 font-normal',
                )}
              >
                <Activity className="h-4 w-4 shrink-0 text-[#71717a]" strokeWidth={1.65} />
                <span className="truncate group-data-[collapsible=icon]:hidden">Koreksi data</span>
                <span className="rounded-full border border-dashed border-[#d4d4d8] dark:border-zinc-700 px-2 py-0.2 text-[11px] font-medium text-[#18181b] dark:text-zinc-200 group-data-[collapsible=icon]:hidden">
                  Audit
                </span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 text-[#a1a1aa] group-data-[collapsible=icon]:hidden" strokeWidth={1.75} />
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Secondary Section ("Build" in Cloudflare Reference -> "Sistem & data") */}
        <div className="space-y-1">
          <p className="px-2.5 text-[12px] font-normal text-[#71717a] group-data-[collapsible=icon]:hidden">
            Sistem &amp; data
          </p>
          <SidebarMenu className="gap-0.5">
            <SidebarMenuItem>
              {!isAdmin ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex h-9 cursor-not-allowed items-center gap-3 rounded-lg px-2.5 text-[13.5px] text-[#a1a1aa] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                      <Database className="h-4 w-4 shrink-0 text-[#a1a1aa]" strokeWidth={1.65} />
                      <span className="truncate group-data-[collapsible=icon]:hidden">Master &amp; database</span>
                      <Lock className="ml-auto h-3.5 w-3.5 text-[#d4d4d8] group-data-[collapsible=icon]:hidden" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    Khusus Admin Data
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Link href="/settings" onClick={handleNavClick}>
                  <div
                    className={cn(
                      'flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-[13.5px] transition-colors cursor-pointer group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0',
                      isSettings
                        ? 'bg-[#f4f4f5] dark:bg-zinc-800 font-medium text-[#18181b] dark:text-zinc-100'
                        : 'text-[#18181b] dark:text-zinc-300 hover:bg-[#f4f4f5]/70 dark:hover:bg-zinc-800/50 font-normal',
                    )}
                  >
                    <Database className="h-4 w-4 shrink-0 text-[#71717a]" strokeWidth={1.65} />
                    <span className="truncate group-data-[collapsible=icon]:hidden">Master &amp; database</span>
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-[#a1a1aa] group-data-[collapsible=icon]:hidden" strokeWidth={1.75} />
                  </div>
                </Link>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>

      {/* 3. Bottom Footer Bar (Cloudflare Reference: PanelLeft collapse button on bottom-left) */}
      <SidebarFooter className="h-12 justify-center border-t border-[#e5e7eb] dark:border-zinc-800 px-3.5">
        <div className="flex items-center justify-between w-full group-data-[collapsible=icon]:justify-center">
          <button
            id="sidebar-edge-toggle"
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            title="Sembunyikan / tampilkan sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#52525b] dark:text-zinc-400 hover:bg-[#f4f4f5] dark:hover:bg-zinc-800 hover:text-[#18181b] dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <PanelLeft className="h-4 w-4" strokeWidth={1.65} />
          </button>

          <button
            type="button"
            onClick={logout}
            title="Keluar"
            className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12.5px] text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-zinc-800 hover:text-[#18181b] dark:hover:text-zinc-100 transition-colors cursor-pointer group-data-[collapsible=icon]:hidden"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.65} />
            <span>Keluar</span>
          </button>
        </div>
      </SidebarFooter>
    </SidebarPrimitive>
  );
}
