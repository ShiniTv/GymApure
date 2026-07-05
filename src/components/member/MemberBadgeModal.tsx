import { useState } from 'react';
import { Printer, ScanLine } from 'lucide-react';
import { Modal, Button, SegmentedControl } from '../ui';
import { MemberBadgeCard, type MemberBadgeData } from './MemberBadgeCard';
import { MemberBadgeScanView } from './MemberBadgeScanView';
import { cn } from '../../lib/utils';

export type { MemberBadgeData };

interface MemberBadgeModalProps {
  open: boolean;
  onClose: () => void;
  member: MemberBadgeData | null;
}

type BadgeView = 'front' | 'back' | 'both';

export function MemberBadgeModal({ open, onClose, member }: MemberBadgeModalProps) {
  const [view, setView] = useState<BadgeView>('front');
  const [showScanView, setShowScanView] = useState(false);

  if (!member) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    setShowScanView(false);
    onClose();
  };

  return (
    <>
      <Modal
        open={open && !showScanView}
        onClose={handleClose}
        title="Carné de membresía"
        maxWidth="sm"
      >
        <div className="flex flex-col gap-3">
          <SegmentedControl
            className="print:hidden"
            fullWidth
            value={view}
            onChange={(value) => setView(value)}
            options={[
              { value: 'front', label: 'Frente' },
              { value: 'back', label: 'Reverso' },
              { value: 'both', label: 'Ambos' },
            ]}
          />

          <div
            id="printable-badge"
            className={cn('flex flex-col items-center gap-4', view === 'both' ? 'print:gap-6' : '')}
          >
            {(view === 'front' || view === 'both') && (
              <MemberBadgeCard member={member} side="front" />
            )}
            {(view === 'back' || view === 'both') && (
              <MemberBadgeCard member={member} side="back" />
            )}
          </div>

          <Button
            variant="secondary"
            className="w-full print:hidden"
            onClick={() => setShowScanView(true)}
          >
            <ScanLine className="h-4 w-4" />
            Mostrar QR para escaneo
          </Button>

          <Button className="w-full print:hidden" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Imprimir carné
          </Button>
        </div>
      </Modal>

      <MemberBadgeScanView
        open={showScanView}
        onClose={() => setShowScanView(false)}
        member={member}
      />
    </>
  );
}
