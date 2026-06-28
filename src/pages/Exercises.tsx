import React, { useState } from 'react';
import { apiFetch, parseJsonResponse, resolveMediaUrl } from '../lib/api';
import { useExercisesQuery, useInvalidateExercises, type Exercise } from '../hooks/queries/useExercisesQuery';
import { Plus, Trash2, Edit, Video, BookOpen, Dumbbell, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input, Label, Modal, PageHeader, Badge, Spinner, EmptyState, Select, Textarea, SearchInput, BackToDashboardLink } from '../components/ui';
import { Link } from 'react-router-dom';
import { clientLogger } from '../lib/clientLogger';

export default function Exercises() {
  const { data: exercises = [], isPending: loading } = useExercisesQuery();
  const invalidateExercises = useInvalidateExercises();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    muscle_group: 'Pecho',
    description: '',
    execution: '',
    video_url: ''
  });
  const { user } = useAuth();

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
        video_url: exercise.video_url || ''
      });
    } else {
      setEditingExercise(null);
      setFormData({
        name: '',
        muscle_group: 'Pecho',
        description: '',
        execution: '',
        video_url: ''
      });
    }
    setIsModalOpen(true);
    setSaveError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const url = editingExercise ? `/api/exercises/${editingExercise.id}` : '/api/exercises';
    const method = editingExercise ? 'PUT' : 'POST';

    const data = new FormData();
    data.append('name', formData.name);
    data.append('muscle_group', formData.muscle_group);
    data.append('description', formData.description);
    data.append('execution', formData.execution);
    data.append('video_url', formData.video_url);
    if (videoFile) {
      data.append('video', videoFile);
    }

    try {
      const res = await apiFetch(url, { method, body: data });
      await parseJsonResponse(res);
      setIsModalOpen(false);
      refreshExercises();
    } catch (err) {
      clientLogger.error('Failed to save exercise', err);
      setSaveError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
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

  const filteredExercises = exercises.filter(ex => 
    ex.name.toLowerCase().includes(search.toLowerCase()) || 
    ex.muscle_group.toLowerCase().includes(search.toLowerCase())
  );

  const formatVideoUrl = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return url;
  };

  const handleVideoUrlChange = (url: string) => {
    setFormData({ ...formData, video_url: formatVideoUrl(url) });
  };

  const getYouTubeEmbedUrl = (url: string | null) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  if (user?.role !== 'trainer' && user?.role !== 'admin') {
    return (
      <div className="page-stack">
        <PageHeader title="Acceso denegado" subtitle="No tienes permiso para ver esta sección." />
        <Card padding="lg" className="text-center">
          <p className="text-sm text-zinc-500 mb-4">Contacta al administrador si crees que es un error.</p>
          <Link to="/" className="text-brand font-bold text-sm hover:underline">Volver al inicio</Link>
        </Card>
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
        title={<>Biblioteca de <span className="text-brand">ejercicios</span></>}
        subtitle="Catálogo de movimientos para rutinas"
        action={<BackToDashboardLink />}
      />

      <div className="flex items-center gap-2">
        <SearchInput
          containerClassName="flex-1 min-w-0"
          placeholder="Buscar por nombre o grupo muscular..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          size="sm"
          className="h-11 min-h-11 w-11 shrink-0 rounded-xl p-0 sm:w-auto sm:px-4 whitespace-nowrap"
          onClick={() => handleOpenModal()}
          aria-label="Nuevo ejercicio"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Nuevo</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
        {filteredExercises.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Dumbbell}
              title={search ? 'Sin resultados' : 'Sin ejercicios'}
              description={search ? `No hay ejercicios que coincidan con «${search}».` : 'Agrega movimientos al catálogo para usarlos en tus rutinas.'}
              action={
                !search ? (
                  <Button onClick={() => handleOpenModal()}>
                    <Plus className="h-4 w-4" />
                    Nuevo ejercicio
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : filteredExercises.map((exercise) => (
          <Card
            key={exercise.id}
            padding="sm"
            rounded="xl"
            className={`group hover:border-brand/40 transition-all ${expandedId === exercise.id ? 'sm:col-span-2 xl:col-span-3 ring-2 ring-brand/20' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className="p-2 bg-brand/10 rounded-lg shrink-0">
                  <Dumbbell className="h-4 w-4 text-brand dark:text-brand" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate leading-tight">
                    {exercise.name}
                  </h3>
                  <Badge variant="default" className="mt-1 text-[10px]">
                    {exercise.muscle_group}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenModal(exercise)}
                  className="h-9 w-9 inline-flex items-center justify-center text-zinc-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-all"
                  aria-label={`Editar ${exercise.name}`}
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setDeleteError(null); setDeleteTarget(exercise); }}
                  className="h-9 w-9 inline-flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  aria-label={`Eliminar ${exercise.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {exercise.description && (
              <p className={`mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-snug ${expandedId === exercise.id ? '' : 'line-clamp-2'}`}>
                {exercise.description}
              </p>
            )}

            {expandedId === exercise.id && (
              <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3 animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Video Section */}
                          {exercise.video_url && (
                            <div className="space-y-3">
                              <h4 className="label-caps flex items-center gap-2">
                                <Video className="h-3 w-3" /> Video demostrativo
                              </h4>
                              {getYouTubeEmbedUrl(exercise.video_url) ? (
                                <div className="aspect-video rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner bg-black">
                                  <iframe 
                                    src={getYouTubeEmbedUrl(exercise.video_url)!}
                                    className="w-full h-full"
                                    loading="lazy"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  ></iframe>
                                </div>
                              ) : exercise.video_url?.startsWith('/uploads/') || exercise.video_url?.startsWith('/api/files/videos/') ? (
                                <div className="aspect-video rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner bg-black">
                                  <video 
                                    src={resolveMediaUrl(exercise.video_url)}
                                    className="w-full h-full object-cover"
                                    controls
                                    playsInline
                                    preload="none"
                                  ></video>
                                </div>
                              ) : (
                                <a 
                                  href={exercise.video_url!} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 group/video h-full min-h-[160px]"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="p-4 brand-solid rounded-2xl shadow-lg shadow-zinc-900/20">
                                      <Video className="h-8 w-8" />
                                    </div>
                                    <div>
                                      <p className="text-lg font-semibold text-zinc-900 dark:text-white">Ver video tutorial</p>
                                      <p className="text-xs text-brand dark:text-brand font-medium">Enlace externo seguro</p>
                                    </div>
                                  </div>
                                  <ChevronRight className="h-6 w-6 text-brand group-hover:translate-x-1 transition-transform" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Execution Section */}
                          {exercise.execution && (
                            <div className="space-y-3">
                              <h4 className="label-caps flex items-center gap-2">
                                <BookOpen className="h-3 w-3" /> Guía de ejecución
                              </h4>
                              <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                <div className="space-y-4">
                                  {exercise.execution.split('\n').filter(line => line.trim()).map((step, idx) => (
                                    <div key={idx} className="flex gap-4">
                                      <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold rounded-lg">
                                        {idx + 1}
                                      </span>
                                      <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed pt-0.5 font-medium">
                                        {step.replace(/^\d+\.\s*/, '')}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
            )}

            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === exercise.id ? null : exercise.id)}
                className={`inline-flex items-center justify-center gap-1 rounded-lg text-xs font-semibold transition-all ${
                  expandedId === exercise.id
                    ? 'h-9 px-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                    : 'h-9 w-9 sm:w-auto sm:px-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800'
                }`}
                aria-label={expandedId === exercise.id ? 'Cerrar detalles' : 'Ver detalles'}
                title={expandedId === exercise.id ? 'Cerrar' : 'Ver detalles'}
              >
                <ChevronRight className={`h-4 w-4 sm:hidden ${expandedId === exercise.id ? 'rotate-90' : ''}`} />
                <span className="hidden sm:inline">{expandedId === exercise.id ? 'Cerrar' : 'Ver detalles'}</span>
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Eliminar ejercicio"
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
          ¿Eliminar <strong>{deleteTarget?.name}</strong>?
        </p>
        <p className="text-xs text-zinc-500 mb-6">
          No se podrá eliminar si está en alguna rutina.
        </p>
        {deleteError && (
          <p className="text-sm text-red-500 mb-4">{deleteError}</p>
        )}
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="xl"
        scrollable
        title={<>{editingExercise ? 'EDITAR' : 'NUEVO'} <span className="text-brand">EJERCICIO</span></>}
      >
            <form onSubmit={handleSubmit} className="page-stack">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Nombre del Ejercicio</Label>
                  <Input
                    required
                    type="text"
                    placeholder="Ej: Press de Banca"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grupo Muscular</Label>
                  <Select
                    value={formData.muscle_group}
                    onChange={(e) => setFormData({...formData, muscle_group: e.target.value})}
                  >
                    {['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core', 'Cardio', 'Full Body'].map(g => (
                      <option key={g} value={g}>{g}</option>
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
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Ejecución paso a paso</Label>
                <Textarea
                  rows={4}
                  value={formData.execution}
                  onChange={(e) => setFormData({...formData, execution: e.target.value})}
                />
              </div>

              <div className="space-y-4">
                <Label>Video del ejercicio</Label>
                <div className="relative">
                  <Video className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <Input
                    type="url"
                    className="pl-12 font-mono text-sm"
                    placeholder="Enlace de YouTube (opcional)..."
                    value={formData.video_url}
                    onChange={(e) => handleVideoUrlChange(e.target.value)}
                  />
                </div>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  id="video-upload"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="video-upload"
                  className="flex items-center justify-center gap-3 w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 cursor-pointer hover:border-brand/50 transition-all"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-xs font-medium">
                    {videoFile ? videoFile.name : 'Seleccionar video MP4/MOV'}
                  </span>
                </label>
              </div>

              {saveError && <p className="text-sm text-red-500">{saveError}</p>}
              <div className="pt-4 flex gap-4">
                <Button type="button" variant="ghost" className="flex-1" size="lg" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 min-h-[48px]" size="lg" disabled={saving}>
                  {saving ? 'Guardando...' : editingExercise ? 'Guardar cambios' : 'Crear ejercicio'}
                </Button>
              </div>
            </form>
      </Modal>
    </div>
  );
}
