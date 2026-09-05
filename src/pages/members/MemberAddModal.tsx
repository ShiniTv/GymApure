import type { Dispatch, SetStateAction } from 'react';
import { Button, CedulaInput, Input, Label, Modal } from '../../components/ui';
import { type TrainingShift } from '../../lib/trainingShift';

export interface NewMemberForm {
  full_name: string;
  email: string;
  cedula: string;
  password: string;
  confirm_password: string;
  role: string;
  training_shift: TrainingShift | '';
}

interface MemberAddModalProps {
  open: boolean;
  onClose: () => void;
  isTrainer: boolean;
  isReceptionist: boolean;
  isStaffMember: boolean;
  canCreateAdmin: boolean;
  newMember: NewMemberForm;
  onNewMemberChange: Dispatch<SetStateAction<NewMemberForm>>;
  errors: Record<string, string>;
  onErrorsChange: Dispatch<SetStateAction<Record<string, string>>>;
  onSubmit: () => void;
}

export function MemberAddModal({
  open,
  onClose,
  isTrainer,
  isReceptionist,
  isStaffMember,
  canCreateAdmin,
  newMember,
  onNewMemberChange,
  errors,
  onErrorsChange,
  onSubmit,
}: MemberAddModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <>
          Nuevo <span className="text-brand">usuario</span>
        </>
      }
      maxWidth="3xl"
      scrollable
      initialFocus="dialog"
    >
      {isTrainer && (
        <p className="text-text-muted mb-4 text-sm">
          Tras crear la cuenta:{' '}
          <strong className="text-text-secondary font-semibold">asigna una rutina</strong> en el
          calendario. La{' '}
          <strong className="text-text-secondary font-semibold">
            membresía la activa recepción
          </strong>{' '}
          en mostrador.
        </p>
      )}
      {isReceptionist && (
        <p className="text-text-muted mb-4 text-sm">
          Crea la cuenta del socio. Para activar membresía y cobrar en el mostrador, use{' '}
          <strong className="text-text-secondary font-semibold">Modo mostrador → Registro</strong>.
        </p>
      )}
      <div className="form-stack">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4">
          <div className="sm:col-span-2">
            <Label>Nombre Completo</Label>
            <Input
              type="text"
              error={errors.full_name}
              value={newMember.full_name}
              onChange={(e) => {
                onNewMemberChange({ ...newMember, full_name: e.target.value });
                if (errors.full_name) onErrorsChange({ ...errors, full_name: '' });
              }}
              placeholder="Ej: Juan Pérez"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              error={errors.email}
              value={newMember.email}
              onChange={(e) => {
                onNewMemberChange({ ...newMember, email: e.target.value });
                if (errors.email) onErrorsChange({ ...errors, email: '' });
              }}
              placeholder="juan@ejemplo.com"
            />
          </div>
          <div>
            <Label>Cédula / ID</Label>
            <CedulaInput
              error={errors.cedula}
              value={newMember.cedula}
              onChange={(value) => {
                onNewMemberChange({ ...newMember, cedula: value });
                if (errors.cedula) onErrorsChange({ ...errors, cedula: '' });
              }}
            />
          </div>
          <div>
            <Label>Contraseña inicial</Label>
            <Input
              type="password"
              minLength={8}
              error={errors.password}
              value={newMember.password}
              onChange={(e) => {
                onNewMemberChange({ ...newMember, password: e.target.value });
                if (errors.password) onErrorsChange({ ...errors, password: '' });
              }}
              placeholder="Ej: Gym2024!"
            />
            <p className="text-text-muted text-small mt-1">
              Mín. 8 caracteres, con mayúscula, minúscula, número y carácter especial.
            </p>
          </div>
          <div>
            <Label>Confirmar contraseña</Label>
            <Input
              type="password"
              minLength={8}
              error={errors.confirm_password}
              value={newMember.confirm_password}
              onChange={(e) => {
                onNewMemberChange({ ...newMember, confirm_password: e.target.value });
                if (errors.confirm_password) onErrorsChange({ ...errors, confirm_password: '' });
              }}
              placeholder="Repite la contraseña"
            />
          </div>
          {!isStaffMember && (
            <div>
              <Label>Rol de Usuario</Label>
              <select
                className="focus:ring-brand border-border bg-surface text-text w-full appearance-none rounded-2xl border px-4 py-3 font-bold transition-all outline-none focus:ring-2"
                value={newMember.role}
                onChange={(e) => {
                  onNewMemberChange({ ...newMember, role: e.target.value, training_shift: '' });
                }}
              >
                <option value="member">Miembro / Atleta</option>
                <option value="trainer">Entrenador / Staff</option>
                <option value="receptionist">Recepcionista</option>
                {canCreateAdmin && <option value="admin">Administrador</option>}
              </select>
            </div>
          )}
          {(newMember.role === 'member' || newMember.role === 'trainer') && (
            <div className={!isStaffMember ? undefined : 'sm:col-span-2'}>
              <Label>
                {newMember.role === 'trainer' ? 'Turno exclusivo' : 'Turno de entrenamiento'}
              </Label>
              <select
                className="focus:ring-brand border-border bg-surface text-text w-full appearance-none rounded-2xl border px-4 py-3 font-bold transition-all outline-none focus:ring-2"
                value={newMember.training_shift}
                onChange={(e) => {
                  onNewMemberChange({
                    ...newMember,
                    training_shift: e.target.value as TrainingShift,
                  });
                }}
              >
                <option value="">Seleccionar turno...</option>
                <option value="diurno">Diurno / Mañana</option>
                <option value="vespertino">Vespertino / Tarde</option>
                <option value="nocturno">Nocturno / Noche</option>
              </select>
            </div>
          )}
        </div>
        {errors.submit && (
          <p className="text-danger text-center text-xs font-medium">{errors.submit}</p>
        )}
        <Button onClick={onSubmit} className="mt-4 w-full" size="lg">
          Crear Usuario
        </Button>
      </div>
    </Modal>
  );
}
