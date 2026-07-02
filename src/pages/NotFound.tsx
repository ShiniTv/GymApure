import { Link } from 'react-router-dom';
import { Home, Dumbbell } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <div className="rounded-full bg-brand/10 p-5">
          <Dumbbell className="h-10 w-10 text-brand" />
        </div>

        <div>
          <h1 className="text-6xl sm:text-7xl font-black text-zinc-900 dark:text-white tracking-tight">
            404
          </h1>
          <p className="mt-3 text-base sm:text-lg font-semibold text-zinc-700 dark:text-zinc-300">
            Página no encontrada
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            La página que buscas no existe o fue movida.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-zinc-800 active:scale-95 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          <Home className="h-4 w-4" />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
