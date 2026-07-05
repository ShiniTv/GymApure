import QRCode from 'react-qr-code';
import { X } from 'lucide-react';
import { buildBadgeQrValue } from '../../lib/badgeQr';
import type { MemberBadgeData } from './MemberBadgeCard';

interface MemberBadgeScanViewProps {
  open: boolean;
  onClose: () => void;
  member: MemberBadgeData;
}

export function MemberBadgeScanView({ open, onClose, member }: MemberBadgeScanViewProps) {
  if (!open) return null;

  const qrValue = buildBadgeQrValue(member.cedula);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-white px-6 py-10 text-zinc-900"
      role="dialog"
      aria-modal
      aria-label="QR para escaneo en recepción"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-700"
        aria-label="Cerrar"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="w-full max-w-sm text-center">
        <h2 className="text-xl font-bold tracking-tight">{member.full_name}</h2>
        <p className="mt-1 text-sm font-medium text-zinc-600">{member.cedula}</p>
        <p className="mt-3 text-sm text-zinc-500">
          Muestre este código en recepción. Mantenga el brillo de la pantalla al máximo.
        </p>

        <div className="mx-auto mt-6 inline-block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <QRCode value={qrValue} size={300} level="H" fgColor="#18181b" bgColor="#ffffff" />
        </div>
      </div>
    </div>
  );
}
