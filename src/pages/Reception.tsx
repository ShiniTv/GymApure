import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import {
  Fingerprint,
  LogIn,
  LogOut,
  UserPlus,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Monitor,
  RefreshCw,
  X,
  ArrowLeft,
  Tablet,
} from 'lucide-react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import {
  Button,
  Card,
  PageHeader,
  Badge,
  Spinner,
  SegmentedControl,
  CedulaInput,
  Label,
  Modal,
} from '../components/ui';
import { cn } from '../lib/utils';
import { useReceptionShortcuts } from '../hooks/useReceptionShortcuts';
import ReceptionWalkInWizard from './reception/ReceptionWalkInWizard';
import ReceptionActivityFeed from '../components/reception/ReceptionActivityFeed';
import { ReceptionHomeSummary } from '../components/reception/ReceptionHomeSummary';
import { usePageTitle } from '../hooks/usePageTitle';
import { useMediaQuery } from '../lib/useMediaQuery';

interface LookupResult {
  found: boolean;
  user?: {
    id: number;
    full_name: string;
    email: string;
    cedula: string | null;
    phone: string | null;
    status: string;
    role: string;
  };
  subscription?: {
    membership_name: string;
    end_date: string;
    days_remaining: number;
  } | null;
  attendance?: {
    is_inside: boolean;
    today_session: { check_in_time: string; check_out_time: string | null } | null;
  };
  access_status?: 'allowed' | 'inactive' | 'no_subscription';
  can_check_in?: boolean;
  can_check_out?: boolean;
  error?: string;
}

interface InsideMember {
  id: number;
  full_name: string;
  cedula: string | null;
  check_in_time: string;
}

type Tab = 'access' | 'inside' | 'register';

interface AttendanceActionResult {
  error?: string;
  user_name?: string;
  message?: string;
  already_checked_in?: boolean;
  already_checked_out?: boolean;
  duration_label?: string;
}

/** Touch-friendly counter inputs — compact on mobile */
const COUNTER_FIELD =
  'min-h-12 h-12 text-base font-semibold tracking-wide sm:min-h-[52px] sm:h-[52px] sm:text-lg';
const COUNTER_ACTION = 'min-h-11 sm:min-h-[52px]';
const COUNTER_SEARCH_BTN = 'h-12 w-12 shrink-0 p-0 sm:h-[52px] sm:w-[52px]';

