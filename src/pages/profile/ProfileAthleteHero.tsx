import React, { ChangeEvent } from 'react';
import { Camera, QrCode, Sparkles, Shield, User, Trophy, Flame, Target } from 'lucide-react';
import { resolveAvatarUrl } from '../../lib/api';
import { Button } from '../../components/ui';
import { ROLE_LABELS } from '../../lib/roles';
import type { UserProfile } from '../../hooks/queries/useProfileQuery';

interface HeroSubscription {
  membership_name: string;
  days_remaining: number;
  end_date?: string;
  status?: string;
}

interface ProfileAthleteHeroProps {
  profile: UserProfile;
  role: string;
  subscription: HeroSubscription | null;
  workoutsThisMonth: number;
  streakDays?: number;
  weeklyGoal?: number;
  avatarUploading: boolean;
  avatarRemoving: boolean;
  onAvatarChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRequestRemoveAvatar: () => void;
  onOpenCarneTab: () => void;
}

export function ProfileAthleteHero({
  profile,
  role,
  subscription,
  workoutsThisMonth,
  streakDays = 0,
  weeklyGoal = 5,
  avatarUploading,
  avatarRemoving,
  onAvatarChange,
  onRequestRemoveAvatar,
  onOpenCarneTab,
}: ProfileAthleteHeroProps) {
  const avatarUrl = resolveAvatarUrl(profile.profile_image);
  const isMember = role === 'member';

  return (
    <div className="border-border/70 from-surface via-surface to-surface-raised/60 relative overflow-hidden rounded-[calc(var(--radius-card)+4px)] border bg-gradient-to-br p-4 shadow-sm sm:p-5">
      {/* Glow / Spotlight ambiental decorativo */}
      <div
        className="bg-brand/10 pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Avatar + Datos Principales */}
        <div className="flex items-center gap-3.5 sm:gap-4.5">
          <div className="relative shrink-0">
            <div className="ring-border/80 bg-surface-raised relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl shadow-inner ring-2 sm:h-18 sm:w-18">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="text-text-muted h-8 w-8" />
              )}
              {avatarUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs">
                  <div className="border-brand h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
                </div>
              )}
            </div>

            <label
              htmlFor="hero-avatar-upload"
              className="bg-brand text-brand-contrast absolute -right-1 -bottom-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95"
              title="Cambiar foto de perfil"
            >
              <Camera className="h-3.5 w-3.5" />
            </label>
            <input
              id="hero-avatar-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onAvatarChange}
              disabled={avatarUploading || avatarRemoving}
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-text truncate text-lg font-bold tracking-tight sm:text-xl">
                {profile.full_name}
              </h1>
              <span className="bg-surface-raised text-text-secondary border-border/60 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                <Shield className="text-brand h-3 w-3" />
                {ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role}
              </span>
            </div>

            <div className="text-text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
              <span className="truncate">{profile.email}</span>
              {profile.cedula && (
                <span className="text-text-secondary font-mono font-medium">
                  C.I. {profile.cedula}
                </span>
              )}
            </div>

            {/* Estado de Membresía / Plan */}
            {isMember && subscription && (
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${
                    subscription.days_remaining > 5
                      ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : subscription.days_remaining > 0
                        ? 'border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  {subscription.membership_name} · {subscription.days_remaining}d restantes
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Acciones y Métricas Clave */}
        <div className="flex flex-wrap items-center gap-2 pt-2 sm:justify-end sm:pt-0">
          {isMember && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onOpenCarneTab}
              className="border-border/80 gap-1.5 shadow-xs"
            >
              <QrCode className="text-brand h-3.5 w-3.5" />
              <span>Carnet QR</span>
            </Button>
          )}

          {avatarUrl && !avatarUploading && (
            <button
              type="button"
              onClick={onRequestRemoveAvatar}
              disabled={avatarRemoving}
              className="text-text-muted hover:text-danger px-2 py-1 text-xs transition-colors disabled:opacity-50"
            >
              Quitar foto
            </button>
          )}
        </div>
      </div>

      {/* Barra de Micro-Métricas del Atleta (Sólo Miembros) */}
      {isMember && (
        <div className="border-border/60 mt-4.5 grid grid-cols-3 gap-2 border-t pt-3.5 text-center sm:text-left">
          <div className="bg-surface-raised/60 border-border/40 rounded-xl border p-2 sm:px-3 sm:py-2">
            <p className="text-text-muted flex items-center justify-center gap-1 text-[11px] font-medium sm:justify-start">
              <Flame className="text-brand h-3 w-3" /> Entrenos (Mes)
            </p>
            <p className="text-text mt-0.5 text-base font-bold tabular-nums sm:text-lg">
              {workoutsThisMonth}
            </p>
          </div>

          <div className="bg-surface-raised/60 border-border/40 rounded-xl border p-2 sm:px-3 sm:py-2">
            <p className="text-text-muted flex items-center justify-center gap-1 text-[11px] font-medium sm:justify-start">
              <Target className="text-brand h-3 w-3" /> Meta semanal
            </p>
            <p className="text-text mt-0.5 text-base font-bold tabular-nums sm:text-lg">
              {weeklyGoal} <span className="text-text-muted text-xs font-normal">días</span>
            </p>
          </div>

          <div className="bg-surface-raised/60 border-border/40 rounded-xl border p-2 sm:px-3 sm:py-2">
            <p className="text-text-muted flex items-center justify-center gap-1 text-[11px] font-medium sm:justify-start">
              <Trophy className="text-brand h-3 w-3" /> Racha activa
            </p>
            <p className="text-text mt-0.5 text-base font-bold tabular-nums sm:text-lg">
              {streakDays > 0 ? `${streakDays}d` : 'Activo'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
