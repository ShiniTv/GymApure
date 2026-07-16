import { useState } from 'react';
import { Plus, Edit, Dumbbell } from 'lucide-react';
import { apiFetch, parseJsonSafe, connectionOrApiError } from '../lib/api';
import {
  useTrainersQuery,
  useInvalidateTrainers,
  type Trainer,
} from '../hooks/queries/useTrainersQuery';
import {
  Button,
  Card,
  Input,
  Label,
  Modal,
  PageHeader,
  Badge,
  Select,
  SearchInput,
  EmptyState,
  BackToDashboardLink,
  Textarea,
  TableRowSkeleton,
  PasswordInput,
} from '../components/ui';
import { ShiftFilter } from '../components/trainers/ShiftFilter';
import { ResponsiveTable } from '../components/ResponsiveTable';
import {
  TRAINER_LEVELS,
  LEVEL_LABELS,
  SHIFT_SHORT_LABELS,
  SHIFT_BADGE_CLASSES,
  type TrainerLevel,
  type TrainingShift,
} from '../lib/trainingShift';
import { passwordSchema } from '../lib/passwordSchema';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToastOptional } from '../context/ToastContext';
import { cn } from '../lib/utils';
import { clientLogger } from '../lib/clientLogger';

const EMPTY_FORM = {
  full_name: '',
  email: '',
  cedula: '',
  password: '',
  confirm_password: '',
  level: 'basico' as TrainerLevel,
  specialty: '',
  shift: 'diurno' as TrainingShift,
  bio: '',
};

