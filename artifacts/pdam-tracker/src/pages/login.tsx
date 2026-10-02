import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocation } from 'wouter';
import { UserRole } from '@/types/pdam';
import {
  Shield,
  UserCheck,
  Building,
  Lock,
  Mail,
  ArrowRight,
  Sun,
  Moon,
  Layers,
  CheckCircle2,
  MapPin,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function Login() {
  const { login, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, redirect to dashboard
  if (user) {
    setLocation('/dashboard');
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      login(selectedRole);
      setLocation('/dashboard');
    }, 300);
  };

  const handleQuickRoleLogin = (role: UserRole) => {
    setIsLoading(true);
    setTimeout(() => {
      login(role);
      setLocation('/dashboard');
    }, 200);
  };

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground transition-colors duration-200">
      {/* ── Left Showcase Panel (Enterprise Utility GIS) ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 p-12 flex-col justify-between relative overflow-hidden border-r border-border/40">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Top Logo */}
        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-lg ring-1 ring-white/20">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-bold text-base tracking-tight text-white">
              PDAM Tirta Ardhia Rinjani
            </span>
            <span className="text-[11px] text-blue-300 font-mono">
              Kabupaten Lombok Tengah
            </span>
          </div>
        </div>

        {/* Main Value Proposition */}
        <div className="max-w-md z-10 space-y-6">
          <Badge variant="outline" className="font-mono text-xs text-blue-300 border-blue-400/30 bg-blue-500/10">
            Modul Perapian Data Pelanggan v1.2
          </Badge>

          <h1 className="text-3xl lg:text-4xl font-heading font-bold text-white leading-tight">
            Dashboard Analitik & Pemetaan GIS Pelanggan
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            Platform internal untuk memantau kualitas data pelanggan, sebaran spasial titik koordinat di 20 wilayah Kecamatan Praya Barat, dan validasi kode pelanggan 9 digit (<code className="font-mono text-blue-300 font-bold">KKWWxxxxx</code>).
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-slate-200">
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <span>Peta GIS interaktif dengan kode warna acuan per wilayah</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-200">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <span>Dashboard statistik sebaran tarif & status sambungan</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-200">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <span>Validasi otomatis integritas data & pelacakan snapshot upload</span>
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="text-[11px] text-slate-400 font-mono z-10 flex items-center justify-between border-t border-slate-800/80 pt-4">
          <span>Bidang IT & Sistem Informasi</span>
          <span>Tahap Pilot: Kec. 07 Praya Barat</span>
        </div>
      </div>

      {/* ── Right Login Panel ── */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 md:p-16 max-w-xl mx-auto w-full">
        {/* Top Bar with Theme Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex lg:hidden items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <span className="font-heading font-bold text-xs">PDAM Tiara</span>
          </div>

          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="h-8 w-8 p-0 rounded-lg border-border hover:bg-muted text-muted-foreground"
              title="Ganti Tema"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Center Form Container */}
        <div className="my-auto space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-heading font-bold text-foreground">
              Masuk ke Sistem
            </h2>
            <p className="text-xs text-muted-foreground">
              Gunakan kredensial internal PDAM atau pilih peran simulasi di bawah.
            </p>
          </div>

          {/* Quick Role Selection Buttons for evaluation */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
              Pilih Akses Cepat Berdasarkan Peran (PRD Section 5):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickRoleLogin('admin')}
                className="p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-left transition-colors flex flex-col gap-1"
              >
                <div className="flex items-center gap-1.5 text-blue-500">
                  <Shield className="w-3.5 h-3.5" />
                  <span className="font-semibold text-xs">Admin (IT)</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Semua menu & upload</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickRoleLogin('verifikator')}
                className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-left transition-colors flex flex-col gap-1"
              >
                <div className="flex items-center gap-1.5 text-emerald-500">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="font-semibold text-xs">Verifikator</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Dashboard & titik GIS</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickRoleLogin('pimpinan')}
                className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 text-left transition-colors flex flex-col gap-1"
              >
                <div className="flex items-center gap-1.5 text-purple-500">
                  <Building className="w-3.5 h-3.5" />
                  <span className="font-semibold text-xs">Pimpinan</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Data agregat</span>
              </button>
            </div>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-border" />
            <span className="flex-shrink mx-3 text-[10px] font-mono uppercase text-muted-foreground">
              atau masuk manual
            </span>
            <div className="flex-grow border-t border-border" />
          </div>

          {/* Standard Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Email / NIK Petugas
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="sofiyan.hawari@pdamtiara.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-10 text-xs rounded-xl border-border bg-card"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">
                  Kata Sandi
                </label>
                <span className="text-[11px] text-primary hover:underline cursor-pointer">
                  Lupa sandi?
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-10 text-xs rounded-xl border-border bg-card"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-xl text-xs font-semibold gap-2 mt-2"
            >
              <span>{isLoading ? 'Memverifikasi...' : 'Masuk ke Aplikasi'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-muted-foreground font-mono">
          PDAM Tirta Ardhia Rinjani &copy; 2026. Hak Cipta Dilindungi.
        </div>
      </div>
    </div>
  );
}
