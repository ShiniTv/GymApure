import React from 'react';
import { Link } from 'react-router';
import {
  IdCard,
  MessageCircle,
  ScanLine,
  Printer,
  Sparkles,
  QrCode,
  User,
  Shield,
} from 'lucide-react';
import { Button, Badge } from '../../components/ui';
import type { MemberBadgeData } from '../../components/member/MemberBadgeCard';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { SURFACE, CARD_PADDING, SECTION_GAP_LG, GRID_2COL, cn } from './ProfileDesignSystem';

interface ProfileCarneTabProps {
  badgeMember: MemberBadgeData | null;
  onShowScan: () => void;
  onShowBadgeModal: () => void;
}

export function ProfileCarneTab({
  badgeMember,
  onShowScan,
  onShowBadgeModal,
}: ProfileCarneTabProps) {
  if (!badgeMember) {
    return (
      <div className="flex justify-center py-16">
        <div
          className={cn(
            'w-full max-w-md',
            CARD_PADDING,
            'border',
            'border-border/80',
            'bg-surface',
            'rounded-xl'
          )}
        >
          <div className="py-4 text-center">
            <div className="bg-surface text-text-muted mx-auto mb-4 w-fit rounded-xl p-3">
              <IdCard className="h-10 w-10" />
            </div>
            <h3 className="text-text text-lg font-semibold tracking-[-0.01em]">
              Carnet digital no disponible
            </h3>
            <p className="text-text-muted mt-2 text-sm">
              Se requiere el número de cédula en tu perfil para generar tu credencial de acceso.
            </p>
            <div className="mt-6">
              <Link
                to="/messages"
                className="bg-brand text-brand-contrast hover:bg-brand/90 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-sm transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Escribir a recepción
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const membershipEnd = badgeMember.subscription_end
    ? format(new Date(badgeMember.subscription_end), 'dd MMMM yyyy', { locale: es })
    : '—';

  return (
    <div className={cn('space-y-4', SECTION_GAP_LG)}>
      {/* Header Actions */}
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="bg-brand/10 text-brand border-brand/20 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              Credencial Digital de Socio
            </div>
            <h2 className="text-text mt-2 text-xl font-bold tracking-[-0.01em]">
              Tu pase de acceso rápido
            </h2>
            <p className="text-text-muted mt-1 text-sm">
              Muéstralo frente al lector de recepción para registrar tu entrada instantáneamente
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              onClick={onShowScan}
              className="flex-1 gap-2 font-semibold shadow-sm sm:flex-none"
            >
              <ScanLine className="h-4 w-4" />
              <span>Mostrar QR</span>
            </Button>
            <Button
              variant="secondary"
              onClick={onShowBadgeModal}
              className="flex-1 gap-2 font-semibold sm:flex-none"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir / Carnet</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Badge Card - Front */}
      <div
        className={cn(
          'overflow-hidden',
          CARD_PADDING,
          'border',
          'border-border/80',
          'bg-surface',
          'rounded-xl'
        )}
      >
        <div className="relative overflow-hidden">
          <div className="from-brand/5 absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />
          <div className="relative p-6">
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between">
              <div className="text-center md:text-left">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm">
                  <Shield className="h-3.5 w-3.5" />
                  Socio Verificado
                </div>
                <h3 className="text-text text-2xl font-bold tracking-[-0.01em]">
                  {badgeMember.full_name}
                </h3>
                <p className="text-text-muted mt-1 font-mono text-sm">C.I. {badgeMember.cedula}</p>
              </div>

              <div className="flex flex-col items-center gap-3 md:items-end">
                <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                  <QrCode className="h-10 w-10 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-text-muted text-xs">Membresía</p>
                  <p className="text-text font-semibold">{badgeMember.membership_name ?? '—'}</p>
                  <p className="text-text-muted mt-1 text-xs">Vence: {membershipEnd}</p>
                </div>
              </div>
            </div>

            {badgeMember.profile_image && (
              <div className="absolute top-6 right-6 md:top-6 md:right-6">
                <img
                  src={badgeMember.profile_image}
                  alt={badgeMember.full_name}
                  className="h-20 w-20 rounded-xl object-cover ring-2 ring-white/20"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Badge Card - Back / Details */}
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
          <User className="text-brand h-5 w-5" />
          <h3 className="text-text text-lg font-semibold tracking-[-0.01em]">
            Detalles de la credencial
          </h3>
        </div>
        <dl className={GRID_2COL}>
          <div className="space-y-1">
            <dt className="text-text-muted text-sm">Rol</dt>
            <dd className="text-text font-medium capitalize">{badgeMember.role}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-text-muted text-sm">Turno</dt>
            <dd className="text-text font-medium capitalize">
              {badgeMember.training_shift ?? '—'}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-text-muted text-sm">Socio desde</dt>
            <dd className="text-text font-medium">
              {badgeMember.created_at
                ? format(new Date(badgeMember.created_at), 'dd MMM yyyy', { locale: es })
                : '—'}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-text-muted text-sm">Estado</dt>
            <dd className="text-text font-medium">
              <Badge
                variant={
                  badgeMember.subscription_end &&
                  new Date(badgeMember.subscription_end) > new Date()
                    ? 'success'
                    : 'default'
                }
                className="text-xs"
              >
                {badgeMember.subscription_end && new Date(badgeMember.subscription_end) > new Date()
                  ? 'Activa'
                  : 'Vencida'}
              </Badge>
            </dd>
          </div>
        </dl>
      </div>

      {/* QR Full Screen Hint */}
      <div className={cn(SURFACE, 'rounded-[var(--radius-card)] p-4')}>
        <div className="flex items-center gap-3">
          <div className="bg-brand/10 rounded-xl p-2">
            <QrCode className="text-brand h-5 w-5" />
          </div>
          <div>
            <p className="text-text font-medium">Escaneo rápido en recepción</p>
            <p className="text-text-muted text-sm">
              Toca "Mostrar QR" para ver el código a pantalla completa
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
