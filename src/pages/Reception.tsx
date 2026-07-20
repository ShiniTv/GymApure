import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import {
  LogIn,
  LogOut,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  X,
  Tablet,
  Pencil,
  KeyRound,
  CreditCard,
  UserPlus,
} from 'lucide-react';
import { apiFetch, parseJsonResponse, parseJsonSafe, connectionOrApiError } from '../lib/api';
import { Button, Card, Badge, Spinner, CedulaInput, Label } from '../components/ui';
import { cn } from '../lib/utils';
import { validateCedula } from '../lib/cedulaUtils';
import { useReceptionShortcuts } from '../hooks/useReceptionShortcuts';
import ReceptionWalkInWizard from './reception/ReceptionWalkInWizard';
import ReceptionActivityFeed from '../components/reception/ReceptionActivityFeed';
import ReceptionRenewPayWizard from '../components/reception/ReceptionRenewPayWizard';
import { ReceptionGuestPasses } from '../components/reception/ReceptionGuestPasses';
import { ReceptionHomeSummary } from '../components/reception/ReceptionHomeSummary';
import { CounterTabNav } from './reception/CounterTabNav';
import { COUNTER_ACTION, COUNTER_FIELD, COUNTER_SEARCH_BTN } from './reception/counterConstants';
import { ReceptionCounterModals } from './reception/ReceptionCounterModals';
import { ReceptionInsideList } from './reception/ReceptionInsideList';
import type {
  AttendanceActionResult,
  InsideMember,
  LookupResult,
  ReceptionTab,
} from './reception/types';
import { usePageTitle } from '../hooks/usePageTitle';
import { useMediaQuery } from '../lib/useMediaQuery';
import { useAuth } from '../context/AuthContext';
import { OnboardingStatus } from '../components/members/OnboardingStatus';

