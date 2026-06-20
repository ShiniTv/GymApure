import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
  X,
  LayoutDashboard,
} from 'lucide-react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { Button, Card, Input, PageHeader, Badge, Spinner, SegmentedControl } from '../components/ui';
import { cn } from '../lib/utils';
import { useReceptionShortcuts } from '../hooks/useReceptionShortcuts';
import ReceptionWalkInWizard from './reception/ReceptionWalkInWizard';
import ReceptionActivityFeed from '../components/reception/ReceptionActivityFeed';

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

export default function Reception() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isCounterMode = searchParams.get('mode') === 'counter';
  const tabParam = searchParams.get('tab');
  const initialTab: Tab =
    tabParam === 'inside' || tabParam === 'register' ? tabParam : 'access';

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
  const cedulaRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (tab === 'access') {
      cedulaRef.current?.focus();
    }
  }, [tab]);

  const doLookup = useCallback(async (value?: string) => {
    const q = (value ?? cedula).trim();
    if (!q) return;

    setLookupLoading(true);
    setMessage('');
    setMessageType('');
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
  }, [cedula]);

  const handleAction = useCallback(async (action: 'check-in' | 'check-out') => {
    const q = cedula.trim();
    if (!q) return;

    setActionLoading(true);
    setMessage('');
    try {
      const res = await apiFetch(`/api/reception/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: q }),
      });
      const data = await parseJsonResponse<{
        error?: string;
        user_name?: string;
        message?: string;
        already_checked_in?: boolean;
        already_checked_out?: boolean;
        duration_label?: string;
      }>(res);

      if (res.ok) {
        setMessageType('success');
        setMessage(
          data.message ||
            (action === 'check-in'
              ? data.already_checked_in
                ? `${data.user_name}: ya tiene ingreso activo`
                : `Entrada autorizada: ${data.user_name}`
              : data.already_checked_out
                ? `${data.user_name}: ya registró salida`
                : `Salida registrada: ${data.user_name}${data.duration_label ? ` (${data.duration_label})` : ''}`)
        );
        setCedula('');
        setLookup(null);
        void loadStats();
        setTimeout(() => cedulaRef.current?.focus(), 100);
      } else {
        setMessageType('error');
        setMessage(data.error || 'Operación fallida');
      }
    } catch {
      setMessageType('error');
      setMessage('Error de red');
    } finally {
      setActionLoading(false);
    }
  }, [cedula, loadStats]);

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

  const lookupPanel = (
    <Card padding="lg" rounded="2xl" className="space-y-6">
      <div className="space-y-4">
        <label className="label-caps">Cédula del visitante</label>
        <div className="flex gap-3">
          <Input
            ref={cedulaRef}
            value={cedula}
            onChange={(e) => setCedula(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && void doLookup()}
            placeholder="V-12345678"
            className={cn(
              'min-h-[52px] text-lg font-semibold tracking-wider',
              isCounterMode && 'min-h-[60px] text-xl'
            )}
            autoComplete="off"
            autoCapitalize="characters"
          />
          <Button
            onClick={() => void doLookup()}
            disabled={lookupLoading || !cedula.trim()}
            className={cn('min-h-[52px] min-w-[52px] px-4', isCounterMode && 'min-h-[60px] min-w-[60px]')}
          >
            {lookupLoading ? <Spinner className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>
        </div>
        {isCounterMode && (
          <p className="text-xs text-zinc-400">
            Atajos: <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px]">Enter</kbd> buscar ·{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px]">F1</kbd> entrada ·{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px]">F2</kbd> salida
          </p>
        )}
      </div>

      {message && (
        <div
          className={cn(
            'rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2',
            messageType === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
          )}
        >
          {messageType === 'success' ? <CheckCircle className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Button
          size="lg"
          className={cn('min-h-[56px] text-base', isCounterMode && 'min-h-[64px] text-lg')}
          disabled={actionLoading || !lookup?.can_check_in}
          onClick={() => void handleAction('check-in')}
        >
          <LogIn className="h-5 w-5 mr-2" />
          Autorizar entrada
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className={cn('min-h-[56px] text-base', isCounterMode && 'min-h-[64px] text-lg')}
          disabled={actionLoading || !lookup?.can_check_out}
          onClick={() => void handleAction('check-out')}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Registrar salida
        </Button>
      </div>
    </Card>
  );

  const memberPanel = (
    <Card padding="lg" rounded="2xl">
      {lookupLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Spinner />
        </div>
      ) : lookup?.found && lookup.user ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{lookup.user.full_name}</h3>
              <p className="text-sm text-zinc-500 mt-1">{lookup.user.cedula}</p>
              <p className="text-xs text-zinc-400 mt-1">{lookup.user.email}</p>
            </div>
            {accessBadge()}
          </div>

          {lookup.subscription ? (
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {lookup.subscription.membership_name}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Vence {format(new Date(lookup.subscription.end_date), 'dd MMM yyyy', { locale: es })}
                {' · '}{lookup.subscription.days_remaining} días restantes
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 p-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                Sin membresía activa — asigne un plan o apruebe un pago
              </p>
            </div>
          )}

          {lookup.attendance?.today_session && (
            <p className="text-xs text-zinc-500">
              Ingreso hoy:{' '}
              {format(new Date(lookup.attendance.today_session.check_in_time), 'HH:mm', { locale: es })}
              {lookup.attendance.today_session.check_out_time &&
                ` · Salida: ${format(new Date(lookup.attendance.today_session.check_out_time), 'HH:mm', { locale: es })}`}
            </p>
          )}
        </div>
      ) : lookup && !lookup.found ? (
        <div className="text-center py-12 space-y-4">
          <XCircle className="h-12 w-12 text-red-400 mx-auto" />
          <p className="font-medium text-zinc-600 dark:text-zinc-400">{lookup.error}</p>
          <Link to="/members">
            <Button variant="secondary">
              <UserPlus className="h-4 w-4 mr-2" />
              Registrar nuevo miembro
            </Button>
          </Link>
        </div>
      ) : (
        <div className="text-center py-12 text-zinc-400">
          <Fingerprint className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="font-medium text-sm label-caps">Ingrese una cédula para consultar</p>
        </div>
      )}
    </Card>
  );

  const insideList = (
    <Card padding="lg" rounded="2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">Dentro del gym ({insideCount})</h3>
        <Button variant="ghost" size="sm" onClick={() => void loadStats()}>
          Actualizar
        </Button>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {inside.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800"
          >
            <div className="min-w-0">
              <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">{m.full_name}</p>
              <p className="text-xs text-zinc-500">{m.cedula || 'Sin cédula'}</p>
            </div>
            <p className="text-xs font-medium text-emerald-600 shrink-0 ml-2">
              {format(new Date(m.check_in_time), 'HH:mm', { locale: es })}
            </p>
          </div>
        ))}
        {inside.length === 0 && (
          <p className="text-center text-zinc-400 py-6 text-sm">Nadie dentro en este momento</p>
        )}
      </div>
    </Card>
  );

  if (isCounterMode) {
    return (
      <div className="space-y-4 -mx-2 lg:-mx-4">
        <div className="flex items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
              <Monitor className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white truncate">Modo mostrador</h1>
              <p className="text-xs text-zinc-500">{insideCount} personas dentro · F1 entrada · F2 salida</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/">
              <Button variant="ghost" size="sm" title="Ir al dashboard">
                <LayoutDashboard className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => setCounterMode(false)} title="Salir del modo mostrador">
              <X className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>

        <SegmentedControl
          value={tab}
          onChange={(v) => changeTab(v as Tab)}
          options={[
            { value: 'access', label: 'Acceso', icon: Fingerprint },
            { value: 'inside', label: `Dentro (${insideCount})`, icon: Users },
            { value: 'register', label: 'Registro', icon: UserPlus },
          ]}
        />

        {tab === 'access' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 px-2">
            <div className="xl:col-span-2 space-y-4">
              {lookupPanel}
              {memberPanel}
            </div>
            <div className="space-y-4">
              {insideList}
              <Card padding="lg" rounded="2xl">
                <h3 className="section-title mb-3">Actividad reciente</h3>
                <ReceptionActivityFeed limit={6} compact refreshKey={feedRefresh} />
              </Card>
            </div>
          </div>
        )}

        {tab === 'inside' && <div className="px-2">{insideList}</div>}
        {tab === 'register' && (
          <div className="px-2">
            <ReceptionWalkInWizard onComplete={() => void loadStats()} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={<>Control de <span className="text-orange-500">acceso</span></>}
        subtitle="Busque por cédula para autorizar entrada y salida"
        badge={`${insideCount} dentro ahora`}
        action={
          <Button onClick={() => setCounterMode(true)}>
            <Monitor className="h-4 w-4 mr-2" />
            Modo mostrador
          </Button>
        }
      />

      <SegmentedControl
        value={tab}
        onChange={(v) => changeTab(v as Tab)}
        options={[
          { value: 'access', label: 'Entrada / Salida', icon: Fingerprint },
          { value: 'inside', label: 'Dentro ahora', icon: Users },
          { value: 'register', label: 'Registro', icon: UserPlus },
        ]}
        className="max-w-xl"
      />

      {tab === 'access' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {lookupPanel}
          {memberPanel}
        </div>
      )}

      {tab === 'inside' && insideList}

      {tab === 'register' && (
        <ReceptionWalkInWizard onComplete={() => void loadStats()} />
      )}
    </div>
  );
}
