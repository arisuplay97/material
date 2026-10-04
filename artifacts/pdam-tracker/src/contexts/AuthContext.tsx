import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { UserRole, UserProfile } from '@/types/pdam';

/**
 * DEMO AUTH — client-side only.
 *
 * There is no server yet, so this cannot protect data. It exists so the UI
 * behaves like the real flow (no auto-login, no in-app role switching).
 * Replace with the API-backed session in the backend phase.
 */

interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  loginAsDemo: (role: UserRole) => void;
  logout: () => void;
}

export const DEMO_USERS: Record<UserRole, UserProfile> = {
  admin: {
    id: 'usr-admin-01',
    name: 'Muh Sofiyan Hawari',
    email: 'sofiyan.hawari@pdamtiara.id',
    role: 'admin',
    department: 'Bidang IT & Sistem Informasi',
  },
  verifikator: {
    id: 'usr-verif-02',
    name: 'Lalu Danial Pratama',
    email: 'danial.verif@pdamtiara.id',
    role: 'verifikator',
    department: 'Tim Perapian Data & Verifikasi Lapangan',
  },
  pimpinan: {
    id: 'usr-pimp-03',
    name: 'Direksi Operasional',
    email: 'direksi@pdamtiara.id',
    role: 'pimpinan',
    department: 'Direksi & Manajemen Eksekutif',
  },
};

const STORAGE_KEY = 'pdam_tiara_session_v2';
const LEGACY_STORAGE_KEY = 'pdam_tiara_auth_user';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

interface StoredSession {
  userId: string;
  expiresAt: number;
}

function readSession(): UserProfile | null {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as StoredSession;
    if (!session || typeof session.expiresAt !== 'number' || session.expiresAt < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    // Only trust the stored id; profile data always comes from the registry.
    return Object.values(DEMO_USERS).find((u) => u.id === session.userId) ?? null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(readSession);

  useEffect(() => {
    try {
      if (user) {
        const session: StoredSession = { userId: user.id, expiresAt: Date.now() + SESSION_TTL_MS };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* storage unavailable — session stays in memory */
    }
  }, [user]);

  const login = useCallback<AuthContextType['login']>((email, password) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) return { ok: false, error: 'Email dan kata sandi wajib diisi.' };
    const match = Object.values(DEMO_USERS).find((u) => u.email === normalized);
    if (!match) return { ok: false, error: 'Akun tidak terdaftar.' };
    setUser(match);
    return { ok: true };
  }, []);

  const loginAsDemo = useCallback((role: UserRole) => setUser(DEMO_USERS[role]), []);
  const logout = useCallback(() => setUser(null), []);

  const value = useMemo(() => ({ user, login, loginAsDemo, logout }), [user, login, loginAsDemo, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
