import { Button, Input, Label, Modal, Textarea } from '../../components/ui';
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
  return (
    <>
      <Modal
        open={!!toggleTarget}
        onClose={() => !toggling && onCloseToggle()}
        title="Cambiar estado"
      >
        {toggleTarget && (
          <>
            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
              {toggleTarget.status === 'active'
                ? `¿Desactivar a ${toggleTarget.full_name}? No podrá hacer check-in ni acceder al sistema.`
                : `¿Activar a ${toggleTarget.full_name}? Podrá usar el gimnasio nuevamente.`}
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={onCloseToggle}
                disabled={toggling}
              >
                Cancelar
              </Button>
              <Button
                variant={toggleTarget.status === 'active' ? 'danger' : 'primary'}
                className="flex-1"
                onClick={onConfirmToggle}
                disabled={toggling}
              >
                {toggling
                  ? 'Cambiando...'
                  : toggleTarget.status === 'active'
                    ? 'Desactivar'
                    : 'Activar'}
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={onCloseDelete}
        title={deleteTarget?.role === 'trainer' ? 'Eliminar entrenador' : 'Eliminar usuario'}
      >
        {deleteTarget?.role === 'trainer' ? (
          <div className="mb-6 space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Esta acción es irreversible. Se eliminarán las rutinas sin asignar del entrenador y
              los planes nutricionales pasarán a tu cuenta. Si tiene rutinas asignadas a miembros,
              deberás desactivarlo o reasignarlas antes.
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
            {deleteError ? <p className="text-sm text-red-500">{deleteError}</p> : null}
          </div>
        ) : (
          <div className="mb-6 space-y-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              ¿Eliminar a <strong>{deleteTarget?.full_name}</strong>? Esta acción no se puede
              deshacer.
            </p>
            {deleteError ? <p className="text-sm text-red-500">{deleteError}</p> : null}
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onCloseDelete} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={onConfirmDelete}
            disabled={
              deleting ||
              (deleteTarget?.role === 'trainer' &&
                deleteConfirmName.trim().toLowerCase() !==
                  deleteTarget.full_name.trim().toLowerCase())
            }
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!pauseTarget}
        onClose={() => {
          if (pausing) return;
          onClosePause();
        }}
        title={
          <>
            Pausar <span className="text-brand">membresía</span>
          </>
        }
      >
        {pauseTarget && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              ¿Pausar la membresía de <strong>{pauseTarget.full_name}</strong>? Los días restantes
              se congelan hasta reanudar.
            </p>
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
            {pauseError && <p className="text-sm font-bold text-red-500">{pauseError}</p>}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                disabled={pausing}
                onClick={onClosePause}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1"
                loading={pausing}
                disabled={pauseReason.trim().length < 3 || pausing}
                onClick={onConfirmPause}
              >
                Pausar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!editShiftTarget}
        onClose={() => !savingShift && onCloseEditShift()}
        title={
          editShiftTarget ? (
            <>
              Turno — <span className="text-brand">{editShiftTarget.full_name}</span>
            </>
          ) : (
            ''
          )
        }
      >
        {editShiftTarget && (
          <div className="space-y-4">
            <ShiftFilter
              includeAll={false}
              label=""
              value={editShiftValue}
              onChange={onEditShiftValueChange}
            />
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={onCloseEditShift}
                disabled={savingShift}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={onSaveShift}
                disabled={savingShift || !editShiftValue}
              >
                {savingShift ? 'Guardando...' : 'Guardar turno'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
