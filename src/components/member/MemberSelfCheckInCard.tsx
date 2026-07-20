import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, LogOut } from 'lucide-react';
import { apiFetch, parseJsonResponse, toDisplayErrorMessage } from '../../lib/api';
import { Button, Card, Input, Label, Skeleton } from '../ui';
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
  const [pinRequired, setPinRequired] = useState(false);
  const [pin, setPin] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [attRes, pinRes] = await Promise.all([
        apiFetch('/api/attendance/me'),
        apiFetch('/api/settings/check-in-pin/required'),
      ]);
      const data = await parseJsonResponse<MeAttendance>(attRes);
      setState(data);
      if (pinRes.ok) {
        const pinData = await parseJsonResponse<{ require_self_check_in_pin?: boolean }>(pinRes);
        setPinRequired(Boolean(pinData.require_self_check_in_pin));
      }
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
        {
          method: 'POST',
          headers: action === 'in' ? { 'Content-Type': 'application/json' } : undefined,
          body: action === 'in' ? JSON.stringify({ pin }) : undefined,
        }
      );
      const data = await parseJsonResponse<{
        message?: string;
        already_checked_in?: boolean;
        error?: string;
        pin_required?: boolean;
      }>(res);
      if (!res.ok) {
        toast?.error(data.error || 'No se pudo registrar asistencia');
        if (data.pin_required) setPinRequired(true);
        return;
      }
      toast?.success(
        data.message || (action === 'in' ? 'Entrada registrada' : 'Salida registrada')
      );
      setPin('');
      await refresh();
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err, 'No se pudo registrar asistencia'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Card padding="sm" rounded="xl" aria-busy="true" aria-label="Cargando asistencia">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </Card>
    );
  }

  const inside = Boolean(state?.is_inside);

  return (
    <Card
      padding="sm"
      rounded="xl"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
          {inside ? 'Estás dentro del gym' : 'Marcar asistencia'}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {inside ? (
            'Cuando salgas, registra la salida aquí o en recepción.'
          ) : pinRequired ? (
            'Pide el PIN del día en recepción para confirmar que estás en sede.'
          ) : (
            <>
              Úsalo en sede. También puedes mostrar tu QR en{' '}
              <Link to="/profile?tab=carne" className="text-brand font-semibold hover:underline">
                Perfil → Carné
              </Link>{' '}
              en recepción.
            </>
          )}
        </p>
        {!inside && pinRequired && (
          <div className="mt-2 max-w-[12rem]">
            <Label htmlFor="self-check-in-pin" className="sr-only">
              PIN de presencia
            </Label>
            <Input
              id="self-check-in-pin"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="PIN del día"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="h-9"
            />
          </div>
        )}
      </div>
      {inside ? (
        <Button size="sm" variant="secondary" loading={busy} onClick={() => void act('out')}>
          <LogOut className="h-4 w-4" />
          Marcar salida
        </Button>
      ) : (
        <Button
          size="sm"
          loading={busy}
          disabled={pinRequired && !pin.trim()}
          onClick={() => void act('in')}
        >
          <LogIn className="h-4 w-4" />
          Marcar entrada
        </Button>
      )}
    </Card>
  );
}
