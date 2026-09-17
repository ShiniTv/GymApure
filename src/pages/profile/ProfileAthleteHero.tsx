import React, { ChangeEvent } from 'react';
import { Camera, QrCode, Shield, User, Flame, Target, Trophy } from 'lucide-react';
import { resolveAvatarUrl } from '../../lib/api';
import { Button } from '../../components/ui';
import { ROLE_LABELS } from '../../lib/roles';
import { cn } from '../../lib/utils';
import type { UserProfile } from '../../hooks/queries/useProfileQuery';
import { DIVIDER, T, GRID_METRIC_STRIP, SECTION_GAP_LG, cardSection } from './ProfileDesignSystem';

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
    <div className={cn('space-y-3', SECTION_GAP_LG)}>
      {/* Hero principal */}
      <div className={cardSection()}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="ring-border relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[var(--radius-card)] ring-1">
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
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
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
                <h1 className={cn(T.pageTitle, 'text-lg sm:text-xl')}>{profile.full_name}</h1>
                <span className="bg-surface-raised text-text-secondary border-border/60 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold">
                  <Shield className="text-brand h-3.5 w-3.5" />
                  {ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role}
                </span>
              </div>

              <div
                className={cn(
                  T.muted,
                  'mt-1.5',
                  'flex',
                  'flex-wrap',
                  'items-center',
                  'gap-x-4',
                  'gap-y-1'
                )}
              >
                <span className="max-w-[280px] truncate">{profile.email}</span>
                {profile.cedula && (
                  <span className="text-text-secondary font-mono font-medium whitespace-nowrap">
                    C.I. {profile.cedula}
                  </span>
                )}
              </div>

              {isMember && subscription && (
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium',
                      subscription.days_remaining > 5
                        ? 'border-success/30 bg-success/10 text-success border'
                        : subscription.days_remaining > 0
                          ? 'border-warning/30 bg-warning/10 text-warning border'
                          : 'border-danger/30 bg-danger/10 text-danger border'
                    )}
                  >
                    <Flame className="h-4 w-4" />
                    <span>{subscription.membership_name}</span>
                    <span className="text-text-muted/70">·</span>
                    <span className="font-semibold tabular-nums">
                      {subscription.days_remaining} día
                      {subscription.days_remaining !== 1 ? 's' : ''}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {isMember && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onOpenCarneTab}
                className="border-border/60 gap-2 shadow-sm"
              >
                <QrCode className="text-brand h-4 w-4" />
                <span>Carnet QR</span>
              </Button>
            )}

            {avatarUrl && !avatarUploading && (
              <button
                type="button"
                onClick={onRequestRemoveAvatar}
                disabled={avatarRemoving}
                className="text-text-muted hover:text-danger px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
              >
                Quitar foto
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Micro-Métricas del Atleta - metric strip pattern */}
      {isMember && (
        <div className={cn(GRID_METRIC_STRIP, 'min-h-[3.25rem]')}>
          <div
            className={cn(
              'tap-feedback group',
              'hover:bg-surface-raised/60',
              'flex',
              'min-h-[var(--touch-min)]',
              'flex-col',
              'items-center',
              'justify-center',
              'gap-1.5',
              'px-2',
              'py-3',
              'transition-colors'
            )}
          >
            <div className={cn(T.mutedSmall, 'flex', 'items-center', 'justify-center', 'gap-1.5')}>
              <Flame className="text-brand h-3.5 w-3.5" />
              <span>Entrenos (Mes)</span>
            </div>
            <span className={T.statValue}>{workoutsThisMonth}</span>
          </div>

          <div
            className={cn(
              'tap-feedback group',
              'hover:bg-surface-raised/60',
              'flex',
              'min-h-[var(--touch-min)]',
              'flex-col',
              'items-center',
              'justify-center',
              'gap-1.5',
              'px-2',
              'py-3',
              'transition-colors',
              'border-l',
              'border-r',
              DIVIDER
            )}
          >
            <div className={cn(T.mutedSmall, 'flex', 'items-center', 'justify-center', 'gap-1.5')}>
              <Target className="text-brand h-3.5 w-3.5" />
              <span>Meta semanal</span>
            </div>
            <span className={T.statValue}>{weeklyGoal}d</span>
          </div>

          <div
            className={cn(
              'tap-feedback group',
              'hover:bg-surface-raised/60',
              'flex',
              'min-h-[var(--touch-min)]',
              'flex-col',
              'items-center',
              'justify-center',
              'gap-1.5',
              'px-2',
              'py-3',
              'transition-colors'
            )}
          >
            <div className={cn(T.mutedSmall, 'flex', 'items-center', 'justify-center', 'gap-1.5')}>
              <Trophy className="text-brand h-3.5 w-3.5" />
              <span>Racha activa</span>
            </div>
            <span className={T.statValue}>{streakDays > 0 ? `${streakDays}d` : '—'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
