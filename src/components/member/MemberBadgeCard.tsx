import { format, parseISO } from 'date-fns';
import QRCode from 'react-qr-code';
import { Avatar } from '../ui';
import Logo from '../Logo';
import { BRAND } from '../../config/brand';
import { buildBadgeQrValue } from '../../lib/badgeQr';
import { resolveAvatarUrl } from '../../lib/api';
import { dateLocale as es } from '../../lib/dateLocale';
import { SHIFT_LABELS, formatMembershipId, type TrainingShift } from '../../lib/trainingShift';
import { cn } from '../../lib/utils';

export interface MemberBadgeData {
  id: number;
  full_name: string;
  cedula: string;
  profile_image?: string | null;
  membership_name?: string | null;
  training_shift?: TrainingShift | null;
  role?: string;
  created_at?: string | null;
  subscription_end?: string | null;
}

interface MemberBadgeCardProps {
  member: MemberBadgeData;
  side: 'front' | 'back';
  className?: string;
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

function formatBadgeDate(value?: string | null, pattern = 'dd/MM/yyyy'): string {
  if (!value) return '—';
  try {
    return format(parseISO(value), pattern, { locale: es });
  } catch {
    return '—';
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
    <div className="flex min-w-0 items-baseline gap-1 text-[10px] leading-tight text-zinc-800">
      <span className="shrink-0 font-semibold text-zinc-600">{label}:</span>
      <span className="min-w-0 truncate font-medium">{value}</span>
    </div>
  );
}

const CARD_CLASS =
  'member-badge-card relative mx-auto w-[214px] overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-md print:shadow-none';

export function MemberBadgeCard({ member, side, className }: MemberBadgeCardProps) {
  const qrValue = buildBadgeQrValue(member.cedula);
  const subtitle = member.membership_name
    ? `${getRoleLabel(member.role)} · ${member.membership_name}`
    : getRoleLabel(member.role);

  const detailRows: { label: string; value: string }[] = [
    { label: 'ID Socio', value: formatMembershipId(member.id) },
    { label: 'Cédula', value: member.cedula },
    { label: 'Plan', value: member.membership_name || 'Sin plan' },
  ];

  if (member.training_shift) {
    detailRows.push({ label: 'Turno', value: SHIFT_LABELS[member.training_shift] });
  }

  if (side === 'front') {
    return (
      <div className={cn(CARD_CLASS, className)} data-badge-side="front">
        <div className="bg-zinc-950 px-3 pt-3 pb-10 print:bg-zinc-950">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8" mode="dark" />
            <span className="text-[11px] font-semibold tracking-wide text-white uppercase">
              {BRAND.name}
            </span>
          </div>
        </div>

        <div className="bg-brand relative h-14 print:bg-[var(--color-brand)]" aria-hidden />

        <div className="relative -mt-11 flex justify-center px-3">
          <Avatar
            src={resolveAvatarUrl(member.profile_image)}
            name={member.full_name}
            size="lg"
            className="h-[4.5rem] w-[4.5rem] rounded-full border-4 border-white bg-white ring-2 ring-zinc-200"
          />
        </div>

        <div className="px-3 pt-2 pb-3 text-center">
          <h2 className="line-clamp-2 text-sm font-bold tracking-tight text-zinc-900">
            {member.full_name}
          </h2>
          <p className="mt-0.5 line-clamp-2 text-[10px] font-medium text-zinc-500">{subtitle}</p>
        </div>

        <div className="space-y-1.5 border-t border-zinc-200 px-3 py-2.5">
          {detailRows.map((row) => (
            <BadgeDetailRow key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(CARD_CLASS, className)} data-badge-side="back">
      <div className="space-y-0.5 px-0 pt-2">
        <div className="h-0.5 bg-zinc-950 print:bg-zinc-950" />
        <div className="bg-brand h-0.5 print:bg-[var(--color-brand)]" />
      </div>

      <div className="flex flex-col items-center px-4 pt-4 pb-2 text-center">
        <Logo className="h-10 w-10" mode="auto" />
        <span className="mt-1 text-[10px] font-semibold tracking-wide text-zinc-900 uppercase">
          {BRAND.name}
        </span>
        <p className="mt-2 text-[8px] leading-snug text-zinc-500">
          Carné personal e intransferible. Presentar en recepción para acceso. El titular es
          responsable del uso de este documento conforme a las normas del gimnasio.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 py-2 text-[9px]">
        <div>
          <span className="block font-semibold tracking-wide text-zinc-500 uppercase">
            Miembro desde
          </span>
          <span className="mt-0.5 block font-semibold text-zinc-900">
            {formatMemberSince(member.created_at)}
          </span>
        </div>
        <div className="text-right">
          <span className="block font-semibold tracking-wide text-zinc-500 uppercase">Vence</span>
          <span className="mt-0.5 block font-semibold text-zinc-900">
            {formatBadgeDate(member.subscription_end)}
          </span>
        </div>
      </div>

      <div className="flex justify-center px-4 pt-1 pb-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-2">
          <QRCode value={qrValue} size={120} level="M" fgColor="#18181b" bgColor="#ffffff" />
        </div>
      </div>
    </div>
  );
}
