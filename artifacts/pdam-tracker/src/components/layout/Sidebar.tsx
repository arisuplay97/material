import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Map, Sliders, Lock, ChevronRight, Database } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function Sidebar() {
  const { user } = useAuth();
  const [location] = useLocation();
  const isAdmin = user?.role === 'admin';

  const navItems = [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'verifikator', 'pimpinan'] },
    { title: 'Peta GIS', path: '/gis', icon: Map, roles: ['admin', 'verifikator', 'pimpinan'] },
    { title: 'Settingan', path: '/settings', icon: Sliders, roles: ['admin'], adminOnly: true },
  ];

  return (
    <aside className="w-56 border-r border-border/60 bg-card flex flex-col shrink-0 h-screen sticky top-0 z-20">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-foreground/[0.06] flex items-center justify-center">
            <Database className="w-4 h-4 text-foreground/70" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[12px] font-semibold text-foreground tracking-tight">Data Pelanggan</span>
            <span className="text-[10px] text-muted-foreground mt-0.5">Lombok Tengah</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2.5 space-y-0.5">
        <div className="px-2 pb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
          Menu
        </div>
        {navItems.map(item => {
          const isActive = location === item.path || (item.path !== '/' && location.startsWith(item.path));
          const isRestricted = item.adminOnly && !isAdmin;
          const Icon = item.icon;

          if (isRestricted) {
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-muted-foreground/40 cursor-not-allowed">
                    <Icon className="w-4 h-4" />
                    <span>{item.title}</span>
                    <Lock className="w-3 h-3 ml-auto" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Hanya Admin</TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link key={item.path} href={item.path}>
              <div className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]'
              }`}>
                <Icon className={`w-4 h-4 ${isActive ? 'text-background' : 'text-muted-foreground group-hover:text-foreground'}`} />
                <span>{item.title}</span>
                {isActive && <ChevronRight className="w-3 h-3 ml-auto text-background/60" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/60">
        <div className="px-2 text-[10px] text-muted-foreground/60 leading-relaxed">
          <span className="font-mono">KKWWxxxxx</span> (9 digit)
          <br />13 Kecamatan &middot; 20 Wilayah (07)
          <br />PRD v1.2
        </div>
      </div>
    </aside>
  );
}
