import { useAuth } from '@/contexts/AuthContext';
import { useLogin } from '@workspace/api-client-react';
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/* ─── SVG Logo Component ─── */
function SiaraLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#0F5FA8" />
      <path d="M12 28V20L20 12L28 20V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 28V22H23V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="17" r="2" fill="white" opacity="0.8" />
      <path d="M8 32H32" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

/* ─── Floating Label Input ─── */
function FloatingInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  suffix,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  suffix?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const isActive = focused || value.length > 0;

  return (
    <div className="siara-input-group">
      <div className={`siara-input-wrapper ${isActive ? 'active' : ''} ${focused ? 'focused' : ''}`}>
        <label
          htmlFor={id}
          className={`siara-floating-label ${isActive ? 'floating' : ''}`}
        >
          {label}
        </label>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          className="siara-input"
          required
        />
        {suffix && <div className="siara-input-suffix">{suffix}</div>}
      </div>
    </div>
  );
}

/* ─── Main Login Page ─── */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const illustrationRef = useRef<HTMLDivElement>(null);

  const loginMutation = useLogin();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Subtle parallax on the illustration
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!illustrationRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 12;
      const y = (e.clientY / window.innerHeight - 0.5) * 12;
      illustrationRef.current.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          login(data.accessToken, data.refreshToken, data.user);
          const role = data.user.role;
          if (role === 'petugas_lapangan') {
            setLocation('/lapangan');
          } else if (role === 'admin_gudang') {
            setLocation('/trackings');
          } else {
            setLocation('/dashboard');
          }
        },
        onError: (err) => {
          setError(err.data?.error || 'Gagal masuk. Periksa username dan kata sandi.');
        }
      }
    );
  };

  return (
    <>
      <style>{`
        /* ─── SIARA Login Page Styles ─── */
        .siara-login-root {
          min-height: 100vh;
          display: flex;
          font-family: 'Inter', sans-serif;
          background: #ffffff;
          overflow: hidden;
        }

        .siara-login-root * {
          box-sizing: border-box;
        }

        /* ── Left Panel ── */
        .siara-left {
          width: 42%;
          min-width: 400px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 48px 56px;
          position: relative;
          z-index: 2;
          background: #ffffff;
        }

        .siara-left-inner {
          max-width: 420px;
          width: 100%;
        }

        /* Organic curved divider */
        .siara-left::after {
          content: '';
          position: absolute;
          top: 0;
          right: -60px;
          width: 120px;
          height: 100%;
          background: #ffffff;
          z-index: 1;
          clip-path: ellipse(60px 55% at 0% 50%);
        }

        /* Branding */
        .siara-brand {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 12px;
        }

        .siara-brand-logo {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
        }

        .siara-brand-text h1 {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #0F5FA8;
          margin: 0;
          line-height: 1;
        }

        .siara-brand-text p {
          font-size: 11px;
          font-weight: 500;
          color: #64748b;
          margin: 3px 0 0 0;
          letter-spacing: 0.01em;
          line-height: 1.3;
        }

        .siara-tagline {
          font-size: 13.5px;
          line-height: 1.65;
          color: #94a3b8;
          margin: 0 0 40px 0;
          max-width: 380px;
          font-weight: 400;
        }

        /* Form title */
        .siara-form-title {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.025em;
          margin: 0 0 6px 0;
        }

        .siara-form-subtitle {
          font-size: 14px;
          color: #94a3b8;
          margin: 0 0 32px 0;
          font-weight: 400;
        }

        /* Floating label input */
        .siara-input-group {
          margin-bottom: 20px;
        }

        .siara-input-wrapper {
          position: relative;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
          transition: all 0.2s ease;
          padding: 0;
        }

        .siara-input-wrapper:hover {
          border-color: #cbd5e1;
        }

        .siara-input-wrapper.focused {
          border-color: #1976D2;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.08);
        }

        .siara-floating-label {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
          color: #94a3b8;
          pointer-events: none;
          transition: all 0.2s ease;
          font-weight: 500;
          background: transparent;
          padding: 0;
        }

        .siara-floating-label.floating {
          top: 8px;
          transform: translateY(0);
          font-size: 10.5px;
          color: #1976D2;
          font-weight: 600;
          letter-spacing: 0.03em;
          background: transparent;
        }

        .siara-input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          padding: 24px 48px 8px 16px;
          font-size: 15px;
          font-family: 'Inter', sans-serif;
          color: #0f172a;
          font-weight: 500;
          line-height: 1;
        }

        .siara-input::placeholder {
          color: transparent;
        }

        .siara-input-suffix {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
        }

        .siara-toggle-pw {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          transition: color 0.15s;
          border-radius: 6px;
        }

        .siara-toggle-pw:hover {
          color: #475569;
          background: #f1f5f9;
        }

        /* Remember & Forgot */
        .siara-options-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
        }

        .siara-checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #64748b;
          cursor: pointer;
          user-select: none;
          font-weight: 500;
        }

        .siara-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1.5px solid #cbd5e1;
          appearance: none;
          cursor: pointer;
          transition: all 0.15s;
          background: #ffffff;
          flex-shrink: 0;
        }

        .siara-checkbox:checked {
          background: #1976D2;
          border-color: #1976D2;
          background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
        }

        .siara-forgot {
          font-size: 13px;
          color: #1976D2;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.15s;
        }

        .siara-forgot:hover {
          color: #0F5FA8;
        }

        /* Login button */
        .siara-btn {
          width: 100%;
          height: 52px;
          border: none;
          border-radius: 12px;
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          background: linear-gradient(135deg, #1976D2 0%, #0F5FA8 100%);
          box-shadow: 0 2px 8px rgba(15, 95, 168, 0.25), 0 1px 2px rgba(15, 95, 168, 0.15);
          letter-spacing: 0.01em;
          position: relative;
          overflow: hidden;
        }

        .siara-btn:hover:not(:disabled) {
          box-shadow: 0 4px 16px rgba(15, 95, 168, 0.35), 0 2px 4px rgba(15, 95, 168, 0.2);
          transform: translateY(-1px);
        }

        .siara-btn:active:not(:disabled) {
          transform: translateY(0px);
          box-shadow: 0 1px 4px rgba(15, 95, 168, 0.2);
        }

        .siara-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Error alert */
        .siara-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .siara-error-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ef4444;
          flex-shrink: 0;
        }

        .siara-error-text {
          font-size: 13px;
          color: #dc2626;
          font-weight: 500;
          line-height: 1.4;
        }

        /* Footer */
        .siara-footer {
          margin-top: 48px;
          font-size: 11px;
          color: #cbd5e1;
          line-height: 1.5;
        }

        .siara-footer span {
          color: #94a3b8;
          font-weight: 500;
        }

        /* ── Right Panel ── */
        .siara-right {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, #e8f0fe 0%, #dbeafe 30%, #eff6ff 70%, #f0f7ff 100%);
          overflow: hidden;
        }

        /* Subtle geometric background patterns */
        .siara-bg-pattern {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .siara-bg-circle {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(25, 118, 210, 0.06);
        }

        .siara-bg-circle:nth-child(1) {
          width: 300px; height: 300px;
          top: -60px; right: -40px;
          background: radial-gradient(circle, rgba(25, 118, 210, 0.04) 0%, transparent 70%);
        }

        .siara-bg-circle:nth-child(2) {
          width: 200px; height: 200px;
          bottom: 80px; left: 40px;
          background: radial-gradient(circle, rgba(66, 165, 245, 0.05) 0%, transparent 70%);
        }

        .siara-bg-circle:nth-child(3) {
          width: 500px; height: 500px;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          border: 1.5px solid rgba(25, 118, 210, 0.04);
        }

        .siara-bg-dots {
          position: absolute;
          width: 120px;
          height: 120px;
          background-image: radial-gradient(circle, rgba(25, 118, 210, 0.12) 1.5px, transparent 1.5px);
          background-size: 16px 16px;
        }

        .siara-bg-dots:nth-child(4) {
          top: 40px;
          right: 40px;
        }

        .siara-bg-dots:nth-child(5) {
          bottom: 60px;
          left: 60px;
          opacity: 0.6;
        }

        /* Illustration */
        .siara-illustration-wrap {
          position: relative;
          z-index: 1;
          width: 85%;
          max-width: 580px;
          transition: transform 0.3s ease-out;
          will-change: transform;
        }

        .siara-illustration-wrap img {
          width: 100%;
          height: auto;
          filter: drop-shadow(0 8px 24px rgba(15, 95, 168, 0.1));
        }

        /* ── Fade-in animation ── */
        .siara-fade-enter {
          opacity: 0;
          transform: translateY(16px);
        }

        .siara-fade-active {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }

        .siara-fade-delay-1 { transition-delay: 0.05s !important; }
        .siara-fade-delay-2 { transition-delay: 0.12s !important; }
        .siara-fade-delay-3 { transition-delay: 0.2s !important; }
        .siara-fade-delay-4 { transition-delay: 0.28s !important; }
        .siara-fade-delay-5 { transition-delay: 0.36s !important; }
        .siara-fade-delay-6 { transition-delay: 0.44s !important; }

        .siara-right-fade-enter {
          opacity: 0;
          transform: scale(0.96);
        }

        .siara-right-fade-active {
          opacity: 1;
          transform: scale(1);
          transition: opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s;
        }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .siara-login-root {
            flex-direction: column;
          }
          .siara-left {
            width: 100%;
            min-width: unset;
            padding: 32px 24px;
          }
          .siara-left::after {
            display: none;
          }
          .siara-right {
            display: none;
          }
          .siara-left-inner {
            max-width: 100%;
          }
        }

        @media (max-width: 480px) {
          .siara-left {
            padding: 24px 20px;
          }
          .siara-form-title {
            font-size: 24px;
          }
        }
      `}</style>

      <div className="siara-login-root">
        {/* ─── LEFT PANEL ─── */}
        <div className="siara-left">
          <div className="siara-left-inner">
            {/* Brand */}
            <div className={`siara-brand ${mounted ? 'siara-fade-active siara-fade-delay-1' : 'siara-fade-enter'}`}>
              <SiaraLogo className="siara-brand-logo" />
              <div className="siara-brand-text">
                <h1>SIARA</h1>
                <p>Sistem Informasi Akuntabilitas<br />dan Realisasi Material</p>
              </div>
            </div>

            <p className={`siara-tagline ${mounted ? 'siara-fade-active siara-fade-delay-2' : 'siara-fade-enter'}`}>
              Memastikan setiap material memiliki jejak digital mulai dari gudang hingga menjadi aset perusahaan.
            </p>

            {/* Form */}
            <div className={mounted ? 'siara-fade-active siara-fade-delay-3' : 'siara-fade-enter'}>
              <h2 className="siara-form-title">Masuk ke Akun</h2>
              <p className="siara-form-subtitle">Masukkan kredensial Anda untuk melanjutkan</p>
            </div>

            {error && (
              <div className="siara-error">
                <div className="siara-error-dot" />
                <span className="siara-error-text">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className={mounted ? 'siara-fade-active siara-fade-delay-4' : 'siara-fade-enter'}>
                <FloatingInput
                  id="login-username"
                  label="Username / NIK"
                  value={email}
                  onChange={setEmail}
                  autoComplete="username"
                />
              </div>

              <div className={mounted ? 'siara-fade-active siara-fade-delay-5' : 'siara-fade-enter'}>
                <FloatingInput
                  id="login-password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                  suffix={
                    <button
                      type="button"
                      className="siara-toggle-pw"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />
              </div>

              <div className={`siara-options-row ${mounted ? 'siara-fade-active siara-fade-delay-5' : 'siara-fade-enter'}`}>
                <label className="siara-checkbox-label">
                  <input
                    type="checkbox"
                    className="siara-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Ingat saya
                </label>
                <a href="#" className="siara-forgot" onClick={(e) => e.preventDefault()}>
                  Lupa Password?
                </a>
              </div>

              <div className={mounted ? 'siara-fade-active siara-fade-delay-6' : 'siara-fade-enter'}>
                <button
                  type="submit"
                  className="siara-btn"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Memverifikasi...
                    </>
                  ) : (
                    'Masuk'
                  )}
                </button>
              </div>
            </form>

            <div className={`siara-footer ${mounted ? 'siara-fade-active siara-fade-delay-6' : 'siara-fade-enter'}`}>
              <span>PERUMDAM Tirta Ardhia Rinjani</span> — SIARA v2.0
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <div className="siara-right">
          {/* Background patterns */}
          <div className="siara-bg-pattern">
            <div className="siara-bg-circle" />
            <div className="siara-bg-circle" />
            <div className="siara-bg-circle" />
            <div className="siara-bg-dots" />
            <div className="siara-bg-dots" />
          </div>

          {/* Illustration with parallax */}
          <div
            ref={illustrationRef}
            className={`siara-illustration-wrap ${mounted ? 'siara-right-fade-active' : 'siara-right-fade-enter'}`}
          >
            <img
              src="/siara-illustration.png"
              alt="SIARA Material Accountability System — Ilustrasi alur tracking material dari gudang ke pemasangan"
              draggable={false}
            />
          </div>
        </div>
      </div>
    </>
  );
}
