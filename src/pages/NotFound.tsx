import { Link } from 'react-router';
import { Home, Dumbbell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDefaultRouteForRole } from '../lib/roles';

export default function NotFound() {
  const { user } = useAuth();
  const home = user ? getDefaultRouteForRole(user.role) : '/login';
  const homeLabel = !user
    ? 'Iniciar sesión'
    : user.role === 'admin' || user.role === 'trainer'
      ? 'Panel'
      : 'Inicio';

  return (
    <div className="bg-bg flex min-h-dvh items-center justify-center p-4">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="bg-brand/10 rounded-[var(--radius-card)] p-3">
          <Dumbbell className="text-brand h-6 w-6" />
        </div>

        <div>
          <h1 className="text-text text-h1 font-semibold tracking-tight">404</h1>
          <p className="text-text-secondary mt-2 text-sm font-semibold">Página no encontrada</p>
          <p className="text-text-muted mt-1 text-sm leading-relaxed">
            La página que buscas no existe o fue movida.
          </p>
        </div>

        <Link
          to={home}
          className="bg-text text-bg inline-flex min-h-[var(--touch-min)] items-center gap-2 rounded-[var(--radius-button)] px-4 py-2.5 text-sm font-semibold shadow-sm transition-[opacity,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:opacity-90 active:scale-[0.97]"
        >
          <Home className="h-4 w-4" />
          Volver a {homeLabel}
        </Link>
      </div>
    </div>
  );
}
