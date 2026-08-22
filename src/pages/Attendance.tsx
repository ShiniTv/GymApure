import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
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
import { Virtuoso } from 'react-virtuoso';
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
  IconButton,
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
  const navigate = useNavigate();
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

  const renderInactiveMember = (_index: number, member: InactiveMember) => {
    const wa = whatsappHref(member.phone);
    return (
      <div className="border-border/60 flex items-center gap-2 border-b px-0.5 py-2 last:border-b-0">
        <Link to={`/members?q=${encodeURIComponent(member.full_name)}`} className="min-w-0 flex-1">
          <p className="text-text truncate text-[13px] leading-tight font-semibold">
            {member.full_name}
          </p>
          <p className="text-text-muted mt-0.5 truncate text-[11px]">
            {member.cedula ?? member.email}
            {member.last_check_in
              ? ` · ${format(new Date(member.last_check_in), 'dd MMM', { locale: es })}`
              : ' · sin accesos'}
          </p>
        </Link>
        <Badge variant="warning" className="shrink-0 px-1.5 py-0 text-[9px]">
          {member.days_since == null ? 'Nunca' : `${member.days_since}d`}
        </Badge>
        <IconButton
          size="sm"
          variant="ghost"
          aria-label={`Mensaje a ${member.full_name}`}
          title="Mensaje"
          onClick={() => void navigate(`/messages?member=${member.id}`)}
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </IconButton>
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-button)] border border-emerald-500/25 text-emerald-600 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400"
            title="WhatsApp"
            aria-label={`WhatsApp a ${member.full_name}`}
          >
            <Phone className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
    );
  };

  return (
    <div className="page-stack-tight mx-auto w-full max-w-7xl">
      <PageHeader
        compact
        title={<>Asistencias</>}
        subtitle="Hoy · volumen · inactivos"
        action={user?.role === 'admin' ? <BackToDashboardLink iconOnly /> : undefined}
      />

      <div className="grid grid-cols-3 gap-2">
        <StatCard minimal title="7d" value={totalEntries} icon={Fingerprint} />
        <StatCard minimal title="Promedio" value={avgEntries} icon={TrendingUp} />
        <StatCard
          minimal
          title="Pico"
          value={data.length > 0 ? Math.max(...data.map((d) => d.count)) : 0}
          icon={Users}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2 lg:items-start lg:gap-4">
        <Card padding="sm" rounded="xl" className="min-w-0">
          <div className="mb-2.5 space-y-2.5">
            <h3 className="text-text flex items-center gap-2 text-[13px] font-semibold">
              <Fingerprint className="text-brand h-3.5 w-3.5 shrink-0" />
              Entradas y salidas de hoy
            </h3>
            <SearchInput
              containerClassName="w-full"
              placeholder="Buscar nombre o cédula…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Buscar asistencia de hoy"
            />
          </div>
          <ReceptionActivityFeed limit={0} search={search} compact />
        </Card>

        {isAdmin ? (
          <Card padding="sm" rounded="xl" className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-text flex items-center gap-2 text-[13px] font-semibold">
                <Users className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                Miembros inactivos
              </h3>
              <FilterChips
                className="w-fit max-w-full"
                options={[
                  { value: '7', label: '7d' },
                  { value: '14', label: '14d' },
                  { value: '30', label: '30d' },
                ]}
                value={inactiveDays}
                onChange={setInactiveDays}
              />
            </div>
            <p className="text-text-muted mb-2 text-[11px] leading-snug">
              Sin acceso en {inactiveDays}d (o nunca)
            </p>
            <div className="max-h-[min(42vh,22rem)] min-h-0 overflow-y-auto lg:max-h-none">
              {inactiveLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : inactiveMembers.length === 0 ? (
                <EmptyState
                  compact
                  icon={Users}
                  title="Sin inactivos"
                  description={`Nadie sin acceso en ${inactiveDays} días.`}
                />
              ) : inactiveMembers.length > 12 ? (
                <Virtuoso
                  style={{ height: 'min(42vh, 22rem)' }}
                  data={inactiveMembers}
                  itemContent={renderInactiveMember}
                />
              ) : (
                inactiveMembers.map((member, index) => (
                  <React.Fragment key={member.id}>
                    {renderInactiveMember(index, member)}
                  </React.Fragment>
                ))
              )}
            </div>
          </Card>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        <Card padding="sm" rounded="xl">
          <h3 className="text-text mb-2.5 flex items-center gap-2 text-[13px] font-semibold">
            <Calendar className="text-brand h-3.5 w-3.5 shrink-0" />
            Volumen diario (7d)
          </h3>
          <div className="h-36 sm:h-48 lg:h-56">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner />
              </div>
            ) : data.length === 0 ? (
              <EmptyState
                compact
                icon={Calendar}
                title="Sin datos"
                description="Aún no hay accesos en 7 días."
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

        <Card padding="sm" rounded="xl">
          <h3 className="text-text mb-2.5 flex items-center gap-2 text-[13px] font-semibold">
            <Clock className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            Horas pico (30d)
          </h3>
          <div className="h-36 sm:h-48 lg:h-56">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner />
              </div>
            ) : hourlyData.length === 0 ? (
              <EmptyState
                compact
                icon={Clock}
                title="Sin horas pico"
                description="Registra accesos para ver el patrón."
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

      <Card padding="sm" rounded="xl">
        <h3 className="text-text mb-2.5 flex items-center gap-2 text-[13px] font-semibold">
          <AlertTriangle className="text-brand h-3.5 w-3.5 shrink-0" />
          Por vencer ({alertDays}d)
        </h3>
        <div className="space-y-2">
          {lastDoorAlert && (
            <div
              className={cn(
                'rounded-[var(--radius-card)] border px-3 py-2.5',
                expiryBannerClasses(getExpirySeverity(lastDoorAlert.days_remaining, alertDays))
                  .container
              )}
            >
              <p className="text-[10px] font-semibold tracking-wide uppercase opacity-80">
                Última alerta en puerta
              </p>
              <p className="mt-1 text-[13px] font-medium">
                {lastDoorAlert.full_name} — {lastDoorAlert.membership_name} —{' '}
                {formatExpiryLabel(lastDoorAlert.days_remaining) === 'Hoy'
                  ? 'vence hoy'
                  : lastDoorAlert.days_remaining === 1
                    ? 'vence mañana'
                    : `vence en ${lastDoorAlert.days_remaining} días`}
              </p>
              <p className="text-text-muted mt-0.5 text-[10px]">
                {format(new Date(lastDoorAlert.check_in_time), 'dd MMM · HH:mm', {
                  locale: es,
                })}
              </p>
            </div>
          )}
          {expiring.length === 0 ? (
            <p className="text-text-muted text-[13px]">
              No hay membresías por vencer en {alertDays} días.
            </p>
          ) : (
            <ul className="divide-border/60 divide-y">
              {expiring.map((member) => {
                const severity = getExpirySeverity(member.days_remaining, alertDays);
                const classes = expiryBannerClasses(severity);
                return (
                  <li key={member.user_id} className="flex items-center justify-between gap-2 py-2">
                    <Link to="/members?expiring=true" className="min-w-0 flex-1">
                      <p className="text-text truncate text-[13px] font-medium">
                        {member.full_name}
                      </p>
                      <p className="text-text-muted truncate text-[11px]">
                        {member.membership_name}
                      </p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge className={cn(classes.badge, 'px-1.5 py-0 text-[9px]')}>
                        {formatExpiryLabel(member.days_remaining)}
                      </Badge>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label={`Mensaje a ${member.full_name}`}
                        title="Mensaje"
                        onClick={() => void navigate(`/messages?member=${member.user_id}`)}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
