import { useCallback, useEffect, useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { apiFetch, parseJsonResponse, toDisplayErrorMessage } from '../../lib/api';
import { Button, Card } from '../ui';
import { useToastOptional } from '../../context/ToastContext';

interface MeAttendance {
  is_inside: boolean;
  check_in_time: string | null;
}

/** Member self check-in/out when already at the gym (complements kiosk QR scan). */
export function MemberSelfCheckInCard() {
  const toast = useToastOptional();
  const [state, setState] = useState<MeAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch('/api/attendance/me');
      const data = await parseJsonResponse<MeAttendance>(res);
      setState(data);
    } catch {
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (action: 'in' | 'out') => {
    setBusy(true);
    try {
      const res = await apiFetch(
        action === 'in' ? '/api/attendance/self-check-in' : '/api/attendance/self-check-out',
        { method: 'POST' }
      );
      const data = await parseJsonResponse<{ message?: string; already_checked_in?: boolean }>(res);
      toast?.success(
        data.message || (action === 'in' ? 'Entrada registrada' : 'Salida registrada')
      );
      await refresh();
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err, 'No se pudo registrar asistencia'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  const inside = Boolean(state?.is_inside);

  return (
    <Card
      padding="sm"
      rounded="xl"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
          {inside ? 'Estás dentro del gym' : 'Marcar asistencia'}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {inside
            ? 'Cuando salgas, registra la salida aquí o en recepción.'
            : 'Úsalo en sede. También puedes mostrar tu QR en Perfil para el kiosco.'}
        </p>
      </div>
      {inside ? (
        <Button size="sm" variant="secondary" loading={busy} onClick={() => void act('out')}>
          <LogOut className="h-4 w-4" />
          Marcar salida
        </Button>
      ) : (
        <Button size="sm" loading={busy} onClick={() => void act('in')}>
          <LogIn className="h-4 w-4" />
          Marcar entrada
        </Button>
      )}
    </Card>
  );
}
