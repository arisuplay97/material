import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  MapPin,
  Settings,
  LogOut,
  Lock,
  ChevronLeft,
} from 'lucide-react';
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ROLE_LABEL } from '@/lib/privacy';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isAdmin = user?.role === 'admin';
  const isCollapsed = state === 'collapsed';

  const navItems = [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, adminOnly: false },
    { title: 'Peta GIS', path: '/gis', icon: MapPin, adminOnly: false },
    { title: 'Pengaturan', path: '/settings', icon: Settings, adminOnly: true },
  ];

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const roleText = user?.role ? ROLE_LABEL[user.role] : 'Petugas';

  return (
    <SidebarPrimitive collapsible="icon" className="z-40 border-r border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 select-none">
      {/* Tombol Show/Hide: Menempel di pinggir garis pembatas sidebar, tanpa border sama sekali */}
      <button
        id="sidebar-edge-toggle"
        type="button"
        onClick={toggleSidebar}
        aria-label={isCollapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
        title={isCollapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
        className="absolute -right-3 top-5 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-neutral-200/80 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-500 shadow-2xs transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900 md:flex cursor-pointer"
      >
        <ChevronLeft
          className={cn('h-3.5 w-3.5 transition-transform duration-200', isCollapsed && 'rotate-180')}
          strokeWidth={2}
        />
      </button>

      {/* Brand Header */}
      <SidebarHeader className="h-16 justify-center border-b border-neutral-200/60 dark:border-neutral-800/80 px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1 border border-neutral-200/50 dark:border-neutral-700">
            <img src="/slip.png" alt="Logo PDAM" className="h-full w-full object-contain" />
          </span>
          <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-xs font-semibold tracking-tight text-neutral-900 dark:text-white">
              PDAM Tirta Ardhia Rinjani
            </span>
            <span className="truncate text-[10.5px] text-neutral-400">
              Kab. Lombok Tengah
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation Menu */}
      <SidebarContent className="px-3 py-4">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 group-data-[collapsible=icon]:hidden">
          Menu Utama
        </p>
        <SidebarMenu className="gap-1">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== '/' && location.startsWith(item.path));
            const isRestricted = item.adminOnly && !isAdmin;
            const Icon = item.icon;

            if (isRestricted) {
              return (
                <SidebarMenuItem key={item.path}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex h-9.5 cursor-not-allowed items-center gap-3 rounded-xl px-3 text-xs text-neutral-400/60 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                        <Lock className="ml-auto h-3 w-3 group-data-[collapsible=icon]:hidden text-neutral-300" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      Khusus Admin Data
                    </TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              );
            }

            return (
              <SidebarMenuItem key={item.path}>
                <Link href={item.path}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.title}
                    className={cn(
                      'group flex h-9.5 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-xs transition-colors duration-150',
                      isActive
                        ? 'bg-neutral-100 dark:bg-neutral-800 font-semibold text-neutral-900 dark:text-white shadow-2xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white font-medium',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200',
                      )}
                    />
                    <span className="truncate">{item.title}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* User Footer Profile */}
      <SidebarFooter className="border-t border-neutral-200/60 dark:border-neutral-800/80 p-3">
        <div className="flex items-center gap-2.5 rounded-xl p-1.5 transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold">
            {initials}
          </div>
          <div className="flex min-w-0 flex-1 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-xs font-semibold text-neutral-900 dark:text-white">{user?.name || 'Petugas'}</span>
            <span className="truncate text-[10.5px] text-neutral-400">{roleText}</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={logout}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white focus-visible:outline-none group-data-[collapsible=icon]:hidden cursor-pointer"
                aria-label="Keluar"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Keluar
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
    </SidebarPrimitive>
  );
}
