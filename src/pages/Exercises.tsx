import React, { useState, useEffect } from 'react';
import { apiFetch, resolveMediaUrl } from '../lib/api';
import { Plus, Search, Trash2, Edit, X, Video, BookOpen, Dumbbell, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
      const data = await res.json();
      if (Array.isArray(data)) {
        setExercises(data);
      } else {
        setExercises([]);
      }
    } catch (err) {
      console.error(err);
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
      const res = await apiFetch(url, {
        method,
        body: data,
      });

      if (res.ok) {
        setIsModalOpen(false);
        apiFetchExercises();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este ejercicio? No se podrá eliminar si está en alguna rutina.')) return;

    try {
      const res = await apiFetch(`/api/exercises/${id}`, { method: 'DELETE' });
      if (res.ok) {
        apiFetchExercises();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al eliminar');
      }
    } catch (err) {
      console.error(err);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase">
            BIBLIOTECA <span className="text-orange-500">EJERCICIOS</span>
          </h1>
          <p className="text-zinc-500 font-medium">Gestiona la base de datos de ejercicios del gimnasio</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-orange-900/20 active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Nuevo Ejercicio
        </button>
      </div>

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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white dark:bg-zinc-900 px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center z-10">
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase">
                {editingExercise ? 'EDITAR' : 'NUEVO'} <span className="text-orange-500">EJERCICIO</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Nombre del Ejercicio</label>
                  <input 
                    required
                    type="text"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                    placeholder="Ej: Press de Banca"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Grupo Muscular</label>
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
                <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Descripción (Vibe del ejercicio)</label>
                <textarea 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                  placeholder="Describe brevemente el objetivo del ejercicio..."
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Ejecución Paso a Paso</label>
                <textarea 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                  placeholder="1. Colócate en posición...
2. Baja lentamente...
3. Empuja con fuerza..."
                  rows={4}
                  value={formData.execution}
                  onChange={(e) => setFormData({...formData, execution: e.target.value})}
                ></textarea>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Video del Ejercicio</label>
                  <div className="flex flex-col gap-4">
                    <div className="relative">
                      <Video className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                      <input 
                        type="url"
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl pl-12 pr-4 py-3 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all font-mono text-sm placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                        placeholder="Enlace de YouTube (opcional)..."
                        value={formData.video_url}
                        onChange={(e) => handleVideoUrlChange(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800"></div>
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ó subir archivo</span>
                      <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800"></div>
                    </div>
                    <div className="relative">
                      <input 
                        type="file"
                        accept="video/*"
                        className="hidden"
                        id="video-upload"
                        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                      />
                      <label 
                        htmlFor="video-upload"
                        className="flex items-center justify-center gap-3 w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 cursor-pointer hover:border-orange-500/50 transition-all group"
                      >
                        <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl shadow-sm group-hover:text-orange-500 transition-colors">
                          <Plus className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                            {videoFile ? videoFile.name : 'Seleccionar Video MP4/MOV'}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Máx 100MB recomendado</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 py-4 rounded-2xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-orange-900/20 active:scale-95"
                >
                  {editingExercise ? 'GUARDAR CAMBIOS' : 'CREAR EJERCICIO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