export default function Reception() {
  usePageTitle('Recepción');
  const [searchParams, setSearchParams] = useSearchParams();
  const isCounterMode = searchParams.get('mode') === 'counter';
  const tabParam = searchParams.get('tab');
  const initialTab: Tab = tabParam === 'inside' || tabParam === 'register' ? tabParam : 'access';

  const [tab, setTab] = useState<Tab>(initialTab);
  const [cedula, setCedula] = useState('');
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [inside, setInside] = useState<InsideMember[]>([]);
  const [insideCount, setInsideCount] = useState(0);
  const [feedRefresh, setFeedRefresh] = useState(0);
  const [checkoutConfirm, setCheckoutConfirm] = useState<{ cedula: string; name: string } | null>(
    null
  );
  const [checkingOutCedula, setCheckingOutCedula] = useState<string | null>(null);
  const cedulaRef = useRef<HTMLInputElement>(null);
  const isMobileShell = useMediaQuery('(max-width: 1023px)');

  const setCounterMode = (enabled: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (enabled) {
      next.set('mode', 'counter');
    } else {
      next.delete('mode');
    }
    setSearchParams(next, { replace: true });
  };

  const changeTab = (next: Tab) => {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    if (next === 'access') {
      params.delete('tab');
    } else {
      params.set('tab', next);
    }
    setSearchParams(params, { replace: true });
  };

  const loadStats = useCallback(async () => {
    try {
      const insideRes = await apiFetch('/api/attendance/inside').then((r) =>
        parseJsonResponse<{ count: number; members: InsideMember[] }>(r)
      );
      setInside(insideRes?.members ?? []);
      setInsideCount(insideRes?.count ?? 0);
      setFeedRefresh((k) => k + 1);
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const doLookup = useCallback(
    async (value?: string, options?: { preserveMessage?: boolean }) => {
      const q = (value ?? cedula).trim();
      if (!q) return;

      setLookupLoading(true);
      if (!options?.preserveMessage) {
        setMessage('');
        setMessageType('');
      }
      try {
        const res = await apiFetch(`/api/reception/lookup?cedula=${encodeURIComponent(q)}`);
        const data = await parseJsonResponse<LookupResult>(res);
        if (res.ok && data?.found) {
          setLookup(data);
        } else {
          setLookup({ found: false, error: data?.error || 'Usuario no encontrado' });
        }
      } catch {
        setLookup({ found: false, error: 'Error de conexión' });
      } finally {
        setLookupLoading(false);
      }
    },
    [cedula]
  );

  const formatAttendanceMessage = useCallback(
    (action: 'check-in' | 'check-out', data: AttendanceActionResult) => {
      if (data.message) return data.message;
      if (action === 'check-in') {
        return data.already_checked_in
          ? `${data.user_name}: ya tiene ingreso activo`
          : `Entrada autorizada: ${data.user_name}`;
      }
      return data.already_checked_out
        ? `${data.user_name}: ya registró salida`
        : `Salida registrada: ${data.user_name}${data.duration_label ? ` (${data.duration_label})` : ''}`;
    },
    []
  );

  const runAttendanceAction = useCallback(
    async (
      action: 'check-in' | 'check-out',
      memberCedula: string,
      options?: { clearInput?: boolean }
    ) => {
      const q = memberCedula.trim();
      if (!q) return false;

      setActionLoading(true);
      if (action === 'check-out') setCheckingOutCedula(q);
      setMessage('');
      try {
        const res = await apiFetch(`/api/reception/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cedula: q }),
        });
        const data = await parseJsonResponse<AttendanceActionResult>(res);

        if (res.ok) {
          setMessageType('success');
          setMessage(formatAttendanceMessage(action, data));
          if (options?.clearInput) {
            setCedula('');
            setLookup(null);
            if (!isMobileShell) {
              setTimeout(() => cedulaRef.current?.focus(), 100);
            }
          } else if (q.toUpperCase() === lookup?.user?.cedula?.toUpperCase()) {
            void doLookup(q, { preserveMessage: true });
          }
          void loadStats();
          return true;
        }

        setMessageType('error');
        setMessage(data.error || 'Operación fallida');
        return false;
      } catch {
        setMessageType('error');
        setMessage('Error de red');
        return false;
      } finally {
        setActionLoading(false);
        setCheckingOutCedula(null);
      }
    },
    [formatAttendanceMessage, loadStats, isMobileShell, lookup?.user?.cedula, doLookup]
  );

  const handleAction = useCallback(
    (action: 'check-in' | 'check-out') => {
      const q = cedula.trim();
      if (!q) return;
      void runAttendanceAction(action, q, { clearInput: true });
    },
    [cedula, runAttendanceAction]
  );

  const requestCheckout = useCallback((member: InsideMember) => {
    if (!member.cedula?.trim()) return;
    setCheckoutConfirm({ cedula: member.cedula.trim(), name: member.full_name });
  }, []);

  const confirmCheckout = useCallback(() => {
    if (!checkoutConfirm) return;
    const { cedula: memberCedula } = checkoutConfirm;
    setCheckoutConfirm(null);
    void runAttendanceAction('check-out', memberCedula);
  }, [checkoutConfirm, runAttendanceAction]);

  useReceptionShortcuts({
    enabled: isCounterMode && tab === 'access',
    onSearch: () => void doLookup(),
    onCheckIn: () => void handleAction('check-in'),
    onCheckOut: () => void handleAction('check-out'),
    canCheckIn: Boolean(lookup?.can_check_in) && !actionLoading,
    canCheckOut: Boolean(lookup?.can_check_out) && !actionLoading,
  });

  const accessBadge = () => {
    if (!lookup?.found) return null;
    if (lookup.access_status === 'inactive') {
      return <Badge variant="danger">Cuenta inactiva</Badge>;
    }
    if (lookup.access_status === 'no_subscription') {
      return <Badge variant="warning">Sin membresía activa</Badge>;
    }
    if (lookup.attendance?.is_inside) {
      return <Badge variant="success">Dentro del gym</Badge>;
    }
    return <Badge variant="accent">Puede ingresar</Badge>;
  };

  const actionMessageBanner =
    message &&
    (messageType === 'success' ? (
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400',
          isCounterMode && 'px-3 py-2.5'
        )}
      >
        <CheckCircle className="h-5 w-5 shrink-0" />
        {message}
      </div>
    ) : (
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400',
          isCounterMode && 'px-3 py-2.5'
        )}
      >
        <XCircle className="h-5 w-5 shrink-0" />
        {message}
      </div>
    ));

  const lookupPanel = (
    <Card padding="md" rounded="xl" className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="reception-cedula" className="label-caps">
          Cédula del visitante
        </Label>
        <div className="flex items-stretch gap-2">
          <div className="min-w-0 flex-1">
            <CedulaInput
              id="reception-cedula"
              ref={cedulaRef}
              value={cedula}
              onChange={setCedula}
              onKeyDown={(e) => e.key === 'Enter' && void doLookup()}
              className={cn(isCounterMode && COUNTER_FIELD)}
            />
          </div>
          <Button
            onClick={() => void doLookup()}
            loading={lookupLoading}
            disabled={!cedula.trim()}
            size="md"
            className={cn(
              isCounterMode
                ? cn(COUNTER_SEARCH_BTN, 'min-h-0')
                : 'aspect-square shrink-0 self-stretch px-0'
            )}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {isCounterMode && (
          <p className="hidden text-xs text-zinc-400 sm:block dark:text-zinc-300">
            Atajos:{' '}
            <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-zinc-800">
              Enter
            </kbd>{' '}
            buscar ·{' '}
            <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-zinc-800">
              F1
            </kbd>{' '}
            entrada ·{' '}
            <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-zinc-800">
              F2
            </kbd>{' '}
            salida
          </p>
        )}
      </div>

      {message && actionMessageBanner}

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Button
          size={isCounterMode ? 'sm' : 'sm'}
          className={cn(isCounterMode && COUNTER_ACTION, isCounterMode && 'sm:min-h-[52px]')}
          disabled={actionLoading || !lookup?.can_check_in}
          onClick={() => void handleAction('check-in')}
        >
          <LogIn className="h-4 w-4 shrink-0" />
          <span className="truncate">{isCounterMode ? 'Entrada' : 'Autorizar entrada'}</span>
        </Button>
        <Button
          size={isCounterMode ? 'sm' : 'sm'}
          variant="secondary"
          className={cn(isCounterMode && COUNTER_ACTION, isCounterMode && 'sm:min-h-[52px]')}
          disabled={actionLoading || !lookup?.can_check_out}
          onClick={() => void handleAction('check-out')}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="truncate">{isCounterMode ? 'Salida' : 'Registrar salida'}</span>
        </Button>
      </div>
    </Card>
  );

  const memberPanel = (
    <Card padding="md" rounded="xl" className={cn(isCounterMode && 'min-h-0')}>
      {lookupLoading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner />
        </div>
      ) : lookup?.found && lookup.user ? (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                className={cn(
                  'font-bold text-zinc-900 dark:text-white',
                  isCounterMode ? 'text-base' : 'text-lg'
                )}
              >
                {lookup.user.full_name}
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{lookup.user.cedula}</p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-300">{lookup.user.email}</p>
            </div>
            {accessBadge()}
          </div>

          {lookup.subscription ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {lookup.subscription.membership_name}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Vence{' '}
                {format(new Date(lookup.subscription.end_date), 'dd MMM yyyy', { locale: es })}
                {' · '}
                {lookup.subscription.days_remaining} días restantes
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
              <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" />
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                Sin membresía activa — asigne un plan o apruebe un pago
              </p>
            </div>
          )}

          {lookup.attendance?.today_session && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Ingreso hoy:{' '}
              {format(new Date(lookup.attendance.today_session.check_in_time), 'HH:mm', {
                locale: es,
              })}
              {lookup.attendance.today_session.check_out_time &&
                ` · Salida: ${format(new Date(lookup.attendance.today_session.check_out_time), 'HH:mm', { locale: es })}`}
            </p>
          )}
        </div>
      ) : lookup && !lookup.found ? (
        <div className="space-y-3 py-8 text-center">
          <XCircle className="mx-auto h-10 w-10 text-red-400" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{lookup.error}</p>
          <Link to="/members">
            <Button variant="secondary" size="sm">
              <UserPlus className="mr-2 h-4 w-4" />
              Registrar nuevo miembro
            </Button>
          </Link>
        </div>
      ) : (
        <div className="py-4 text-center text-zinc-400 sm:py-5 dark:text-zinc-300">
          <Fingerprint className="mx-auto mb-1.5 h-6 w-6 opacity-30 sm:h-7 sm:w-7" />
          <p className="label-caps text-[11px] font-medium">Ingrese una cédula para consultar</p>
        </div>
      )}
    </Card>
  );

  const insideList = (
    <Card padding="md" rounded="xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="section-title">Dentro del gym ({insideCount})</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 px-0"
          onClick={() => void loadStats()}
          aria-label="Actualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {tab === 'inside' && message && <div className="mb-3">{actionMessageBanner}</div>}
      <div className={cn('scroll-area space-y-2', isCounterMode ? 'max-h-56' : 'max-h-72')}>
        {inside.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                {m.full_name}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{m.cedula || 'Sin cédula'}</p>
            </div>
            <p className="shrink-0 text-xs font-medium text-emerald-600">
              {format(new Date(m.check_in_time), 'HH:mm', { locale: es })}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 shrink-0 px-2.5 text-xs"
              disabled={!m.cedula || actionLoading}
              loading={checkingOutCedula === m.cedula?.trim()}
              onClick={() => requestCheckout(m)}
              title={m.cedula ? 'Registrar salida' : 'Sin cédula registrada'}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Salida</span>
            </Button>
          </div>
        ))}
        {inside.length === 0 && (
          <p className="py-6 text-center text-sm text-zinc-400 dark:text-zinc-300">
            Nadie dentro en este momento
          </p>
        )}
      </div>
    </Card>
  );

  const checkoutConfirmModal = (
    <Modal
      open={checkoutConfirm != null}
      onClose={() => setCheckoutConfirm(null)}
      title="¿Registrar salida?"
      maxWidth="sm"
    >
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Se registrará la salida de{' '}
        <strong className="text-zinc-900 dark:text-white">{checkoutConfirm?.name}</strong> del gym.
      </p>
      <div className="flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={() => setCheckoutConfirm(null)}>
          Cancelar
        </Button>
        <Button className="flex-1" onClick={() => void confirmCheckout()} loading={actionLoading}>
          Registrar salida
        </Button>
      </div>
    </Modal>
  );

  if (isCounterMode) {
    const showMemberPanel = lookupLoading || lookup != null;

    return (
      <div className="page-stack">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="bg-brand/10 text-brand shrink-0 rounded-lg p-1.5">
              <Monitor className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-zinc-900 sm:text-lg dark:text-white">
                Modo mostrador
              </h1>
              <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                <span className="lg:hidden">{insideCount} dentro</span>
                <span className="hidden lg:inline">
                  {insideCount} dentro · F1 entrada · F2 salida
                </span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setCounterMode(false)}
              title="Volver al resumen"
              aria-label="Volver al resumen"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Link to="/check-in?kiosk=1" className="hidden sm:inline-flex">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                title="Modo tablet"
                aria-label="Modo tablet"
              >
                <Tablet className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2.5"
              onClick={() => setCounterMode(false)}
              title="Salir del modo mostrador"
            >
              <X className="h-4 w-4" />
              <span className="hidden text-xs sm:inline">Salir</span>
            </Button>
          </div>
        </div>

        <div className="panel-wide space-y-4">
          <SegmentedControl
            variant="compact"
            value={tab}
            onChange={(v) => changeTab(v)}
            options={[
              { value: 'access', label: 'Acceso', icon: Fingerprint },
              { value: 'inside', label: 'Dentro ahora', icon: Users, count: insideCount },
              { value: 'register', label: 'Registro', icon: UserPlus },
            ]}
          />

          {tab === 'access' && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-5 lg:gap-4">
              <div className="space-y-3 lg:col-span-3 lg:space-y-4">
                {lookupPanel}
                {showMemberPanel && memberPanel}
              </div>
              <aside className="hidden space-y-4 lg:col-span-2 lg:block">
                {insideList}
                <Card padding="md" rounded="xl">
                  <h3 className="section-title mb-2">Actividad reciente</h3>
                  <ReceptionActivityFeed limit={5} compact refreshKey={feedRefresh} />
                </Card>
              </aside>
            </div>
          )}

          {tab === 'inside' && insideList}

          {tab === 'register' && (
            <div className="pb-4">
              <ReceptionWalkInWizard onComplete={() => void loadStats()} />
            </div>
          )}
        </div>
        {checkoutConfirmModal}
      </div>
    );
  }

  return (
    <div className="page-stack">
      <ReceptionHomeSummary onOpenCounter={() => setCounterMode(true)} />

      <div className="panel-wide hidden space-y-4 lg:block">
        <PageHeader
          compact
          title={
            <>
              Control de <span className="text-brand">acceso</span>
            </>
          }
          subtitle="Busque por cédula para autorizar entrada y salida"
        />

        <SegmentedControl
          variant="compact"
          value={tab}
          onChange={(v) => changeTab(v)}
          options={[
            { value: 'access', label: 'Entrada / Salida', icon: Fingerprint },
            { value: 'inside', label: 'Dentro ahora', icon: Users, count: insideCount },
            { value: 'register', label: 'Registro', icon: UserPlus },
          ]}
        />

        {tab === 'access' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {lookupPanel}
            {memberPanel}
          </div>
        )}

        {tab === 'inside' && insideList}

        {tab === 'register' && <ReceptionWalkInWizard onComplete={() => void loadStats()} />}
      </div>
      {checkoutConfirmModal}
    </div>
  );
}
