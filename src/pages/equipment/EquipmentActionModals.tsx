import type { FormEvent } from 'react';
import {
  EQUIPMENT_STATUSES,
  EQUIPMENT_STATUS_LABELS,
  equipmentDisplayName,
  type EquipmentStatus,
} from '../../lib/equipment/constants';
import { Button, Input, Label, Modal, Textarea, Select } from '../../components/ui';
import type { EquipmentFormState, EquipmentItem, RepairFormState, Vendor, Zone } from './types';

export interface EquipmentActionModalsProps {
  detail: EquipmentItem | null;
  zones: Zone[];
  vendors: Vendor[];
  reportOpen: boolean;
  onReportOpenChange: (open: boolean) => void;
  reportText: string;
  onReportTextChange: (value: string) => void;
  reportError: string;
  onReport: (e: FormEvent) => void;
  editOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
  editForm: EquipmentFormState;
  onEditFormChange: (updater: (f: EquipmentFormState) => EquipmentFormState) => void;
  editError: string;
  editSaving: boolean;
  onUpdate: (e: FormEvent) => void;
  deleteOpen: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  deleteError: string;
  deleting: boolean;
  onDelete: () => void;
  repairOpen: boolean;
  onRepairOpenChange: (open: boolean) => void;
  repairForm: RepairFormState;
  onRepairFormChange: (updater: (f: RepairFormState) => RepairFormState) => void;
  repairError: string;
  repairSaving: boolean;
  onRepair: (e: FormEvent) => void;
  retireOpen: boolean;
  onRetireOpenChange: (open: boolean) => void;
  retireReason: string;
  onRetireReasonChange: (value: string) => void;
  retireError: string;
  retiring: boolean;
  onRetire: (e: FormEvent) => void;
}

