import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useGetCurrentUser, User, setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';
import { useLocation } from 'wouter';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize token getter for the API client
setAuthTokenGetter(() => {
  return localStorage.getItem('access_token');
});

// Since the API server is on a different port/path, we might need to set baseUrl.
// Wait, the vite proxy usually handles `/api`. If so, baseUrl can be left as default.

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();

  const { data: currentUser, isLoading: isUserLoading, isError } = useGetCurrentUser({
    query: {
      enabled: !!token,
      retry: false,
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

  const handleLogin = (newToken: string, newRefreshToken: string) => {
    localStorage.setItem('access_token', newToken);
    localStorage.setItem('refresh_token', newRefreshToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
    setLocation('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading: !!token && isUserLoading, login: handleLogin, logout: handleLogout }}>
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
