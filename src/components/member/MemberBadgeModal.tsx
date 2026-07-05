import { useState } from 'react';
import { Printer } from 'lucide-react';
import { Modal, Button, SegmentedControl } from '../ui';
import { MemberBadgeCard, type MemberBadgeData } from './MemberBadgeCard';
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

  if (!member) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal open={open} onClose={onClose} title="Carné de membresía" maxWidth="sm">
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
          {(view === 'back' || view === 'both') && <MemberBadgeCard member={member} side="back" />}
        </div>

        <Button className="w-full print:hidden" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          Imprimir carné
        </Button>
      </div>
    </Modal>
  );
}
