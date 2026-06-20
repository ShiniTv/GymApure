import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { apiFetch } from '../lib/api';
import type { UserRole } from '../lib/roles';

interface User {
  id: number;
  email: string;
  role: UserRole;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback((userData: User) => {
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    apiFetch('/api/auth/logout', { method: 'POST' })
      .then(() => setUser(null))
      .catch(() => setUser(null));
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, isLoading }),
    [user, login, logout, isLoading]
  );

  return (
    <AuthContext.Provider value={value}>
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
