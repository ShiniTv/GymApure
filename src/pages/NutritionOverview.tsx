import { Link, useSearchParams } from 'react-router';
import {
  UtensilsCrossed,
  ChevronRight,
  Plus,
  Users,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react';
import { useTrainerNutritionOverviewQuery } from '../hooks/queries/useNutritionQuery';
import {
  Button,
  EmptyState,
  Badge,
  Avatar,
  BackToDashboardLink,
  SearchInput,
  FilterChips,
  Spinner,
} from '../components/ui';
import {
  OperateEmpty,
  OperateMetricStrip,
  OperatePage,
  OperateHeader,
  OPERATE_SURFACE,
  OperateIcon,
} from '../components/operate/OperateChrome';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn } from '../lib/utils';
import { useState, useMemo, useEffect } from 'react';

function adherenceBadgeClass(percent: number): string {
  if (percent >= 75) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  if (percent >= 50) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
  return 'bg-red-500/10 text-danger dark:text-danger';
}

export default function NutritionOverview() {
  usePageTitle('Nutrición');

  const { data, isPending: loading } = useTrainerNutritionOverviewQuery(true);

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

  const clearFilters = () => {
    setSearch('');
    updateFilter('all');
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

  const withoutPlan = data?.without_plan ?? 0;
  const assignedTotal = data?.assigned_total ?? data?.members.length ?? 0;
  const filtersActive = filter !== 'all' || search.trim().length > 0;

  return (
    <OperatePage>
      <OperateHeader
        icon={UtensilsCrossed}
        title={
          <>
            Nutrición de <span className="text-brand">mis clientes</span>
          </>
        }
        subtitle={
          loading
            ? 'Cargando adherencia…'
            : withoutPlan > 0
              ? `${withoutPlan} sin plan · prioriza asignar`
              : 'Quién tiene plan y adherencia de los últimos 7 días'
        }
        action={
          <>
            <BackToDashboardLink iconOnly className="sm:hidden" />
            <span className="hidden sm:inline-flex">
              <BackToDashboardLink />
            </span>
          </>
        }
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : !data || assignedTotal === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Sin miembros asignados"
          description="Cuando tengas clientes asignados, aquí verás su estado nutricional."
          action={
            <Link to="/members">
              <Button size="sm" className="min-h-11">
                Ir a miembros
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <OperateMetricStrip
            items={[
              {
                to: '/members',
                label: 'Clientes',
                value: assignedTotal,
                icon: Users,
              },
              {
                to: '/nutrition-overview?filter=with',
                label: 'Con plan',
                value: data.with_plan,
                icon: ClipboardList,
              },
              {
                to: '/nutrition-overview?filter=without',
                label: 'Sin plan',
                value: withoutPlan,
                icon: AlertTriangle,
              },
              {
                to: '/nutrition-overview',
                label: 'Registrando',
                value: data.logging_active,
                icon: UtensilsCrossed,
              },
            ]}
          />

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

          {members.length === 0 ? (
            <OperateEmpty
              icon={UtensilsCrossed}
              title="Sin resultados"
              description="Prueba otro filtro o búsqueda."
              action={
                filtersActive ? (
                  <Button size="sm" variant="secondary" className="min-h-11" onClick={clearFilters}>
                    Quitar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <ul
                className={cn(
                  'overflow-hidden rounded-[var(--radius-card)] border lg:hidden',
                  OPERATE_SURFACE
                )}
              >
                {members.map((member) => {
                  const hasPlan = 'has_plan' in member ? member.has_plan : true;
                  return (
                    <li key={member.user_id}>
                      <Link
                        to={`/members/${member.user_id}/nutrition`}
                        className="tap-feedback group border-border/60 hover:bg-surface-raised/80 flex min-h-[var(--touch-min)] items-center gap-3 border-b px-3 py-2.5 transition-colors last:border-b-0"
                      >
                        <Avatar name={member.full_name} size="sm" className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-text truncate text-sm font-medium tracking-[-0.011em]">
                            {member.full_name}
                          </p>
                          {hasPlan ? (
                            <p className="text-text-muted text-small truncate">
                              {member.plan_title} · {member.logged_days}d registro
                            </p>
                          ) : (
                            <p className="text-small text-warning">Sin plan nutricional</p>
                          )}
                        </div>
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
                          <span className="text-brand text-small inline-flex items-center gap-1 font-semibold">
                            <Plus className="operate-icon h-3.5 w-3.5" />
                            Crear
                          </span>
                        )}
                        <ChevronRight className="operate-icon text-text-muted h-4 w-4 shrink-0 opacity-60" />
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div
                className={cn(
                  'hidden overflow-hidden rounded-[var(--radius-card)] border lg:block',
                  OPERATE_SURFACE
                )}
              >
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="border-border bg-surface-raised text-text-muted text-small border-b font-semibold">
                    <tr>
                      <th className="px-4 py-3">Miembro</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Registros</th>
                      <th className="px-4 py-3">Adherencia</th>
                      <th className="px-4 py-3 text-right"> </th>
                    </tr>
                  </thead>
                  <tbody className="divide-border-subtle divide-y">
                    {members.map((member) => {
                      const hasPlan = 'has_plan' in member ? member.has_plan : true;
                      return (
                        <tr key={member.user_id} className="group hover:bg-surface-raised/80">
                          <td className="px-4 py-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Avatar name={member.full_name} size="sm" className="shrink-0" />
                              <p className="text-text truncate font-medium">{member.full_name}</p>
                            </div>
                          </td>
                          <td className="text-text-secondary max-w-[14rem] px-4 py-3 text-xs">
                            {hasPlan ? (
                              <span className="truncate">{member.plan_title}</span>
                            ) : (
                              <span className="text-warning inline-flex items-center gap-1.5">
                                <OperateIcon icon={AlertTriangle} tone="warn" size="sm" />
                                Sin plan
                              </span>
                            )}
                          </td>
                          <td className="text-text-muted px-4 py-3 text-xs tabular-nums">
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
                              <Button
                                size="sm"
                                variant={hasPlan ? 'ghost' : 'secondary'}
                                className="min-h-11 gap-1"
                              >
                                {hasPlan ? (
                                  'Ver'
                                ) : (
                                  <>
                                    <Plus className="operate-icon h-3.5 w-3.5" />
                                    Crear
                                  </>
                                )}
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </OperatePage>
  );
}
