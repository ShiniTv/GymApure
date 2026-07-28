import { FormEvent } from 'react';
import { Link } from 'react-router';
import { Bell, Lock } from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  Label,
  PasswordInput,
  passwordStrength,
} from '../../components/ui';
import { PushNotificationsToggle } from '../../components/PushNotificationsToggle';
import { cn } from '../../lib/utils';
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
  return (
    <div className="grid w-full gap-3 md:grid-cols-2 md:items-stretch md:gap-4">
      <div className="flex min-w-0 flex-col space-y-3">
        <Card
          padding="sm"
          rounded="xl"
          className="min-w-0 border-zinc-200/70 bg-white/80 shadow-sm md:p-4 dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:shadow-none"
        >
          <h2 className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900 dark:text-white">
            <Bell className="text-brand h-3.5 w-3.5" />
            Notificaciones
          </h2>
          <p className="mb-3 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
            Pagos, mensajes y novedades en este dispositivo.
          </p>
          <PushNotificationsToggle />
        </Card>

        {role !== 'member' && (
          <Card
            padding="sm"
            rounded="xl"
            className="min-w-0 border-zinc-200/70 bg-white/80 shadow-sm md:p-4 dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:shadow-none"
          >
            <h2 className="mb-1 text-[13px] font-semibold text-zinc-900 dark:text-white">
              Verificación en dos pasos
            </h2>
            <p className="mb-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              Protege tu cuenta de staff con MFA (TOTP).
            </p>
            <Link
              to="/security"
              className="text-brand inline-flex items-center gap-1 text-sm font-semibold hover:underline"
            >
              Configurar MFA →
            </Link>
          </Card>
        )}
      </div>

      <Accordion>
        <AccordionItem
          title="Cambiar contraseña"
          icon={<Lock className="text-brand h-4 w-4" />}
          className="rounded-xl border border-zinc-200/70 bg-white/80 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:shadow-none"
        >
          <p className="mb-3 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
            Al actualizarla, cerraremos esta sesión para proteger tu cuenta.
          </p>
          {passwordError && (
            <p className="mb-3 text-xs font-medium text-red-500">{passwordError}</p>
          )}
          <form onSubmit={onChangePassword} className="space-y-3">
            <div>
              <Label htmlFor="current_password">Contraseña actual</Label>
              <PasswordInput
                id="current_password"
                autoComplete="current-password"
                value={passwordForm.current_password}
                onChange={(e) => {
                  setPasswordForm({ ...passwordForm, current_password: e.target.value });
                }}
                required
              />
            </div>
            <div>
              <Label htmlFor="new_password">Nueva contraseña</Label>
              <PasswordInput
                id="new_password"
                autoComplete="new-password"
                value={passwordForm.new_password}
                onChange={(e) => {
                  setPasswordForm({ ...passwordForm, new_password: e.target.value });
                }}
                minLength={8}
                required
              />
              {passwordForm.new_password &&
                (() => {
                  const strength = passwordStrength(passwordForm.new_password);
                  return (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={cn(
                              'h-1 flex-1 rounded-full transition-colors',
                              strength.score >= level
                                ? level === 1
                                  ? 'bg-red-500'
                                  : level === 2
                                    ? 'bg-yellow-500'
                                    : 'bg-emerald-500'
                                : 'bg-zinc-200 dark:bg-zinc-700'
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-xs font-medium text-zinc-400 dark:text-zinc-300">
                        Fortaleza: {strength.label}
                      </p>
                    </div>
                  );
                })()}
            </div>
            <div>
              <Label htmlFor="confirm_password">Confirmar nueva contraseña</Label>
              <PasswordInput
                id="confirm_password"
                autoComplete="new-password"
                value={passwordForm.confirm_password}
                onChange={(e) => {
                  setPasswordForm({ ...passwordForm, confirm_password: e.target.value });
                }}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={passwordSaving}
              size="sm"
              className="h-10 min-h-10 w-full sm:w-auto"
            >
              <Lock className="h-4 w-4" />
              {passwordSaving ? 'Actualizando…' : 'Actualizar contraseña'}
            </Button>
          </form>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
