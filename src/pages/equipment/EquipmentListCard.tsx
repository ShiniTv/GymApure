import { Wrench, MapPin, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { resolveEquipmentPhotoUrl } from '../../lib/api';
import {
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_STATUS_BADGE,
  equipmentDisplayName,
} from '../../lib/equipment/constants';
import { Badge } from '../../components/ui';
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
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className={cn(
        'border-border bg-surface hover:bg-surface-raised flex w-full min-w-0 items-center gap-2.5 rounded-xl border border-l-4 p-2.5 text-left transition-colors sm:gap-3 sm:p-3',
        STATUS_BORDER_STYLES[item.status]
      )}
    >
      {item.photo_url ? (
        <img
          src={resolveEquipmentPhotoUrl(item.photo_url)}
          alt=""
          className="h-11 w-11 shrink-0 rounded-lg object-cover sm:h-12 sm:w-12"
        />
      ) : (
        <div className="bg-surface-raised flex h-11 w-11 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12">
          <Wrench className="text-text-muted h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-text truncate text-[13px] font-semibold sm:text-sm">
          {equipmentDisplayName(item)}
          {item.quantity > 1 && (
            <span className="text-text-muted ml-1.5 text-[10px] font-bold">×{item.quantity}</span>
          )}
        </p>
        {!hideZone && (
          <p className="text-text-muted mt-0.5 flex items-center gap-1 truncate text-[11px] sm:text-xs">
            <MapPin className="h-3 w-3 shrink-0" />
            {item.zone_name ?? 'Sin zona'}
          </p>
        )}
        {isInspectionDue(item.next_inspection_at) && (
          <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-orange-600 dark:text-orange-400">
            <Clock className="h-3 w-3" />
            <span className="sm:hidden">Revisión</span>
            <span className="hidden sm:inline">Revisión pendiente</span>
          </p>
        )}
      </div>
      <Badge variant={EQUIPMENT_STATUS_BADGE[item.status]} className="shrink-0 text-[10px]">
        <span className="sm:hidden">{STATUS_SHORT_LABELS[item.status]}</span>
        <span className="hidden sm:inline">{EQUIPMENT_STATUS_LABELS[item.status]}</span>
      </Badge>
    </button>
  );
}
