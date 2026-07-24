import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { Pencil, Trash2, StickyNote } from 'lucide-react';
import { Button, EmptyState, Spinner, Textarea } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToastOptional } from '../../context/ToastContext';
import { toDisplayErrorMessage } from '../../lib/api';
import {
  useCoachNotesQuery,
  useCreateCoachNote,
  useDeleteCoachNote,
  useUpdateCoachNote,
} from '../../hooks/queries/useCoachNotesQuery';

interface MemberCoachNotesPanelProps {
  memberId: number;
}

export function MemberCoachNotesPanel({ memberId }: MemberCoachNotesPanelProps) {
  const { user } = useAuth();
  const toast = useToastOptional();
  const { data, isPending, isError, refetch } = useCoachNotesQuery(memberId);
  const createNote = useCreateCoachNote(memberId);
  const updateNote = useUpdateCoachNote(memberId);
  const deleteNote = useDeleteCoachNote(memberId);

  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState('');

  const notes = data?.items ?? [];

  const submit = async () => {
    const body = draft.trim();
    if (!body || createNote.isPending) return;
    try {
      await createNote.mutateAsync(body);
      setDraft('');
      toast?.success('Nota guardada');
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err, 'No se pudo guardar la nota'));
    }
  };

  const saveEdit = async () => {
    if (editingId == null || updateNote.isPending) return;
    const body = editBody.trim();
    if (!body) return;
    try {
      await updateNote.mutateAsync({ noteId: editingId, body });
      setEditingId(null);
      setEditBody('');
      toast?.success('Nota actualizada');
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err, 'No se pudo actualizar'));
    }
  };

  const remove = async (noteId: number) => {
    if (deleteNote.isPending) return;
    try {
      await deleteNote.mutateAsync(noteId);
      if (editingId === noteId) {
        setEditingId(null);
        setEditBody('');
      }
      toast?.success('Nota eliminada');
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err, 'No se pudo eliminar'));
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-zinc-200/70 bg-white/80 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/50">
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          Nueva nota (solo staff)
        </p>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Observaciones de la sesión, técnica, dolores, siguiente foco…"
          rows={3}
          className="min-h-[5rem]"
        />
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            disabled={!draft.trim() || createNote.isPending}
            onClick={() => void submit()}
          >
            {createNote.isPending ? 'Guardando…' : 'Guardar nota'}
          </Button>
        </div>
      </div>

      {isPending ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : isError ? (
        <EmptyState
          icon={StickyNote}
          title="No se pudieron cargar las notas"
          description="Revisa tu conexión e inténtalo de nuevo."
          action={
            <Button size="sm" variant="secondary" onClick={() => void refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="Sin notas aún"
          description="Registra observaciones después de entrenar con este miembro."
        />
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => {
            const canEdit = user?.role === 'admin' || user?.id === note.author_id;
            const isEditing = editingId === note.id;
            return (
              <li
                key={note.id}
                className="rounded-xl border border-zinc-200/70 bg-white/80 px-3 py-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/50"
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-zinc-800 dark:text-zinc-100">
                      {note.author_name}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {format(parseISO(note.created_at), 'd MMM yyyy · HH:mm', { locale: es })}
                      {note.updated_at !== note.created_at ? ' · editada' : ''}
                    </p>
                  </div>
                  {canEdit ? (
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                        aria-label="Editar nota"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditBody(note.body);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-500"
                        aria-label="Eliminar nota"
                        onClick={() => void remove(note.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingId(null);
                          setEditBody('');
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        disabled={!editBody.trim() || updateNote.isPending}
                        onClick={() => void saveEdit()}
                      >
                        Guardar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                    {note.body}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
