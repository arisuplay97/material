import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useGetCurrentUser, User, setAuthTokenGetter } from '@workspace/api-client-react';
import { useLocation } from 'wouter';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, refreshToken: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Always read token from localStorage so API calls work immediately after login
setAuthTokenGetter(() => localStorage.getItem('access_token'));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();

  // Only fetch /auth/me on initial page load (when token exists but user not yet set)
  const { data: currentUser, isLoading: isUserLoading, isError } = useGetCurrentUser({
    query: {
      enabled: !!token && user === null,
      retry: false,
      queryKey: ['currentUser']
    }
  });

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isError) {
      handleLogout();
    }
  }, [isError]);

  // Accept user data directly so state is set synchronously before navigation
  const handleLogin = (newToken: string, newRefreshToken: string, userData: User) => {
    localStorage.setItem('access_token', newToken);
    localStorage.setItem('refresh_token', newRefreshToken);
    setToken(newToken);
    setUser(userData); // set immediately — no race condition
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
    setLocation('/login');
  };

  const isLoading = !!token && user === null && isUserLoading;

  return (
    <AuthContext.Provider value={{ user, isLoading, login: handleLogin, logout: handleLogout }}>
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
