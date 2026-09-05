import { Link, useLocation } from 'react-router';
import { ShieldAlert, Home, Users } from 'lucide-react';
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
  receptionist: 'Como recepcionista, tu área de trabajo es el mostrador: acceso, registro y pagos.',
};

interface AccessDeniedLocationState {
  from?: { pathname?: string; search?: string };
}

export default function AccessDenied() {
  const { user } = useAuth();
  const location = useLocation();
  const role = user?.role ?? 'member';
  const home = getDefaultRouteForRole(role);
  const homeLabel = role === 'receptionist' || role === 'member' ? 'Inicio' : 'Panel';
  const portalTitle = PORTAL_TITLES[role];
  const roleHint = ROLE_HINTS[role];
  const fromState = (location.state as AccessDeniedLocationState | null)?.from;
  const attemptedPath =
    `${fromState?.pathname ?? ''}${fromState?.search ?? ''}` || location.pathname;
  const path = fromState?.pathname ?? location.pathname;
  const routinesBlocked =
    role === 'admin' &&
    (path.includes('/routines') ||
      path.includes('/exercises') ||
      /\/members\/\d+\/(routines|nutrition)/.test(path));

  return (
    <div className="page-stack mx-auto max-w-lg">
      <PageHeader
        compact
        showTitleOnMobile
        title={
          <>
            Acceso <span className="text-brand">restringido</span>
          </>
        }
        subtitle={`${portalTitle} — esta sección no corresponde a tu rol.`}
      />

      <div className="border-border bg-surface space-y-4 rounded-2xl border p-6 text-center">
        <ShieldAlert className="text-brand mx-auto h-12 w-12 opacity-80" aria-hidden />
        <p className="text-text-secondary text-sm leading-relaxed">
          {routinesBlocked
            ? 'Las rutinas y la nutrición las asigna el entrenador desde su portal. Desde aquí puedes gestionar miembros, membresías y el mostrador.'
            : 'Esta sección no está disponible para tu cuenta.'}
        </p>
        {fromState?.pathname ? (
          <p className="text-text-muted text-xs leading-relaxed">
            Intentaste abrir <span className="font-mono">{attemptedPath}</span>.
          </p>
        ) : null}
        {roleHint && !routinesBlocked ? (
          <p className="text-text-muted text-xs leading-relaxed">{roleHint}</p>
        ) : null}
        <div className="flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
          {routinesBlocked ? (
            <Link to="/members">
              <Button className="w-full sm:w-auto">
                <Users className="mr-2 h-4 w-4" />
                Ir a Miembros
              </Button>
            </Link>
          ) : null}
          <Link to={home}>
            <Button
              variant={routinesBlocked ? 'secondary' : 'primary'}
              className="w-full sm:w-auto"
            >
              <Home className="mr-2 h-4 w-4" />
              Ir a {homeLabel}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
