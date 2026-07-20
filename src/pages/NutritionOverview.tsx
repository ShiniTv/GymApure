import { Link } from 'react-router-dom';
import { UtensilsCrossed, ChevronRight, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  useNutritionOverviewQuery,
  useTrainerNutritionOverviewQuery,
} from '../hooks/queries/useNutritionQuery';
import {
  Button,
  Card,
  PageHeader,
  Spinner,
  EmptyState,
  Badge,
  Avatar,
  BackToDashboardLink,
  SearchInput,
} from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn } from '../lib/utils';
import { useState, useMemo } from 'react';

function adherenceBadgeClass(percent: number): string {
  if (percent >= 75) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  if (percent >= 50) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
  return 'bg-red-500/10 text-red-600 dark:text-red-400';
}

export default function NutritionOverview() {
  const { user } = useAuth();
  const isTrainer = user?.role === 'trainer';
  usePageTitle(isTrainer ? 'Nutrición' : 'Nutrición — resumen');

  const adminQuery = useNutritionOverviewQuery(!isTrainer);
  const trainerQuery = useTrainerNutritionOverviewQuery(isTrainer);
  const { data, isPending: loading } = isTrainer ? trainerQuery : adminQuery;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'with' | 'without'>('all');

  const members = useMemo(() => {
    const list = data?.members ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((m) => {
      const hasPlan = 'has_plan' in m ? m.has_plan : true;
      if (filter === 'with' && !hasPlan) return false;
      if (filter === 'without' && hasPlan) return false;
      if (!q) return true;
      return (
        m.full_name.toLowerCase().includes(q) || (m.plan_title ?? '').toLowerCase().includes(q)
      );
    });
  }, [data?.members, search, filter]);

  const withoutPlan = isTrainer && data && 'without_plan' in data ? data.without_plan! : 0;
  const assignedTotal =
    isTrainer && data && 'assigned_total' in data
      ? data.assigned_total!
      : (data?.members.length ?? 0);

  return (
    <div className="page-stack-tight mx-auto w-full max-w-5xl">
      <PageHeader
        compact
        className={isTrainer ? 'max-lg:!hidden' : undefined}
        title={
          isTrainer ? (
            <>
              Nutrición de <span className="text-brand">mis clientes</span>
            </>
          ) : (
            <>
              Nutrición <span className="text-brand">general</span>
            </>
          )
        }
        subtitle={
          isTrainer
            ? 'Quién tiene plan, quién no, y adherencia de los últimos 7 días.'
            : 'Adherencia agregada de los últimos 7 días por miembro con plan activo.'
        }
        action={<BackToDashboardLink />}
      />

      {isTrainer && (
        <p className="px-0.5 text-[11px] text-zinc-500 lg:hidden dark:text-zinc-400">
          Quién tiene plan, quién no, y adherencia de los últimos 7 días.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !data || assignedTotal === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title={isTrainer ? 'Sin miembros asignados' : 'Sin planes activos'}
          description={
            isTrainer
              ? 'Cuando tengas clientes asignados, aquí verás su estado nutricional.'
              : 'Asigna planes nutricionales desde la ficha de cada miembro.'
          }
          action={
            <Link to="/members">
              <Button size="sm">Ir a miembros</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div
            className={cn('grid gap-2', isTrainer ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')}
          >
            {isTrainer && (
              <Card padding="sm" rounded="xl">
                <p className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                  Clientes
                </p>
                <p className="text-2xl font-black text-zinc-900 dark:text-white">{assignedTotal}</p>
              </Card>
            )}
            <Card padding="sm" rounded="xl">
              <p className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                Con plan
              </p>
              <p className="text-2xl font-black text-zinc-900 dark:text-white">{data.with_plan}</p>
            </Card>
            {isTrainer ? (
              <Card padding="sm" rounded="xl">
                <p className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                  Sin plan
                </p>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  {withoutPlan}
                </p>
              </Card>
            ) : null}
            <Card padding="sm" rounded="xl">
              <p className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                Registrando
              </p>
              <p className="text-2xl font-black text-zinc-900 dark:text-white">
                {data.logging_active}
              </p>
            </Card>
            {!isTrainer && (
              <Card padding="sm" rounded="xl">
                <p className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                  Periodo
                </p>
                <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                  {data.period_days}d
                </p>
              </Card>
            )}
          </div>

          {isTrainer && (
            <div className="space-y-2">
              <SearchInput
                placeholder="Buscar cliente…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'all', label: 'Todos' },
                    { id: 'without', label: 'Sin plan' },
                    { id: 'with', label: 'Con plan' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFilter(opt.id)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                      filter === opt.id
                        ? 'border-brand/40 bg-brand/10 text-brand'
                        : 'border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            {members.length === 0 ? (
              <EmptyState
                icon={UtensilsCrossed}
                title="Sin resultados"
                description="Prueba otro filtro o búsqueda."
                className="py-8 sm:col-span-2"
              />
            ) : (
              members.map((member) => {
                const hasPlan = 'has_plan' in member ? member.has_plan : true;
                return (
                  <Card key={member.user_id} padding="sm" rounded="xl">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        {isTrainer && (
                          <Avatar name={member.full_name} size="sm" className="shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-bold text-zinc-900 dark:text-white">
                            {member.full_name}
                          </p>
                          {hasPlan ? (
                            <>
                              <p className="truncate text-xs text-zinc-500">{member.plan_title}</p>
                              <p className="mt-1 text-[11px] text-zinc-400">
                                {member.logged_days} día{member.logged_days !== 1 ? 's' : ''} con
                                registro
                              </p>
                            </>
                          ) : (
                            <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                              Sin plan nutricional
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {hasPlan ? (
                          <Badge
                            className={cn(
                              'tabular-nums',
                              adherenceBadgeClass(member.adherence_percent)
                            )}
                          >
                            {member.adherence_percent}%
                          </Badge>
                        ) : (
                          <Link to={`/members/${member.user_id}/nutrition`}>
                            <Button size="sm" variant="secondary" className="gap-1">
                              <Plus className="h-3.5 w-3.5" />
                              Crear
                            </Button>
                          </Link>
                        )}
                        <Link
                          to={`/members/${member.user_id}/nutrition`}
                          className="hover:text-brand hover:bg-brand/10 rounded-lg p-2 text-zinc-400 transition-colors"
                          title={hasPlan ? 'Ver plan' : 'Asignar plan'}
                          aria-label={hasPlan ? 'Ver plan' : 'Asignar plan'}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
