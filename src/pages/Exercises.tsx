import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import {
  useExercisesCatalogQuery,
  useInvalidateExercises,
  type Exercise,
} from '../hooks/queries/useExercisesQuery';
import { Plus, Video, Dumbbell } from 'lucide-react';
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
    return list;
  }, [catalogList, debouncedSearch, muscleFilter, videoOnly]);

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
    } else {
      setEditingExercise(null);
      setFormData({
        name: '',
        muscle_group: 'Pecho',
        description: '',
        execution: '',
        video_url: '',
      });
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
    data.append('execution', formData.execution);
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
    <div className="mx-auto w-full max-w-6xl space-y-3 sm:space-y-4">
      <PageHeader
        compact
        title={
          <>
            {readOnly ? (
              <>
                Mis <span className="text-brand">ejercicios</span>
              </>
            ) : (
              <>
                Biblioteca de <span className="text-brand">ejercicios</span>
              </>
            )}
          </>
        }
        subtitle={readOnly ? 'Movimientos y videos' : 'Para armar rutinas'}
        action={<BackToDashboardLink />}
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
        {canEdit && (
          <Button
            size="sm"
            variant="ghost"
            className="h-10 w-10 shrink-0 rounded-xl p-0 sm:h-9 sm:w-auto sm:gap-1.5 sm:px-3"
            onClick={() => {
              handleOpenModal();
            }}
            aria-label="Nuevo ejercicio"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo</span>
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <FilterChips
          options={[
            { value: '', label: 'Todos', count: catalogList.length },
            ...MUSCLE_GROUPS.map((group) => ({
              value: group,
              label: group,
              count: muscleCounts[group] ?? 0,
            })),
          ]}
          value={muscleFilter}
          onChange={setMuscleFilter}
        />
        <FilterChips
          options={[
            { value: '', label: 'Todos los formatos' },
            { value: 'video', label: 'Con video', count: videoCount },
          ]}
          value={videoOnly ? 'video' : ''}
          onChange={(v) => setVideoOnly(v === 'video')}
          ariaLabel="Filtro de video"
          fullWidth={false}
          className="w-fit max-w-full"
        />
      </div>

      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="min-w-0 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
          {resultsLabel}
        </p>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="text-brand shrink-0 text-[11px] font-semibold hover:underline"
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
            maxWidth="xl"
            scrollable
            title={<>{editingExercise ? 'Editar ejercicio' : 'Nuevo ejercicio'}</>}
          >
            <form onSubmit={handleSubmit} className="page-stack">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre del Ejercicio</Label>
                  <Input
                    required
                    type="text"
                    placeholder="Ej: Press de Banca"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grupo Muscular</Label>
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

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  placeholder="Describe brevemente el objetivo del ejercicio..."
                  rows={2}
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Ejecución paso a paso</Label>
                <Textarea
                  rows={4}
                  value={formData.execution}
                  onChange={(e) => {
                    setFormData({ ...formData, execution: e.target.value });
                  }}
                />
              </div>

              <div className="space-y-4">
                <Label>Video del ejercicio</Label>
                <div className="relative">
                  <Video className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-zinc-300" />
                  <Input
                    type="url"
                    className="pl-12 font-mono text-sm"
                    placeholder="Enlace de YouTube (opcional)..."
                    value={formData.video_url}
                    onChange={(e) => {
                      handleVideoUrlChange(e.target.value);
                    }}
                  />
                </div>
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
                  className="hover:border-brand/50 flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 p-6 transition-all dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-xs font-medium">
                    {videoFile ? videoFile.name : 'Seleccionar video MP4/MOV'}
                  </span>
                </label>
                <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {mediaCapabilities?.directUpload ? (
                    <>
                      Producción: subida directa a almacenamiento privado. Máx.{' '}
                      {mediaCapabilities.recommendedMaxMb} MB · {mediaCapabilities.maxDurationSec} s
                      · MP4/WebM comprimido en 720p antes de subir.
                    </>
                  ) : (
                    <>
                      Máx. 60 s · 50 MB al subir · se comprime automáticamente a 720p (requiere
                      FFmpeg en el servidor).
                    </>
                  )}
                </p>
                {videoUploadProgress && (
                  <p className="text-brand text-xs font-medium">{videoUploadProgress}</p>
                )}
              </div>

              {saveError && <p className="text-sm text-red-500">{saveError}</p>}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  size="lg"
                  onClick={() => {
                    setIsModalOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="min-h-[48px] flex-1" size="lg" disabled={saving}>
                  {saving
                    ? 'Guardando...'
                    : editingExercise
                      ? 'Guardar cambios'
                      : 'Crear ejercicio'}
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
