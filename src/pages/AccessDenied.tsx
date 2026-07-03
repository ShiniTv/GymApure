import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDefaultRouteForRole } from '../lib/roles';
import { Button, PageHeader } from '../components/ui';

export default function AccessDenied() {
  const { user } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const home = getDefaultRouteForRole(user?.role ?? 'member');
  const homeLabel = user?.role === 'receptionist' ? 'Inicio' : 'Dashboard';

  return (
    <div className="page-stack max-w-lg mx-auto">
      <PageHeader
        compact
        title={<>Acceso <span className="text-brand">restringido</span></>}
        subtitle="No tienes permiso para ver esta sección con tu rol actual."
      />

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-brand mx-auto opacity-80" aria-hidden />
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {from
            ? `La ruta "${from}" no está disponible para tu cuenta.`
            : 'Esta página no está disponible para tu cuenta.'}
        </p>
        <Link to={home}>
          <Button className="w-full sm:w-auto">
            <Home className="h-4 w-4 mr-2" />
            Ir a {homeLabel}
          </Button>
        </Link>
      </div>
    </div>
  );
}
