import { Link, useSearchParams } from 'react-router-dom';
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
  FilterChips,
} from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn } from '../lib/utils';
import { useState, useMemo, useEffect } from 'react';

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

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'with' | 'without'>(() => {
    const raw = searchParams.get('filter');
    return raw === 'with' || raw === 'without' ? raw : 'all';
  });

  useEffect(() => {
    const raw = searchParams.get('filter');
    const next = raw === 'with' || raw === 'without' ? raw : 'all';
    setFilter((prev) => (prev === next ? prev : next));
  }, [searchParams]);

  const updateFilter = (value: 'all' | 'with' | 'without') => {
    setFilter(value);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === 'all') next.delete('filter');
        else next.set('filter', value);
        return next;
      },
      { replace: true }
    );
  };

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
    <div className="page-stack-tight mx-auto w-full max-w-7xl">
      <PageHeader
        compact
        showTitleOnMobile
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
            className={cn('grid gap-3', isTrainer ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')}
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <SearchInput
                containerClassName="min-w-0 flex-1"
                placeholder="Buscar cliente…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <FilterChips
                className="w-fit max-w-full shrink-0"
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'without', label: 'Sin plan' },
                  { value: 'with', label: 'Con plan' },
                ]}
                value={filter}
                onChange={(v) => updateFilter(v as 'all' | 'with' | 'without')}
              />
            </div>
          )}

          {/* Mobile / tablet cards */}
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:hidden">
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

          {/* Desktop table */}
          <Card padding="none" rounded="xl" className="hidden overflow-hidden lg:block">
            {members.length === 0 ? (
              <EmptyState
                icon={UtensilsCrossed}
                title="Sin resultados"
                description="Prueba otro filtro o búsqueda."
                className="py-10"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50/90 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-2.5">Miembro</th>
                      <th className="px-4 py-2.5">Plan</th>
                      <th className="px-4 py-2.5">Registros</th>
                      <th className="px-4 py-2.5">Adherencia</th>
                      <th className="px-4 py-2.5 text-right"> </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {members.map((member) => {
                      const hasPlan = 'has_plan' in member ? member.has_plan : true;
                      return (
                        <tr
                          key={member.user_id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                        >
                          <td className="px-4 py-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Avatar name={member.full_name} size="sm" className="shrink-0" />
                              <p className="truncate font-semibold text-zinc-900 dark:text-white">
                                {member.full_name}
                              </p>
                            </div>
                          </td>
                          <td className="max-w-[14rem] px-4 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                            {hasPlan ? (
                              <span className="truncate">{member.plan_title}</span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400">Sin plan</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                            {hasPlan ? `${member.logged_days}d` : '—'}
                          </td>
                          <td className="px-4 py-3">
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
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link to={`/members/${member.user_id}/nutrition`}>
                              <Button size="sm" variant={hasPlan ? 'ghost' : 'secondary'}>
                                {hasPlan ? 'Ver' : 'Crear'}
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
