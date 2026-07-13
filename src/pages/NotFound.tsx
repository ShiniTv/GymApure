import { Link } from 'react-router-dom';
import { Home, Dumbbell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDefaultRouteForRole } from '../lib/roles';

export default function NotFound() {
  const { user } = useAuth();
  const home = user ? getDefaultRouteForRole(user.role) : '/login';
  const homeLabel =
    user?.role === 'receptionist' ? 'Inicio' : user ? 'Dashboard' : 'Iniciar sesión';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="bg-brand/10 rounded-full p-5">
          <Dumbbell className="text-brand h-10 w-10" />
        </div>

        <div>
          <h1 className="text-6xl font-black tracking-tight text-zinc-900 sm:text-7xl dark:text-white">
            404
          </h1>
          <p className="mt-3 text-base font-semibold text-zinc-700 sm:text-lg dark:text-zinc-300">
            Página no encontrada
          </p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            La página que buscas no existe o fue movida.
          </p>
        </div>

        <Link
          to={home}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-zinc-800 active:scale-95 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          <Home className="h-4 w-4" />
          Volver a {homeLabel}
        </Link>
      </div>
    </div>
  );
}
