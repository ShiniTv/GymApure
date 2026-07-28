import { Link } from 'react-router';
import { IdCard, MessageCircle, ScanLine } from 'lucide-react';
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
  return (
    <div className="mx-auto w-full max-w-sm pt-1 md:max-w-2xl">
      {badgeMember ? (
        <div className="flex flex-col items-center gap-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)] md:items-center md:gap-4">
          <div className="flex w-full flex-col items-center gap-3 md:items-start">
            <div className="w-full text-center md:text-left">
              <h2 className="text-[13px] font-semibold text-zinc-900 md:text-sm dark:text-white">
                Carné digital
              </h2>
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                Muéstralo en recepción · sube el brillo
              </p>
            </div>

            <div className="-mb-8 origin-top scale-[0.82] sm:-mb-6 sm:scale-90 md:mb-0 md:scale-100">
              <MemberBadgeCard
                member={badgeMember}
                side="front"
                className="shadow-[0_10px_28px_-12px_rgba(0,0,0,0.35)] dark:shadow-[0_12px_32px_-10px_rgba(0,0,0,0.65)]"
              />
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-2.5 md:items-stretch">
            <Button className="h-11 min-h-11 w-full" onClick={onShowScan}>
              <ScanLine className="h-4 w-4" />
              Mostrar QR
            </Button>
            <button
              type="button"
              onClick={onShowBadgeModal}
              className="text-[11px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline md:text-center dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Ver carné completo / Imprimir
            </button>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={IdCard}
          title="Carné no disponible"
          description="Falta tu cédula en el perfil. Pide a recepción que la complete."
          action={
            <Link
              to="/messages"
              className="brand-solid brand-solid-hover inline-flex min-h-[var(--touch-min)] items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold tracking-wide shadow-md shadow-zinc-900/10"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Escribir a recepción
            </Link>
          }
        />
      )}
    </div>
  );
}
