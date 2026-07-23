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
      maxWidth="2xl"
      scrollable
      initialFocus="dialog"
    >
      {isTrainer && (
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Tras crear la cuenta:{' '}
          <strong className="font-semibold text-zinc-700 dark:text-zinc-300">
            asigna una rutina
          </strong>{' '}
          en Asignaciones. La{' '}
          <strong className="font-semibold text-zinc-700 dark:text-zinc-300">
            membresía la activa recepción
          </strong>{' '}
          en mostrador.
        </p>
      )}
      {isReceptionist && (
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Crea la cuenta del socio. Para activar membresía y cobrar en el mostrador, use{' '}
          <strong className="font-semibold text-zinc-700 dark:text-zinc-300">
            Modo mostrador → Registro
          </strong>
          .
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
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
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
                className="focus:ring-brand w-full appearance-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-bold text-zinc-900 transition-all outline-none focus:ring-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
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
                className="focus:ring-brand w-full appearance-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-bold text-zinc-900 transition-all outline-none focus:ring-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
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
          <p className="text-center text-xs font-medium text-red-500">{errors.submit}</p>
        )}
        <Button onClick={onSubmit} className="mt-4 w-full" size="lg">
          Crear Usuario
        </Button>
      </div>
    </Modal>
  );
}
