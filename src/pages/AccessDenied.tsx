import { Link } from 'react-router';
import { ShieldAlert, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDefaultRouteForRole, PORTAL_TITLES, type UserRole } from '../lib/roles';
import { Button, PageHeader } from '../components/ui';

const ROLE_HINTS: Partial<Record<UserRole, string>> = {
  admin:
    'Como administrador, tu panel se centra en gestión, finanzas y supervisión. Las herramientas de entrenador y recepción tienen portales propios.',
  trainer:
    'Como entrenador, usa el portal de entrenamiento para rutinas, ejercicios y planes de tus miembros asignados.',
  member:
    'Como cliente, tu espacio incluye rutinas, biblioteca de ejercicios, nutrición e historial de entrenamientos.',
  receptionist:
    'Como recepcionista, tu área de trabajo es el mostrador: check-in, registro y pagos.',
};

export default function AccessDenied() {
  const { user } = useAuth();
  const role = user?.role ?? 'member';
  const home = getDefaultRouteForRole(role);
  const homeLabel = role === 'receptionist' || role === 'member' ? 'Inicio' : 'Panel';
  const portalTitle = PORTAL_TITLES[role];
  const roleHint = ROLE_HINTS[role];

  return (
    <div className="page-stack mx-auto max-w-lg">
      <PageHeader
        compact
        title={
          <>
            Acceso <span className="text-brand">restringido</span>
          </>
        }
        subtitle={`${portalTitle} — esta sección no corresponde a tu rol.`}
      />

      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <ShieldAlert className="text-brand mx-auto h-12 w-12 opacity-80" aria-hidden />
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Esta sección no está disponible para tu cuenta.
        </p>
        {roleHint && (
          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">{roleHint}</p>
        )}
        <Link to={home}>
          <Button className="w-full sm:w-auto">
            <Home className="mr-2 h-4 w-4" />
            Ir a {homeLabel}
          </Button>
        </Link>
      </div>
    </div>
  );
}
