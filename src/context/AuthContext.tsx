import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, registerUnauthorizedHandler, setAuthBootstrapComplete } from '../lib/api';
import { dispatchSessionRevoked, onSessionRevoked, SESSION_MESSAGES } from '../lib/sessionEvents';
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
  logoutLocal: (message?: string) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_SESSION_REVOKED_MESSAGE = SESSION_MESSAGES.loginElsewhere;
const INACTIVE_ACCOUNT_MESSAGE = SESSION_MESSAGES.accountInactive;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const logoutLocal = useCallback(
    (message?: string) => {
      setUser(null);
      if (message) {
        sessionStorage.setItem('auth:session-message', message);
      }
      navigate('/login', { replace: true });
    },
    [navigate]
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);

    apiFetch('/api/auth/me', { signal: controller.signal })
      .then(async (res) => {
        const contentType = res.headers.get('content-type') ?? '';
        if (!res.ok || !contentType.includes('application/json')) {
          throw new Error('Not authenticated');
        }
        return res.json() as Promise<{ user: User }>;
      })
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => {
        window.clearTimeout(timeout);
        setIsLoading(false);
        setAuthBootstrapComplete(true);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler((reason) => {
      if (!userRef.current) return;
      const message =
        reason === 'inactive' ? INACTIVE_ACCOUNT_MESSAGE : DEFAULT_SESSION_REVOKED_MESSAGE;
      dispatchSessionRevoked({
        message,
        reason: reason === 'inactive' ? 'account_inactive' : 'expired',
      });
      logoutLocal(message);
    });
    return () => registerUnauthorizedHandler(null);
  }, [logoutLocal]);

  useEffect(() => {
    return onSessionRevoked((detail) => {
      if (!userRef.current) return;
      logoutLocal(detail.message ?? DEFAULT_SESSION_REVOKED_MESSAGE);
    });
  }, [logoutLocal]);

  const login = useCallback((userData: User) => {
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    apiFetch('/api/auth/logout', { method: 'POST' })
      .then(() => logoutLocal())
      .catch(() => logoutLocal());
  }, [logoutLocal]);

  const value = useMemo(
    () => ({ user, login, logout, logoutLocal, isLoading }),
    [user, login, logout, logoutLocal, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
