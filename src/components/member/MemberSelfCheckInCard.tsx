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

/** Compact self check-in/out row (secondary to training CTA on home). */
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
      <Card
        padding="md"
        rounded="xl"
        className="flex items-center gap-3.5"
        aria-busy="true"
        aria-label="Cargando asistencia"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </Card>
    );
  }

  const inside = Boolean(state?.is_inside);

  return (
    <Card padding="md" rounded="xl">
      <div className="flex items-center gap-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-text">
            {inside ? 'Dentro del gym' : 'Asistencia'}
          </p>
          <p className="mt-1 truncate text-[11px] leading-relaxed text-text-secondary">
            {inside ? (
              'Registra la salida al irte'
            ) : pinRequired ? (
              'PIN de recepción requerido'
            ) : (
              <>
                En sede ·{' '}
                <Link to="/profile?tab=carne" className="text-brand font-semibold hover:underline">
                  Carné QR
                </Link>
              </>
            )}
          </p>
        </div>
        {inside ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-10 shrink-0 px-3"
            loading={busy}
            onClick={() => void act('out')}
          >
            <LogOut className="h-3.5 w-3.5" />
            Salida
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-10 shrink-0 px-3"
            loading={busy}
            disabled={pinRequired && !pin.trim()}
            onClick={() => void act('in')}
          >
            <LogIn className="h-3.5 w-3.5" />
            Entrada
          </Button>
        )}
      </div>
      {!inside && pinRequired && (
        <div className="mt-3 max-w-[11rem]">
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
            className="h-9 text-sm"
          />
        </div>
      )}
    </Card>
  );
}
