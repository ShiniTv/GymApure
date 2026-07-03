import { Printer, Shield } from 'lucide-react';
import { Modal, Button, Avatar } from '../ui';
import { BRAND } from '../../config/brand';
import {
  SHIFT_LABELS,
  formatMembershipId,
  buildBadgeQrUrl,
  type TrainingShift,
} from '../../lib/trainingShift';
import { cn } from '../../lib/utils';
import { resolveAvatarUrl } from '../../lib/api';

export interface MemberBadgeData {
  id: number;
  full_name: string;
  email?: string;
  cedula: string;
  profile_image?: string | null;
  membership_name?: string | null;
  training_shift?: TrainingShift | null;
  role?: string;
}

interface MemberBadgeModalProps {
  open: boolean;
  onClose: () => void;
  member: MemberBadgeData | null;
}

function getRoleLabel(role?: string): string {
  switch (role) {
    case 'admin':
      return 'Administración';
    case 'trainer':
      return 'Staff — Entrenador';
    case 'receptionist':
      return 'Recepción';
    default:
      return 'Atleta — Miembro';
  }
}

function getBadgeStyle(role?: string) {
  switch (role) {
    case 'admin':
      return {
        border: 'border-purple-500/40',
        cardBg: 'bg-gradient-to-b from-zinc-900 via-purple-950/20 to-slate-950',
        labelBg: 'bg-purple-600 text-white',
        label: 'ADMINISTRACIÓN',
      };
    case 'trainer':
      return {
        border: 'border-blue-500/40',
        cardBg: 'bg-gradient-to-b from-zinc-900 via-blue-950/20 to-slate-950',
        labelBg: 'bg-blue-600 text-white',
        label: 'STAFF — ENTRENADOR',
      };
    default:
      return {
        border: 'border-emerald-500/40',
        cardBg: 'bg-gradient-to-b from-zinc-900 via-emerald-950/20 to-slate-950',
        labelBg: 'bg-emerald-600 text-white',
        label: 'MIEMBRO ACTIVO',
      };
  }
}

export function MemberBadgeModal({ open, onClose, member }: MemberBadgeModalProps) {
  if (!member) return null;

  const style = getBadgeStyle(member.role);
  const qrUrl = buildBadgeQrUrl(member.cedula);
  const memberSince = new Date().getFullYear().toString();

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal open={open} onClose={onClose} title="Carné de membresía" maxWidth="sm">
      <div className="flex flex-col items-center gap-4">
        <div
          id="printable-badge"
          className={cn(
            'relative w-full max-w-[20rem] rounded-[28px] border p-6 flex flex-col items-center text-center shadow-2xl overflow-hidden print:shadow-none print:border-zinc-300',
            style.border,
            style.cardBg
          )}
        >
          <div className="w-full flex items-center justify-between border-b border-white/10 pb-4 mb-5 print:border-zinc-200">
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-5 h-5 text-white print:text-black shrink-0" />
              <span className="font-black tracking-tight text-sm uppercase text-white print:text-black truncate">
                {BRAND.name}
              </span>
            </div>
            <span className={cn('text-[9px] font-bold uppercase px-2 py-0.5 rounded-full', style.labelBg)}>
              {style.label}
            </span>
          </div>

          <Avatar
            src={resolveAvatarUrl(member.profile_image)}
            name={member.full_name}
            size="lg"
            className="h-24 w-24 ring-4 ring-zinc-950 relative z-10 print:ring-zinc-100 rounded-2xl"
          />

          <div className="mt-4 space-y-1">
            <h2 className="text-xl font-black tracking-tight text-white print:text-black line-clamp-2">
              {member.full_name}
            </h2>
            {member.email && (
              <p className="text-xs text-white/50 print:text-zinc-500 font-medium line-clamp-1">
                {member.email}
              </p>
            )}
          </div>

          <div className="relative p-3 bg-white/5 border border-white/10 rounded-2xl my-5 shadow-inner print:bg-zinc-50 print:border-zinc-200">
            <img src={qrUrl} alt="Código QR de acceso" className="w-36 h-36 mx-auto rounded-lg" />
          </div>

          <div className="w-full grid grid-cols-2 gap-3 text-left border-t border-white/10 pt-4 print:border-zinc-200">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-white/30 print:text-zinc-400 font-bold block">
                Grupo
              </span>
              <span className="text-xs text-white print:text-black font-extrabold block truncate">
                {getRoleLabel(member.role)}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-white/30 print:text-zinc-400 font-bold block">
                ID Socio
              </span>
              <span className="text-xs text-white print:text-black font-mono font-bold block">
                {formatMembershipId(member.id)}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-white/30 print:text-zinc-400 font-bold block">
                Cédula
              </span>
              <span className="text-xs text-white print:text-black font-mono font-bold block truncate">
                {member.cedula}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-white/30 print:text-zinc-400 font-bold block">
                Plan
              </span>
              <span className="text-xs text-white print:text-black font-extrabold block truncate">
                {member.membership_name || 'Sin plan'}
              </span>
            </div>
            {member.training_shift && (
              <div className="col-span-2">
                <span className="text-[9px] uppercase tracking-wider text-white/30 print:text-zinc-400 font-bold block">
                  Turno
                </span>
                <span className="text-xs text-white print:text-black font-extrabold block">
                  {SHIFT_LABELS[member.training_shift]}
                </span>
              </div>
            )}
            <div className="col-span-2">
              <span className="text-[9px] uppercase tracking-wider text-white/30 print:text-zinc-400 font-bold block">
                Miembro desde
              </span>
              <span className="text-xs text-white print:text-black font-bold block">{memberSince}</span>
            </div>
          </div>
        </div>

        <Button className="w-full print:hidden" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          Imprimir carné
        </Button>
      </div>
    </Modal>
  );
}
