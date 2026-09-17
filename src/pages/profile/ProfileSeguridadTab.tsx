import React, { FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { Bell, Download, Lock, ShieldCheck, Trash2, Key, Shield } from 'lucide-react';
import { Button, Label, PasswordInput, passwordStrength } from '../../components/ui';
import { PushNotificationsToggle } from '../../components/PushNotificationsToggle';
import { useAuth } from '../../context/AuthContext';
import { useToastOptional } from '../../context/ToastContext';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { PasswordFormState } from './types';
import { CARD_PADDING, GRID_ASYMMETRIC, cn } from './ProfileDesignSystem';

interface ProfileSeguridadTabProps {
  role: string;
  passwordForm: PasswordFormState;
  setPasswordForm: (form: PasswordFormState) => void;
  passwordSaving: boolean;
  passwordError: string;
  onChangePassword: (e: FormEvent) => void;
}

function PasswordStrengthMeter({ strength }: { strength: ReturnType<typeof passwordStrength> }) {
  const colors = ['bg-danger', 'bg-warning', 'bg-success', 'bg-success'];
  const width = ['25%', '50%', '75%', '100%'];

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">Fuerza de la contraseña</span>
        <span className="text-text font-semibold">{strength.label}</span>
      </div>
      <div className="bg-surface h-1.5 w-full overflow-hidden rounded-full">
        <div
          className={cn('h-full transition-all duration-300', colors[strength.score] || colors[0])}
          style={{ width: width[strength.score] || width[0] }}
        />
      </div>
      <p className="text-text-muted text-xs">
        {strength.score === 0
          ? 'Muy débil - usa más caracteres y variedad'
          : strength.score === 1
            ? 'Débil - añade números y símbolos'
            : strength.score === 2
              ? 'Aceptable - mezcla mayúsculas, números y símbolos'
              : strength.score === 3
                ? 'Fuerte - buena combinación de caracteres'
                : 'Muy fuerte - excelente seguridad'}
      </p>
    </div>
  );
}

