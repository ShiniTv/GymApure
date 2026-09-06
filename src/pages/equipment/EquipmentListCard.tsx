import { Wrench, MapPin, Clock, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { resolveEquipmentPhotoUrl } from '../../lib/api';
import {
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_STATUS_BADGE,
  equipmentDisplayName,
} from '../../lib/equipment/constants';
import { Badge } from '../../components/ui';
import { OperateIcon } from '../../components/operate/OperateIcon';
import { STATUS_BORDER_STYLES, STATUS_SHORT_LABELS, isInspectionDue } from './formDefaults';
import type { EquipmentItem } from './types';

export function EquipmentListCard({
  item,
  onOpen,
  hideZone = false,
}: {
  item: EquipmentItem;
  onOpen: (id: number) => void;
  hideZone?: boolean;
}) {
  const inspectionDue = isInspectionDue(item.next_inspection_at);

  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className={cn(
        'tap-feedback border-border/80 bg-surface hover:bg-surface-raised/80 group flex w-full min-w-0 items-center gap-3 rounded-[var(--radius-card)] border border-l-4 px-3 py-2.5 text-left transition-colors',
        STATUS_BORDER_STYLES[item.status]
      )}
    >
      {item.photo_url ? (
        <img
          src={resolveEquipmentPhotoUrl(item.photo_url)}
          alt=""
          className="h-10 w-10 shrink-0 rounded-[var(--radius-button)] object-cover"
        />
      ) : (
        <OperateIcon icon={Wrench} tone={inspectionDue ? 'warn' : 'neutral'} well size="md" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-text truncate text-sm font-medium tracking-[-0.011em]">
          {equipmentDisplayName(item)}
          {item.quantity > 1 && (
            <span className="text-text-muted text-small ml-1.5 font-semibold tabular-nums">
              ×{item.quantity}
            </span>
          )}
        </p>
        <p className="text-text-muted text-small mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          {!hideZone ? (
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
              <span className="truncate">{item.zone_name ?? 'Sin zona'}</span>
            </span>
          ) : null}
          {inspectionDue ? (
            <span className="text-warning inline-flex items-center gap-1 font-medium">
              <Clock className="h-3 w-3" aria-hidden />
              Revisión
            </span>
          ) : null}
        </p>
      </div>
      <Badge variant={EQUIPMENT_STATUS_BADGE[item.status]} className="text-small shrink-0">
        <span className="sm:hidden">{STATUS_SHORT_LABELS[item.status]}</span>
        <span className="hidden sm:inline">{EQUIPMENT_STATUS_LABELS[item.status]}</span>
      </Badge>
      <ChevronRight
        className="operate-icon text-text-muted h-4 w-4 shrink-0 opacity-50"
        aria-hidden
      />
    </button>
  );
}
