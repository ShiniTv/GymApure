import { Link } from 'react-router-dom';
import { UtensilsCrossed, ChevronRight } from 'lucide-react';
import { useNutritionOverviewQuery } from '../hooks/queries/useNutritionQuery';
import { Button, Card, PageHeader, Spinner, EmptyState, Badge, BackToDashboardLink } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn } from '../lib/utils';

function adherenceBadgeClass(percent: number): string {
  if (percent >= 75) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  if (percent >= 50) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
  return 'bg-red-500/10 text-red-600 dark:text-red-400';
}

export default function NutritionOverview() {
  usePageTitle('Nutrición — resumen');
  const { data, isPending: loading } = useNutritionOverviewQuery();

  return (
    <div className="page-stack">
      <PageHeader
        compact
        title={<>Nutrición <span className="text-brand">general</span></>}
        subtitle="Adherencia agregada de los últimos 7 días por miembro con plan activo."
        action={<BackToDashboardLink />}
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !data || data.members.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Sin planes activos"
          description="Asigna planes nutricionales desde la ficha de cada miembro."
          action={
            <Link to="/members">
              <Button size="sm">Ir a miembros</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Card padding="sm" rounded="xl">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Con plan</p>
              <p className="text-2xl font-black text-zinc-900 dark:text-white">{data.with_plan}</p>
            </Card>
            <Card padding="sm" rounded="xl">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Registrando</p>
              <p className="text-2xl font-black text-zinc-900 dark:text-white">{data.logging_active}</p>
            </Card>
            <Card padding="sm" rounded="xl" className="col-span-2 sm:col-span-1">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Periodo</p>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">{data.period_days} días</p>
            </Card>
          </div>

          <div className="space-y-2">
            {data.members.map((member) => (
              <Card key={member.user_id} padding="sm" rounded="xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-zinc-900 dark:text-white truncate">{member.full_name}</p>
                    <p className="text-xs text-zinc-500 truncate">{member.plan_title}</p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {member.logged_days} día{member.logged_days !== 1 ? 's' : ''} con registro
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={cn('tabular-nums', adherenceBadgeClass(member.adherence_percent))}>
                      {member.adherence_percent}% adherencia
                    </Badge>
                    <Link
                      to={`/members/${member.user_id}/nutrition`}
                      className="p-2 rounded-lg text-zinc-400 hover:text-brand hover:bg-brand/10 transition-colors"
                      title="Ver plan del miembro"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