export function EquipmentActionModals(props: EquipmentActionModalsProps) {
  const {
    detail,
    zones,
    vendors,
    reportOpen,
    onReportOpenChange,
    reportText,
    onReportTextChange,
    reportError,
    onReport,
    editOpen,
    onEditOpenChange,
    editForm,
    onEditFormChange,
    editError,
    editSaving,
    onUpdate,
    deleteOpen,
    onDeleteOpenChange,
    deleteError,
    deleting,
    onDelete,
    repairOpen,
    onRepairOpenChange,
    repairForm,
    onRepairFormChange,
    repairError,
    repairSaving,
    onRepair,
    retireOpen,
    onRetireOpenChange,
    retireReason,
    onRetireReasonChange,
    retireError,
    retiring,
    onRetire,
  } = props;

  return (
    <>
      <Modal open={reportOpen} onClose={() => onReportOpenChange(false)} title="Reportar problema">
        <form onSubmit={onReport} className="space-y-4">
          <Textarea
            rows={4}
            placeholder="Describe el problema (ruido, pieza suelta, no enciende...)"
            value={reportText}
            onChange={(e) => onReportTextChange(e.target.value)}
            required
          />
          {reportError && <p className="text-sm text-red-500">{reportError}</p>}
          <Button type="submit" className="w-full">
            Enviar reporte
          </Button>
        </form>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => onEditOpenChange(false)}
        title="Editar equipo"
        maxWidth="md"
      >
        <form onSubmit={onUpdate} className="space-y-4">
          {detail?.catalog_name && (
            <p className="bg-surface-raised text-text-secondary rounded-lg px-3 py-2 text-sm">
              Tipo: <span className="text-text font-semibold">{detail.catalog_name}</span>
            </p>
          )}
          <div>
            <Label>
              {detail?.catalog_id ? 'Nombre en el gym (opcional)' : 'Nombre del equipo'}
            </Label>
            <Input
              value={editForm.custom_name}
              onChange={(e) => onEditFormChange((f) => ({ ...f, custom_name: e.target.value }))}
              placeholder="Ej. Prensa piernas #2"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Zona</Label>
              <Select
                value={editForm.zone_id}
                onChange={(e) => onEditFormChange((f) => ({ ...f, zone_id: e.target.value }))}
              >
                <option value="">Sin zona</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select
                value={editForm.status}
                onChange={(e) =>
                  onEditFormChange((f) => ({
                    ...f,
                    status: e.target.value as EquipmentStatus,
                  }))
                }
              >
                {EQUIPMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {EQUIPMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Marca</Label>
              <Input
                value={editForm.brand}
                onChange={(e) => onEditFormChange((f) => ({ ...f, brand: e.target.value }))}
              />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input
                value={editForm.model}
                onChange={(e) => onEditFormChange((f) => ({ ...f, model: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Nº de serie</Label>
              <Input
                value={editForm.serial_number}
                onChange={(e) => onEditFormChange((f) => ({ ...f, serial_number: e.target.value }))}
              />
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input
                type="number"
                min={1}
                value={editForm.quantity}
                onChange={(e) => onEditFormChange((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Próxima inspección</Label>
            <Input
              type="date"
              value={editForm.next_inspection_at}
              onChange={(e) =>
                onEditFormChange((f) => ({ ...f, next_inspection_at: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea
              value={editForm.notes}
              onChange={(e) => onEditFormChange((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
          </div>
          {editError && <p className="text-sm text-red-500">{editError}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => onEditOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={editSaving}>
              {editSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => onDeleteOpenChange(false)}
        title={
          <>
            Eliminar <span className="text-red-500">equipo</span>
          </>
        }
        maxWidth="sm"
        initialFocus="dialog"
      >
        {detail && (
          <div className="space-y-4">
            <p className="text-text-secondary text-sm">
              ¿Eliminar <strong>{equipmentDisplayName(detail)}</strong> del inventario? Se borrará
              también su historial de mantenimiento. Esta acción no se puede deshacer.
            </p>
            <p className="text-text-muted text-xs">
              Si el equipo ya no está en el gym pero quieres conservar el historial, usa{' '}
              <strong>Retirar</strong> en lugar de eliminar.
            </p>
            {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => onDeleteOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                className="flex-1"
                disabled={deleting}
                onClick={() => void onDelete()}
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={repairOpen}
        onClose={() => onRepairOpenChange(false)}
        title="Registrar reparación"
        maxWidth="md"
      >
        <form onSubmit={onRepair} className="space-y-4">
          <div>
            <Label>Qué se hizo</Label>
            <Textarea
              rows={3}
              required
              placeholder="Ej. Cambio de cable, lubricación, ajuste de poleas..."
              value={repairForm.description}
              onChange={(e) => onRepairFormChange((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Proveedor (opcional)</Label>
              <Select
                value={repairForm.vendor_id}
                onChange={(e) => onRepairFormChange((f) => ({ ...f, vendor_id: e.target.value }))}
              >
                <option value="">Sin proveedor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Costo USD (opcional)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={repairForm.cost_usd}
                onChange={(e) => onRepairFormChange((f) => ({ ...f, cost_usd: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Fecha</Label>
              <Input
                type="date"
                required
                value={repairForm.performed_at}
                onChange={(e) =>
                  onRepairFormChange((f) => ({ ...f, performed_at: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Estado tras reparación</Label>
              <Select
                value={repairForm.new_status}
                onChange={(e) =>
                  onRepairFormChange((f) => ({
                    ...f,
                    new_status: e.target.value as EquipmentStatus | '',
                  }))
                }
              >
                <option value="">Sin cambio</option>
                {EQUIPMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {EQUIPMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {repairError && <p className="text-sm text-red-500">{repairError}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => onRepairOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={repairSaving}>
              {repairSaving ? 'Guardando...' : 'Registrar reparación'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={retireOpen}
        onClose={() => onRetireOpenChange(false)}
        title="Retirar del gym"
        maxWidth="sm"
        initialFocus="dialog"
      >
        <form onSubmit={onRetire} className="space-y-4">
          <p className="text-text-secondary text-sm">
            El equipo pasará a <strong>fuera de servicio</strong> y quedará en el historial. Úsalo
            cuando ya no esté en el local (vendido, sustituido, etc.).
          </p>
          <div>
            <Label>Motivo (opcional)</Label>
            <Textarea
              rows={2}
              placeholder="Ej. Vendida, sustituida por modelo nuevo..."
              value={retireReason}
              onChange={(e) => onRetireReasonChange(e.target.value)}
            />
          </div>
          {retireError && <p className="text-sm text-red-500">{retireError}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => onRetireOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={retiring}>
              {retiring ? 'Retirando...' : 'Retirar del gym'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
