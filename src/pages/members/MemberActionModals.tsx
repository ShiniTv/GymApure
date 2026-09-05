import { Pause, Trash2, UserCog } from 'lucide-react';
import { Button, Input, Label, Modal, ModalActions, Textarea } from '../../components/ui';
import { ShiftFilter } from '../../components/trainers/ShiftFilter';
import type { Member } from '../../hooks/queries/useMembersQuery';
import type { TrainingShift } from '../../lib/trainingShift';

interface MemberActionModalsProps {
  toggleTarget: Member | null;
  toggling: boolean;
  onCloseToggle: () => void;
  onConfirmToggle: () => void;

  deleteTarget: Member | null;
  deleteConfirmName: string;
  onDeleteConfirmNameChange: (value: string) => void;
  deleteError: string;
  onClearDeleteError: () => void;
  deleting: boolean;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;

  pauseTarget: Member | null;
  pauseReason: string;
  onPauseReasonChange: (value: string) => void;
  pauseError: string;
  pausing: boolean;
  onClosePause: () => void;
  onConfirmPause: () => void;

  editShiftTarget: Member | null;
  editShiftValue: TrainingShift | '';
  onEditShiftValueChange: (value: TrainingShift | '') => void;
  savingShift: boolean;
  onCloseEditShift: () => void;
  onSaveShift: () => void;
}

export function MemberActionModals({
  toggleTarget,
  toggling,
  onCloseToggle,
  onConfirmToggle,
  deleteTarget,
  deleteConfirmName,
  onDeleteConfirmNameChange,
  deleteError,
  onClearDeleteError,
  deleting,
  onCloseDelete,
  onConfirmDelete,
  pauseTarget,
  pauseReason,
  onPauseReasonChange,
  pauseError,
  pausing,
  onClosePause,
  onConfirmPause,
  editShiftTarget,
  editShiftValue,
  onEditShiftValueChange,
  savingShift,
  onCloseEditShift,
  onSaveShift,
}: MemberActionModalsProps) {
  const isDeactivating = toggleTarget?.status === 'active';

  return (
    <>
      <Modal
        open={!!toggleTarget}
        onClose={() => !toggling && onCloseToggle()}
        title="Cambiar estado"
        description={
          toggleTarget
            ? isDeactivating
              ? `${toggleTarget.full_name} no podrá registrar acceso ni usar el sistema.`
              : `${toggleTarget.full_name} podrá usar el gimnasio nuevamente.`
            : undefined
        }
        icon={UserCog}
        tone={isDeactivating ? 'danger' : 'brand'}
        maxWidth="sm"
        initialFocus="dialog"
        footer={
          <ModalActions>
            <Button variant="secondary" onClick={onCloseToggle} disabled={toggling}>
              Cancelar
            </Button>
            <Button
              variant={isDeactivating ? 'danger' : 'primary'}
              onClick={onConfirmToggle}
              disabled={toggling}
            >
              {toggling ? 'Cambiando…' : isDeactivating ? 'Desactivar' : 'Activar'}
            </Button>
          </ModalActions>
        }
      />

      <Modal
        open={!!deleteTarget}
        onClose={onCloseDelete}
        title={deleteTarget?.role === 'trainer' ? 'Eliminar entrenador' : 'Eliminar usuario'}
        description={
          deleteTarget?.role === 'trainer'
            ? 'Acción irreversible. Rutinas sin asignar se eliminan; planes nutricionales pasan a tu cuenta.'
            : deleteTarget
              ? `¿Eliminar a ${deleteTarget.full_name}? Esta acción no se puede deshacer.`
              : undefined
        }
        icon={Trash2}
        tone="danger"
        maxWidth="sm"
        initialFocus={deleteTarget?.role === 'trainer' ? 'input' : 'dialog'}
        footer={
          <ModalActions>
            <Button variant="secondary" onClick={onCloseDelete} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={onConfirmDelete}
              disabled={
                deleting ||
                (deleteTarget?.role === 'trainer' &&
                  deleteConfirmName.trim().toLowerCase() !==
                    deleteTarget.full_name.trim().toLowerCase())
              }
            >
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </ModalActions>
        }
      >
        {deleteTarget?.role === 'trainer' ? (
          <div className="space-y-3">
            <p className="text-text-secondary text-sm leading-snug">
              Si tiene rutinas asignadas a miembros, desactívalo o reasígnalas antes.
            </p>
            <div>
              <Label htmlFor="delete-trainer-confirm">
                Escribe el nombre exacto: <strong>{deleteTarget.full_name}</strong>
              </Label>
              <Input
                id="delete-trainer-confirm"
                value={deleteConfirmName}
                onChange={(e) => {
                  onDeleteConfirmNameChange(e.target.value);
                  if (deleteError) onClearDeleteError();
                }}
                placeholder={deleteTarget.full_name}
                autoComplete="off"
                disabled={deleting}
              />
            </div>
            {deleteError ? <p className="text-danger text-sm">{deleteError}</p> : null}
          </div>
        ) : deleteError ? (
          <p className="text-danger text-sm">{deleteError}</p>
        ) : null}
      </Modal>

      <Modal
        open={!!pauseTarget}
        onClose={() => {
          if (pausing) return;
          onClosePause();
        }}
        title="Pausar membresía"
        description={
          pauseTarget
            ? `Los días restantes de ${pauseTarget.full_name} se congelan hasta reanudar.`
            : undefined
        }
        icon={Pause}
        tone="brand"
        maxWidth="sm"
        footer={
          <ModalActions>
            <Button type="button" variant="secondary" disabled={pausing} onClick={onClosePause}>
              Cancelar
            </Button>
            <Button
              type="button"
              loading={pausing}
              disabled={pauseReason.trim().length < 3 || pausing}
              onClick={onConfirmPause}
            >
              Pausar
            </Button>
          </ModalActions>
        }
      >
        {pauseTarget ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="pause-reason">Motivo</Label>
              <Textarea
                id="pause-reason"
                rows={3}
                maxLength={500}
                value={pauseReason}
                onChange={(e) => onPauseReasonChange(e.target.value)}
                placeholder="Ej. Viaje, lesión, solicitud del miembro"
                required
              />
            </div>
            {pauseError ? <p className="text-danger text-sm font-semibold">{pauseError}</p> : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!editShiftTarget}
        onClose={() => !savingShift && onCloseEditShift()}
        title={editShiftTarget ? `Turno — ${editShiftTarget.full_name}` : 'Turno'}
        maxWidth="sm"
        footer={
          <ModalActions>
            <Button variant="secondary" onClick={onCloseEditShift} disabled={savingShift}>
              Cancelar
            </Button>
            <Button onClick={onSaveShift} disabled={savingShift || !editShiftValue}>
              {savingShift ? 'Guardando…' : 'Guardar turno'}
            </Button>
          </ModalActions>
        }
      >
        {editShiftTarget ? (
          <ShiftFilter
            includeAll={false}
            label=""
            value={editShiftValue}
            onChange={onEditShiftValueChange}
          />
        ) : null}
      </Modal>
    </>
  );
}
