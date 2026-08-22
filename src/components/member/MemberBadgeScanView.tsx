import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'react-qr-code';
import { X } from 'lucide-react';
import { buildBadgeQrValue } from '../../lib/badgeQr';
import { useScrollLock } from '../../hooks/useScrollLock';
import { Button } from '../ui';
import type { MemberBadgeData } from './MemberBadgeCard';

interface MemberBadgeScanViewProps {
  open: boolean;
  onClose: () => void;
  member: MemberBadgeData;
}

export function MemberBadgeScanView({ open, onClose, member }: MemberBadgeScanViewProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!open || !portalTarget) return null;

  const qrValue = buildBadgeQrValue(member.cedula);

  return createPortal(
    <div
      className="bg-surface text-text fixed inset-0 z-[80] flex flex-col items-center justify-center px-6 py-10"
      role="dialog"
      aria-modal
      aria-label="QR para escaneo en recepción"
    >
      <button
        type="button"
        onClick={onClose}
        className="bg-surface-raised text-text-secondary absolute top-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-full"
        aria-label="Cerrar"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <p className="text-text-muted text-[11px] font-semibold tracking-wide uppercase">
          Escaneo en recepción
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight">{member.full_name}</h2>
        <p className="text-text-muted mt-0.5 text-sm font-medium">{member.cedula}</p>

        <div className="bg-surface ring-border mt-8 rounded-2xl p-5 ring-1">
          <QRCode value={qrValue} size={280} level="H" fgColor="#18181b" bgColor="#ffffff" />
        </div>

        <p className="text-text-muted mt-5 max-w-[16rem] text-[13px] leading-snug">
          Sube el brillo al máximo para un escaneo limpio.
        </p>

        <Button variant="ghost" className="mt-8 w-full" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>,
    portalTarget
  );
}
