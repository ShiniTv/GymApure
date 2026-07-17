import { useEffect, useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { apiFetch, parseJsonResponse, toDisplayErrorMessage } from '../../lib/api';
import { Button, Input, Label, Modal, Badge, EmptyState, Spinner } from '../ui';
import type { Trainer } from '../../hooks/queries/useTrainersQuery';

interface AssignedMember {
  id: number;
  full_name: string;
  email: string;
  cedula: string | null;
  assigned_at: string;
  notes: string | null;
  has_active_routine: boolean;
}

interface MemberOption {
  id: number;
  full_name: string;
  cedula: string | null;
}

interface TrainerMembersModalProps {
  trainer: Trainer | null;
  open: boolean;
  onClose: () => void;
  onToast?: (msg: string, type?: 'success' | 'error') => void;
}

export function TrainerMembersModal({ trainer, open, onClose, onToast }: TrainerMembersModalProps) {
  const [members, setMembers] = useState<AssignedMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<MemberOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadMembers = async (trainerId: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/trainers/${trainerId}/members`);
      const data = await parseJsonResponse<AssignedMember[]>(res);
      setMembers(data);
    } catch (err) {
      setError(toDisplayErrorMessage(err, 'No se pudieron cargar los miembros'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && trainer) {
      void loadMembers(trainer.id);
      setSearch('');
      setSelectedId('');
      setOptions([]);
    }
  }, [open, trainer]);

  useEffect(() => {
    if (!open || search.trim().length < 2) {
      setOptions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await apiFetch(
            `/api/users/options?role=member&q=${encodeURIComponent(search.trim())}`
          );
          const data = await parseJsonResponse<MemberOption[]>(res);
          const assigned = new Set(members.map((m) => m.id));
          setOptions(data.filter((m) => !assigned.has(m.id)));
        } catch {
          setOptions([]);
        }
      })();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [search, open, members]);

  const assign = async () => {
    if (!trainer || !selectedId) return;
    setSaving(true);
    setError('');
    try {
      const res = await apiFetch(`/api/trainers/${trainer.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: Number(selectedId) }),
      });
      await parseJsonResponse(res);
      onToast?.('Miembro vinculado al entrenador', 'success');
      setSelectedId('');
      setSearch('');
      await loadMembers(trainer.id);
    } catch (err) {
      setError(toDisplayErrorMessage(err, 'No se pudo vincular'));
    } finally {
      setSaving(false);
    }
  };

  const unassign = async (memberId: number) => {
    if (!trainer) return;
    setSaving(true);
    setError('');
    try {
      const res = await apiFetch(`/api/trainers/${trainer.id}/members/${memberId}`, {
        method: 'DELETE',
      });
      await parseJsonResponse(res);
      onToast?.('Miembro desvinculado', 'success');
      await loadMembers(trainer.id);
    } catch (err) {
      setError(toDisplayErrorMessage(err, 'No se pudo desvincular'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={trainer ? `Miembros de ${trainer.full_name}` : 'Miembros'}
      maxWidth="lg"
    >
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Vincula miembros al turno del entrenador antes de crear rutinas. El entrenador solo verá a
        estos clientes.
      </p>

      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mb-4 space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
        <Label htmlFor="assign-member-search">Vincular miembro</Label>
        <Input
          id="assign-member-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o cédula…"
        />
        {options.length > 0 && (
          <select
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">Seleccionar…</option>
            {options.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
                {m.cedula ? ` (${m.cedula})` : ''}
              </option>
            ))}
          </select>
        )}
        <Button
          type="button"
          size="sm"
          onClick={() => void assign()}
          disabled={!selectedId || saving}
          loading={saving}
        >
          <UserPlus className="h-4 w-4" />
          Vincular
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="Sin miembros vinculados"
          description="Busca y vincula el primero."
        />
      ) : (
        <ul className="max-h-72 divide-y divide-zinc-200 overflow-y-auto dark:divide-zinc-800">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                  {m.full_name}
                </p>
                <p className="truncate text-xs text-zinc-500">{m.cedula || m.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {m.has_active_routine ? (
                  <Badge variant="success">Con rutina</Badge>
                ) : (
                  <Badge variant="warning">Sin rutina</Badge>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Desvincular ${m.full_name}`}
                  onClick={() => void unassign(m.id)}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
