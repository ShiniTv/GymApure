import { Modal, Avatar } from '../../components/ui';
import type { Member } from '../../hooks/queries/useMembersQuery';
import { MemberDetailPanel, type MemberQuickAction } from './MemberDetailPanel';

export type { MemberQuickAction };

interface MemberQuickSheetProps {
  member: Member | null;
  open: boolean;
  onClose: () => void;
  alertDays: number;
  actions: MemberQuickAction[];
}

/** Ficha rápida del miembro — modal centrado (móvil / tablet). */
export function MemberQuickSheet({
  member,
  open,
  onClose,
  alertDays,
  actions,
}: MemberQuickSheetProps) {
  if (!member) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={member.full_name} size="sm" className="shrink-0" />
          <span className="truncate">{member.full_name}</span>
        </span>
      }
      maxWidth="2xl"
      initialFocus="dialog"
      className="mx-4"
    >
      <MemberDetailPanel
        member={member}
        alertDays={alertDays}
        actions={actions}
        onClose={onClose}
      />
    </Modal>
  );
}
