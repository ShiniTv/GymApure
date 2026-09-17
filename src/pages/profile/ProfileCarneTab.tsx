import React from 'react';
import { Link } from 'react-router';
import { IdCard, MessageCircle, ScanLine, Printer, QrCode, User, Shield } from 'lucide-react';
import { Button, Badge } from '../../components/ui';
import type { MemberBadgeData } from '../../components/member/MemberBadgeCard';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';

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
      <div className="flex justify-center py-10">
        <div className="border-border/80 bg-surface w-full max-w-sm rounded-xl border p-5 text-center shadow-2xs">
          <div className="bg-surface-raised text-text-muted mx-auto mb-3 w-fit rounded-xl p-3">
            <IdCard className="h-8 w-8" />
          </div>
          <h3 className="text-text text-base font-semibold tracking-[-0.01em]">
            Carnet digital no disponible
          </h3>
          <p className="text-text-muted mt-1 text-xs">
            Se requiere el número de cédula en tu perfil para generar tu credencial de acceso.
          </p>
          <div className="mt-4">
            <Link
              to="/messages"
              className="bg-brand text-brand-contrast hover:bg-brand/90 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold shadow-2xs transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Escribir a recepción
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = badgeMember.subscription_end
    ? new Date(badgeMember.subscription_end) <= new Date()
    : false;

  const membershipEnd = badgeMember.subscription_end
    ? format(new Date(badgeMember.subscription_end), 'dd MMM yyyy', { locale: es })
    : '—';

  return (
    <div className="mx-auto w-full max-w-md space-y-3">
      {/* Apple Wallet Style Pass */}
      <div className="glass-panel light-catch shadow-apple-glass relative overflow-hidden rounded-xl p-5">
        {/* Glow de fondo tenue */}
        <div className="from-brand/10 pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-radial to-transparent" />

        {/* Encabezado del pase */}
        <div className="border-border/50 flex items-center justify-between border-b pb-3.5">
          <div className="flex items-center gap-2">
            <div className="bg-brand text-brand-contrast flex h-7 w-7 items-center justify-center rounded-lg shadow-2xs">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="text-text text-xs font-bold tracking-tight">GymApure</p>
              <p className="text-text-muted text-small font-medium tracking-wider uppercase">
                Pase Digital
              </p>
            </div>
          </div>

          <Badge
            variant={isExpired ? 'danger' : 'success'}
            className="text-small px-2 py-0.5 font-semibold"
          >
            {isExpired ? 'Vencida' : 'Activa'}
          </Badge>
        </div>

        {/* Datos del Socio & QR */}
        <div className="py-4 text-center">
          <div className="mb-3 flex items-center justify-center gap-3">
            {badgeMember.profile_image ? (
              <img
                src={badgeMember.profile_image}
                alt={badgeMember.full_name}
                className="border-border/80 h-12 w-12 rounded-full border object-cover"
              />
            ) : (
              <div className="bg-surface-raised border-border/80 flex h-12 w-12 items-center justify-center rounded-full border">
                <User className="text-text-muted h-6 w-6" />
              </div>
            )}
            <div className="text-left">
              <h3 className="text-text text-base font-bold tracking-[-0.01em]">
                {badgeMember.full_name}
              </h3>
              <p className="text-text-secondary font-mono text-xs">C.I. {badgeMember.cedula}</p>
            </div>
          </div>

          {/* Código QR Central */}
          <div className="border-border/60 bg-surface-raised my-2 inline-flex items-center justify-center rounded-xl border p-3 shadow-2xs">
            <QrCode className="text-text h-24 w-24" />
          </div>
          <p className="text-text-muted text-small mt-1 font-medium">
            Escanea este código en el lector de recepción
          </p>
        </div>

        {/* Detalles en Grid Bento */}
        <div className="border-border/50 grid grid-cols-3 gap-2 border-t pt-3 text-center">
          <div className="bg-surface-raised/50 border-border/50 rounded-xl border p-2">
            <span className="text-text-muted text-small block font-semibold tracking-wider uppercase">
              Membresía
            </span>
            <span className="text-text mt-0.5 block truncate text-xs font-semibold">
              {badgeMember.membership_name ?? 'General'}
            </span>
          </div>
          <div className="bg-surface-raised/50 border-border/50 rounded-xl border p-2">
            <span className="text-text-muted text-small block font-semibold tracking-wider uppercase">
              Turno
            </span>
            <span className="text-text mt-0.5 block truncate text-xs font-semibold capitalize">
              {badgeMember.training_shift ?? 'Libre'}
            </span>
          </div>
          <div className="bg-surface-raised/50 border-border/50 rounded-xl border p-2">
            <span className="text-text-muted text-small block font-semibold tracking-wider uppercase">
              Vence
            </span>
            <span className="text-text mt-0.5 block text-xs font-semibold tabular-nums">
              {membershipEnd}
            </span>
          </div>
        </div>
      </div>

      {/* Acciones de la Credencial */}
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" onClick={onShowScan} className="w-full gap-2 font-semibold shadow-2xs">
          <ScanLine className="h-3.5 w-3.5" />
          <span>Pantalla completa</span>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={onShowBadgeModal}
          className="w-full gap-2 font-semibold shadow-2xs"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>Imprimir carnet</span>
        </Button>
      </div>
    </div>
  );
}
