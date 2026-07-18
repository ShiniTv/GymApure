import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { Fingerprint, TrendingUp, Users, Calendar, Clock, AlertTriangle } from 'lucide-react';
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

export default function Attendance() {
  const { user } = useAuth();
  const adminStats = useAdminStatsOptional();
  const [data, setData] = useState<DailyVolumePoint[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyVolumePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const expiring = adminStats?.stats?.expiringList ?? [];
  const lastDoorAlert = adminStats?.stats?.lastDoorAlert ?? null;
  const alertDays = adminStats?.stats?.expiryAlertDays ?? 7;

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

  const totalEntries = data.reduce((sum, item) => sum + item.count, 0);
  const avgEntries = data.length > 0 ? (totalEntries / data.length).toFixed(1) : 0;

  return (
    <div className="page-stack">
      <PageHeader
        compact
        title={<>Asistencias</>}
        subtitle="Entradas de hoy, volumen, horas pico y membresías por vencer"
        action={user?.role === 'admin' ? <BackToDashboardLink /> : undefined}
      />

      <Card padding="md" rounded="xl" className="sm:rounded-2xl sm:p-6">
        <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-900 sm:text-base dark:text-white">
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
        <div className="scroll-area max-h-72 sm:max-h-80">
          <ReceptionActivityFeed limit={0} search={search} />
        </div>
      </Card>

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
        <Card padding="md" rounded="xl" className="sm:rounded-2xl sm:p-6">
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

        <Card padding="md" rounded="xl" className="sm:rounded-2xl sm:p-6">
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

      <Card padding="md" rounded="xl" className="sm:rounded-2xl sm:p-6">
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
          <div className="scroll-area max-h-56 space-y-2 sm:max-h-64">
            {expiring.length === 0 ? (
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                No hay membresías por vencer en los próximos {alertDays} días.
              </p>
            ) : (
              expiring.map((member) => {
                const severity = getExpirySeverity(member.days_remaining, alertDays);
                const classes = expiryBannerClasses(severity);
                return (
                  <Link
                    key={member.user_id}
                    to="/members?expiring=true"
                    className={cn(
                      'flex items-center justify-between rounded-xl border p-3 transition-colors hover:opacity-90',
                      classes.itemBorder
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {member.full_name}
                      </p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-300">
                        {member.membership_name}
                      </p>
                    </div>
                    <Badge className={classes.badge}>
                      {formatExpiryLabel(member.days_remaining)}
                    </Badge>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
