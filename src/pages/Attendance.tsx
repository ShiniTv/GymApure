import React, { lazy, Suspense, useState, useEffect } from 'react';
import { apiFetch, parseJsonResponse, parseJsonSafe } from '../lib/api';
import { getKioskClientKey } from '../lib/kiosk';
import { Fingerprint, TrendingUp, Users, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge, Button, Card, Input, PageHeader, Spinner, StatCard } from '../components/ui';
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

interface KioskSimResponse {
  error?: string;
  user_name?: string;
  already_checked_in?: boolean;
  already_checked_out?: boolean;
  expiry_warning?: string;
  duration_label?: string;
}

interface ExpiringMember {
  user_id: number;
  full_name: string;
  membership_name: string;
  days_remaining: number;
  end_date: string;
}

interface LastDoorAlert {
  full_name: string;
  membership_name: string;
  days_remaining: number;
  check_in_time: string;
}

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
    <div className="space-y-6">
      <PageHeader
        title={<>CONTROL <span className="text-orange-500">BIOMÉTRICO</span></>}
        subtitle="Análisis de volumen de usuarios y frecuencia de ingreso"
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
        <Card padding="lg" rounded="3xl">
          <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-8 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-orange-500" />
            Volumen Diario (7d)
          </h3>
          <div className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Spinner />
              </div>
            ) : data.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-400 font-bold uppercase tracking-widest text-xs">Sin datos</div>
            ) : (
              <Suspense fallback={<div className="h-full flex items-center justify-center"><Spinner /></div>}>
                <DailyVolumeChart data={data} />
              </Suspense>
            )}
          </div>
        </Card>

        <Card padding="lg" rounded="3xl">
          <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-8 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            Horas Pico (30d)
          </h3>
          <div className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Spinner />
              </div>
            ) : hourlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-400 font-bold uppercase tracking-widest text-xs">Sin datos</div>
            ) : (
              <Suspense fallback={<div className="h-full flex items-center justify-center"><Spinner /></div>}>
                <HourlyVolumeChart data={hourlyData} />
              </Suspense>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md" rounded="2xl" className="overflow-hidden relative">
          <div className="flex items-center gap-3 mb-6">
            <Fingerprint className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Simulador Biométrico</h3>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-medium text-zinc-500">Ingresa la cédula para simular entrada o salida en el kiosk.</p>
            <Input
              id="sim-cedula"
              type="text"
              placeholder="V-12345678"
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                    const el = document.getElementById('sim-cedula') as HTMLInputElement;
                    const cedula = el.value;
                    if (!cedula) return;
                    
                    const feedbackEl = document.getElementById('sim-feedback');
                    if (feedbackEl) {
                      feedbackEl.innerText = 'Validando entrada...';
                      feedbackEl.className = 'text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-2 text-center';
                    }

                    const kioskKey = getKioskClientKey();
                    if (!kioskKey) {
                      if (feedbackEl) {
                        feedbackEl.innerText = 'Kiosk no configurado (falta VITE_KIOSK_KEY)';
                        feedbackEl.className = 'text-[10px] font-black uppercase tracking-widest text-red-500 mt-2 text-center';
                      }
                      return;
                    }

                    apiFetch('/api/attendance/check-in', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Kiosk-Key': kioskKey,
                      },
                      body: JSON.stringify({ cedula })
                    })
                    .then((res) => parseJsonSafe<KioskSimResponse>(res))
                    .then((data) => {
                      if (feedbackEl) {
                        if (data.error) {
                          feedbackEl.innerText = `Entrada denegada: ${data.error}`;
                          feedbackEl.className = 'text-[10px] font-black uppercase tracking-widest text-red-500 mt-2 text-center';
                        } else {
                          const base = data.already_checked_in
                            ? `Ingreso activo: ${data.user_name}`
                            : `Entrada OK: ${data.user_name}`;
                          feedbackEl.innerText = data.expiry_warning
                            ? `${base} — ${data.expiry_warning}`
                            : base;
                          feedbackEl.className = data.expiry_warning
                            ? 'text-[10px] font-black uppercase tracking-widest text-orange-500 mt-2 text-center'
                            : 'text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-2 text-center';
                          if (!data.already_checked_in) {
                            setTimeout(() => window.location.reload(), 1500);
                          }
                        }
                      }
                    });
                  }}
              >
                Simular entrada
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-500 shadow-blue-900/20"
                onClick={() => {
                    const el = document.getElementById('sim-cedula') as HTMLInputElement;
                    const cedula = el.value;
                    if (!cedula) return;
                    
                    const feedbackEl = document.getElementById('sim-feedback');
                    if (feedbackEl) {
                      feedbackEl.innerText = 'Validando salida...';
                      feedbackEl.className = 'text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-2 text-center';
                    }

                    const kioskKey = getKioskClientKey();
                    if (!kioskKey) {
                      if (feedbackEl) {
                        feedbackEl.innerText = 'Kiosk no configurado (falta VITE_KIOSK_KEY)';
                        feedbackEl.className = 'text-[10px] font-black uppercase tracking-widest text-red-500 mt-2 text-center';
                      }
                      return;
                    }

                    apiFetch('/api/attendance/check-out', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Kiosk-Key': kioskKey,
                      },
                      body: JSON.stringify({ cedula })
                    })
                    .then((res) => parseJsonSafe<KioskSimResponse>(res))
                    .then((data) => {
                      if (feedbackEl) {
                        if (data.error) {
                          feedbackEl.innerText = `Salida denegada: ${data.error}`;
                          feedbackEl.className = 'text-[10px] font-black uppercase tracking-widest text-red-500 mt-2 text-center';
                        } else {
                          const base = data.already_checked_out
                            ? `Ya salió hoy: ${data.user_name}`
                            : `Salida OK: ${data.user_name}${data.duration_label ? ` (${data.duration_label})` : ''}`;
                          feedbackEl.innerText = base;
                          feedbackEl.className = 'text-[10px] font-black uppercase tracking-widest text-blue-500 mt-2 text-center';
                          el.value = '';
                          if (!data.already_checked_out) {
                            setTimeout(() => window.location.reload(), 1500);
                          }
                        }
                      }
                    });
                  }}
              >
                Simular salida
              </Button>
            </div>
            <p id="sim-feedback" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-2 text-center" />
          </div>

          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse" />
              <div className="relative h-20 w-20 rounded-full border-4 border-emerald-500/30 flex items-center justify-center">
                <Fingerprint className="h-10 w-10 text-emerald-500" />
              </div>
            </div>
          </div>
        </Card>

        <Card padding="lg" rounded="3xl">
          <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Próximos Vencimientos ({alertDays}d)
          </h3>
          <div className="space-y-4">
            {lastDoorAlert && (
              <div className={cn('p-4 border rounded-2xl', expiryBannerClasses(getExpirySeverity(lastDoorAlert.days_remaining, alertDays)).container)}>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Última alerta en puerta:</p>
                <p className="text-sm font-black text-zinc-700 dark:text-zinc-200 uppercase tracking-tight">
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
            <div className="space-y-2 max-h-48 overflow-y-auto">
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
                        <p className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase">{member.full_name}</p>
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
    </div>
  );
}
