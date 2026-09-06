import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import {
  fetchExerciseById,
  exerciseHasVideo,
  useExercisesCatalogQuery,
  useInvalidateExercises,
  type Exercise,
} from '../hooks/queries/useExercisesQuery';
import { Plus, Video, Dumbbell, ChevronDown, Minus, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canOperateExercises } from '../lib/roles';
import {
  Button,
  Input,
  Label,
  Modal,
  Select,
  Textarea,
  SearchInput,
  BackToDashboardLink,
  FilterChips,
  EmptyState,
  SegmentedControl,
  IconButton,
  Card,
  Skeleton,
} from '../components/ui';
import { OperateHeader, OperatePage } from '../components/operate/OperateChrome';
import {
  MUSCLE_GROUPS,
  filterExercises,
  formatMuscleGroupLabel,
} from '../lib/exerciseMuscleGroups';
import {
  ExerciseLibraryView,
  type ExerciseLayoutView,
} from '../components/exercise/ExerciseLibraryView';
import { getYouTubeEmbedUrl } from '../lib/exerciseVideo';
import { cn } from '../lib/utils';
import { clientLogger } from '../lib/clientLogger';
import { usePageTitle } from '../hooks/usePageTitle';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import {
  capturePosterFromVideoFile,
  fetchExerciseMediaCapabilities,
  uploadExercisePosterDirect,
  uploadExerciseVideoDirect,
  type ExerciseMediaCapabilities,
} from '../lib/exerciseVideoUploadClient';

