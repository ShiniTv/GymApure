import React from 'react';
import { Link } from 'react-router';
import { IdCard, MessageCircle, ScanLine, Printer, Sparkles } from 'lucide-react';
import { Button, EmptyState } from '../../components/ui';
import { MemberBadgeCard, type MemberBadgeData } from '../../components/member/MemberBadgeCard';

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
      <div className="mx-auto w-full max-w-md py-6">
        <EmptyState
          icon={IdCard}
          title="Carnet digital no disponible"
          description="Se requiere el número de cédula en tu perfil para generar tu credencial de acceso."
          action={
            <Link
              to="/messages"
              className="brand-solid brand-solid-hover inline-flex min-h-[var(--touch-min)] items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide shadow-md"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Escribir a recepción
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pt-1">
      {/* Tarjeta de Carnet Estilo VIP */}
      <div className="border-border/80 from-surface to-surface-raised overflow-hidden rounded-3xl border bg-gradient-to-b p-5 shadow-md">
        <div className="flex flex-col items-center gap-5 md:flex-row md:items-center md:justify-between">
          <div className="w-full text-center md:text-left">
            <div className="bg-brand/10 text-brand border-brand/20 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Credencial Digital de Socio</span>
            </div>
            <h2 className="text-text mt-2 text-base font-bold sm:text-lg">
              Tu pase de acceso rápido
            </h2>
            <p className="text-text-muted mt-0.5 text-xs">
              Muéstralo frente al lector de recepción para registrar tu entrada instantáneamente
            </p>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
            <Button size="md" onClick={onShowScan} className="gap-2 font-semibold shadow-sm">
              <ScanLine className="h-4 w-4" />
              <span>Mostrar QR</span>
            </Button>
            <Button
              size="md"
              variant="secondary"
              onClick={onShowBadgeModal}
              className="gap-2 font-semibold"
            >
              <Printer className="text-text-muted h-4 w-4" />
              <span>Imprimir / Carnet</span>
            </Button>
          </div>
        </div>

        {/* Visualizador de Tarjeta de Socio */}
        <div className="mt-6 flex justify-center py-2">
          <div className="origin-center transition-transform hover:scale-[1.02]">
            <MemberBadgeCard member={badgeMember} side="front" className="shadow-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