export default function Trainers() {
  usePageTitle('Entrenadores');
  const toast = useToastOptional();
  const invalidateTrainers = useInvalidateTrainers();

  const [search, setSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState<TrainingShift | ''>('');
  const [levelFilter, setLevelFilter] = useState<TrainerLevel | ''>('');

  const { data: trainers = [], isPending: loading } = useTrainersQuery({
    shift: shiftFilter,
    level: levelFilter,
    search,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [editTarget, setEditTarget] = useState<Trainer | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState({
    level: 'basico' as TrainerLevel,
    specialty: '',
    shift: 'diurno' as TrainingShift,
    bio: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const resetCreate = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setIsCreating(false);
  };

  const openEdit = (trainer: Trainer) => {
    setEditTarget(trainer);
    setEditForm({
      level: trainer.level,
      specialty: trainer.specialty || '',
      shift: trainer.shift,
      bio: trainer.bio || '',
    });
    setErrors({});
  };

  const validateCreate = () => {
    const next: Record<string, string> = {};
    if (!form.full_name.trim() || form.full_name.trim().length < 3) {
      next.full_name = 'Nombre requerido (mín. 3 caracteres)';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Email inválido';
    }
    if (!form.cedula.trim()) next.cedula = 'Cédula requerida';
    const passwordResult = passwordSchema.safeParse(form.password);
    if (!passwordResult.success) {
      next.password = passwordResult.error.issues[0]?.message || 'Contraseña inválida';
    }
    if (form.password !== form.confirm_password)
      next.confirm_password = 'Las contraseñas no coinciden';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreate = async () => {
    if (!validateCreate()) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/trainers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          cedula: form.cedula.trim(),
          password: form.password,
          level: form.level,
          specialty: form.specialty.trim() || null,
          shift: form.shift,
          bio: form.bio.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await parseJsonSafe<{ error?: string }>(res);
        setErrors({ submit: data.error || 'Error al crear entrenador' });
        return;
      }
      resetCreate();
      invalidateTrainers();
      toast?.success('Entrenador creado');
    } catch (err) {
      clientLogger.error('Failed to create trainer', err);
      setErrors({ submit: connectionOrApiError(err, 'Error al crear entrenador') });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/trainers/${editTarget.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: editForm.level,
          specialty: editForm.specialty.trim() || null,
          shift: editForm.shift,
          bio: editForm.bio.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await parseJsonSafe<{ error?: string }>(res);
        setErrors({ submit: data.error || 'Error al actualizar' });
        return;
      }
      setEditTarget(null);
      invalidateTrainers();
      toast?.success('Perfil actualizado');
    } catch (err) {
      clientLogger.error('Failed to update trainer', err);
      setErrors({ submit: connectionOrApiError(err, 'Error al actualizar') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        compact
        title={
          <>
            Gestión de <span className="text-brand">entrenadores</span>
          </>
        }
        subtitle="Administra nivel, especialidad y turno exclusivo de cada entrenador."
        action={<BackToDashboardLink />}
      />

      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <SearchInput
            containerClassName="flex-1 min-w-0"
            placeholder="Buscar por nombre o especialidad..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
          />
          <Button
            size="sm"
            className="h-11 min-h-11 w-11 shrink-0 rounded-xl p-0 sm:w-auto sm:px-4"
            onClick={() => {
              setIsCreating(true);
            }}
            aria-label="Nuevo entrenador"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo entrenador</span>
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] tracking-wider text-zinc-500 uppercase">Turno</Label>
          <ShiftFilter value={shiftFilter} onChange={setShiftFilter} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setLevelFilter('');
            }}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
              levelFilter === ''
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'
            )}
          >
            Todos los niveles
          </button>
          {TRAINER_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => {
                setLevelFilter(level);
              }}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                levelFilter === level
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'
              )}
            >
              {LEVEL_LABELS[level]}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveTable
        items={trainers}
        keyExtractor={(trainer) => trainer.id}
        breakpoint="lg"
        desktopInCard
        loading={loading}
        loadingSkeleton={
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} padding="sm" rounded="xl">
                  <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="mt-2 h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                </Card>
              ))}
            </div>
            <Card
              padding="none"
              rounded="xl"
              className="table-shell hidden overflow-hidden lg:block"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    <TableRowSkeleton cols={6} />
                    <TableRowSkeleton cols={6} />
                    <TableRowSkeleton cols={6} />
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        }
        emptyState={
          <EmptyState
            icon={Dumbbell}
            title="Sin entrenadores"
            description="Crea el primer entrenador con turno y nivel asignados."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setIsCreating(true);
                }}
              >
                Nuevo entrenador
              </Button>
            }
          />
        }
        mobileClassName="grid gap-2 sm:grid-cols-2"
        mobile={(trainer) => (
          <Card padding="sm" rounded="xl" className="relative">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-bold text-zinc-900 dark:text-white">
                  {trainer.full_name}
                </p>
                <p className="truncate text-xs text-zinc-500">{trainer.email}</p>
                {trainer.specialty && (
                  <p className="mt-1 truncate text-xs text-zinc-600 dark:text-zinc-400">
                    {trainer.specialty}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  openEdit(trainer);
                }}
                className="hover:bg-brand/10 hover:text-brand shrink-0 rounded-lg p-1.5 text-zinc-400"
                title="Editar perfil"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge className={SHIFT_BADGE_CLASSES[trainer.shift]}>
                {SHIFT_SHORT_LABELS[trainer.shift]}
              </Badge>
              <Badge variant="default">{LEVEL_LABELS[trainer.level]}</Badge>
              <Badge variant={trainer.status === 'active' ? 'success' : 'danger'}>
                {trainer.status === 'active' ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </Card>
        )}
        header={
          <tr>
            <th className="px-4 py-2.5 lg:px-5">Nombre</th>
            <th className="px-4 py-2.5 lg:px-5">Email</th>
            <th className="px-4 py-2.5 lg:px-5">Especialidad</th>
            <th className="px-4 py-2.5 lg:px-5">Turno</th>
            <th className="px-4 py-2.5 lg:px-5">Nivel</th>
            <th className="px-4 py-2.5 text-right lg:px-5">Estado</th>
          </tr>
        }
        desktop={(trainer) => (
          <tr className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
            <td className="px-4 py-2.5 font-medium text-zinc-900 lg:px-5 dark:text-white">
              {trainer.full_name}
            </td>
            <td className="max-w-[12rem] truncate px-4 py-2.5 text-zinc-500 lg:px-5 dark:text-zinc-400">
              {trainer.email}
            </td>
            <td className="max-w-[10rem] truncate px-4 py-2.5 text-zinc-600 lg:px-5 dark:text-zinc-300">
              {trainer.specialty || '—'}
            </td>
            <td className="px-4 py-2.5 lg:px-5">
              <Badge className={SHIFT_BADGE_CLASSES[trainer.shift]}>
                {SHIFT_SHORT_LABELS[trainer.shift]}
              </Badge>
            </td>
            <td className="px-4 py-2.5 lg:px-5">
              <Badge variant="default">{LEVEL_LABELS[trainer.level]}</Badge>
            </td>
            <td className="px-4 py-2.5 text-right lg:px-5">
              <div className="inline-flex items-center gap-2">
                <Badge variant={trainer.status === 'active' ? 'success' : 'danger'}>
                  {trainer.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
                <button
                  type="button"
                  onClick={() => {
                    openEdit(trainer);
                  }}
                  className="hover:bg-brand/10 hover:text-brand rounded-lg p-1.5 text-zinc-400"
                  title="Editar perfil"
                  aria-label={`Editar ${trainer.full_name}`}
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        )}
      />

      <Modal
        open={isCreating}
        onClose={resetCreate}
        title={
          <>
            Nuevo <span className="text-brand">entrenador</span>
          </>
        }
        scrollable
      >
        <div className="form-stack">
          <div>
            <Label>Nombre completo</Label>
            <Input
              value={form.full_name}
              error={errors.full_name}
              onChange={(e) => {
                setForm({ ...form, full_name: e.target.value });
              }}
              placeholder="Ej: Alexis Rodríguez"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              error={errors.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
              }}
            />
          </div>
          <div>
            <Label>Cédula</Label>
            <Input
              value={form.cedula}
              error={errors.cedula}
              onChange={(e) => {
                setForm({ ...form, cedula: e.target.value });
              }}
              placeholder="V-12345678"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nivel</Label>
              <Select
                value={form.level}
                onChange={(e) => {
                  setForm({ ...form, level: e.target.value as TrainerLevel });
                }}
              >
                {TRAINER_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {LEVEL_LABELS[level]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Turno exclusivo</Label>
              <Select
                value={form.shift}
                onChange={(e) => {
                  setForm({ ...form, shift: e.target.value as TrainingShift });
                }}
              >
                <option value="diurno">Diurno / Mañana</option>
                <option value="vespertino">Vespertino / Tarde</option>
                <option value="nocturno">Nocturno / Noche</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Especialidad</Label>
            <Input
              value={form.specialty}
              onChange={(e) => {
                setForm({ ...form, specialty: e.target.value });
              }}
              placeholder="Ej: Fuerza, HIIT, Nutrición deportiva"
            />
          </div>
          <div>
            <Label>Bio (opcional)</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => {
                setForm({ ...form, bio: e.target.value });
              }}
              rows={3}
            />
          </div>
          <div>
            <Label>Contraseña inicial</Label>
            <PasswordInput
              value={form.password}
              error={errors.password}
              autoComplete="new-password"
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
              }}
            />
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Mín. 8 caracteres, con mayúscula, minúscula, número y carácter especial.
            </p>
          </div>
          <div>
            <Label>Confirmar contraseña</Label>
            <PasswordInput
              value={form.confirm_password}
              error={errors.confirm_password}
              autoComplete="new-password"
              onChange={(e) => {
                setForm({ ...form, confirm_password: e.target.value });
              }}
            />
          </div>
          {errors.submit && (
            <p className="text-center text-xs text-red-500" role="alert">
              {errors.submit}
            </p>
          )}
          <Button className="w-full" size="lg" onClick={handleCreate} loading={saving}>
            Crear entrenador
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!editTarget}
        onClose={() => {
          setEditTarget(null);
        }}
        title={
          <>
            Editar <span className="text-brand">perfil</span>
          </>
        }
        scrollable
      >
        {editTarget && (
          <div className="form-stack">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {editTarget.full_name}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nivel</Label>
                <Select
                  value={editForm.level}
                  onChange={(e) => {
                    setEditForm({ ...editForm, level: e.target.value as TrainerLevel });
                  }}
                >
                  {TRAINER_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {LEVEL_LABELS[level]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Turno exclusivo</Label>
                <Select
                  value={editForm.shift}
                  onChange={(e) => {
                    setEditForm({ ...editForm, shift: e.target.value as TrainingShift });
                  }}
                >
                  <option value="diurno">Diurno / Mañana</option>
                  <option value="vespertino">Vespertino / Tarde</option>
                  <option value="nocturno">Nocturno / Noche</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>Especialidad</Label>
              <Input
                value={editForm.specialty}
                onChange={(e) => {
                  setEditForm({ ...editForm, specialty: e.target.value });
                }}
              />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea
                value={editForm.bio}
                onChange={(e) => {
                  setEditForm({ ...editForm, bio: e.target.value });
                }}
                rows={3}
              />
            </div>
            {errors.submit && <p className="text-center text-xs text-red-500">{errors.submit}</p>}
            <Button className="w-full" onClick={handleUpdate} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
