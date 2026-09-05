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
        <div className="bg-brand/10 rounded-full p-5">
          <Dumbbell className="text-brand h-10 w-10" />
        </div>

        <div>
          <h1 className="text-text text-6xl font-black tracking-tight sm:text-7xl">404</h1>
          <p className="text-text-secondary mt-3 text-base font-semibold sm:text-lg">
            Página no encontrada
          </p>
          <p className="text-text-muted mt-1 text-sm leading-relaxed">
            La página que buscas no existe o fue movida.
          </p>
        </div>

        <Link
          to={home}
          className="bg-text text-bg inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-md transition-[opacity,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:opacity-90 active:scale-[0.97]"
        >
          <Home className="h-4 w-4" />
          Volver a {homeLabel}
        </Link>
      </div>
    </div>
  );
}