export default function Reception() {
  usePageTitle('Recepción');
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isCounterMode = searchParams.get('mode') === 'counter';
  const tabParam = searchParams.get('tab');
  const initialTab: ReceptionTab =
    tabParam === 'inside' ||
    tabParam === 'register' ||
    tabParam === 'renew' ||
    tabParam === 'guests'
      ? tabParam
      : 'access';

  const [tab, setTab] = useState<ReceptionTab>(initialTab);
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
  const [cedulaEditOpen, setCedulaEditOpen] = useState(false);
  const [cedulaEditValue, setCedulaEditValue] = useState('');
  const [cedulaEditError, setCedulaEditError] = useState('');
  const [cedulaEditSaving, setCedulaEditSaving] = useState(false);
  const [checkInPin, setCheckInPin] = useState<{
    pin: string;
    required: boolean;
    configured: boolean;
  } | null>(null);
  const [renewPrefill, setRenewPrefill] = useState<{
    id: number;
    full_name: string;
    cedula: string | null;
  } | null>(null);
  const cedulaRef = useRef<HTMLInputElement>(null);
  const isMobileShell = useMediaQuery('(max-width: 1023px)');

  // Mobile defaults to counter (or last saved mode); desktop stays on summary home.
  useEffect(() => {
    if (!isMobileShell) return;
    if (searchParams.has('mode')) return;
    let preferCounter = true;
    try {
      const saved = localStorage.getItem('gymapure_reception_mode');
      if (saved === 'summary') preferCounter = false;
      if (saved === 'counter') preferCounter = true;
    } catch {
      /* ignore */
    }
    if (preferCounter) {
      const next = new URLSearchParams(searchParams);
      next.set('mode', 'counter');
      setSearchParams(next, { replace: true });
    }
  }, [isMobileShell, searchParams, setSearchParams]);

  useEffect(() => {
    void apiFetch('/api/settings/check-in-pin')
      .then((res) =>
        parseJsonResponse<{
          check_in_pin?: string;
          require_self_check_in_pin?: boolean;
          pin_configured?: boolean;
        }>(res)
      )
      .then((data) => {
        setCheckInPin({
          pin: data.check_in_pin ?? '',
          required: Boolean(data.require_self_check_in_pin),
          configured: Boolean(data.pin_configured ?? data.check_in_pin),
        });
      })
      .catch(() => {
        setCheckInPin(null);
      });
  }, []);

  const setCounterMode = (enabled: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (enabled) {
      next.set('mode', 'counter');
    } else {
      next.delete('mode');
    }
    setSearchParams(next, { replace: true });
    try {
      localStorage.setItem('gymapure_reception_mode', enabled ? 'counter' : 'summary');
    } catch {
      /* ignore */
    }
  };

  const changeTab = (next: ReceptionTab) => {
    setTab(next);
    if (next !== 'renew') setRenewPrefill(null);
    const params = new URLSearchParams(searchParams);
    if (next === 'access') {
      params.delete('tab');
    } else {
      params.set('tab', next);
    }
    setSearchParams(params, { replace: true });
  };

  const openRenewForLookup = () => {
    if (!lookup?.user) return;
    setRenewPrefill({
      id: lookup.user.id,
      full_name: lookup.user.full_name,
      cedula: lookup.user.cedula,
    });
    changeTab('renew');
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

  const openCedulaEdit = () => {
    if (!lookup?.user) return;
    setCedulaEditValue(lookup.user.cedula ?? '');
    setCedulaEditError('');
    setCedulaEditOpen(true);
  };

  const saveCedulaEdit = async () => {
    if (!lookup?.user) return;
    const err = validateCedula(cedulaEditValue);
    if (err) {
      setCedulaEditError(err);
      return;
    }
    setCedulaEditSaving(true);
    setCedulaEditError('');
    try {
      const res = await apiFetch(`/api/users/${lookup.user.id}/cedula`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: cedulaEditValue }),
      });
      const updated = await parseJsonResponse<{ cedula: string }>(res);
      setLookup((prev) =>
        prev?.user
          ? {
              ...prev,
              user: { ...prev.user, cedula: updated.cedula },
            }
          : prev
      );
      setCedulaEditOpen(false);
      setMessage('Cédula actualizada');
      setMessageType('success');
    } catch (e) {
      setCedulaEditError(e instanceof Error ? e.message : 'No se pudo actualizar la cédula');
    } finally {
      setCedulaEditSaving(false);
    }
  };

  const walkInHref = (prefillCedula?: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('mode', 'counter');
    params.set('tab', 'register');
    if (prefillCedula?.trim()) {
      params.set('cedula', prefillCedula.trim().toUpperCase());
    }
    return `/reception?${params.toString()}`;
  };

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
        const data = await parseJsonSafe<LookupResult>(res);
        if (res.ok && data?.found) {
          setLookup(data);
        } else {
          setLookup({
            found: false,
            error: data?.error || (res.ok ? 'Usuario no encontrado' : `Error HTTP ${res.status}`),
          });
        }
      } catch (err) {
        setLookup({ found: false, error: connectionOrApiError(err, 'Error al buscar') });
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
          if (action === 'check-in' && !data.already_checked_in) {
            setInsideCount((c) => c + 1);
          } else if (action === 'check-out' && !data.already_checked_out) {
            setInsideCount((c) => Math.max(0, c - 1));
            setInside((prev) => prev.filter((m) => m.cedula?.toUpperCase() !== q.toUpperCase()));
          }
          if (options?.clearInput) {
            setCedula('');
            setLookup(null);
            setTimeout(() => cedulaRef.current?.focus(), 100);
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
    [formatAttendanceMessage, loadStats, lookup?.user?.cedula, doLookup]
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
    if (lookup.access_status === 'paused') {
      return <Badge variant="warning">Membresía pausada</Badge>;
    }
    if (lookup.access_status === 'no_subscription') {
      return <Badge variant="warning">Sin membresía activa</Badge>;
    }
    if (lookup.attendance?.is_inside) {
      return <Badge variant="success">Dentro del gym</Badge>;
    }
    return <Badge variant="accent">Puede ingresar</Badge>;
  };

  const handleResumeMembership = useCallback(async () => {
    if (!lookup?.user?.id || actionLoading) return;
    setActionLoading(true);
    setMessage('');
    try {
      await parseJsonResponse(
        await apiFetch('/api/memberships/resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: lookup.user.id }),
        })
      );
      setMessageType('success');
      setMessage('Membresía reanudada');
      await doLookup(lookup.user.cedula ?? cedula, { preserveMessage: true });
      void loadStats();
    } catch (err) {
      setMessageType('error');
      setMessage(err instanceof Error ? err.message : 'No se pudo reanudar la membresía');
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, cedula, doLookup, loadStats, lookup]);

  const pinBanner =
    checkInPin?.configured && checkInPin.pin ? (
      <div
        className={cn(
          'border-brand/20 bg-brand/5 flex items-center gap-2.5 rounded-xl border px-3 py-2',
          !isCounterMode && 'px-4 py-3'
        )}
      >
        <KeyRound className="text-brand h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            PIN del día
          </p>
          <p className="font-mono text-lg font-bold tracking-[0.18em] text-zinc-900 dark:text-white">
            {checkInPin.pin}
          </p>
        </div>
        {user?.role === 'admin' ? (
          <Link
            to="/settings"
            className="shrink-0 text-[11px] font-semibold text-zinc-500 underline"
          >
            Cambiar
          </Link>
        ) : (
          <span className="shrink-0 text-[10px] text-zinc-400">Solo admin</span>
        )}
      </div>
    ) : checkInPin && !checkInPin.configured ? (
      <p className="px-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        Sin PIN de presencia.
        {user?.role === 'admin' ? (
          <>
            {' '}
            <Link to="/settings" className="font-semibold underline">
              Configurar en Ajustes
            </Link>
          </>
        ) : (
          ' Pide a un admin configurarlo.'
        )}
      </p>
    ) : null;

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
    <div
      className={cn(
        'space-y-3 rounded-xl border border-zinc-200/70 bg-white/80 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/50',
        !isCounterMode && 'border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900'
      )}
    >
      <div className="space-y-2">
        <Label htmlFor="reception-cedula" className="text-xs font-medium text-zinc-500">
          Cédula
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
            variant={isCounterMode ? 'ghost' : undefined}
            onClick={() => void doLookup()}
            loading={lookupLoading}
            disabled={!cedula.trim()}
            size="md"
            aria-label="Buscar"
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
          size="sm"
          className={cn(isCounterMode && COUNTER_ACTION, isCounterMode && 'sm:min-h-[52px]')}
          disabled={actionLoading || !lookup?.can_check_in}
          onClick={() => void handleAction('check-in')}
        >
          <LogIn className="h-4 w-4 shrink-0" />
          <span className="truncate">{isCounterMode ? 'Entrada' : 'Autorizar entrada'}</span>
        </Button>
        <Button
          size="sm"
          variant={isCounterMode ? 'ghost' : 'secondary'}
          className={cn(isCounterMode && COUNTER_ACTION, isCounterMode && 'sm:min-h-[52px]')}
          disabled={actionLoading || !lookup?.can_check_out}
          onClick={() => void handleAction('check-out')}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="truncate">{isCounterMode ? 'Salida' : 'Registrar salida'}</span>
        </Button>
      </div>
    </div>
  );

  const memberPanel = (
    <div
      className={cn(
        'rounded-xl border border-zinc-200/70 bg-white/80 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/50',
        !isCounterMode && 'border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900'
      )}
    >
      {lookupLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : lookup?.found && lookup.user ? (
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                className={cn(
                  'font-semibold text-zinc-900 dark:text-white',
                  isCounterMode ? 'text-sm' : 'text-lg font-bold'
                )}
              >
                {lookup.user.full_name}
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                {lookup.user.cedula}
                {!isCounterMode && lookup.user.email ? ` · ${lookup.user.email}` : ''}
              </p>
              {!isCounterMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-8 px-2 text-xs"
                  onClick={openCedulaEdit}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Corregir cédula
                </Button>
              )}
            </div>
            {accessBadge()}
          </div>

          {lookup.subscription?.status === 'paused' ? (
            <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    {lookup.subscription.membership_name} — pausada
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {lookup.subscription.days_remaining} día
                    {lookup.subscription.days_remaining !== 1 ? 's' : ''} congelados.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                loading={actionLoading}
                onClick={() => void handleResumeMembership()}
              >
                Reanudar membresía
              </Button>
            </div>
          ) : lookup.subscription ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-2.5 py-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {lookup.subscription.membership_name}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {lookup.subscription.days_remaining} días · vence{' '}
                  {lookup.subscription.end_date
                    ? format(new Date(lookup.subscription.end_date), 'dd MMM yyyy', { locale: es })
                    : '—'}
                </p>
              </div>
              {lookup.subscription.days_remaining <= 7 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={openRenewForLookup}
                >
                  <CreditCard className="mr-1 h-3.5 w-3.5" />
                  Renovar
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
                <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
                  Sin membresía activa
                </p>
              </div>
              {lookup.user && (
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs"
                    onClick={openRenewForLookup}
                  >
                    <CreditCard className="mr-1 h-3.5 w-3.5" />
                    Renovar
                  </Button>
                  <Link
                    to={`/payments?register=1&memberId=${lookup.user.id}`}
                    className="inline-flex"
                  >
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs">
                      Pago
                    </Button>
                  </Link>
                  <Link to={`/members?assignUserId=${lookup.user.id}`} className="inline-flex">
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs">
                      Asignar plan
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          <OnboardingStatus onboarding={lookup.onboarding} variant="chip" />

          {isCounterMode && (
            <button
              type="button"
              onClick={openCedulaEdit}
              className="text-[11px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Corregir cédula
            </button>
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
        <div className="space-y-2.5 py-4 text-center">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{lookup.error}</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            <Link to={walkInHref(cedula)}>
              <Button size="sm" className="h-9 px-3 text-xs">
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Registrar
              </Button>
            </Link>
            <Link to="/members">
              <Button variant="ghost" size="sm" className="h-9 px-3 text-xs">
                Solo cuenta
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="py-3 text-center text-zinc-400 dark:text-zinc-500">
          <p className="text-[11px] font-medium">Ingresa una cédula para consultar</p>
        </div>
      )}
    </div>
  );

  const insideList = (
    <ReceptionInsideList
      inside={inside}
      insideCount={insideCount}
      tab={tab}
      isCounterMode={isCounterMode}
      actionLoading={actionLoading}
      checkingOutCedula={checkingOutCedula}
      messageBanner={message ? actionMessageBanner : null}
      onRefresh={() => void loadStats()}
      onRequestCheckout={requestCheckout}
    />
  );

  const counterModals = (
    <ReceptionCounterModals
      checkoutConfirm={checkoutConfirm}
      onCloseCheckout={() => setCheckoutConfirm(null)}
      onConfirmCheckout={() => void confirmCheckout()}
      actionLoading={actionLoading}
      cedulaEditOpen={cedulaEditOpen}
      onCloseCedulaEdit={() => setCedulaEditOpen(false)}
      cedulaEditValue={cedulaEditValue}
      onCedulaEditValueChange={setCedulaEditValue}
      cedulaEditError={cedulaEditError}
      onClearCedulaEditError={() => setCedulaEditError('')}
      cedulaEditSaving={cedulaEditSaving}
      onSaveCedulaEdit={() => void saveCedulaEdit()}
    />
  );

  if (isCounterMode) {
    const showMemberPanel = lookupLoading || lookup != null;

    return (
      <div className="page-stack-tight">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-zinc-900 dark:text-white">
              Acceso
            </h1>
            <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="lg:hidden">{insideCount} dentro</span>
              <span className="hidden lg:inline">
                {insideCount} dentro · F1 entrada · F2 salida
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
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
              className="h-9 w-9 p-0"
              onClick={() => setCounterMode(false)}
              title="Salir del mostrador"
              aria-label="Salir del mostrador"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="panel-wide space-y-3">
          <CounterTabNav tab={tab} insideCount={insideCount} onChange={changeTab} />

          {tab === 'access' && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5 md:gap-4">
              <div className="space-y-2.5 md:col-span-3">
                {pinBanner}
                {lookupPanel}
                {showMemberPanel && memberPanel}
              </div>
              <aside className="hidden space-y-4 md:col-span-2 md:block">
                {insideList}
                <Card
                  padding="md"
                  rounded="xl"
                  className="border-zinc-200/70 dark:border-zinc-800/80"
                >
                  <h3 className="section-title mb-2">Actividad reciente</h3>
                  <ReceptionActivityFeed limit={5} compact refreshKey={feedRefresh} />
                </Card>
              </aside>
            </div>
          )}

          {tab === 'inside' && insideList}

          {tab === 'register' && (
            <div className="pb-4">
              <ReceptionWalkInWizard
                initialCedula={searchParams.get('cedula') ?? undefined}
                onComplete={() => void loadStats()}
              />
            </div>
          )}
          {tab === 'renew' && (
            <ReceptionRenewPayWizard
              key={renewPrefill?.id ?? 'renew'}
              initialMember={renewPrefill}
              onComplete={() => void loadStats()}
            />
          )}
          {tab === 'guests' && <ReceptionGuestPasses />}
        </div>
        {counterModals}
      </div>
    );
  }

  return (
    <div className="page-stack">
      <ReceptionHomeSummary onOpenCounter={() => setCounterMode(true)} />
      {counterModals}
    </div>
  );
}
