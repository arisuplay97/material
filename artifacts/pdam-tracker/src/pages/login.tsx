import { useAuth } from '@/contexts/AuthContext';
import { useLogin } from '@workspace/api-client-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Eye,
  EyeOff,
  Loader2,
  Package,
  MapPin,
} from 'lucide-react';

/* ─── SVG Logo ─── */
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
    <div className="sl-input-group">
      <div className={`sl-input-wrap ${isActive ? 'active' : ''} ${focused ? 'focused' : ''}`}>
        <label htmlFor={id} className={`sl-float-label ${isActive ? 'floating' : ''}`}>
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
          className="sl-input"
          required
        />
        {suffix && <div className="sl-input-suffix">{suffix}</div>}
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

  const loginMutation = useLogin();

  useEffect(() => {
    setMounted(true);
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
        },
      }
    );
  };

  const fc = (cls: string, delay: string) =>
    `${cls} ${mounted ? `sl-fade-in ${delay}` : 'sl-fade-init'}`;

  return (
    <>
      <style>{`
        /* ═══════════════════════════════════════
           SIARA Login — Enterprise Abstract Design
           ═══════════════════════════════════════ */

        .sl-root {
          min-height: 100vh;
          display: flex;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #ffffff;
          overflow: hidden;
        }
        .sl-root * { box-sizing: border-box; }

        /* ── Fade Animations ── */
        .sl-fade-init {
          opacity: 0;
          transform: translateY(14px);
        }
        .sl-fade-in {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .sl-d1 { transition-delay: 0.05s !important; }
        .sl-d2 { transition-delay: 0.12s !important; }
        .sl-d3 { transition-delay: 0.19s !important; }
        .sl-d4 { transition-delay: 0.26s !important; }
        .sl-d5 { transition-delay: 0.33s !important; }
        .sl-d6 { transition-delay: 0.40s !important; }
        .sl-d7 { transition-delay: 0.47s !important; }

        .sl-scale-init {
          opacity: 0;
          transform: scale(0.96) translate(10px, 10px);
        }
        .sl-scale-in {
          opacity: 1;
          transform: scale(1) translate(0, 0);
          transition: opacity 0.8s ease 0.15s, transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.15s;
        }

        /* ═══ LEFT PANEL ═══ */
        .sl-left {
          width: 40%;
          min-width: 420px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 48px 64px;
          position: relative;
          z-index: 2;
          background: #ffffff;
        }
        .sl-left-inner {
          max-width: 380px;
          width: 100%;
          margin: 0 auto;
        }

        /* Brand */
        .sl-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .sl-brand-logo {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
        }
        .sl-brand-text h1 {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.01em;
          color: #0F5FA8;
          margin: 0;
          line-height: 1;
        }
        .sl-brand-text p {
          font-size: 11px;
          font-weight: 500;
          color: #475569;
          margin: 4px 0 0;
          line-height: 1.2;
        }

        .sl-tagline {
          font-size: 13.5px;
          line-height: 1.6;
          color: #64748b;
          margin: 0 0 48px;
          font-weight: 400;
        }

        /* Form heading */
        .sl-form-title {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0 0 6px;
        }
        .sl-form-sub {
          font-size: 13.5px;
          color: #64748b;
          margin: 0 0 32px;
        }

        /* Input */
        .sl-input-group {
          margin-bottom: 18px;
        }
        .sl-input-wrap {
          position: relative;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          transition: all 0.2s ease;
        }
        .sl-input-wrap:hover {
          border-color: #cbd5e1;
        }
        .sl-input-wrap.focused {
          border-color: #0F5FA8;
          box-shadow: 0 0 0 3px rgba(15, 95, 168, 0.08);
        }
        .sl-float-label {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
          color: #94a3b8;
          pointer-events: none;
          transition: all 0.2s ease;
          font-weight: 500;
        }
        .sl-float-label.floating {
          top: 8px;
          transform: translateY(0);
          font-size: 10px;
          color: #64748b;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .sl-input-wrap.focused .sl-float-label.floating {
          color: #0F5FA8;
        }
        .sl-input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          padding: 24px 44px 8px 14px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          color: #0f172a;
          font-weight: 500;
        }
        .sl-input::placeholder { color: transparent; }

        .sl-input-suffix {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
        }
        .sl-toggle-pw {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          transition: color 0.15s;
          border-radius: 6px;
        }
        .sl-toggle-pw:hover {
          color: #475569;
          background: #f8fafc;
        }

        /* Options row */
        .sl-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
        }
        .sl-cb-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #475569;
          cursor: pointer;
          user-select: none;
          font-weight: 500;
        }
        .sl-cb {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          appearance: none;
          cursor: pointer;
          transition: all 0.15s;
          background: #fff;
          flex-shrink: 0;
        }
        .sl-cb:checked {
          background: #0F5FA8;
          border-color: #0F5FA8;
          background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
        }
        .sl-forgot {
          font-size: 13px;
          color: #0F5FA8;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.15s;
        }
        .sl-forgot:hover { color: #1e40af; }

        /* Button */
        .sl-btn {
          width: 100%;
          height: 46px;
          border: none;
          border-radius: 8px;
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 14.5px;
          font-weight: 600;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          background: #0F5FA8;
          letter-spacing: 0.01em;
        }
        .sl-btn:hover:not(:disabled) {
          background: #0d5496;
        }
        .sl-btn:active:not(:disabled) {
          transform: translateY(1px);
        }
        .sl-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Error */
        .sl-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sl-error-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #ef4444;
          flex-shrink: 0;
        }
        .sl-error-text {
          font-size: 13px;
          color: #dc2626;
          font-weight: 500;
          line-height: 1.4;
        }

        /* Footer */
        .sl-footer {
          margin-top: 56px;
          font-size: 11px;
          color: #94a3b8;
          text-align: left;
        }

        /* ═══ RIGHT PANEL (Visual Showcase) ═══ */
        .sl-right {
          flex: 1;
          position: relative;
          background: #f8fafc; /* Very light blue-gray */
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 40px;
          border-left: 1px solid #e2e8f0;
        }

        /* Subtle grid background common in SaaS */
        .sl-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(#f1f5f9 1px, transparent 1px),
            linear-gradient(90deg, #f1f5f9 1px, transparent 1px);
          background-size: 32px 32px;
          background-position: -1px -1px;
          opacity: 0.6;
          pointer-events: none;
        }

        /* Abstract Mockup Composition */
        .mockup-container {
          position: relative;
          width: 100%;
          max-width: 640px;
          z-index: 10;
        }

        /* Main Window */
        .mockup-window {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 10px 40px -10px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04);
          overflow: hidden;
          width: 100%;
        }

        .mw-header {
          height: 48px;
          background: #ffffff;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          padding: 0 16px;
          gap: 6px;
        }
        .mw-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          background: #e2e8f0;
        }

        .mw-body {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Abstract Row */
        .mw-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border: 1px solid #f1f5f9;
          border-radius: 8px;
          background: #ffffff;
        }
        .mw-row-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .mw-icon {
          width: 36px; height: 36px;
          border-radius: 8px;
          background: #f0f7ff;
          color: #0F5FA8;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .mw-lines {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .al-dark { height: 8px; background: #334155; border-radius: 4px; }
        .al-light { height: 8px; background: #cbd5e1; border-radius: 4px; }
        
        .mw-badge {
          display: inline-flex;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .mw-badge.blue {
          background: #eff6ff;
          color: #0F5FA8;
        }
        .mw-badge.green {
          background: #f0fdf4;
          color: #16a34a;
        }

        /* Abstract Tracking Line inside window */
        .mw-tracking {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 0 12px;
        }
        .mt-dot {
          width: 12px; height: 12px;
          border-radius: 50%;
          background: #cbd5e1;
        }
        .mt-dot.done {
          background: #0F5FA8;
          box-shadow: 0 0 0 3px #eff6ff;
        }
        .mt-line {
          flex: 1;
          height: 2px;
          background: #e2e8f0;
          border-radius: 1px;
        }
        .mt-line.done {
          background: #0F5FA8;
        }

        /* Overlapping Card */
        .mockup-float {
          position: absolute;
          bottom: -24px;
          right: -32px;
          width: 260px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 12px 32px -8px rgba(15, 23, 42, 0.12);
        }
        .mf-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .mf-icon {
          width: 28px; height: 28px;
          border-radius: 6px;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }

        /* ═══ RESPONSIVE ═══ */
        @media (max-width: 1024px) {
          .sl-right { padding: 32px; }
          .mockup-float {
            right: 0;
            bottom: -20px;
          }
        }

        @media (max-width: 900px) {
          .sl-root { flex-direction: column; }
          .sl-left {
            width: 100%;
            min-width: unset;
            padding: 40px 32px;
            align-items: center;
          }
          .sl-left-inner { max-width: 400px; }
          .sl-right { display: none; }
        }

        @media (max-width: 480px) {
          .sl-left { padding: 32px 24px; }
          .sl-form-title { font-size: 22px; }
          .sl-brand-text h1 { font-size: 18px; }
        }
      `}</style>

      <div className="sl-root">
        {/* ═══ LEFT: Login Form ═══ */}
        <div className="sl-left">
          <div className="sl-left-inner">
            {/* Brand Logo & Title */}
            <div className={fc('sl-brand', 'sl-d1')}>
              <SiaraLogo className="sl-brand-logo" />
              <div className="sl-brand-text">
                <h1>SIARA</h1>
                <p>Sistem Informasi Akuntabilitas dan Realisasi Material</p>
              </div>
            </div>

            {/* Supporting Description */}
            <p className={fc('sl-tagline', 'sl-d2')}>
              Memastikan setiap material memiliki jejak digital mulai dari gudang hingga menjadi aset perusahaan.
            </p>

            {/* Form heading */}
            <div className={fc('', 'sl-d3')}>
              <h2 className="sl-form-title">Masuk ke Akun</h2>
              <p className="sl-form-sub">Masukkan kredensial Anda untuk melanjutkan</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="sl-error">
                <div className="sl-error-dot" />
                <span className="sl-error-text">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className={fc('', 'sl-d4')}>
                <FloatingInput
                  id="login-username"
                  label="Username / NIK"
                  value={email}
                  onChange={setEmail}
                  autoComplete="username"
                />
              </div>

              <div className={fc('', 'sl-d5')}>
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
                      className="sl-toggle-pw"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              </div>

              <div className={fc('sl-options', 'sl-d6')}>
                <label className="sl-cb-label">
                  <input
                    type="checkbox"
                    className="sl-cb"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Ingat saya
                </label>
                <a href="#" className="sl-forgot" onClick={(e) => e.preventDefault()}>
                  Lupa Password?
                </a>
              </div>

              <div className={fc('', 'sl-d7')}>
                <button
                  type="submit"
                  className="sl-btn"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Memverifikasi...
                    </>
                  ) : (
                    'Masuk'
                  )}
                </button>
              </div>
            </form>

            <div className={fc('sl-footer', 'sl-d7')}>
              PERUMDAM Tirta Ardhia Rinjani — SIARA v2.0
            </div>
          </div>
        </div>

        {/* ═══ RIGHT: Abstract Product Composition ═══ */}
        <div className="sl-right">
          <div className="sl-grid" />

          <div className={`mockup-container ${mounted ? 'sl-scale-in' : 'sl-scale-init'}`}>
            {/* Main Mockup Window */}
            <div className="mockup-window">
              <div className="mw-header">
                <div className="mw-dot" />
                <div className="mw-dot" />
                <div className="mw-dot" />
              </div>
              <div className="mw-body">

                {/* Abstract Material Item 1 */}
                <div className="mw-row">
                  <div className="mw-row-left">
                    <div className="mw-icon">
                      <Package size={18} strokeWidth={2.5} />
                    </div>
                    <div className="mw-lines">
                      <div className="al-dark" style={{ width: '140px' }} />
                      <div className="al-light" style={{ width: '80px' }} />
                    </div>
                  </div>
                  <div className="mw-badge blue">
                    Dalam Distribusi
                  </div>
                </div>

                {/* Abstract Material Item 2 */}
                <div className="mw-row">
                  <div className="mw-row-left">
                    <div className="mw-icon">
                      <Package size={18} strokeWidth={2.5} />
                    </div>
                    <div className="mw-lines">
                      <div className="al-dark" style={{ width: '100px' }} />
                      <div className="al-light" style={{ width: '90px' }} />
                    </div>
                  </div>
                  <div className="mw-badge green">
                    Terpasang
                  </div>
                </div>

                {/* Abstract Tracking Step Indicators */}
                <div className="mw-tracking">
                  <div className="mt-dot done" />
                  <div className="mt-line done" />
                  <div className="mt-dot done" />
                  <div className="mt-line done" />
                  <div className="mt-dot done" />
                  <div className="mt-line" />
                  <div className="mt-dot" />
                </div>
              </div>
            </div>

            {/* Overlapping small card for depth */}
            <div className="mockup-float">
              <div className="mf-header">
                <div className="mf-icon">
                  <MapPin size={14} strokeWidth={2.5} />
                </div>
                <div className="mw-lines">
                  <div className="al-dark" style={{ width: '90px' }} />
                  <div className="al-light" style={{ width: '130px' }} />
                </div>
              </div>
              <div className="mw-lines" style={{ gap: '12px' }}>
                <div className="al-light" style={{ width: '100%' }} />
                <div className="al-light" style={{ width: '70%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
