import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, clearToken, hasToken } from './lib/api';

interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  role: 'admin' | 'manager';
}

interface AuthContextType {
  profile: UserProfile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Check existing token on mount
  useEffect(() => {
    if (!hasToken()) {
      setLoading(false);
      return;
    }
    api<{ profile: UserProfile }>('/auth/me')
      .then(data => setProfile(data.profile))
      .catch(() => { clearToken(); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const data = await api<{ token: string; profile: UserProfile }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setToken(data.token);
    setProfile(data.profile);
  };

  const logout = () => {
    clearToken();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
