import { useAuth } from '@/contexts/AuthContext';
import { useLogin } from '@workspace/api-client-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';

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
    `${cls} ${mounted ? `fade-in ${delay}` : 'fade-init'}`;

  return (
    <>
      <style>{`
        /* ═══════════════════════════════════════
           SIARA Login — Minimal 50/50 Enterprise
           ═══════════════════════════════════════ */

        .sl-root {
          min-height: 100vh;
          display: flex;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #ffffff;
        }
        .sl-root * { box-sizing: border-box; }

        /* ── Fade Animations ── */
        .fade-init {
          opacity: 0;
          transform: translateY(12px);
        }
        .fade-in {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .d1 { transition-delay: 0.1s !important; }
        .d2 { transition-delay: 0.2s !important; }
        .d3 { transition-delay: 0.3s !important; }
        .d4 { transition-delay: 0.4s !important; }

        /* ═══ LEFT PANEL (Value Proposition) ═══ */
        .sl-left {
          width: 50%;
          background: linear-gradient(145deg, #0f172a 0%, #172554 100%);
          color: #ffffff;
          padding: 80px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
        }

        .sl-left-inner {
          max-width: 480px;
          margin: 0 auto;
          width: 100%;
        }

        .sl-headline {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 40px;
          font-weight: 700;
          line-height: 1.15;
          letter-spacing: -0.02em;
          margin-bottom: 24px;
          color: #ffffff;
        }

        .sl-description {
          font-size: 16px;
          line-height: 1.6;
          color: #94a3b8;
          margin-bottom: 48px;
        }

        .sl-benefits {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .sl-benefit-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .sl-check {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(25, 118, 210, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .sl-benefit-text {
          font-size: 15px;
          font-weight: 500;
          color: #e2e8f0;
          line-height: 1.5;
        }

        /* ═══ RIGHT PANEL (Login Form) ═══ */
        .sl-right {
          width: 50%;
          background: #ffffff;
          padding: 80px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .sl-right-inner {
          max-width: 400px;
          margin: 0 auto;
          width: 100%;
        }

        .sl-form-title {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 32px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }

        .sl-form-sub {
          font-size: 14.5px;
          color: #64748b;
          margin-bottom: 40px;
        }

        /* Input */
        .sl-input-group {
          margin-bottom: 20px;
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
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .sl-float-label {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14.5px;
          color: #94a3b8;
          pointer-events: none;
          transition: all 0.2s ease;
          font-weight: 400;
        }
        .sl-float-label.floating {
          top: 10px;
          transform: translateY(0);
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
        }
        .sl-input-wrap.focused .sl-float-label.floating {
          color: #3b82f6;
        }
        .sl-input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          padding: 26px 48px 10px 16px;
          font-size: 15px;
          font-family: 'Inter', sans-serif;
          color: #0f172a;
          font-weight: 500;
        }
        .sl-input::placeholder { color: transparent; }

        .sl-input-suffix {
          position: absolute;
          right: 14px;
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

        /* Options */
        .sl-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
        }
        .sl-cb-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #475569;
          cursor: pointer;
          user-select: none;
        }
        .sl-cb {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          appearance: none;
          cursor: pointer;
          transition: all 0.15s;
          background: #fff;
          flex-shrink: 0;
        }
        .sl-cb:checked {
          background: #3b82f6;
          border-color: #3b82f6;
          background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' d='M4 8l3 3 5-5'/%3e%3c/svg%3e");
          background-position: center;
          background-size: 12px;
          background-repeat: no-repeat;
        }
        .sl-forgot {
          font-size: 14px;
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.15s;
        }
        .sl-forgot:hover { color: #2563eb; }

        /* Button */
        .sl-btn {
          width: 100%;
          height: 52px;
          border: none;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          background: #3b82f6;
        }
        .sl-btn:hover:not(:disabled) {
          background: #2563eb;
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
          padding: 12px 16px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sl-error-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #ef4444;
          flex-shrink: 0;
        }
        .sl-error-text {
          font-size: 14px;
          color: #b91c1c;
          font-weight: 500;
          line-height: 1.4;
        }

        /* ═══ RESPONSIVE ═══ */
        @media (max-width: 960px) {
          .sl-root { flex-direction: column; }
          .sl-left, .sl-right { width: 100%; padding: 48px 32px; min-height: unset; }
          .sl-headline { font-size: 32px; }
        }

        @media (max-width: 480px) {
          .sl-left, .sl-right { padding: 40px 24px; }
          .sl-headline { font-size: 28px; }
          .sl-form-title { font-size: 28px; }
        }
      `}</style>

      <div className="sl-root">

        {/* ═══ LEFT PANEL ═══ */}
        <div className="sl-left">
          <div className="sl-left-inner">
            <h1 className={fc('sl-headline', 'd1')}>
              Setiap Material, Terpantau dengan Lebih Baik.
            </h1>
            <p className={fc('sl-description', 'd2')}>
              Membantu memastikan setiap material memiliki jejak digital yang jelas, mulai dari penerimaan di gudang hingga menjadi aset perusahaan.
            </p>

            <div className={fc('sl-benefits', 'd3')}>
              <div className="sl-benefit-item">
                <div className="sl-check">
                  <Check size={14} strokeWidth={3} />
                </div>
                <div className="sl-benefit-text">Pelacakan material yang terstruktur</div>
              </div>
              <div className="sl-benefit-item">
                <div className="sl-check">
                  <Check size={14} strokeWidth={3} />
                </div>
                <div className="sl-benefit-text">Riwayat pergerakan material terdokumentasi</div>
              </div>
              <div className="sl-benefit-item">
                <div className="sl-check">
                  <Check size={14} strokeWidth={3} />
                </div>
                <div className="sl-benefit-text">Informasi status material lebih mudah dipantau</div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT PANEL ═══ */}
        <div className="sl-right">
          <div className="sl-right-inner">
            <div className={fc('', 'd1')}>
              <h2 className="sl-form-title">Masuk ke Akun</h2>
              <p className="sl-form-sub">Masukkan kredensial Anda untuk melanjutkan</p>
            </div>

            {error && (
              <div className="sl-error">
                <div className="sl-error-dot" />
                <span className="sl-error-text">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className={fc('', 'd2')}>
                <FloatingInput
                  id="login-username"
                  label="Username / NIK"
                  value={email}
                  onChange={setEmail}
                  autoComplete="username"
                />
              </div>

              <div className={fc('', 'd3')}>
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
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />
              </div>

              <div className={fc('sl-options', 'd4')}>
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

              <div className={fc('', 'd4')}>
                <button
                  type="submit"
                  className="sl-btn"
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
          </div>
        </div>

      </div>
    </>
  );
}
