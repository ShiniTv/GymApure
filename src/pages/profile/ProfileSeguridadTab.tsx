import React, { FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { Bell, Download, Lock, ShieldCheck, Trash2, Key } from 'lucide-react';
import { Button, Label, PasswordInput, passwordStrength } from '../../components/ui';
import { PushNotificationsToggle } from '../../components/PushNotificationsToggle';
import { useAuth } from '../../context/AuthContext';
import { useToastOptional } from '../../context/ToastContext';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { PasswordFormState } from './types';

interface ProfileSeguridadTabProps {
  role: string;
  passwordForm: PasswordFormState;
  setPasswordForm: (form: PasswordFormState) => void;
  passwordSaving: boolean;
  passwordError: string;
  onChangePassword: (e: FormEvent) => void;
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
    <div className="grid w-full gap-4 md:grid-cols-2 md:items-start">
      {/* Columna Izquierda: Contraseña */}
      <div className="space-y-4">
        <form
          onSubmit={onChangePassword}
          className="border-border/70 bg-surface rounded-2xl border p-4 shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <Lock className="text-brand h-4 w-4" />
            <h2 className="text-text text-sm font-bold tracking-tight">Cambiar Contraseña</h2>
          </div>
          <p className="text-text-muted mt-0.5 text-xs">
            Usa al menos 8 caracteres combinando letras, números y símbolos
          </p>

          {passwordError && (
            <div className="bg-danger/10 border-danger/30 text-danger mt-3 rounded-xl border p-2.5 text-xs font-semibold">
              {passwordError}
            </div>
          )}

          <div className="mt-3.5 space-y-3">
            <div>
              <Label className="text-text text-xs font-semibold">Contraseña actual</Label>
              <PasswordInput
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, current_password: e.target.value })
                }
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-text text-xs font-semibold">Nueva contraseña</Label>
              <PasswordInput
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                required
                className="mt-1"
              />
              {passwordForm.new_password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-muted">Fuerza:</span>
                    <span className="text-text font-semibold">{strength.label}</span>
                  </div>
                  <div className="bg-surface-raised mt-1 h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className={`h-full transition-all duration-300 ${
                        strength.score <= 1
                          ? 'w-1/4 bg-rose-500'
                          : strength.score === 2
                            ? 'w-2/4 bg-amber-500'
                            : strength.score === 3
                              ? 'w-3/4 bg-emerald-500'
                              : 'w-full bg-emerald-600'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label className="text-text text-xs font-semibold">Confirmar nueva contraseña</Label>
              <PasswordInput
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                }
                required
                className="mt-1"
              />
            </div>
          </div>

          <div className="border-border/60 mt-4 flex justify-end border-t pt-3">
            <Button
              type="submit"
              disabled={
                passwordSaving ||
                !passwordForm.current_password ||
                !passwordForm.new_password ||
                passwordForm.new_password !== passwordForm.confirm_password
              }
              className="text-xs font-semibold shadow-xs"
            >
              {passwordSaving ? 'Actualizando…' : 'Actualizar contraseña'}
            </Button>
          </div>
        </form>
      </div>

      {/* Columna Derecha: 2FA, Notificaciones y Privacidad */}
      <div className="space-y-4">
        {/* Notificaciones Push */}
        <div className="border-border/70 bg-surface rounded-2xl border p-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <Bell className="text-brand h-4 w-4" />
            <h2 className="text-text text-sm font-bold tracking-tight">Notificaciones Push</h2>
          </div>
          <p className="text-text-muted mt-0.5 text-xs">
            Recibe avisos sobre pagos, confirmaciones y mensajes en este dispositivo
          </p>
          <div className="mt-3">
            <PushNotificationsToggle />
          </div>
        </div>

        {/* Autenticación en dos pasos (Staff / Admin / Trainer) */}
        {role !== 'member' && (
          <div className="border-border/70 bg-surface rounded-2xl border p-4 shadow-2xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-brand h-4 w-4" />
              <h2 className="text-text text-sm font-bold tracking-tight">
                Verificación en Dos Pasos (MFA)
              </h2>
            </div>
            <p className="text-text-muted mt-0.5 text-xs">
              Protege el acceso a tu cuenta mediante códigos de autenticador (Google Authenticator,
              Authy, etc.)
            </p>
            <div className="mt-3">
              <Link
                to="/security"
                className="bg-surface-raised border-border/80 text-text hover:bg-surface-raised/80 hover:border-brand/40 inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all"
              >
                <Key className="text-brand h-3.5 w-3.5" />
                <span>Gestionar seguridad y llaves 2FA →</span>
              </Link>
            </div>
          </div>
        )}

        {/* Privacidad y Datos RGPD */}
        <div className="border-border/70 bg-surface rounded-2xl border p-4 shadow-2xs">
          <h2 className="text-text text-sm font-bold tracking-tight">Tus Datos y Privacidad</h2>
          <p className="text-text-muted mt-0.5 text-xs">
            Descarga una copia completa de tu información o solicita la anonimización de tu cuenta
          </p>

          <div className="mt-3.5 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={exporting}
              onClick={() => void handleExport()}
              className="gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{exporting ? 'Descargando…' : 'Exportar mis datos (JSON)'}</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={deleting}
              onClick={() => void handleDeleteAccount()}
              className={`gap-1.5 text-xs ${confirmDelete ? 'border-danger text-danger bg-danger/10' : ''}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{confirmDelete ? 'Confirmar cierre de cuenta' : 'Cerrar cuenta'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
