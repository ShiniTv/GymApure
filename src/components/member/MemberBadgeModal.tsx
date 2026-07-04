import { Printer } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Modal, Button, Avatar } from '../ui';
import Logo from '../Logo';
import {
  SHIFT_LABELS,
  formatMembershipId,
  buildBadgeQrUrl,
  type TrainingShift,
} from '../../lib/trainingShift';
import { cn } from '../../lib/utils';
import { resolveAvatarUrl } from '../../lib/api';
import { dateLocale as es } from '../../lib/dateLocale';
import { useTheme } from '../../context/ThemeContext';
import { PALETTES } from '../../config/themes';

export interface MemberBadgeData {
  id: number;
  full_name: string;
  email?: string;
  cedula: string;
  profile_image?: string | null;
  membership_name?: string | null;
  training_shift?: TrainingShift | null;
  role?: string;
  created_at?: string | null;
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

function getStatusLabel(role?: string): string {
  switch (role) {
    case 'admin':
      return 'ADMINISTRACIÓN';
    case 'trainer':
      return 'STAFF — ENTRENADOR';
    case 'receptionist':
      return 'RECEPCIÓN';
    default:
      return 'MIEMBRO ACTIVO';
  }
}

function formatMemberSince(createdAt?: string | null): string {
  if (!createdAt) return '—';
  try {
    return format(parseISO(createdAt), 'MMM yyyy', { locale: es });
  } catch {
    return '—';
  }
}

function BadgeDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block text-[9px] font-semibold tracking-wide text-zinc-500 uppercase print:text-zinc-500">
        {label}
      </span>
      <span className="mt-0.5 block truncate text-xs font-medium text-zinc-900 dark:text-zinc-100 print:text-zinc-900">
        {value}
      </span>
    </div>
  );
}

export function MemberBadgeModal({ open, onClose, member }: MemberBadgeModalProps) {
  const { theme, palette } = useTheme();

  if (!member) return null;

  const qrUrl = buildBadgeQrUrl(member.cedula);
  const memberSince = formatMemberSince(member.created_at);
  const paletteLabel = PALETTES[palette].label;

  const handlePrint = () => {
    window.print();
  };

  const detailRows: { label: string; value: string }[] = [
    { label: 'Grupo', value: getRoleLabel(member.role) },
    { label: 'ID Socio', value: formatMembershipId(member.id) },
    { label: 'Cédula', value: member.cedula },
    { label: 'Plan', value: member.membership_name || 'Sin plan' },
  ];

  if (member.training_shift) {
    detailRows.push({ label: 'Turno', value: SHIFT_LABELS[member.training_shift] });
  }

  detailRows.push({ label: 'Miembro desde', value: memberSince });

  return (
    <Modal open={open} onClose={onClose} title="Carné de membresía" maxWidth="sm">
      <div className="flex flex-col gap-3">
        <div
          id="printable-badge"
          data-appearance={theme}
          data-palette={palette}
          className={cn(
            'relative w-full overflow-hidden rounded-2xl border p-4 shadow-lg',
            'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900',
            'print:border-zinc-300 print:bg-white print:shadow-none'
          )}
        >
          <div
            className="from-brand/12 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent print:hidden"
            aria-hidden
          />
          <div
            className="bg-brand pointer-events-none absolute inset-y-0 left-0 w-1 print:opacity-90"
            aria-hidden
          />

          <div className="relative mb-3 flex items-center justify-between gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800 print:border-zinc-200">
            <div className="flex min-w-0 items-center gap-2">
              <Logo className="h-7 w-7" mode="auto" />
              <div className="min-w-0 text-left">
                <span className="block truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-white print:text-zinc-900">
                  GymApure
                </span>
                <span className="block text-[9px] font-medium text-zinc-500 dark:text-zinc-400 print:hidden">
                  Tema {paletteLabel}
                </span>
              </div>
            </div>
            <span className="border-brand/35 bg-brand/10 text-brand shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-semibold tracking-wide uppercase print:border-zinc-300 print:bg-zinc-100 print:text-zinc-800">
              {getStatusLabel(member.role)}
            </span>
          </div>

          <div className="relative flex items-center gap-3">
            <div className="flex min-w-0 flex-1 flex-col items-start text-left">
              <Avatar
                src={resolveAvatarUrl(member.profile_image)}
                name={member.full_name}
                size="lg"
                className="ring-brand/35 h-14 w-14 rounded-full ring-2 print:ring-zinc-200"
              />
              <h2 className="mt-2 line-clamp-2 text-base font-semibold tracking-tight text-zinc-900 dark:text-white print:text-zinc-900">
                {member.full_name}
              </h2>
              {member.email && (
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400 print:hidden">
                  {member.email}
                </p>
              )}
            </div>

            <div className="shrink-0 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-700 print:border-zinc-200">
              <img
                src={qrUrl}
                alt="Código QR de acceso"
                className="h-[5.5rem] w-[5.5rem] rounded-md"
              />
            </div>
          </div>

          <div className="relative mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-zinc-200 pt-3 dark:border-zinc-800 print:border-zinc-200">
            {detailRows.map((row) => (
              <BadgeDetailRow key={row.label} label={row.label} value={row.value} />
            ))}
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