export function ProfileSeguridadTab({
  role,
  passwordForm,
  setPasswordForm,
  passwordSaving,
  passwordError,
  onChangePassword,
}: ProfileSeguridadTabProps) {
  const { logoutLocal } = useAuth();
  const toast = useToastOptional();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const strength = passwordStrength(passwordForm.new_password);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await apiFetch('/api/me/data-export');
      const data = await parseJsonResponse<Record<string, unknown>>(res);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gymapure-datos-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast?.success('Exportación descargada correctamente');
    } catch (err) {
      toast?.error(err instanceof Error ? err.message : 'No se pudo exportar los datos');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await apiFetch('/api/me/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      await parseJsonResponse<{ ok: boolean }>(res);
      toast?.success('Cuenta cerrada y anonimizada');
      logoutLocal();
      window.location.assign('/login');
    } catch (err) {
      toast?.error(err instanceof Error ? err.message : 'No se pudo cerrar la cuenta');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className={GRID_ASYMMETRIC}>
      {/* Columna Izquierda: Contraseña */}
      <div
        className={cn(
          'space-y-4',
          CARD_PADDING,
          'border',
          'border-border/80',
          'bg-surface',
          'rounded-xl'
        )}
      >
        <div className="flex items-center gap-2">
          <Lock className="text-brand h-5 w-5" />
          <h3 className="text-text text-lg font-semibold tracking-[-0.01em]">Cambiar Contraseña</h3>
        </div>
        <p className="text-text-muted text-sm">
          Usa al menos 8 caracteres combinando letras, números y símbolos
        </p>

        <form onSubmit={onChangePassword} className="space-y-4">
          {passwordError && (
            <div className="bg-danger/10 border-danger/30 text-danger flex items-center gap-2 rounded-xl border p-3 text-sm font-medium">
              <svg
                className="h-4 w-4 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {passwordError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-text text-sm font-medium">
              Contraseña actual
            </Label>
            <PasswordInput
              id="current-password"
              value={passwordForm.current_password}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, current_password: e.target.value })
              }
              required
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-text text-sm font-medium">
              Nueva contraseña
            </Label>
            <PasswordInput
              id="new-password"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              required
              autoComplete="new-password"
            />
            {passwordForm.new_password && <PasswordStrengthMeter strength={strength} />}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-text text-sm font-medium">
              Confirmar nueva contraseña
            </Label>
            <PasswordInput
              id="confirm-password"
              value={passwordForm.confirm_password}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
              }
              required
              autoComplete="new-password"
            />
          </div>

          <div className="border-border/50 border-t pt-3">
            <Button
              type="submit"
              disabled={
                passwordSaving ||
                !passwordForm.current_password ||
                !passwordForm.new_password ||
                passwordForm.new_password !== passwordForm.confirm_password
              }
              className="w-full gap-2 shadow-sm"
            >
              <Lock className="h-4 w-4" />
              <span>{passwordSaving ? 'Actualizando…' : 'Actualizar contraseña'}</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Columna Derecha: 2FA, Notificaciones y Privacidad */}
      <div className="space-y-4">
        {/* Notificaciones Push */}
        <div
          className={cn(
            'space-y-3',
            CARD_PADDING,
            'border',
            'border-border/80',
            'bg-surface',
            'rounded-xl'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="bg-brand/10 rounded-xl p-2">
              <Bell className="text-brand h-5 w-5" />
            </div>
            <div>
              <h3 className="text-text text-lg font-semibold tracking-[-0.01em]">
                Notificaciones Push
              </h3>
              <p className="text-text-muted text-sm">
                Recibe avisos sobre pagos, confirmaciones y mensajes en este dispositivo
              </p>
            </div>
          </div>
          <PushNotificationsToggle />
        </div>

        {/* Autenticación en dos pasos (Staff / Admin / Trainer) */}
        {role !== 'member' && (
          <div
            className={cn(
              'space-y-3',
              CARD_PADDING,
              'border',
              'border-border/80',
              'bg-surface',
              'rounded-xl'
            )}
          >
            <div className="flex items-center gap-2">
              <div className="bg-brand/10 rounded-xl p-2">
                <ShieldCheck className="text-brand h-5 w-5" />
              </div>
              <div>
                <h3 className="text-text text-lg font-semibold tracking-[-0.01em]">
                  Verificación en Dos Pasos (MFA)
                </h3>
                <p className="text-text-muted text-sm">
                  Protege el acceso a tu cuenta mediante códigos de autenticador (Google
                  Authenticator, Authy, etc.)
                </p>
              </div>
            </div>
            <Link
              to="/security"
              className="bg-surface border-border/50 text-text hover:bg-surface-raised hover:border-brand/40 inline-flex items-center gap-2 rounded-xl border px-4 py-3 font-semibold transition-all"
            >
              <div className="bg-brand/10 rounded-lg p-2">
                <Key className="text-brand h-5 w-5" />
              </div>
              <span>Gestionar seguridad y llaves 2FA</span>
            </Link>
          </div>
        )}

        {/* Privacidad y Datos RGPD */}
        <div
          className={cn(
            'space-y-3',
            CARD_PADDING,
            'border',
            'border-border/80',
            'bg-surface',
            'rounded-[var(--radius-card)]',
            'border-danger/30',
            'bg-danger/5'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="bg-danger/10 rounded-[var(--radius-card)] p-2">
              <Shield className="text-danger h-5 w-5" />
            </div>
            <div>
              <h3 className="text-text text-lg font-semibold tracking-[-0.01em]">
                Tus Datos y Privacidad
              </h3>
              <p className="text-text-muted text-sm">
                Descarga una copia completa de tu información o solicita la anonimización de tu
                cuenta
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <Button
              type="button"
              variant="secondary"
              disabled={exporting}
              onClick={() => void handleExport()}
              className="w-full justify-start gap-3"
            >
              <div className="bg-surface border-border/50 rounded-lg border p-2">
                <Download className="text-text-muted h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-text font-medium">Exportar mis datos (JSON)</p>
                <p className="text-text-muted text-xs">
                  Descarga una copia completa de tu información
                </p>
              </div>
            </Button>

            <Button
              type="button"
              variant={confirmDelete ? 'danger' : 'secondary'}
              disabled={deleting}
              onClick={() => void handleDeleteAccount()}
              className="w-full justify-start gap-3"
            >
              <div className="bg-surface border-border/50 rounded-lg border p-2">
                <Trash2
                  className={confirmDelete ? 'text-danger h-5 w-5' : 'text-text-muted h-5 w-5'}
                />
              </div>
              <div className="text-left">
                <p className={confirmDelete ? 'text-danger font-medium' : 'text-text font-medium'}>
                  {confirmDelete ? 'Confirmar cierre de cuenta' : 'Cerrar cuenta'}
                </p>
                <p className="text-text-muted text-xs">
                  {confirmDelete
                    ? 'Esta acción es irreversible'
                    : 'Anonimiza tu cuenta permanentemente'}
                </p>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
