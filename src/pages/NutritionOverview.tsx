import { Link, useSearchParams } from 'react-router';
import { UtensilsCrossed, ChevronRight, Plus } from 'lucide-react';
import { useTrainerNutritionOverviewQuery } from '../hooks/queries/useNutritionQuery';
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
import { typography } from '../lib/typography';
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

  return (
    <div className="page-stack-tight mx-auto w-full max-w-7xl">
      <PageHeader
        compact
        showTitleOnMobile
        title={
          <>
            Nutrición de <span className="text-brand">mis clientes</span>
          </>
        }
        subtitle="Quién tiene plan, quién no, y adherencia de los últimos 7 días."
        action={<BackToDashboardLink />}
      />

      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : !data || assignedTotal === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Sin miembros asignados"
          description="Cuando tengas clientes asignados, aquí verás su estado nutricional."
          action={
            <Link to="/members">
              <Button size="sm">Ir a miembros</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
            <Card padding="sm" rounded="xl">
              <p className={cn(typography.statLabel)}>Clientes</p>
              <p className={cn(typography.statValueSm, 'mt-0.5')}>{assignedTotal}</p>
            </Card>
            <Card padding="sm" rounded="xl">
              <p className={cn(typography.statLabel)}>Con plan</p>
              <p className={cn(typography.statValueSm, 'mt-0.5')}>{data.with_plan}</p>
            </Card>
            <Card padding="sm" rounded="xl">
              <p className={cn(typography.statLabel)}>Sin plan</p>
              <p className={cn(typography.statValueSm, 'text-warning mt-0.5')}>{withoutPlan}</p>
            </Card>
            <Card padding="sm" rounded="xl">
              <p className={cn(typography.statLabel)}>Registrando</p>
              <p className={cn(typography.statValueSm, 'mt-0.5')}>{data.logging_active}</p>
            </Card>
          </div>

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
                        <Avatar name={member.full_name} size="sm" className="shrink-0" />
                        <div className="min-w-0">
                          <p className="text-text truncate text-sm font-semibold">
                            {member.full_name}
                          </p>
                          {hasPlan ? (
                            <>
                              <p className="text-text-muted truncate text-xs">
                                {member.plan_title}
                              </p>
                              <p className="text-text-muted text-small mt-1">
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
                          className="hover:text-brand hover:bg-brand/10 text-text-muted rounded-lg p-2 transition-colors"
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

          <Card padding="none" rounded="xl" className="hidden overflow-hidden lg:block">
            {members.length === 0 ? (
              <EmptyState
                icon={UtensilsCrossed}
                title="Sin resultados"
                description="Prueba otro filtro o búsqueda."
                className="py-5"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="border-border bg-surface-raised text-text-muted text-small border-b font-semibold tracking-wide uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Miembro</th>
                      <th className="px-4 py-2.5">Plan</th>
                      <th className="px-4 py-2.5">Registros</th>
                      <th className="px-4 py-2.5">Adherencia</th>
                      <th className="px-4 py-2.5 text-right"> </th>
                    </tr>
                  </thead>
                  <tbody className="divide-border-subtle divide-y">
                    {members.map((member) => {
                      const hasPlan = 'has_plan' in member ? member.has_plan : true;
                      return (
                        <tr key={member.user_id} className="hover:bg-surface-raised/80">
                          <td className="px-4 py-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Avatar name={member.full_name} size="sm" className="shrink-0" />
                              <p className="text-text truncate font-semibold">{member.full_name}</p>
                            </div>
                          </td>
                          <td className="text-text-secondary max-w-[14rem] px-4 py-3 text-xs">
                            {hasPlan ? (
                              <span className="truncate">{member.plan_title}</span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400">Sin plan</span>
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
