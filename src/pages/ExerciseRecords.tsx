import React, { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Dumbbell, Plus, Search, Trash2, Trophy, TrendingUp } from 'lucide-react';
import { apiFetch, parseJsonResponse, toDisplayErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToastOptional } from '../context/ToastContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { clientLogger } from '../lib/clientLogger';
import { dateLocale as es } from '../lib/dateLocale';
import type {
  ExerciseRecordDetail,
  ExerciseRecordSummary,
  RmTestRow,
} from '../lib/exerciseRecords';
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
  PageHeader,
  PageState,
  Skeleton,
  Spinner,
} from '../components/ui';

const ExerciseRecordsChart = lazy(() => import('../components/exercise/ExerciseRecordsChart'));

interface UserBrief {
  id: number;
  full_name: string;
}

export default function ExerciseRecords() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToastOptional();

  const userIdToFetch = id ? parseInt(id, 10) : user?.id;
  const isTrainerView = Boolean(id);

  const [targetUser, setTargetUser] = useState<UserBrief | null>(null);
  const [records, setRecords] = useState<ExerciseRecordSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ExerciseRecordDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAddTest, setShowAddTest] = useState(false);
  const [savingTest, setSavingTest] = useState(false);
  const [deletingTestId, setDeletingTestId] = useState<number | null>(null);
  const [testForm, setTestForm] = useState({
    weight: '',
    reps: '',
    test_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const displayName = isTrainerView ? targetUser?.full_name : user?.name;
  const historyHref = isTrainerView ? `/members/${id}/history` : '/history';
  const recordsBase = isTrainerView
    ? `/api/users/${userIdToFetch}/exercise-records`
    : `/api/users/${userIdToFetch}/exercise-records`;

  usePageTitle(isTrainerView ? 'Marcas del miembro' : 'Marcas por ejercicio');

  const fetchRecords = useCallback(async () => {
    if (!userIdToFetch) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiFetch(recordsBase);
      const data = await parseJsonResponse<ExerciseRecordSummary[]>(res);
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      clientLogger.error('Failed to fetch exercise records', err);
      setRecords([]);
      setLoadError(toDisplayErrorMessage(err, 'No se pudieron cargar las marcas'));
    } finally {
      setLoading(false);
    }
  }, [userIdToFetch, recordsBase]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (!isTrainerView || !userIdToFetch) return;
    let cancelled = false;
    void apiFetch(`/api/users/${userIdToFetch}`)
      .then((res) => parseJsonResponse<UserBrief>(res))
      .then((data) => {
        if (!cancelled) setTargetUser(data);
      })
      .catch(() => {
        if (!cancelled) setTargetUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isTrainerView, userIdToFetch]);

  const openDetail = useCallback(
    async (exerciseId: number) => {
      if (!userIdToFetch) return;
      setSelectedExerciseId(exerciseId);
      setDetail(null);
      setDetailLoading(true);
      try {
        const res = await apiFetch(`${recordsBase}/${exerciseId}`);
        const data = await parseJsonResponse<ExerciseRecordDetail>(res);
        setDetail(data);
      } catch (err) {
        clientLogger.error('Failed to fetch exercise record detail', err);
        toast?.error(toDisplayErrorMessage(err, 'No se pudo cargar el detalle'));
        setSelectedExerciseId(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [userIdToFetch, recordsBase, toast]
  );

  const closeDetail = () => {
    setSelectedExerciseId(null);
    setDetail(null);
    setShowAddTest(false);
  };

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (row) => row.name.toLowerCase().includes(q) || row.muscle_group.toLowerCase().includes(q)
    );
  }, [records, search]);

  const submitTest = async () => {
    if (!userIdToFetch || !selectedExerciseId) return;
    const weight = Number(testForm.weight);
    const reps = Number(testForm.reps);
    if (!Number.isFinite(weight) || weight < 0 || !Number.isFinite(reps) || reps < 1) {
      toast?.error('Ingresa peso y repeticiones válidos');
      return;
    }
    setSavingTest(true);
    try {
      await parseJsonResponse(
        await apiFetch(`${recordsBase}/${selectedExerciseId}/tests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weight,
            reps,
            test_date: testForm.test_date || undefined,
            notes: testForm.notes.trim() || null,
          }),
        })
      );
      toast?.success('Prueba de RM registrada');
      setShowAddTest(false);
      setTestForm({
        weight: '',
        reps: '',
        test_date: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      await openDetail(selectedExerciseId);
      await fetchRecords();
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err, 'No se pudo guardar la prueba'));
    } finally {
      setSavingTest(false);
    }
  };

  const deleteTest = async (test: RmTestRow) => {
    if (!userIdToFetch || !selectedExerciseId) return;
    setDeletingTestId(test.id);
    try {
      await parseJsonResponse(
        await apiFetch(`${recordsBase}/${selectedExerciseId}/tests/${test.id}`, {
          method: 'DELETE',
        })
      );
      toast?.success('Prueba eliminada');
      await openDetail(selectedExerciseId);
      await fetchRecords();
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err, 'No se pudo eliminar la prueba'));
    } finally {
      setDeletingTestId(null);
    }
  };

  const formatKg = (value: number) =>
    Number(value).toLocaleString('es-VE', { maximumFractionDigits: 1 });

  if (loadError && records.length === 0) {
    return (
      <PageState>
        <EmptyState
          icon={Trophy}
          title="Error al cargar"
          description={loadError}
          action={<Button onClick={() => void fetchRecords()}>Reintentar</Button>}
        />
      </PageState>
    );
  }

  if (loading && records.length === 0) {
    return (
      <PageState>
        <Spinner />
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Cargando marcas…</p>
      </PageState>
    );
  }

  return (
    <div className="page-stack-tight mx-auto w-full max-w-5xl">
      {isTrainerView && (
        <Breadcrumbs
          items={[
            { label: 'Miembros', href: '/members' },
            { label: displayName ?? 'Miembro', href: `/members/${id}/routines` },
            { label: 'Historial', href: historyHref },
            { label: 'Marcas' },
          ]}
        />
      )}
      {!isTrainerView && (
        <Breadcrumbs items={[{ label: 'Historial', href: '/history' }, { label: 'Marcas' }]} />
      )}

      <PageHeader
        compact
        title={
          isTrainerView ? (
            <>
              Marcas de <span className="text-brand">{displayName ?? '…'}</span>
            </>
          ) : (
            <>
              Marcas por <span className="text-brand">ejercicio</span>
            </>
          )
        }
        subtitle="Peso máximo, 1RM estimado (Epley) y pruebas manuales para programar rutinas"
        action={
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              className="hidden h-9 gap-1.5 sm:inline-flex"
              onClick={() => navigate(historyHref)}
            >
              <Dumbbell className="h-3.5 w-3.5" />
              Historial
            </Button>
            <button
              type="button"
              onClick={() => navigate(historyHref)}
              className="hover:text-brand inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 sm:hidden dark:text-zinc-400 dark:hover:bg-zinc-800"
              aria-label="Volver al historial"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ejercicio o grupo muscular…"
          className="pl-9"
          aria-label="Buscar marcas"
        />
      </div>

      <Card padding="none" rounded="xl" className="overflow-hidden">
        {filteredRecords.length === 0 ? (
          <EmptyState
            variant="motivational"
            icon={Trophy}
            title={search.trim() ? 'Sin resultados' : 'Aún no hay marcas'}
            description={
              search.trim()
                ? 'Prueba con otro nombre o grupo muscular.'
                : 'Cuando completes entrenamientos con peso, las marcas aparecerán aquí. También puedes registrar pruebas de RM manualmente.'
            }
            action={
              <Link to={historyHref}>
                <Button size="sm" variant="secondary">
                  Ir al historial
                </Button>
              </Link>
            }
          />
        ) : (
          <>
            <div className="divide-y divide-zinc-100 lg:hidden dark:divide-zinc-800">
              {filteredRecords.map((row) => (
                <button
                  key={row.exercise_id}
                  type="button"
                  onClick={() => void openDetail(row.exercise_id)}
                  className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                        {row.name}
                      </p>
                      {row.muscle_group && (
                        <p className="text-[10px] text-zinc-500 capitalize dark:text-zinc-400">
                          {row.muscle_group}
                        </p>
                      )}
                    </div>
                    <Badge variant="default" className="shrink-0 px-1.5 py-0 text-[9px]">
                      {row.session_count} ses.
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-sm font-bold text-zinc-900 tabular-nums dark:text-white">
                        {formatKg(row.max_weight_kg)}
                      </p>
                      <p className="text-[9px] text-zinc-500">Peso máx.</p>
                    </div>
                    <div>
                      <p className="text-brand text-sm font-bold tabular-nums">
                        {formatKg(row.estimated_1rm_kg)}
                      </p>
                      <p className="text-[9px] text-zinc-500">1RM est.</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 tabular-nums dark:text-white">
                        {row.best_set ? `${row.best_set.reps}` : '—'}
                      </p>
                      <p className="text-[9px] text-zinc-500">Reps mejor</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <th className="px-4 py-2.5 font-medium">Ejercicio</th>
                    <th className="px-4 py-2.5 font-medium">Grupo</th>
                    <th className="px-4 py-2.5 font-medium">Peso máx.</th>
                    <th className="px-4 py-2.5 font-medium">Mejor serie</th>
                    <th className="px-4 py-2.5 font-medium">1RM est.</th>
                    <th className="px-4 py-2.5 font-medium">Última vez</th>
                    <th className="px-4 py-2.5 font-medium">Sesiones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredRecords.map((row) => (
                    <tr
                      key={row.exercise_id}
                      className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      onClick={() => void openDetail(row.exercise_id)}
                    >
                      <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-white">
                        {row.name}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-500 capitalize">
                        {row.muscle_group || '—'}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {formatKg(row.max_weight_kg)} kg
                        {row.max_weight_reps > 0 && (
                          <span className="text-zinc-400"> × {row.max_weight_reps}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {row.best_set
                          ? `${formatKg(row.best_set.weight)} kg × ${row.best_set.reps}`
                          : '—'}
                      </td>
                      <td className="text-brand px-4 py-2.5 font-semibold tabular-nums">
                        {formatKg(row.estimated_1rm_kg)} kg
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-500 tabular-nums">
                        {row.last_performed
                          ? format(parseISO(row.last_performed), 'dd MMM yyyy', { locale: es })
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-600 tabular-nums dark:text-zinc-300">
                        {row.session_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Modal
        open={selectedExerciseId !== null}
        onClose={closeDetail}
        title={
          detail ? (
            <>
              {detail.name}
              {detail.muscle_group ? (
                <span className="ml-2 text-xs font-normal text-zinc-500 capitalize">
                  {detail.muscle_group}
                </span>
              ) : null}
            </>
          ) : (
            'Detalle de marca'
          )
        }
        maxWidth="xl"
        scrollable
      >
        {detailLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : detail ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-center dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-lg font-bold text-zinc-900 tabular-nums dark:text-white">
                  {formatKg(detail.summary.max_weight_kg)} kg
                </p>
                <p className="text-[10px] text-zinc-500">Peso máximo</p>
              </div>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-center dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-brand text-lg font-bold tabular-nums">
                  {formatKg(detail.summary.estimated_1rm_kg)} kg
                </p>
                <p className="text-[10px] text-zinc-500">1RM estimado</p>
              </div>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-center dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-lg font-bold text-zinc-900 tabular-nums dark:text-white">
                  {detail.summary.best_set
                    ? `${formatKg(detail.summary.best_set.weight)}×${detail.summary.best_set.reps}`
                    : '—'}
                </p>
                <p className="text-[10px] text-zinc-500">Mejor serie</p>
              </div>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-center dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-lg font-bold text-zinc-900 tabular-nums dark:text-white">
                  {detail.summary.session_count}
                </p>
                <p className="text-[10px] text-zinc-500">Sesiones</p>
              </div>
            </div>

            {detail.timeline.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <TrendingUp className="text-brand h-4 w-4" />
                  <h3 className="section-title">Progreso de peso máximo</h3>
                </div>
                <div className="h-48">
                  <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
                    <ExerciseRecordsChart timeline={detail.timeline} />
                  </Suspense>
                </div>
              </div>
            )}

            {detail.reps_at_weight.length > 0 && (
              <div>
                <h3 className="section-title mb-2">Repeticiones máximas por carga</h3>
                <div className="overflow-x-auto rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50 text-[10px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                        <th className="px-3 py-2 font-medium">Peso</th>
                        <th className="px-3 py-2 font-medium">Máx. reps</th>
                        <th className="px-3 py-2 font-medium">1RM est.</th>
                        <th className="px-3 py-2 font-medium">Origen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {detail.reps_at_weight.map((row) => (
                        <tr key={row.weight_kg} className="text-zinc-700 dark:text-zinc-200">
                          <td className="px-3 py-1.5 font-medium tabular-nums">
                            {formatKg(row.weight_kg)} kg
                          </td>
                          <td className="px-3 py-1.5 tabular-nums">{row.max_reps}</td>
                          <td className="px-3 py-1.5 tabular-nums">
                            {formatKg(row.estimated_1rm_kg)} kg
                          </td>
                          <td className="px-3 py-1.5">
                            <Badge variant="default" className="px-1.5 py-0 text-[9px]">
                              {row.source === 'both'
                                ? 'Log + manual'
                                : row.source === 'manual'
                                  ? 'Manual'
                                  : 'Entrenamiento'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="section-title">Pruebas de RM</h3>
                <Button size="sm" onClick={() => setShowAddTest(true)} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Registrar prueba
                </Button>
              </div>
              {detail.manual_tests.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  No hay pruebas manuales. Registra un RM con una carga determinada para
                  complementar el historial de entrenamientos.
                </p>
              ) : (
                <ul className="space-y-2">
                  {detail.manual_tests.map((test) => (
                    <li
                      key={test.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 tabular-nums dark:text-white">
                          {formatKg(test.weight)} kg × {test.reps}
                          <span className="text-brand ml-2 text-xs font-medium">
                            ≈ {formatKg(test.estimated_1rm_kg)} kg 1RM
                          </span>
                        </p>
                        <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                          {format(parseISO(test.test_date), 'dd MMM yyyy', { locale: es })}
                          {test.recorded_by_name ? ` · ${test.recorded_by_name}` : ''}
                          {test.notes ? ` · ${test.notes}` : ''}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        disabled={deletingTestId === test.id}
                        onClick={() => void deleteTest(test)}
                        aria-label="Eliminar prueba"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={showAddTest}
        onClose={() => {
          if (savingTest) return;
          setShowAddTest(false);
        }}
        title="Registrar prueba de RM"
      >
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Anota el peso y las repeticiones máximas logradas en una prueba (p. ej. 80 kg × 5).
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rm-test-weight">Peso (kg)</Label>
              <Input
                id="rm-test-weight"
                type="number"
                min={0}
                step="0.5"
                value={testForm.weight}
                onChange={(e) => setTestForm((prev) => ({ ...prev, weight: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="rm-test-reps">Repeticiones</Label>
              <Input
                id="rm-test-reps"
                type="number"
                min={1}
                step="1"
                value={testForm.reps}
                onChange={(e) => setTestForm((prev) => ({ ...prev, reps: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="rm-test-date">Fecha</Label>
            <Input
              id="rm-test-date"
              type="date"
              value={testForm.test_date}
              onChange={(e) => setTestForm((prev) => ({ ...prev, test_date: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="rm-test-notes">Notas (opcional)</Label>
            <Input
              id="rm-test-notes"
              value={testForm.notes}
              onChange={(e) => setTestForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Ej. prueba de fuerza, día de pecho…"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={savingTest}
              onClick={() => setShowAddTest(false)}
            >
              Cancelar
            </Button>
            <Button className="flex-1" disabled={savingTest} onClick={() => void submitTest()}>
              {savingTest ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
