import { FormEvent, lazy, Suspense } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Input, Label, Modal } from '../../components/ui';
import type { MemberBadgeData } from '../../components/member/MemberBadgeCard';
import type { MeasurementFormState } from './types';

const MemberBadgeModal = lazy(() =>
  import('../../components/member/MemberBadgeModal').then((m) => ({ default: m.MemberBadgeModal }))
);
const MemberBadgeScanView = lazy(() =>
  import('../../components/member/MemberBadgeScanView').then((m) => ({
    default: m.MemberBadgeScanView,
  }))
);

interface ProfileModalsProps {
  showRemoveAvatarModal: boolean;
  avatarRemoving: boolean;
  onCloseRemoveAvatar: () => void;
  onConfirmRemoveAvatar: () => void;
  showBadgeModal: boolean;
  onCloseBadgeModal: () => void;
  showScanView: boolean;
  onCloseScanView: () => void;
  badgeMember: MemberBadgeData | null;
  isAddingMeasurement: boolean;
  onCloseMeasurement: () => void;
  measurementError: string;
  measurementForm: MeasurementFormState;
  setMeasurementForm: (form: MeasurementFormState) => void;
  onAddMeasurement: (e: FormEvent) => void;
}

export function ProfileModals({
  showRemoveAvatarModal,
  avatarRemoving,
  onCloseRemoveAvatar,
  onConfirmRemoveAvatar,
  showBadgeModal,
  onCloseBadgeModal,
  showScanView,
  onCloseScanView,
  badgeMember,
  isAddingMeasurement,
  onCloseMeasurement,
  measurementError,
  measurementForm,
  setMeasurementForm,
  onAddMeasurement,
}: ProfileModalsProps) {
  return (
    <>
      <Modal
        open={showRemoveAvatarModal}
        onClose={() => !avatarRemoving && onCloseRemoveAvatar()}
        title="Quitar foto de perfil"
        maxWidth="sm"
      >
        <p className="text-text-muted mb-5 text-sm">
          ¿Quitar tu foto de perfil? Volverás al avatar por defecto.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCloseRemoveAvatar}
            disabled={avatarRemoving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => void onConfirmRemoveAvatar()}
            loading={avatarRemoving}
          >
            <Trash2 className="h-4 w-4" />
            Quitar foto
          </Button>
        </div>
      </Modal>

      <Suspense fallback={null}>
        <MemberBadgeModal open={showBadgeModal} onClose={onCloseBadgeModal} member={badgeMember} />

        {badgeMember && (
          <MemberBadgeScanView open={showScanView} onClose={onCloseScanView} member={badgeMember} />
        )}
      </Suspense>

      <Modal
        open={isAddingMeasurement}
        onClose={onCloseMeasurement}
        title="Registrar peso"
        maxWidth="sm"
      >
        {measurementError && (
          <p className="text-danger mb-3 text-sm font-medium">{measurementError}</p>
        )}
        <form onSubmit={onAddMeasurement} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha</Label>
              <Input
                type="date"
                value={measurementForm.date}
                onChange={(e) => {
                  setMeasurementForm({ ...measurementForm, date: e.target.value });
                }}
                required
              />
            </div>
            <div>
              <Label>Peso (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurementForm.weight}
                onChange={(e) => {
                  setMeasurementForm({ ...measurementForm, weight: e.target.value });
                }}
                placeholder="Ej. 72.5"
                autoFocus
              />
            </div>
          </div>
          <details className="border-border group rounded-lg border">
            <summary className="text-text-muted text-small cursor-pointer list-none px-3 py-2 font-medium marker:content-none [&::-webkit-details-marker]:hidden">
              Más medidas (opcional)
            </summary>
            <div className="border-border-subtle grid grid-cols-2 gap-3 border-t px-3 pt-2 pb-3">
              <div>
                <Label>Grasa (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={measurementForm.body_fat_percentage}
                  onChange={(e) => {
                    setMeasurementForm({
                      ...measurementForm,
                      body_fat_percentage: e.target.value,
                    });
                  }}
                />
              </div>
              <div>
                <Label>Cintura (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={measurementForm.waist}
                  onChange={(e) => {
                    setMeasurementForm({ ...measurementForm, waist: e.target.value });
                  }}
                />
              </div>
              <div>
                <Label>Brazo (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={measurementForm.arm}
                  onChange={(e) => {
                    setMeasurementForm({ ...measurementForm, arm: e.target.value });
                  }}
                />
              </div>
              <div>
                <Label>Pierna (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={measurementForm.leg}
                  onChange={(e) => {
                    setMeasurementForm({ ...measurementForm, leg: e.target.value });
                  }}
                />
              </div>
            </div>
          </details>
          <Button type="submit" className="w-full">
            Guardar
          </Button>
        </form>
      </Modal>
    </>
  );
}