export default function Exercises() {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('');
  const [videoOnly, setVideoOnly] = useState(false);
  const [layoutView, setLayoutView] = useState<ExerciseLayoutView>('flat');
  const [filtersOpen, setFiltersOpen] = useState(false);
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
    () => catalogList.filter((e) => exerciseHasVideo(e)).length,
    [catalogList]
  );

  const filteredForDisplay = useMemo(() => {
    let list = filterExercises(catalogList, {
      search: debouncedSearch,
      muscleGroup: muscleFilter,
    });
    if (videoOnly) list = list.filter((e) => exerciseHasVideo(e));
    return list;
  }, [catalogList, debouncedSearch, muscleFilter, videoOnly]);

  const refreshExercises = () => invalidateExercises();

  const handleOpenModal = async (exercise: Exercise | null = null) => {
    setVideoFile(null);
    if (exercise) {
      let detail = exercise;
      try {
        detail = await fetchExerciseById(exercise.id);
      } catch {
        /* list row still has name/group; execution may be empty until retry */
      }
      setEditingExercise(detail);
      setFormData({
        name: detail.name,
        muscle_group: detail.muscle_group,
        description: detail.description || '',
        execution: detail.execution || '',
        video_url: detail.video_url || '',
      });
      const steps = (detail.execution || '')
        .split(/\n+/)
        .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
        .filter(Boolean);
      setExecutionSteps(steps.length > 0 ? steps : ['']);
      setVideoOpen(Boolean(detail.video_url));
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
          try {
            setVideoUploadProgress('Generando miniatura…');
            const posterBlob = await capturePosterFromVideoFile(videoFile);
            setVideoUploadProgress('Subiendo miniatura…');
            const posterRef = await uploadExercisePosterDirect(posterBlob);
            data.append('poster_storage_ref', posterRef);
          } catch {
            /* video still saves; poster is optional if capture fails */
          }
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
  const filterChipCount = Number(Boolean(muscleFilter)) + Number(videoOnly);
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
      <OperatePage maxWidth="max-w-6xl">
        <OperateHeader
          icon={Dumbbell}
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
      </OperatePage>
    );
  }

  if (loading) {
    return (
      <OperatePage maxWidth="max-w-6xl">
        <OperateHeader
          icon={Dumbbell}
          title={
            <>
              <span className="text-brand">Ejercicios</span>
            </>
          }
          subtitle="Catálogo para armar rutinas"
          action={<BackToDashboardLink iconOnly />}
        />
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-[4.25rem] rounded-xl" />
          ))}
        </div>
      </OperatePage>
    );
  }

  return (
    <OperatePage maxWidth="max-w-6xl">
      <OperateHeader
        icon={Dumbbell}
        title={
          readOnly ? (
            <>
              Mis <span className="text-brand">ejercicios</span>
            </>
          ) : (
            <>
              Biblioteca de <span className="text-brand">ejercicios</span>
            </>
          )
        }
        subtitle={readOnly ? 'Movimientos y videos' : 'Catálogo para armar rutinas'}
        action={
          <>
            <BackToDashboardLink iconOnly />
            {canEdit ? (
              <Button
                onClick={() => void handleOpenModal()}
                className="min-h-11 gap-1.5 px-2.5 sm:px-4"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo ejercicio</span>
                <span className="sr-only sm:hidden">Nuevo ejercicio</span>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <SearchInput
          containerClassName="min-w-0 w-full flex-1"
          placeholder="Buscar ejercicio…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          aria-label="Buscar por nombre o grupo muscular"
        />
        <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:h-11 sm:justify-end">
          {filteredForDisplay.length > 0 || hasActiveFilters ? (
            <SegmentedControl
              variant="compact"
              value={layoutView}
              onChange={setLayoutView}
              className="w-fit max-w-full"
              options={[
                { value: 'flat', label: 'Lista' },
                { value: 'groups', label: 'Grupos' },
              ]}
            />
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={cn(
              'h-9 gap-1.5 px-2.5',
              filtersOpen && 'bg-surface-overlay',
              filterChipCount > 0 && 'text-brand'
            )}
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-label="Filtros"
            title="Filtros"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden md:inline">Filtros</span>
            {filterChipCount > 0 ? (
              <span className="text-text-muted text-small rounded-md px-1.5 font-semibold tabular-nums">
                {filterChipCount}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      {filtersOpen ? (
        <Card padding="sm" rounded="xl" className="space-y-3">
          <FilterChips
            className="w-fit max-w-full"
            ariaLabel="Grupo muscular"
            options={[
              { value: '', label: 'Grupos', count: catalogList.length },
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
          {videoCount > 0 || videoOnly ? (
            <FilterChips
              className="w-fit max-w-full"
              ariaLabel="Video"
              options={[
                { value: 'all', label: 'Video' },
                { value: 'video', label: 'Con video', count: videoCount },
              ]}
              value={videoOnly ? 'video' : 'all'}
              onChange={(value) => setVideoOnly(value === 'video')}
            />
          ) : null}
          {filterChipCount > 0 ? (
            <Button type="button" variant="secondary" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          ) : null}
        </Card>
      ) : null}

      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-text-muted text-small min-w-0 truncate">{resultsLabel}</p>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="text-brand text-small shrink-0 font-semibold hover:underline"
          >
            Limpiar
          </button>
        ) : null}
      </div>

      <ExerciseLibraryView
        exercises={filteredForDisplay}
        readOnly={readOnly}
        search={debouncedSearch}
        muscleFilter={muscleFilter}
        videoOnly={videoOnly}
        skipClientFilter
        layoutView={layoutView}
        onClearFilters={hasActiveFilters ? clearFilters : undefined}
        onEdit={canEdit ? (exercise) => void handleOpenModal(exercise) : undefined}
        onDelete={
          canEdit
            ? (exercise) => {
                setDeleteError(null);
                setDeleteTarget(exercise);
              }
            : undefined
        }
        onCreate={canEdit ? () => void handleOpenModal() : undefined}
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
            <p className="text-text-secondary mb-2 text-sm">
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
            <p className="text-text-muted mb-6 text-xs">
              {deleteTarget?.is_system && !deleteTarget.owner_trainer_id
                ? 'Solo dejará de aparecer en tu catálogo. Otros entrenadores seguirán viéndolo.'
                : 'No se podrá eliminar si está en alguna rutina.'}
            </p>
            {deleteError && <p className="text-danger mb-4 text-sm">{deleteError}</p>}
            <div className="flex gap-3">
              <Button
                variant="secondary"
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
                  variant="secondary"
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
                    className="text-brand text-small font-semibold hover:underline"
                    onClick={() => setExecutionSteps((steps) => [...steps, ''])}
                  >
                    + Paso
                  </button>
                </div>
                <div className="space-y-1.5">
                  {executionSteps.map((step, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <span className="text-text-muted text-small w-4 shrink-0 text-center tabular-nums">
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
                        variant="secondary"
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
                  <span className="text-text min-w-0 flex-1 text-sm font-medium">
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
                      <span className="text-text-secondary text-small min-w-0 truncate font-medium">
                        {videoFile ? videoFile.name : 'Subir MP4/MOV'}
                      </span>
                    </label>
                    <p className="text-text-muted text-small leading-snug">
                      {mediaCapabilities?.directUpload
                        ? `Máx. ${mediaCapabilities.recommendedMaxMb} MB · ${mediaCapabilities.maxDurationSec}s · 720p`
                        : 'Máx. 60s · 50 MB · se comprime a 720p'}
                    </p>
                    {videoUploadProgress ? (
                      <p className="text-brand text-small font-medium">{videoUploadProgress}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {saveError ? <p className="text-danger text-sm">{saveError}</p> : null}
            </form>
          </Modal>
        </>
      )}
    </OperatePage>
  );
}
