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
import { dispatchSessionRevoked, onSessionRevoked } from '../lib/sessionEvents';
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

const DEFAULT_SESSION_REVOKED_MESSAGE =
  'Tu sesión se cerró porque iniciaste sesión en otro dispositivo.';

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
    let cancelled = false;
    const controller = new AbortController();
    // BD remota lenta: 2.5s abortaba /me y trataba sesión válida como logout.
    const timeout = window.setTimeout(() => controller.abort(), 10_000);

    apiFetch('/api/auth/me', { signal: controller.signal })
      .then(async (res) => {
        const contentType = res.headers.get('content-type') ?? '';
        if (!res.ok || !contentType.includes('application/json')) {
          throw new Error('Not authenticated');
        }
        return res.json() as Promise<{ user: User | null }>;
      })
      .then((data) => {
        if (!cancelled) setUser(data.user ?? null);
      })
      .catch((err: unknown) => {
        // StrictMode / unmount: no marcar logout ni terminar bootstrap.
        if (cancelled) return;
        void err;
        setUser(null);
      })
      .finally(() => {
        if (cancelled) return;
        window.clearTimeout(timeout);
        setIsLoading(false);
        setAuthBootstrapComplete(true);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      if (userRef.current) {
        dispatchSessionRevoked({ message: DEFAULT_SESSION_REVOKED_MESSAGE });
        logoutLocal(DEFAULT_SESSION_REVOKED_MESSAGE);
      }
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
    void apiFetch('/api/auth/logout', { method: 'POST' }).finally(() => {
      logoutLocal();
    });
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
