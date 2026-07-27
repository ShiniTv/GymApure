import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import {
  useExercisesCatalogQuery,
  useInvalidateExercises,
  type Exercise,
} from '../hooks/queries/useExercisesQuery';
import { Plus, Video, Dumbbell, ChevronDown, Minus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canOperateExercises } from '../lib/roles';
import {
  Button,
  Input,
  Label,
  Modal,
  PageHeader,
  Spinner,
  Select,
  Textarea,
  SearchInput,
  BackToDashboardLink,
  FilterChips,
  EmptyState,
  IconButton,
} from '../components/ui';
import {
  MUSCLE_GROUPS,
  filterExercises,
  formatMuscleGroupLabel,
} from '../lib/exerciseMuscleGroups';
import { ExerciseLibraryView } from '../components/exercise/ExerciseLibraryView';
import { getYouTubeEmbedUrl } from '../lib/exerciseVideo';
import { clientLogger } from '../lib/clientLogger';
import { usePageTitle } from '../hooks/usePageTitle';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import {
  fetchExerciseMediaCapabilities,
  uploadExerciseVideoDirect,
  type ExerciseMediaCapabilities,
} from '../lib/exerciseVideoUploadClient';

export default function Exercises() {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('');
  const [videoOnly, setVideoOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'az' | 'recent'>('az');
  const [executionSteps, setExecutionSteps] = useState<string[]>(['']);
  const [videoOpen, setVideoOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);
  const {
    data: catalog,
    isPending: loading,
    isError: exercisesError,
    refetch: refetchExercises,
  } = useExercisesCatalogQuery(true);
  const catalogList = catalog ?? [];
  const invalidateExercises = useInvalidateExercises();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<string | null>(null);
  const [mediaCapabilities, setMediaCapabilities] = useState<ExerciseMediaCapabilities | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: '',
    muscle_group: 'Pecho',
    description: '',
    execution: '',
    video_url: '',
  });
  const { user } = useAuth();
  const canEdit = canOperateExercises(user?.role ?? '');
  const readOnly = !canEdit;

  usePageTitle(readOnly ? 'Biblioteca' : 'Ejercicios');

  useEffect(() => {
    if (!canEdit) return;
    void fetchExerciseMediaCapabilities()
      .then(setMediaCapabilities)
      .catch(() => setMediaCapabilities(null));
  }, [canEdit]);

  const muscleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const group of MUSCLE_GROUPS) counts[group] = 0;
    for (const exercise of catalogList) {
      const label = formatMuscleGroupLabel(exercise.muscle_group);
      if (label in counts) counts[label] += 1;
      else counts[label] = (counts[label] ?? 0) + 1;
    }
    return counts;
  }, [catalogList]);

  const videoCount = useMemo(
    () => catalogList.filter((e) => Boolean(e.video_url)).length,
    [catalogList]
  );

  const filteredForDisplay = useMemo(() => {
    let list = filterExercises(catalogList, {
      search: debouncedSearch,
      muscleGroup: muscleFilter,
    });
    if (videoOnly) list = list.filter((e) => Boolean(e.video_url));
    list = [...list].sort((a, b) =>
      sortBy === 'az' ? a.name.localeCompare(b.name, 'es') : b.id - a.id
    );
    return list;
  }, [catalogList, debouncedSearch, muscleFilter, videoOnly, sortBy]);

  const refreshExercises = () => invalidateExercises();

  const handleOpenModal = (exercise: Exercise | null = null) => {
    setVideoFile(null);
    if (exercise) {
      setEditingExercise(exercise);
      setFormData({
        name: exercise.name,
        muscle_group: exercise.muscle_group,
        description: exercise.description || '',
        execution: exercise.execution || '',
        video_url: exercise.video_url || '',
      });
      const steps = (exercise.execution || '')
        .split(/\n+/)
        .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
        .filter(Boolean);
      setExecutionSteps(steps.length > 0 ? steps : ['']);
      setVideoOpen(Boolean(exercise.video_url));
    } else {
      setEditingExercise(null);
      setFormData({
        name: '',
        muscle_group: 'Pecho',
        description: '',
        execution: '',
        video_url: '',
      });
      setExecutionSteps(['']);
      setVideoOpen(false);
    }
    setIsModalOpen(true);
    setSaveError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setVideoUploadProgress(null);
    const url = editingExercise ? `/api/exercises/${editingExercise.id}` : '/api/exercises';
    const method = editingExercise ? 'PUT' : 'POST';

    const data = new FormData();
    data.append('name', formData.name);
    data.append('muscle_group', formData.muscle_group);
    data.append('description', formData.description);
    data.append(
      'execution',
      executionSteps
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s, i) => `${i + 1}. ${s}`)
        .join('\n')
    );
    data.append('video_url', formData.video_url);

    try {
      if (videoFile) {
        if (mediaCapabilities?.directUpload) {
          setVideoUploadProgress('Subiendo video…');
          const videoRef = await uploadExerciseVideoDirect(videoFile);
          data.append('video_storage_ref', videoRef);
          data.set('video_url', '');
        } else {
          data.append('video', videoFile);
        }
      }

      const res = await apiFetch(url, { method, body: data });
      await parseJsonResponse(res);
      setIsModalOpen(false);
      setVideoFile(null);
      refreshExercises();
    } catch (err) {
      clientLogger.error('Failed to save exercise', err);
      setSaveError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
      setVideoUploadProgress(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await apiFetch(`/api/exercises/${deleteTarget.id}`, { method: 'DELETE' });
      await parseJsonResponse(res);
      setDeleteTarget(null);
      refreshExercises();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const hasActiveFilters = Boolean(debouncedSearch.trim() || muscleFilter || videoOnly);
  const clearFilters = () => {
    setSearch('');
    setMuscleFilter('');
    setVideoOnly(false);
  };
  const resultsLabel = `${filteredForDisplay.length} ejercicio${filteredForDisplay.length !== 1 ? 's' : ''}${
    muscleFilter ? ` · ${muscleFilter}` : ''
  }${videoOnly ? ' · con video' : ''}${
    debouncedSearch.trim() ? ` · «${debouncedSearch.trim()}»` : ''
  }`;

  const handleVideoUrlChange = (url: string) => {
    const embed = getYouTubeEmbedUrl(url);
    setFormData({ ...formData, video_url: embed ?? url });
  };

  if (exercisesError && !loading) {
    return (
      <div className="page-stack-tight mx-auto w-full max-w-6xl">
        <PageHeader
          compact
          title={
            <>
              Biblioteca de <span className="text-brand">ejercicios</span>
            </>
          }
          action={<BackToDashboardLink />}
        />
        <EmptyState
          icon={Dumbbell}
          title="Error al cargar"
          description="No pudimos obtener la biblioteca de ejercicios."
          action={
            <Button size="sm" onClick={() => void refetchExercises()}>
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-state-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="page-stack-tight mx-auto w-full max-w-6xl">
      <PageHeader
        compact
        title={
          readOnly ? (
            <>
              Mis <span className="text-brand">ejercicios</span>
            </>
          ) : (
            <>
              <span className="text-brand">Ejercicios</span>
            </>
          )
        }
        subtitle={readOnly ? 'Movimientos y videos' : 'Catálogo para armar rutinas'}
        action={<BackToDashboardLink iconOnly />}
      />

      <div className="flex items-center gap-2">
        <SearchInput
          containerClassName="min-w-0 flex-1"
          placeholder="Buscar ejercicio…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          aria-label="Buscar por nombre o grupo muscular"
        />
        {canEdit ? (
          <IconButton
            size="md"
            variant="secondary"
            className="border-brand/30 text-brand hover:bg-brand/10"
            aria-label="Nuevo ejercicio"
            title="Nuevo"
            onClick={() => handleOpenModal()}
          >
            <Plus className="h-4 w-4" />
          </IconButton>
        ) : null}
      </div>

      <div className="space-y-2">
        <FilterChips
          layout="scroll"
          ariaLabel="Grupo muscular"
          options={[
            { value: '', label: 'Todos', count: catalogList.length },
            ...MUSCLE_GROUPS.filter(
              (group) => (muscleCounts[group] ?? 0) > 0 || muscleFilter === group
            ).map((group) => ({
              value: group,
              label: group,
              count: muscleCounts[group] ?? 0,
            })),
          ]}
          value={muscleFilter}
          onChange={setMuscleFilter}
        />
        <div className="flex items-center justify-between gap-2 px-0.5">
          <p className="text-text-muted min-w-0 truncate text-[11px]">{resultsLabel}</p>
          <div className="flex shrink-0 items-center gap-2">
            <div className="text-text-muted flex items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => setSortBy('az')}
                className={sortBy === 'az' ? 'text-text font-semibold' : 'hover:text-text'}
                aria-pressed={sortBy === 'az'}
              >
                A–Z
              </button>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={() => setSortBy('recent')}
                className={sortBy === 'recent' ? 'text-text font-semibold' : 'hover:text-text'}
                aria-pressed={sortBy === 'recent'}
              >
                Recientes
              </button>
            </div>
            <button
              type="button"
              onClick={() => setVideoOnly((v) => !v)}
              className={
                videoOnly
                  ? 'bg-surface-overlay text-text inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold'
                  : 'text-text-secondary hover:text-text inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold'
              }
              aria-pressed={videoOnly}
            >
              <Video className="h-3 w-3" aria-hidden />
              Video{videoCount > 0 ? ` · ${videoCount}` : ''}
            </button>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="text-brand text-[11px] font-semibold hover:underline"
              >
                Limpiar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <ExerciseLibraryView
        exercises={filteredForDisplay}
        readOnly={readOnly}
        search={debouncedSearch}
        muscleFilter={muscleFilter}
        videoOnly={videoOnly}
        skipClientFilter
        onClearFilters={hasActiveFilters ? clearFilters : undefined}
        onEdit={canEdit ? (exercise) => handleOpenModal(exercise) : undefined}
        onDelete={
          canEdit
            ? (exercise) => {
                setDeleteError(null);
                setDeleteTarget(exercise);
              }
            : undefined
        }
        onCreate={canEdit ? () => handleOpenModal() : undefined}
      />

      {canEdit && (
        <>
          <Modal
            open={!!deleteTarget}
            onClose={() => !deleting && setDeleteTarget(null)}
            title={
              deleteTarget?.is_system && !deleteTarget.owner_trainer_id
                ? 'Ocultar ejercicio'
                : 'Eliminar ejercicio'
            }
          >
            <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
              {deleteTarget?.is_system && !deleteTarget.owner_trainer_id ? (
                <>
                  ¿Ocultar <strong>{deleteTarget?.name}</strong> de tu biblioteca?
                </>
              ) : (
                <>
                  ¿Eliminar <strong>{deleteTarget?.name}</strong>?
                </>
              )}
            </p>
            <p className="mb-6 text-xs text-zinc-500 dark:text-zinc-400">
              {deleteTarget?.is_system && !deleteTarget.owner_trainer_id
                ? 'Solo dejará de aparecer en tu catálogo. Otros entrenadores seguirán viéndolo.'
                : 'No se podrá eliminar si está en alguna rutina.'}
            </p>
            {deleteError && <p className="mb-4 text-sm text-red-500">{deleteError}</p>}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setDeleteTarget(null);
                }}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting
                  ? 'Procesando...'
                  : deleteTarget?.is_system && !deleteTarget.owner_trainer_id
                    ? 'Ocultar'
                    : 'Eliminar'}
              </Button>
            </div>
          </Modal>

          <Modal
            open={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
            }}
            maxWidth="lg"
            scrollable
            title={<>{editingExercise ? 'Editar ejercicio' : 'Nuevo ejercicio'}</>}
            footer={
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  form="exercise-form"
                  size="sm"
                  className="flex-1"
                  disabled={saving}
                >
                  {saving ? 'Guardando…' : editingExercise ? 'Guardar' : 'Crear'}
                </Button>
              </>
            }
          >
            <form id="exercise-form" onSubmit={handleSubmit} className="space-y-2.5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <Label className="mb-0.5">Nombre</Label>
                  <Input
                    required
                    type="text"
                    placeholder="Ej: Press de banca"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                    }}
                  />
                </div>
                <div>
                  <Label className="mb-0.5">Grupo muscular</Label>
                  <Select
                    value={formData.muscle_group}
                    onChange={(e) => {
                      setFormData({ ...formData, muscle_group: e.target.value });
                    }}
                  >
                    {MUSCLE_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label className="mb-0.5">Descripción</Label>
                <Textarea
                  placeholder="Objetivo breve (opcional)"
                  rows={2}
                  className="min-h-[3.25rem] px-3 py-2 text-sm leading-snug"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="mb-0">Ejecución</Label>
                  <button
                    type="button"
                    className="text-brand text-[11px] font-semibold hover:underline"
                    onClick={() => setExecutionSteps((steps) => [...steps, ''])}
                  >
                    + Paso
                  </button>
                </div>
                <div className="space-y-1.5">
                  {executionSteps.map((step, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <span className="text-text-muted w-4 shrink-0 text-center text-[11px] tabular-nums">
                        {index + 1}
                      </span>
                      <Input
                        value={step}
                        placeholder={`Paso ${index + 1}`}
                        onChange={(e) => {
                          const next = [...executionSteps];
                          next[index] = e.target.value;
                          setExecutionSteps(next);
                        }}
                      />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label={`Quitar paso ${index + 1}`}
                        disabled={executionSteps.length <= 1}
                        onClick={() =>
                          setExecutionSteps((steps) =>
                            steps.length <= 1 ? steps : steps.filter((_, i) => i !== index)
                          )
                        }
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-border/60 overflow-hidden rounded-[var(--radius-input)] border">
                <button
                  type="button"
                  onClick={() => setVideoOpen((o) => !o)}
                  className="hover:bg-surface-overlay/40 flex w-full items-center gap-2 px-3 py-2 text-left"
                  aria-expanded={videoOpen}
                >
                  <Video className="text-text-muted h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="text-text min-w-0 flex-1 text-[13px] font-medium">
                    Video (opcional)
                  </span>
                  <ChevronDown
                    className={`text-text-muted h-3.5 w-3.5 transition-transform ${videoOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
                {videoOpen ? (
                  <div className="border-border/60 space-y-1.5 border-t px-3 pt-2 pb-3">
                    <Input
                      type="url"
                      leadingIcon={<Video />}
                      className="font-mono text-xs"
                      placeholder="YouTube (opcional)"
                      value={formData.video_url}
                      onChange={(e) => {
                        handleVideoUrlChange(e.target.value);
                      }}
                    />
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      id="video-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (
                          file &&
                          mediaCapabilities?.directUpload &&
                          file.size > mediaCapabilities.maxUploadBytes
                        ) {
                          setSaveError(
                            `El video supera ${mediaCapabilities.recommendedMaxMb} MB. Comprímelo antes de subir.`
                          );
                          setVideoFile(null);
                          e.target.value = '';
                          return;
                        }
                        setSaveError(null);
                        setVideoFile(file);
                      }}
                    />
                    <label
                      htmlFor="video-upload"
                      className="border-border/70 hover:border-brand/40 bg-surface-overlay/40 flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-input)] border border-dashed px-3 py-2 transition-colors"
                    >
                      <Plus className="text-text-muted h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="text-text-secondary min-w-0 truncate text-[11px] font-medium">
                        {videoFile ? videoFile.name : 'Subir MP4/MOV'}
                      </span>
                    </label>
                    <p className="text-text-muted text-[10px] leading-snug">
                      {mediaCapabilities?.directUpload
                        ? `Máx. ${mediaCapabilities.recommendedMaxMb} MB · ${mediaCapabilities.maxDurationSec}s · 720p`
                        : 'Máx. 60s · 50 MB · se comprime a 720p'}
                    </p>
                    {videoUploadProgress ? (
                      <p className="text-brand text-[11px] font-medium">{videoUploadProgress}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {saveError ? <p className="text-sm text-red-500">{saveError}</p> : null}
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
