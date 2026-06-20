import React, { lazy, Suspense, useState, useEffect } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { Fingerprint, TrendingUp, Users, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import { Badge, Card, PageHeader, Spinner, StatCard } from '../components/ui';
import { useAdminStatsOptional } from '../context/AdminStatsContext';
import { expiryBannerClasses, formatExpiryLabel, getExpirySeverity } from '../lib/expiryUtils';
import { cn } from '../lib/utils';
import { clientLogger } from '../lib/clientLogger';

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
  const adminStats = useAdminStatsOptional();
  const [data, setData] = useState<DailyVolumePoint[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyVolumePoint[]>([]);
  const [loading, setLoading] = useState(true);

  const expiring = adminStats?.stats?.expiringList ?? [];
  const lastDoorAlert = adminStats?.stats?.lastDoorAlert ?? null;
  const alertDays = adminStats?.stats?.expiryAlertDays ?? 7;

  useEffect(() => {
    const load = async () => {
      try {
        const [volume, hourly] = await Promise.all([
          apiFetch('/api/attendance/volume').then((res) => parseJsonResponse<{ date: string; count: number }[]>(res)),
          apiFetch('/api/attendance/hourly').then((res) => parseJsonResponse<{ hour: number; count: number }[]>(res)),
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
        title={<>Asistencias</>}
        subtitle="Análisis de volumen, horas pico y membresías por vencer"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total ingresos (7d)" value={totalEntries} icon={Fingerprint} color="orange" />
        <StatCard title="Promedio diario" value={`${avgEntries} users`} icon={TrendingUp} color="blue" />
        <StatCard
          title="Pico de ingreso"
          value={data.length > 0 ? Math.max(...data.map(d => d.count)) : 0}
          icon={Users}
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg" rounded="2xl">
          <h3 className="section-title mb-6 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-orange-500" />
            Volumen diario (7d)
          </h3>
          <div className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Spinner />
              </div>
            ) : data.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-400 text-sm">Sin datos</div>
            ) : (
              <Suspense fallback={<div className="h-full flex items-center justify-center"><Spinner /></div>}>
                <DailyVolumeChart data={data} />
              </Suspense>
            )}
          </div>
        </Card>

        <Card padding="lg" rounded="2xl">
          <h3 className="section-title mb-6 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            Horas pico (30d)
          </h3>
          <div className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Spinner />
              </div>
            ) : hourlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-400 text-sm">Sin datos</div>
            ) : (
              <Suspense fallback={<div className="h-full flex items-center justify-center"><Spinner /></div>}>
                <HourlyVolumeChart data={hourlyData} />
              </Suspense>
            )}
          </div>
        </Card>
      </div>

      <Card padding="lg" rounded="2xl">
        <h3 className="section-title mb-6 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Próximos vencimientos ({alertDays}d)
        </h3>
        <div className="space-y-4">
          {lastDoorAlert && (
            <div className={cn('p-4 border rounded-2xl', expiryBannerClasses(getExpirySeverity(lastDoorAlert.days_remaining, alertDays)).container)}>
              <p className="label-caps mb-2">Última alerta en puerta:</p>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {lastDoorAlert.full_name} — {lastDoorAlert.membership_name} —{' '}
                {formatExpiryLabel(lastDoorAlert.days_remaining) === 'Hoy'
                  ? 'vence hoy'
                  : lastDoorAlert.days_remaining === 1
                  ? 'vence mañana'
                  : `vence en ${lastDoorAlert.days_remaining} días`}
              </p>
              <p className="text-[10px] text-zinc-400 mt-1">
                {format(new Date(lastDoorAlert.check_in_time), 'dd MMM yyyy · HH:mm', { locale: es })}
              </p>
            </div>
          )}
          <div className="scroll-area space-y-2 max-h-56 sm:max-h-64">
            {expiring.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                No hay membresías por vencer en los próximos {alertDays} días.
              </p>
            ) : (
              expiring.map((member) => {
                const severity = getExpirySeverity(member.days_remaining, alertDays);
                const classes = expiryBannerClasses(severity);
                return (
                  <div
                    key={member.user_id}
                    className={cn('flex items-center justify-between p-3 rounded-xl border', classes.itemBorder)}
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{member.full_name}</p>
                      <p className="text-[10px] text-zinc-400">{member.membership_name}</p>
                    </div>
                    <Badge className={classes.badge}>{formatExpiryLabel(member.days_remaining)}</Badge>
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
