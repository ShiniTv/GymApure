import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, parseJsonResponse } from '../lib/api';
import {
  Fingerprint,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  MessageSquare,
  Phone,
} from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import {
  Badge,
  Card,
  PageHeader,
  Spinner,
  StatCard,
  BackToDashboardLink,
  EmptyState,
  SearchInput,
  FilterChips,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useAdminStatsOptional } from '../context/AdminStatsContext';
import { expiryBannerClasses, formatExpiryLabel, getExpirySeverity } from '../lib/expiryUtils';
import { cn } from '../lib/utils';
import { clientLogger } from '../lib/clientLogger';
import ReceptionActivityFeed from '../components/reception/ReceptionActivityFeed';

const DailyVolumeChart = lazy(() =>
  import('../components/AttendanceCharts').then((m) => ({ default: m.DailyVolumeChart }))
);
const HourlyVolumeChart = lazy(() =>
  import('../components/AttendanceCharts').then((m) => ({ default: m.HourlyVolumeChart }))
);

interface DailyVolumePoint {
  date: string;
  count: number;
}

interface HourlyVolumePoint {
  hour: number;
  count: number;
}

interface InactiveMember {
  id: number;
  full_name: string;
  cedula: string | null;
  email: string;
  phone: string | null;
  last_check_in: string | null;
  days_since: number | null;
}

function whatsappHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const withCountry = digits.length === 10 ? `58${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}

export default function Attendance() {
  const { user } = useAuth();
  const adminStats = useAdminStatsOptional();
  const [data, setData] = useState<DailyVolumePoint[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyVolumePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [inactiveDays, setInactiveDays] = useState('14');
  const [inactiveMembers, setInactiveMembers] = useState<InactiveMember[]>([]);
  const [inactiveLoading, setInactiveLoading] = useState(false);

  const expiring = adminStats?.stats?.expiringList ?? [];
  const lastDoorAlert = adminStats?.stats?.lastDoorAlert ?? null;
  const alertDays = adminStats?.stats?.expiryAlertDays ?? 7;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);
    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  useEffect(() => {
    const load = async () => {
      try {
        const [volume, hourly] = await Promise.all([
          apiFetch('/api/attendance/volume').then((res) =>
            parseJsonResponse<{ date: string; count: number }[]>(res)
          ),
          apiFetch('/api/attendance/hourly').then((res) =>
            parseJsonResponse<{ hour: number; count: number }[]>(res)
          ),
        ]);
        setData(Array.isArray(volume) ? volume : []);
        setHourlyData(Array.isArray(hourly) ? hourly : []);
      } catch (err) {
        clientLogger.error('Failed to load attendance analytics', err);
        setData([]);
        setHourlyData([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    setInactiveLoading(true);
    void apiFetch(`/api/attendance/inactive?days=${inactiveDays}`)
      .then((res) => parseJsonResponse<{ days: number; members: InactiveMember[] }>(res))
      .then((payload) => {
        setInactiveMembers(Array.isArray(payload.members) ? payload.members : []);
      })
      .catch((err) => {
        clientLogger.error('Failed to load inactive members', err);
        setInactiveMembers([]);
      })
      .finally(() => setInactiveLoading(false));
  }, [inactiveDays, isAdmin]);

  const totalEntries = data.reduce((sum, item) => sum + item.count, 0);
  const avgEntries = data.length > 0 ? (totalEntries / data.length).toFixed(1) : 0;

  return (
    <div className="page-stack-tight mx-auto w-full max-w-5xl">
      <PageHeader
        compact
        title={<>Asistencias</>}
        subtitle="Entradas de hoy, volumen, horas pico y membresías por vencer"
        action={user?.role === 'admin' ? <BackToDashboardLink /> : undefined}
      />

      <Card padding="sm" rounded="xl" className="md:p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
            <Fingerprint className="text-brand h-4 w-4 shrink-0" />
            Entradas y salidas de hoy
          </h3>
          <SearchInput
            containerClassName="w-full sm:max-w-xs"
            placeholder="Buscar por nombre o cédula…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Buscar asistencia de hoy"
          />
        </div>
        <ReceptionActivityFeed limit={0} search={search} />
      </Card>

      {isAdmin && (
        <Card padding="sm" rounded="xl" className="md:p-4">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
              <Users className="h-4 w-4 shrink-0 text-amber-500" />
              Miembros inactivos
            </h3>
            <FilterChips
              className="sm:w-auto"
              options={[
                { value: '7', label: '7d' },
                { value: '14', label: '14d' },
                { value: '30', label: '30d' },
              ]}
              value={inactiveDays}
              onChange={setInactiveDays}
            />
          </div>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            Sin check-in en los últimos {inactiveDays} días (o nunca).
          </p>
          <div className="space-y-2">
            {inactiveLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : inactiveMembers.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Nadie inactivo en este periodo.
              </p>
            ) : (
              inactiveMembers.map((member) => {
                const wa = whatsappHref(member.phone);
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <Link
                      to={`/members?q=${encodeURIComponent(member.full_name)}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                        {member.full_name}
                      </p>
                      <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                        {member.cedula ?? member.email}
                        {member.last_check_in
                          ? ` · último ${format(new Date(member.last_check_in), 'dd MMM yyyy', { locale: es })}`
                          : ' · sin check-ins'}
                      </p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge variant="warning" className="text-[10px]">
                        {member.days_since == null ? 'Nunca' : `${member.days_since}d`}
                      </Badge>
                      <Link
                        to={`/messages?member=${member.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        title="Enviar mensaje"
                        aria-label={`Mensaje a ${member.full_name}`}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Link>
                      {wa ? (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                          title="WhatsApp"
                          aria-label={`WhatsApp a ${member.full_name}`}
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-6">
        <StatCard compact title="7d" value={totalEntries} icon={Fingerprint} color="orange" />
        <StatCard compact title="Promedio" value={avgEntries} icon={TrendingUp} color="blue" />
        <StatCard
          compact
          title="Pico"
          value={data.length > 0 ? Math.max(...data.map((d) => d.count)) : 0}
          icon={Users}
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-6">
        <Card padding="sm" rounded="xl" className="md:p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-900 sm:mb-5 sm:text-base dark:text-white">
            <Calendar className="text-brand h-4 w-4 shrink-0" />
            Volumen diario (7d)
          </h3>
          <div className="h-44 sm:h-56 lg:h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner />
              </div>
            ) : data.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Sin datos de asistencia"
                description="Aún no hay check-ins registrados en los últimos 7 días."
              />
            ) : (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center">
                    <Spinner />
                  </div>
                }
              >
                <DailyVolumeChart data={data} />
              </Suspense>
            )}
          </div>
        </Card>

        <Card padding="sm" rounded="xl" className="md:p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-900 sm:mb-5 sm:text-base dark:text-white">
            <Clock className="h-4 w-4 shrink-0 text-blue-500" />
            Horas pico (30d)
          </h3>
          <div className="h-44 sm:h-56 lg:h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner />
              </div>
            ) : hourlyData.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="Sin horas pico"
                description="Registra check-ins para ver el patrón horario del gym."
              />
            ) : (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center">
                    <Spinner />
                  </div>
                }
              >
                <HourlyVolumeChart data={hourlyData} />
              </Suspense>
            )}
          </div>
        </Card>
      </div>

      <Card padding="sm" rounded="xl" className="md:p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-900 sm:mb-5 sm:text-base dark:text-white">
          <AlertTriangle className="text-brand h-4 w-4 shrink-0" />
          Próximos vencimientos ({alertDays}d)
        </h3>
        <div className="space-y-3 sm:space-y-4">
          {lastDoorAlert && (
            <div
              className={cn(
                'rounded-2xl border p-4',
                expiryBannerClasses(getExpirySeverity(lastDoorAlert.days_remaining, alertDays))
                  .container
              )}
            >
              <p className="label-caps mb-2">Última alerta en puerta:</p>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {lastDoorAlert.full_name} — {lastDoorAlert.membership_name} —{' '}
                {formatExpiryLabel(lastDoorAlert.days_remaining) === 'Hoy'
                  ? 'vence hoy'
                  : lastDoorAlert.days_remaining === 1
                    ? 'vence mañana'
                    : `vence en ${lastDoorAlert.days_remaining} días`}
              </p>
              <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-300">
                {format(new Date(lastDoorAlert.check_in_time), 'dd MMM yyyy · HH:mm', {
                  locale: es,
                })}
              </p>
            </div>
          )}
          <div className="space-y-2">
            {expiring.length === 0 ? (
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                No hay membresías por vencer en los próximos {alertDays} días.
              </p>
            ) : (
              expiring.map((member) => {
                const severity = getExpirySeverity(member.days_remaining, alertDays);
                const classes = expiryBannerClasses(severity);
                return (
                  <div
                    key={member.user_id}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-xl border p-3',
                      classes.itemBorder
                    )}
                  >
                    <Link to="/members?expiring=true" className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {member.full_name}
                      </p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-300">
                        {member.membership_name}
                      </p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge className={classes.badge}>
                        {formatExpiryLabel(member.days_remaining)}
                      </Badge>
                      <Link
                        to={`/messages?member=${member.user_id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        title="Enviar mensaje"
                        aria-label={`Mensaje a ${member.full_name}`}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
