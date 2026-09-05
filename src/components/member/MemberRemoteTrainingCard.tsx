import { useCallback, useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { apiFetch, parseJsonResponse, toDisplayErrorMessage } from '../../lib/api';
import { Button, Card, Skeleton } from '../ui';
import { useToastOptional } from '../../context/ToastContext';

interface MeAttendance {
  remote_training?: boolean;
  remote_started_at?: string | null;
}

/**
 * Confirma entrenamiento fuera del gym (sin PIN de instalaciones).
 * Visible para el entrenador en el panel — no afecta ocupación del gym.
 */
export function MemberRemoteTrainingCard() {
  const toast = useToastOptional();
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch('/api/attendance/me');
      const data = await parseJsonResponse<MeAttendance>(res);
      setActive(Boolean(data.remote_training));
    } catch {
      setActive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (action: 'start' | 'end') => {
    setBusy(true);
    try {
      const res = await apiFetch(
        action === 'start' ? '/api/attendance/remote-start' : '/api/attendance/remote-end',
        { method: 'POST' }
      );
      const data = await parseJsonResponse<{ message?: string; error?: string }>(res);
      if (!res.ok) {
        toast?.error(data.error || 'No se pudo actualizar el entrenamiento remoto');
        return;
      }
      toast?.success(
        data.message ||
          (action === 'start' ? 'Entrenamiento remoto iniciado' : 'Entrenamiento remoto finalizado')
      );
      await refresh();
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err, 'No se pudo actualizar el entrenamiento remoto'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Card
        padding="md"
        rounded="xl"
        className="flex items-center gap-3.5"
        aria-busy="true"
        aria-label="Cargando entrenamiento remoto"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </Card>
    );
  }

  return (
    <Card padding="md" rounded="xl" className="flex items-center gap-3.5">
      <div
        className={
          active
            ? 'bg-brand/15 text-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-xl'
            : 'bg-surface-raised text-text-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl'
        }
        aria-hidden
      >
        <Radio className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-text text-sm leading-snug font-semibold">
          {active ? 'Entrenando ahora (remoto)' : 'Entrenamiento fuera del gym'}
        </p>
        <p className="text-text-secondary text-small mt-0.5 leading-relaxed">
          {active
            ? 'Tu entrenador ya puede ver que estás en sesión. Sin PIN del gym.'
            : 'Si no estás en las instalaciones, confirma aquí para que tu entrenador lo sepa.'}
        </p>
      </div>
      <Button
        size="sm"
        variant={active ? 'secondary' : 'primary'}
        disabled={busy}
        onClick={() => void act(active ? 'end' : 'start')}
      >
        {busy ? '…' : active ? 'Terminar' : 'Estoy entrenando'}
      </Button>
    </Card>
  );
}
