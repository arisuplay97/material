import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserRole, UserProfile } from '@/types/pdam';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (role?: UserRole, name?: string) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const DEFAULT_USERS: Record<UserRole, UserProfile> = {
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'pdam_tiara_auth_user',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error reading auth state', e);
    }
    // Default to admin for seamless evaluation
    return DEFAULT_USERS.admin;
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, [user]);

  const login = (role: UserRole = 'admin', customName?: string) => {
    setIsLoading(true);
    setTimeout(() => {
      const baseUser = DEFAULT_USERS[role] || DEFAULT_USERS.admin;
      const newUser: UserProfile = {
        ...baseUser,
        name: customName || baseUser.name,
      };
      setUser(newUser);
      setIsLoading(false);
    }, 200);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
  };

  const switchRole = (role: UserRole) => {
    const newUser = DEFAULT_USERS[role] || DEFAULT_USERS.admin;
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
