import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { Pencil, Trash2, StickyNote } from 'lucide-react';
import { Button, EmptyState, IconButton, Spinner, Textarea } from '../../components/ui';
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
      <div className="border-border bg-surface rounded-xl border p-3">
        <p className="text-text-muted text-small mb-2 font-semibold tracking-wide uppercase">
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
        <div className="flex justify-center py-6">
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
              <li key={note.id} className="border-border bg-surface rounded-xl border px-3 py-2.5">
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-text text-small truncate font-semibold">
                      {note.author_name}
                    </p>
                    <p className="text-text-muted text-small">
                      {format(parseISO(note.created_at), 'd MMM yyyy · HH:mm', { locale: es })}
                      {note.updated_at !== note.created_at ? ' · editada' : ''}
                    </p>
                  </div>
                  {canEdit ? (
                    <div className="flex shrink-0 gap-1">
                      <IconButton
                        size="sm"
                        variant="tertiary"
                        aria-label="Editar nota"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditBody(note.body);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        size="sm"
                        variant="danger"
                        aria-label="Eliminar nota"
                        onClick={() => void remove(note.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
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
                  <p className="text-text text-sm leading-relaxed whitespace-pre-wrap">
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
