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
  SearchCheck,
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
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const isAdmin = user?.role === 'admin';
  const isCollapsed = state === 'collapsed';

  const navItems = [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, adminOnly: false },
    { title: 'Peta GIS', path: '/gis', icon: MapPin, adminOnly: false },
    { title: 'Koreksi Data', path: '/data-correction', icon: SearchCheck, adminOnly: false },
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

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarPrimitive
      collapsible="icon"
      className="z-50 border-r border-border bg-card select-none"
    >
      {/* Tombol Show/Hide Desktop: Kumo square-rounded control */}
      <button
        id="sidebar-edge-toggle"
        type="button"
        onClick={toggleSidebar}
        aria-label={isCollapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
        title={isCollapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
        className="absolute -right-3 top-4 z-50 hidden h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-2xs transition-colors duration-100 hover:bg-muted hover:text-foreground md:flex cursor-pointer"
      >
        <ChevronLeft
          className={cn('h-3.5 w-3.5 transition-transform duration-200', isCollapsed && 'rotate-180')}
          strokeWidth={2}
        />
      </button>

      {/* Brand Header */}
      <SidebarHeader className="h-13 justify-center border-b border-border px-3.5">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/60 p-1 border border-border">
            <img src="/slip.png" alt="Logo PDAM" className="h-full w-full object-contain" />
          </span>
          <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-xs font-semibold tracking-tight text-foreground">
              PDAM Tirta Ardhia Rinjani
            </span>
            <span className="truncate font-mono text-[10px] text-muted-foreground">
              Kab. Lombok Tengah
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation Menu */}
      <SidebarContent className="px-2.5 py-3.5">
        <p className="mb-1.5 px-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground group-data-[collapsible=icon]:hidden">
          Navigasi
        </p>
        <SidebarMenu className="gap-0.5">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== '/' && location.startsWith(item.path));
            const isRestricted = item.adminOnly && !isAdmin;
            const Icon = item.icon;

            if (isRestricted) {
              return (
                <SidebarMenuItem key={item.path}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex h-8.5 cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 text-xs text-muted-foreground/50 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                        <Lock className="ml-auto h-3 w-3 group-data-[collapsible=icon]:hidden text-muted-foreground/40" />
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
                <Link href={item.path} onClick={handleNavClick}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.title}
                    className={cn(
                      'group relative flex h-8.5 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-xs transition-colors duration-100',
                      isActive
                        ? 'bg-[#055AD4]/10 dark:bg-blue-500/15 font-semibold text-[#055AD4] dark:text-blue-300 border border-[#055AD4]/20 dark:border-blue-400/25'
                        : 'border border-transparent text-muted-foreground hover:bg-muted/80 hover:text-foreground font-medium',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive
                          ? 'text-[#055AD4] dark:text-blue-400'
                          : 'text-muted-foreground group-hover:text-foreground',
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
      <SidebarFooter className="border-t border-border p-2.5">
        <div className="flex items-center gap-2.5 rounded-md p-1.5 transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
          <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-mono text-[11px] font-semibold border border-border">
            {initials}
          </div>
          <div className="flex min-w-0 flex-1 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-xs font-semibold text-foreground">{user?.name || 'Petugas'}</span>
            <span className="truncate font-mono text-[10px] text-muted-foreground">{roleText}</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={logout}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground focus-visible:outline-none group-data-[collapsible=icon]:hidden cursor-pointer"
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
