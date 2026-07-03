import React, { useState, useEffect } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import {
  useExercisesQuery,
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
import { MUSCLE_GROUPS, filterExercises } from '../lib/exerciseMuscleGroups';
import { ExerciseLibraryView } from '../components/exercise/ExerciseLibraryView';
import { getYouTubeEmbedUrl } from '../lib/exerciseVideo';
import { clientLogger } from '../lib/clientLogger';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  fetchExerciseMediaCapabilities,
  uploadExerciseVideoDirect,
  type ExerciseMediaCapabilities,
} from '../lib/exerciseVideoUploadClient';
export default function Exercises() {
  const {
    data: exercises = [],
    isPending: loading,
    isError: exercisesError,
    refetch: refetchExercises,
  } = useExercisesQuery();
  const invalidateExercises = useInvalidateExercises();
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('');
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

  const filteredForDisplay = filterExercises(exercises, { search, muscleGroup: muscleFilter });

  const handleVideoUrlChange = (url: string) => {
    const embed = getYouTubeEmbedUrl(url);
    setFormData({ ...formData, video_url: embed ?? url });
  };

  if (exercisesError && !loading) {
    return (
      <div className="page-stack-tight">
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
    <div className="page-stack-tight">
      <PageHeader
        compact
        title={
          <>
            Biblioteca de <span className="text-brand">ejercicios</span>
          </>
        }
        subtitle={
          readOnly
            ? 'Consulta movimientos y videos de tu entrenador'
            : 'Catálogo de movimientos para rutinas'
        }
        action={<BackToDashboardLink />}
      />

      <div className="flex items-center gap-2">
        <SearchInput
          containerClassName="flex-1 min-w-0"
          placeholder="Buscar por nombre o grupo muscular..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
        />
        {canEdit && (
          <Button
            size="sm"
            className="h-11 min-h-11 w-11 shrink-0 rounded-xl p-0 whitespace-nowrap sm:w-auto sm:px-4"
            onClick={() => {
              handleOpenModal();
            }}
            aria-label="Nuevo ejercicio"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Nuevo</span>
          </Button>
        )}
      </div>

      <FilterChips
        options={[
          { value: '', label: 'Todos' },
          ...MUSCLE_GROUPS.map((group) => ({ value: group, label: group })),
        ]}
        value={muscleFilter}
        onChange={setMuscleFilter}
      />

      <ExerciseLibraryView
        exercises={filteredForDisplay}
        readOnly={readOnly}
        search=""
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
            title="Eliminar ejercicio"
          >
            <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
              ¿Eliminar <strong>{deleteTarget?.name}</strong>?
            </p>
            <p className="mb-6 text-xs text-zinc-500 dark:text-zinc-400">
              No se podrá eliminar si está en alguna rutina.
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
                {deleting ? 'Eliminando...' : 'Eliminar'}
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
            title={
              <>
                {editingExercise ? 'EDITAR' : 'NUEVO'} <span className="text-brand">EJERCICIO</span>
              </>
            }
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
