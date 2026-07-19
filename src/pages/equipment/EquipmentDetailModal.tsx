import type { RefObject } from 'react';
import {
  AlertTriangle,
  Archive,
  Camera,
  Clock,
  Hammer,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { formatMoney } from '../../lib/utils';
import { resolveEquipmentPhotoUrl } from '../../lib/api';
import {
  EQUIPMENT_STATUSES,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_EVENT_LABELS,
  EQUIPMENT_STATUS_BADGE,
  equipmentDisplayName,
  type EquipmentStatus,
} from '../../lib/equipment/constants';
import { AnchoredMenu, Badge, Button, Modal, Spinner } from '../../components/ui';
import type { EquipmentItem, MaintenanceEvent } from './types';

interface EquipmentDetailModalProps {
  open: boolean;
  onClose: () => void;
  detail: EquipmentItem | null;
  events: MaintenanceEvent[];
  detailLoading: boolean;
  isAdmin: boolean;
  detailMoreOpen: boolean;
  detailMoreRef: RefObject<HTMLButtonElement | null>;
  onDetailMoreOpenChange: (open: boolean) => void;
  onReport: () => void;
  onRepair: () => void;
  onEdit: () => void;
  onPhotoUpload: (file: File) => void;
  onRetireOpen: () => void;
  onDeleteOpen: () => void;
  onStatusChange: (status: EquipmentStatus) => void;
}

export function EquipmentDetailModal({
  open,
  onClose,
  detail,
  events,
  detailLoading,
  isAdmin,
  detailMoreOpen,
  detailMoreRef,
  onDetailMoreOpenChange,
  onReport,
  onRepair,
  onEdit,
  onPhotoUpload,
  onRetireOpen,
  onDeleteOpen,
  onStatusChange,
}: EquipmentDetailModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={detail ? equipmentDisplayName(detail) : 'Detalle del equipo'}
      maxWidth="xl"
    >
      {detailLoading || !detail ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <Badge variant={EQUIPMENT_STATUS_BADGE[detail.status]}>
              {EQUIPMENT_STATUS_LABELS[detail.status]}
            </Badge>
            <div className="flex flex-wrap gap-2">
              {!isAdmin && (
                <Button variant="secondary" onClick={onReport}>
                  <AlertTriangle className="h-4 w-4" />
                  Reportar problema
                </Button>
              )}
              {isAdmin && (
                <>
                  <Button variant="secondary" size="sm" onClick={onRepair}>
                    <Hammer className="h-4 w-4" />
                    Reparación
                  </Button>
                  <Button variant="secondary" size="sm" onClick={onEdit}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    ref={detailMoreRef}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 px-0"
                    onClick={() => onDetailMoreOpenChange(!detailMoreOpen)}
                    aria-label="Más acciones"
                    aria-expanded={detailMoreOpen}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  <AnchoredMenu
                    open={detailMoreOpen}
                    onClose={() => onDetailMoreOpenChange(false)}
                    anchorRef={detailMoreRef}
                    align="end"
                  >
                    <div className="flex flex-col p-1">
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <Camera className="h-4 w-4" />
                        Subir foto
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            onDetailMoreOpenChange(false);
                            if (file) onPhotoUpload(file);
                          }}
                        />
                      </label>
                      {detail.status !== 'out_of_service' && (
                        <button
                          type="button"
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          onClick={() => {
                            onDetailMoreOpenChange(false);
                            onRetireOpen();
                          }}
                        >
                          <Archive className="h-4 w-4" />
                          Retirar del gym
                        </button>
                      )}
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                        onClick={() => {
                          onDetailMoreOpenChange(false);
                          onDeleteOpen();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </button>
                    </div>
                  </AnchoredMenu>
                </>
              )}
            </div>
          </div>

          {detail.photo_url && (
            <img
              src={resolveEquipmentPhotoUrl(detail.photo_url)}
              alt=""
              className="max-h-48 w-full rounded-xl object-cover"
            />
          )}

          <div className="grid gap-2 text-sm text-zinc-600 sm:grid-cols-2 dark:text-zinc-300">
            <p>
              <span className="font-semibold text-zinc-900 dark:text-white">Zona:</span>{' '}
              {detail.zone_name ?? '—'}
            </p>
            <p>
              <span className="font-semibold text-zinc-900 dark:text-white">Categoría:</span>{' '}
              {detail.catalog_category ? EQUIPMENT_CATEGORY_LABELS[detail.catalog_category] : '—'}
            </p>
            <p>
              <span className="font-semibold text-zinc-900 dark:text-white">Marca / modelo:</span>{' '}
              {[detail.brand, detail.model].filter(Boolean).join(' ') || '—'}
            </p>
            <p>
              <span className="font-semibold text-zinc-900 dark:text-white">Serie:</span>{' '}
              {detail.serial_number ?? '—'}
            </p>
            {detail.next_inspection_at && (
              <p className="flex items-center gap-1 sm:col-span-2">
                <Clock className="h-4 w-4" />
                Próxima inspección: {detail.next_inspection_at}
              </p>
            )}
          </div>

          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_STATUSES.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={detail.status === status ? 'primary' : 'secondary'}
                  onClick={() => onStatusChange(status)}
                >
                  {EQUIPMENT_STATUS_LABELS[status]}
                </Button>
              ))}
            </div>
          )}

          <div>
            <h4 className="mb-2 text-sm font-bold text-zinc-900 dark:text-white">Historial</h4>
            {events.length === 0 ? (
              <p className="text-sm text-zinc-500">Sin eventos registrados.</p>
            ) : (
              <ul className="space-y-2">
                {events.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-500">
                        {EQUIPMENT_EVENT_LABELS[
                          event.event_type as keyof typeof EQUIPMENT_EVENT_LABELS
                        ] ?? event.event_type}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(event.performed_at).toLocaleString('es')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                      {event.description}
                    </p>
                    {(event.vendor_name || event.cost_usd != null) && (
                      <p className="mt-1 text-xs text-zinc-500">
                        {[
                          event.vendor_name,
                          event.cost_usd != null && !Number.isNaN(Number(event.cost_usd))
                            ? formatMoney(Number(event.cost_usd))
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    {event.created_by_name && (
                      <p className="mt-1 text-[10px] text-zinc-400">{event.created_by_name}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
