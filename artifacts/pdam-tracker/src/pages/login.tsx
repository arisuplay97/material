import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocation } from 'wouter';
import { UserRole } from '@/types/pdam';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  Sun,
  Moon,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { PdamSceneBg } from '@/components/auth/PdamSceneBg';
import './login.css';

const DEMO_ACCOUNTS: {
  role: UserRole;
  label: string;
  desc: string;
  icon: React.ElementType;
  tone: string;
}[] = [
  {
    role: 'admin',
    label: 'Masuk Cepat sebagai Admin Data',
    desc: 'Akses penuh verifikasi data & pemetaan GIS',
    icon: Shield,
    tone: 'bg-primary/10 text-primary',
  },
];

export default function Login() {
  const { login, loginAsDemo, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const res = login(email, password);
    if (!res.ok) {
      setErrorMessage(res.error);
      setShakeKey((k) => k + 1);
      setIsLoading(false);
      return;
    }

    setLocation('/dashboard');
  };

  const handleQuickDemoLogin = (role: UserRole) => {
    setErrorMessage('');
    loginAsDemo(role);
    setLocation('/dashboard');
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden font-sans select-none bg-[#0b2a3d]">
      {/* ── 1. Animated SVG Illustration Background ── */}
      <PdamSceneBg />

      {/* ── 2. Top-Left Floating Tagline ── */}
      <div className="scene-tag">
        <b>Verifikasi Data Pelanggan</b>
        <span>Sistem validasi sambungan, verifikasi anomali koordinat spasial, dan monitoring GIS terpadu PDAM Tirta Ardhia Rinjani Lombok Tengah.</span>
      </div>

      {/* ── 3. Right-Aligned Glassmorphism Login Container (Compact & Clean) ── */}
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center p-3 sm:p-5 lg:justify-end lg:pr-[clamp(24px,6vw,96px)]">
        <div className="login-glass-card w-full max-w-[380px] p-5 sm:p-6 my-auto text-foreground transition-all">
          {/* Brand & Theme Header */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200/60 dark:border-neutral-800/80">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-xs border border-neutral-200/50">
                <img src="/slip.png" alt="Logo PDAM" className="h-full w-full object-contain" />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-bold tracking-tight text-neutral-900 dark:text-white">
                  PDAM Tirta Ardhia Rinjani
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  Kabupaten Lombok Tengah
                </span>
              </div>
            </div>

            <button
              id="login-theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-label="Ganti tema"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200/70 dark:border-neutral-700 bg-white/80 dark:bg-neutral-800/80 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-all cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-neutral-600" />}
            </button>
          </div>

          {/* Form Greeting */}
          <div className="mt-3.5">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">Masuk ke Sistem</h1>
            <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
              Gunakan akun petugas atau klik masuk cepat di bawah.
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div
              key={shakeKey}
              role="alert"
              className="lg-shake mt-3 flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="mt-3.5 space-y-2.5">
            <div className="space-y-1">
              <label htmlFor="login-email" className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                Email / ID Pegawai
              </label>
              <div className="lg-field">
                <Mail className="lg-field-icon w-3.5 h-3.5 left-3" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  placeholder="sofiyan.hawari@pdamtiara.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="lg-input h-9 text-xs pl-8.5 bg-white/90 dark:bg-neutral-800/90 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="login-password" className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                Kata Sandi
              </label>
              <div className="lg-field">
                <Lock className="lg-field-icon w-3.5 h-3.5 left-3" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="lg-input h-9 text-xs pl-8.5 bg-white/90 dark:bg-neutral-800/90 rounded-xl"
                  style={{ paddingRight: 38 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="pt-0.5">
              <button id="login-submit" type="submit" disabled={isLoading} className="lg-btn h-9 text-xs font-semibold rounded-xl cursor-pointer">
                {isLoading ? (
                  <>
                    <Loader2 className="lg-spinner h-3.5 w-3.5" />
                    <span>Memeriksa…</span>
                  </>
                ) : (
                  <>
                    <span>Masuk</span>
                    <ArrowRight className="lg-btn-arrow h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Access Demo (Only Admin Data) */}
          <div className="mt-3.5 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/80">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Akses Uji Coba Cepat
              </span>
              <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            </div>

            <button
              id="login-demo-admin"
              type="button"
              onClick={() => handleQuickDemoLogin('admin')}
              className="lg-demo p-2 rounded-xl bg-white/70 dark:bg-neutral-800/60 hover:bg-white dark:hover:bg-neutral-800 border-neutral-200/80 dark:border-neutral-700 cursor-pointer w-full text-left"
            >
              <span className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Shield className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1 ml-2">
                <span className="block text-xs font-semibold leading-tight text-neutral-800 dark:text-neutral-200">
                  Masuk sebagai Admin Data
                </span>
                <span className="mt-0.5 block text-[10.5px] leading-tight text-neutral-500 dark:text-neutral-400">
                  Akses penuh verifikasi data & pemetaan GIS
                </span>
              </span>
              <ArrowRight className="lg-demo-arrow h-3.5 w-3.5 text-primary shrink-0" />
            </button>
          </div>

          <p className="mt-3 text-center text-[10px] text-neutral-400">
            © 2026 PDAM Tirta Ardhia Rinjani • Lombok Tengah
          </p>
        </div>
      </div>
    </div>
  );
}
