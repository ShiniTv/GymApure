import React, { useState, useEffect } from 'react';
import { apiFetch, parseJsonResponse, resolveMediaUrl } from '../lib/api';
import { Plus, Search, Trash2, Edit, Video, BookOpen, Dumbbell, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input, Label, Modal, PageHeader } from '../components/ui';
import { clientLogger } from '../lib/clientLogger';

interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
  description: string | null;
  execution: string | null;
  video_url: string | null;
}

export default function Exercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  useEffect(() => {
    apiFetchExercises();
  }, []);

  const apiFetchExercises = async () => {
    try {
      const res = await apiFetch('/api/exercises');
      const data = await parseJsonResponse<Exercise[]>(res);
      setExercises(Array.isArray(data) ? data : []);
    } catch (err) {
      clientLogger.error('Failed to fetch exercises', err);
      setExercises([]);
    }
  };

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      apiFetchExercises();
    } catch (err) {
      clientLogger.error('Failed to save exercise', err);
      alert(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este ejercicio? No se podrá eliminar si está en alguna rutina.')) return;

    try {
      const res = await apiFetch(`/api/exercises/${id}`, { method: 'DELETE' });
      await parseJsonResponse(res);
      apiFetchExercises();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
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
    return <div className="p-8 text-center">Acceso denegado.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={<>BIBLIOTECA <span className="text-orange-500">EJERCICIOS</span></>}
        subtitle="Gestiona la base de datos de ejercicios del gimnasio"
        action={
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-5 w-5" />
            Nuevo Ejercicio
          </Button>
        }
      />

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
        <input 
          type="text"
          placeholder="Buscar ejercicio por nombre o grupo muscular..."
          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExercises.map((exercise) => (
          <div key={exercise.id} className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden group hover:border-orange-500/50 transition-all shadow-sm hover:shadow-xl ${expandedId === exercise.id ? 'col-span-full ring-2 ring-orange-500/20' : ''}`}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl group-hover:bg-orange-500/10 transition-colors">
                  <Dumbbell className="h-6 w-6 text-zinc-400 group-hover:text-orange-500" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleOpenModal(exercise)} className="p-2 text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-xl transition-all">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(exercise.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-tight">{exercise.name}</h3>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-1 rounded-lg">
                      {exercise.muscle_group}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {exercise.description && (
                      <div className="flex gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                        <BookOpen className="h-4 w-4 shrink-0 mt-0.5" />
                        <p className={expandedId === exercise.id ? '' : 'line-clamp-2'}>
                          {exercise.description}
                        </p>
                      </div>
                    )}
                    
                    {expandedId === exercise.id && (
                      <div className="mt-8 space-y-8 animate-in slide-in-from-top-4 duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Video Section */}
                          {exercise.video_url && (
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
                                <Video className="h-3 w-3" /> VIDEO DEMOSTRATIVO
                              </h4>
                              {getYouTubeEmbedUrl(exercise.video_url) ? (
                                <div className="aspect-video rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner bg-black">
                                  <iframe 
                                    src={getYouTubeEmbedUrl(exercise.video_url)!}
                                    className="w-full h-full"
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
                                  ></video>
                                </div>
                              ) : (
                                <a 
                                  href={exercise.video_url!} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between p-6 bg-orange-50 dark:bg-orange-950/20 rounded-3xl border border-orange-100 dark:border-orange-900/30 group/video h-full min-h-[160px]"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="p-4 bg-orange-500 rounded-2xl text-white shadow-lg shadow-orange-500/20">
                                      <Video className="h-8 w-8" />
                                    </div>
                                    <div>
                                      <p className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tighter">VER VIDEO TUTORIAL</p>
                                      <p className="text-[10px] text-orange-600 dark:text-orange-400 font-black uppercase tracking-widest">Enlace Externo Segurizado</p>
                                    </div>
                                  </div>
                                  <ChevronRight className="h-6 w-6 text-orange-500 group-hover:translate-x-1 transition-transform" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Execution Section */}
                          {exercise.execution && (
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
                                <BookOpen className="h-3 w-3" /> GUÍA DE EJECUCIÓN
                              </h4>
                              <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                <div className="space-y-4">
                                  {exercise.execution.split('\n').filter(line => line.trim()).map((step, idx) => (
                                    <div key={idx} className="flex gap-4">
                                      <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black rounded-lg">
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

                    <div className="flex items-center justify-end pt-2">
                      <button 
                        onClick={() => setExpandedId(expandedId === exercise.id ? null : exercise.id)}
                        className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${
                          expandedId === exercise.id 
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' 
                            : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800'
                        }`}
                      >
                        {expandedId === exercise.id ? 'Cerrar Detalles' : 'Ver Detalles'}
                      </button>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="xl"
        scrollable
        title={<>{editingExercise ? 'EDITAR' : 'NUEVO'} <span className="text-orange-500">EJERCICIO</span></>}
      >
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  <select
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold"
                    value={formData.muscle_group}
                    onChange={(e) => setFormData({...formData, muscle_group: e.target.value})}
                  >
                    {['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core', 'Cardio', 'Full Body'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <textarea
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                  placeholder="Describe brevemente el objetivo del ejercicio..."
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Ejecución paso a paso</Label>
                <textarea
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
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
                  className="flex items-center justify-center gap-3 w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 cursor-pointer hover:border-orange-500/50 transition-all"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-xs font-black uppercase">
                    {videoFile ? videoFile.name : 'Seleccionar video MP4/MOV'}
                  </span>
                </label>
              </div>

              <div className="pt-4 flex gap-4">
                <Button type="button" variant="ghost" className="flex-1" size="lg" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" size="lg">
                  {editingExercise ? 'Guardar cambios' : 'Crear ejercicio'}
                </Button>
              </div>
            </form>
      </Modal>
    </div>
  );
}
