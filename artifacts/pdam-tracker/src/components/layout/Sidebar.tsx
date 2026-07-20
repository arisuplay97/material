import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'wouter';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarFooter
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Box,
  MapPin,
  ClipboardCheck,
  AlertTriangle,
  FileText,
  Users,
  Building2,
  LogOut,
  Settings,
  ShieldCheck,
  ScanLine,
  Map
} from 'lucide-react';
import { useLogout } from '@workspace/api-client-react';
import React from 'react';

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        logout();
      }
    });
  };

  const role = user?.role;

  const menuItems = [
    {
      title: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      roles: ['spi', 'direksi', 'superadmin', 'admin_gudang']
    },
    {
      title: "Peta GIS",
      path: "/gis-map",
      icon: Map,
      roles: ['spi', 'direksi', 'superadmin', 'admin_gudang']
    },
    {
      title: "Penerimaan Cabang",
      path: "/receive",
      icon: ScanLine,
      roles: ['admin_gudang', 'petugas_lapangan', 'superadmin']
    },
    {
      title: "Tugas Lapangan",
      path: "/lapangan",
      icon: MapPin,
      roles: ['petugas_lapangan', 'superadmin']
    },
    {
      title: "Tracking Material",
      path: "/trackings",
      icon: ClipboardCheck,
      roles: ['admin_gudang', 'spi', 'direksi', 'superadmin']
    },
    {
      title: "Permintaan Material",
      path: "/material-requests",
      icon: FileText,
      roles: ['admin_gudang', 'spi', 'superadmin']
    },
    {
      title: "Review Bukti",
      path: "/spi/flagged",
      icon: AlertTriangle,
      roles: ['spi', 'superadmin']
    },
    {
      title: "Laporan",
      path: "/reports",
      icon: FileText,
      roles: ['spi', 'direksi', 'superadmin']
    },
    {
      title: "Data Material",
      path: "/materials",
      icon: Box,
      roles: ['admin_gudang', 'superadmin']
    },
    {
      title: "Cabang",
      path: "/branches",
      icon: Building2,
      roles: ['spi', 'superadmin']
    },
    {
      title: "Pengguna",
      path: "/users",
      icon: Users,
      roles: ['superadmin']
    }
  ];

  const visibleItems = menuItems.filter(item => !role || item.roles.includes(role));

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="border-b border-border py-4 px-4 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-background" />
          <div className="flex flex-col">
            <span className="font-serif font-bold text-lg leading-tight tracking-tight">PDAM Tiara</span>
            <span className="text-[10px] uppercase tracking-wider text-background/80 font-mono">Tracking & Verifikasi</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-card">
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-xs uppercase tracking-widest text-muted-foreground mt-4">Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.path || location.startsWith(item.path + '/')}
                    className="font-medium data-[active=true]:bg-primary/5 data-[active=true]:text-primary"
                  >
                    <Link href={item.path} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4 bg-card">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-serif font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold truncate max-w-[140px] text-foreground">{user?.name}</span>
              <span className="text-xs text-muted-foreground font-mono truncate max-w-[140px]">{user?.role.replace('_', ' ')}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" asChild className="font-mono text-xs">
              <Link href="/settings">
                <Settings className="w-3 h-3 mr-2" />
                Setting
              </Link>
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLogout} className="font-mono text-xs" disabled={logoutMutation.isPending}>
              <LogOut className="w-3 h-3 mr-2" />
              Keluar
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
