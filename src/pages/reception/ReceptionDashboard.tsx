import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Fingerprint, Users, CreditCard, UserPlus, Monitor, Clock } from 'lucide-react';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import { QuickAction } from '../../components/admin/QuickAction';
import { PageHeader, StatCard, Card, DashboardSkeleton } from '../../components/ui';
import ReceptionActivityFeed from '../../components/reception/ReceptionActivityFeed';

interface ReceptionStats {
  todayCheckIns: number;
  insideNow: number;
  pendingPayments: number;
}

export default function ReceptionDashboard() {
  const [stats, setStats] = useState<ReceptionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/stats/reception')
      .then((res) => parseJsonResponse<ReceptionStats>(res))
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <DashboardSkeleton statCount={3} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={<>Recepción <span className="text-orange-500">Caribean Gym</span></>}
        subtitle="Resumen del día — use el modo mostrador para operaciones de acceso"
        badge={stats?.insideNow ? `${stats.insideNow} dentro` : undefined}
        action={
          <Link to="/reception?mode=counter">
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold shadow-lg shadow-orange-900/20 transition-colors">
              <Monitor className="h-4 w-4" />
              Modo mostrador
            </span>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Ingresos hoy" value={stats?.todayCheckIns ?? 0} icon={Fingerprint} color="orange" />
        <StatCard title="Dentro ahora" value={stats?.insideNow ?? 0} icon={Users} color="emerald" />
        <StatCard title="Pagos pendientes" value={stats?.pendingPayments ?? 0} icon={CreditCard} color="blue" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickAction
          to="/reception?mode=counter"
          icon={Monitor}
          title="Modo mostrador"
          description="Pantalla optimizada para mostrador con atajos F1/F2"
          tone="orange"
        />
        <QuickAction
          to="/members"
          icon={UserPlus}
          title="Miembros"
          description="Registrar personas nuevas"
          tone="blue"
        />
        <QuickAction
          to="/payments?status=pending"
          icon={CreditCard}
          title="Pagos"
          description="Aprobar pagos walk-in"
          count={stats?.pendingPayments ?? 0}
          tone="emerald"
        />
      </div>

      <Card padding="lg" rounded="2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            Actividad de hoy
          </h3>
          <Link
            to="/reception?mode=counter&tab=inside"
            className="text-xs font-semibold text-orange-600 hover:text-orange-500"
          >
            Ver dentro ahora
          </Link>
        </div>
        <ReceptionActivityFeed limit={10} />
      </Card>
    </div>
  );
}
