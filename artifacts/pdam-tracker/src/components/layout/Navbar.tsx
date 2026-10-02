import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { pdamService, KECAMATAN_LIST } from '@/services/pdamDataService';
import { UserRole } from '@/types/pdam';
import {
  Sun,
  Moon,
  Shield,
  UserCheck,
  Building,
  Calendar,
  ChevronDown,
  LogOut,
  Database,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const { user, switchRole, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [snapshot, setSnapshot] = useState(pdamService.getActiveSnapshot());

  useEffect(() => {
    const unsub = pdamService.subscribe(() => {
      setSnapshot(pdamService.getActiveSnapshot());
    });
    return unsub;
  }, []);

  const roleLabels: Record<UserRole, { label: string; icon: typeof Shield; cls: string }> = {
    admin: { label: 'Admin Data', icon: Shield, cls: 'text-blue-600 dark:text-blue-400' },
    verifikator: { label: 'Verifikator', icon: UserCheck, cls: 'text-emerald-600 dark:text-emerald-400' },
    pimpinan: { label: 'Pimpinan', icon: Building, cls: 'text-violet-600 dark:text-violet-400' },
  };

  const currentRole = user?.role || 'admin';
  const roleConfig = roleLabels[currentRole];
  const RoleIcon = roleConfig.icon;

  const fmtDate = (iso?: string) => {
    if (!iso) return '1 Okt 2026';
    try {
      return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return iso; }
  };

  return (
    <header className="h-14 border-b border-border/60 bg-card px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Brand */}
      <div className="flex items-center gap-2.5">
        <Database className="w-5 h-5 text-foreground/70" />
        <div className="hidden sm:flex flex-col leading-none">
          <span className="text-[13px] font-semibold tracking-tight text-foreground">Data Pelanggan</span>
          <span className="text-[10px] text-muted-foreground">PDAM Tirta Ardhia Rinjani</span>
        </div>
      </div>

      {/* Center: Snapshot date */}
      <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Calendar className="w-3 h-3" />
        <span>Snapshot {fmtDate(snapshot?.uploaded_at)}</span>
        <span className="text-foreground font-medium ml-1">{snapshot?.total_rows || 0} data</span>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost" size="icon"
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 rounded-lg gap-1.5 text-xs">
              <RoleIcon className={`w-3.5 h-3.5 ${roleConfig.cls}`} />
              <span className="hidden sm:inline font-medium text-foreground">{user?.name?.split(' ')[0]}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Peran</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(['admin', 'verifikator', 'pimpinan'] as UserRole[]).map(role => {
              const cfg = roleLabels[role];
              const Icon = cfg.icon;
              return (
                <DropdownMenuItem key={role} onClick={() => switchRole(role)} className={`text-xs gap-2 ${currentRole === role ? 'font-semibold' : ''}`}>
                  <Icon className={`w-3.5 h-3.5 ${cfg.cls}`} />
                  {cfg.label}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-xs gap-2 text-destructive">
              <LogOut className="w-3.5 h-3.5" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
