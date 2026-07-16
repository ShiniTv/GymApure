import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch, parseJsonResponse, parseJsonSafe, connectionOrApiError } from '../lib/api';
import { Search, Plus, Dumbbell, AlertTriangle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminStatsOptional } from '../context/AdminStatsContext';
import {
  Button,
  Input,
  Label,
  Modal,
  PageHeader,
  PaginationBar,
  Card,
  FilterChips,
  EmptyState,
  TableRowSkeleton,
  SearchInput,
  BackToDashboardLink,
  CedulaInput,
} from '../components/ui';
import { useToastOptional } from '../context/ToastContext';
import {
  useMembersQuery,
  useInvalidateMembers,
  type Member,
} from '../hooks/queries/useMembersQuery';
import { useInvalidateMemberOptions } from '../hooks/queries/useRoutinesQuery';
import { clientLogger } from '../lib/clientLogger';
import { roleBadgeClass } from '../lib/utils';
import { validateCedula } from '../lib/cedulaUtils';
import { ResponsiveTable } from '../components/ResponsiveTable';
import { MemberCardMobile } from './members/MemberCardMobile';
import { MemberTableRow } from './members/MemberTableRow';
import { StaggerContainer, StaggerItem } from '../components/animations';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshContainer } from '../components/PullToRefresh';
import { ShiftFilter } from '../components/trainers/ShiftFilter';
import { MemberBadgeModal, type MemberBadgeData } from '../components/member/MemberBadgeModal';
import { usePageTitle } from '../hooks/usePageTitle';
import { passwordSchema } from '../lib/passwordPolicy';
import { type TrainingShift } from '../lib/trainingShift';

interface MembershipPlan {
  id: number;
  name: string;
  duration_days: number;
  price_usd: number;
}

export default function Members() {
  const { user } = useAuth();
  usePageTitle('Miembros');
  const adminStats = useAdminStatsOptional();
  const invalidateMembers = useInvalidateMembers();
  const invalidateMemberOptions = useInvalidateMemberOptions();

  const onRefreshMembers = useCallback(() => {
    invalidateMembers();
  }, [invalidateMembers]);
  const {
    pullDistance: pullMembers,
    isRefreshing: refreshingMembers,
    handlers: membersHandlers,
  } = usePullToRefresh({
    onRefresh: onRefreshMembers,
    threshold: 80,
  });

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [isAdding, setIsAdding] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newMember, setNewMember] = useState({
    full_name: '',
    email: '',
    cedula: '',
    password: '',
    confirm_password: '',
    role: 'member',
    training_shift: '' as TrainingShift | '',
  });
  const [assignTarget, setAssignTarget] = useState<Member | null>(null);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [approvedPayments, setApprovedPayments] = useState<
    { id: number; amount_usd: number; method: string; created_at: string }[]
  >([]);
  const [assignError, setAssignError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<Member | null>(null);
  const [toggling, setToggling] = useState(false);
  const [expiringFilter, setExpiringFilter] = useState(false);
  const [shiftFilter, setShiftFilter] = useState<TrainingShift | ''>('');
  const [badgeTarget, setBadgeTarget] = useState<MemberBadgeData | null>(null);
  const [editShiftTarget, setEditShiftTarget] = useState<Member | null>(null);
  const [editShiftValue, setEditShiftValue] = useState<TrainingShift | ''>('');
  const [savingShift, setSavingShift] = useState(false);
  const alertDays = adminStats?.stats?.expiryAlertDays ?? 7;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToastOptional();
  const nutritionFocus = searchParams.get('focus') === 'nutrition';

  useEffect(() => {
    if (searchParams.get('expiring') === 'true') {
      setExpiringFilter(true);
    }
    const shiftParam = searchParams.get('shift');
    if (shiftParam === 'diurno' || shiftParam === 'vespertino' || shiftParam === 'nocturno') {
      setShiftFilter(shiftParam);
    } else if (!shiftParam) {
      setShiftFilter('');
    }
  }, [searchParams]);

  const handleShiftFilterChange = (shift: TrainingShift | '') => {
    setShiftFilter(shift);
    setPage(1);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (shift) next.set('shift', shift);
        else next.delete('shift');
        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  const isTrainer = user?.role === 'trainer';
  const isReceptionist = user?.role === 'receptionist';
  const isStaffMember = isTrainer || isReceptionist;
  const colCount = isStaffMember ? 5 : 6;

  const { data: membersData, isPending: loading } = useMembersQuery({
    page,
    pageSize,
    search,
    expiringFilter,
    shiftFilter: shiftFilter || undefined,
    isTrainer,
  });
  const members = membersData?.items ?? [];
  const total = membersData?.total ?? 0;

  const openAssignSubscription = useCallback(
    async (member: Member) => {
      setAssignTarget(member);
      setAssignError('');
      setSelectedPlanId('');
      setSelectedPaymentId('');
      setApprovedPayments([]);
      try {
        const plansRes = await apiFetch('/api/memberships');
        const plansData = await parseJsonResponse<MembershipPlan[]>(plansRes);
        setMembershipPlans(Array.isArray(plansData) ? plansData : []);

        if (user?.role === 'receptionist') {
          const paymentsRes = await apiFetch('/api/payments?pageSize=100&status=approved');
          const paymentsData = await parseJsonResponse<{
            items: {
              id: number;
              user_id: number;
              amount_usd: number;
              method: string;
              created_at: string;
            }[];
          }>(paymentsRes);
          const forMember = (paymentsData.items ?? []).filter((p) => p.user_id === member.id);
          setApprovedPayments(forMember);
        }
      } catch {
        setMembershipPlans([]);
        setApprovedPayments([]);
      }
    },
    [user?.role]
  );

  useEffect(() => {
    const assignUserId = searchParams.get('assignUserId');
    if (!assignUserId || loading) return;
    const memberId = Number(assignUserId);
    if (Number.isNaN(memberId)) return;
    const member = members.find((m) => m.id === memberId);
    if (member) {
      void openAssignSubscription(member);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('assignUserId');
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParams, members, loading, openAssignSubscription, setSearchParams]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!newMember.full_name.trim()) {
      newErrors.full_name = 'El nombre es obligatorio';
    } else if (newMember.full_name.trim().length < 3) {
      newErrors.full_name = 'El nombre debe tener al menos 3 caracteres';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newMember.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!emailRegex.test(newMember.email)) {
      newErrors.email = 'Email inválido';
    }

    const cedulaErr = validateCedula(newMember.cedula);
    if (cedulaErr) newErrors.cedula = cedulaErr;

    if (!newMember.password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else {
      const passwordResult = passwordSchema.safeParse(newMember.password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.issues[0]?.message || 'Contraseña inválida';
      }
    }

    if (newMember.password !== newMember.confirm_password) {
      newErrors.confirm_password = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddMember = async () => {
    if (!validateForm()) return;

    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newMember.full_name,
          email: newMember.email,
          cedula: newMember.cedula || undefined,
          password: newMember.password,
          role: newMember.role,
          training_shift:
            newMember.role === 'member' && newMember.training_shift
              ? newMember.training_shift
              : undefined,
          shift: newMember.role === 'trainer' ? newMember.training_shift || 'diurno' : undefined,
          level: newMember.role === 'trainer' ? 'basico' : undefined,
        }),
      });

      if (res.ok) {
        const data = await parseJsonResponse<{ id?: number }>(res);
        setIsAdding(false);
        setErrors({});
        setNewMember({
          full_name: '',
          email: '',
          cedula: '',
          password: '',
          confirm_password: '',
          role: 'member',
          training_shift: '',
        });
        invalidateMembers();
        invalidateMemberOptions();
        if (isTrainer) {
          toast?.success(
            'Cuenta creada. Asigna una rutina en Asignaciones; recepción debe activar la membresía.'
          );
          if (data.id) {
            navigate('/routines?view=calendar&assign=1');
          }
        }
      } else {
        const data = await parseJsonSafe<{ error?: string }>(res);
        setErrors({ submit: data.error || 'Error al crear usuario' });
      }
    } catch (err) {
      clientLogger.error('Failed to add member', err);
      setErrors({ submit: connectionOrApiError(err, 'Error al crear usuario') });
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        invalidateMembers();
        toast?.success('Usuario eliminado');
      }
    } catch (err) {
      clientLogger.error('Failed to delete user', err);
    } finally {
      setDeleting(false);
    }
  };

  const confirmToggleStatus = useCallback(async () => {
    if (!toggleTarget) return;
    setToggling(true);
    const newStatus = toggleTarget.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await apiFetch(`/api/users/${toggleTarget.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        invalidateMembers();
        toast?.success(`Usuario ${newStatus === 'active' ? 'activado' : 'desactivado'}`);
      }
    } catch (err) {
      clientLogger.error('Failed to toggle member status', err);
      toast?.error('No se pudo cambiar el estado');
    } finally {
      setToggling(false);
      setToggleTarget(null);
    }
  }, [toggleTarget, invalidateMembers, toast]);

  const handleToggleClick = useCallback((member: Member) => {
    setToggleTarget(member);
  }, []);

  const handleDeleteClick = useCallback((member: Member) => {
    setDeleteTarget(member);
  }, []);

  const openMemberBadge = useCallback((member: Member) => {
    setBadgeTarget({
      id: member.id,
      full_name: member.full_name,
      cedula: member.cedula,
      profile_image: member.profile_image,
      membership_name: member.membership_name,
      training_shift: member.training_shift,
      role: member.role,
      created_at: member.created_at,
      subscription_end: member.subscription_end,
    });
  }, []);

  const openEditShift = useCallback((member: Member) => {
    setEditShiftTarget(member);
    setEditShiftValue(member.training_shift || '');
  }, []);

  const saveMemberShift = async () => {
    if (!editShiftTarget || !editShiftValue) {
      toast?.error('Selecciona un turno');
      return;
    }
    setSavingShift(true);
    try {
      await parseJsonResponse(
        await apiFetch(`/api/users/${editShiftTarget.id}/training-shift`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ training_shift: editShiftValue }),
        })
      );
      setEditShiftTarget(null);
      invalidateMembers();
      toast?.success('Turno actualizado');
    } catch (err) {
      toast?.error(err instanceof Error ? err.message : 'Error al guardar turno');
    } finally {
      setSavingShift(false);
    }
  };

  const handleAssignSubscription = async () => {
    if (!assignTarget || !selectedPlanId) {
      setAssignError('Selecciona un plan');
      return;
    }
    if (isReceptionist && !selectedPaymentId) {
      setAssignError('Selecciona un pago aprobado vinculado a este miembro');
      return;
    }

    try {
      await parseJsonResponse(
        await apiFetch('/api/memberships/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: assignTarget.id,
            membership_id: Number(selectedPlanId),
            ...(selectedPaymentId ? { payment_id: Number(selectedPaymentId) } : {}),
          }),
        })
      );

      setAssignTarget(null);
      setSelectedPaymentId('');
      invalidateMembers();
      await adminStats?.refresh();
      toast?.success('Membresía asignada');
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Error al asignar');
    }
  };

  const filteredMembers = members;
  const canAddUser =
    user?.role === 'trainer' || user?.role === 'admin' || user?.role === 'receptionist';
  const addUserLabel = isStaffMember ? 'Nuevo miembro' : 'Nuevo usuario';

  const membersEmptyState = (() => {
    if (expiringFilter) {
      return {
        title: 'Sin resultados',
        description: 'No hay miembros por vencer en este periodo.',
      };
    }
    if (isTrainer) {
      if (search) {
        return {
          title: 'Sin resultados',
          description: 'Ningún miembro asignado coincide con tu búsqueda.',
        };
      }
      return {
        title: 'Aún no tienes miembros asignados',
        description:
          '1) Crea la cuenta del miembro. 2) Asigna una rutina en Rutinas → Asignaciones. 3) Recepción activa la membresía para check-in y cobros.',
      };
    }
    if (search) {
      return {
        title: 'Sin resultados',
        description: 'Prueba con otro nombre o cédula.',
      };
    }
    return {
      title: 'Sin miembros',
      description: 'Aún no hay miembros registrados en el sistema.',
    };
  })();

  const showTrainerAssignCta = isTrainer && !search && !expiringFilter;
  const membersWithoutPlan = useMemo(
    () => filteredMembers.filter((m) => m.role === 'member' && !m.membership_name),
    [filteredMembers]
  );

  const membersEmptyAction = showTrainerAssignCta ? (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button size="sm" onClick={() => navigate('/routines?view=assignments')}>
        <Dumbbell className="h-4 w-4" /> Ir a asignaciones
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setIsAdding(true);
        }}
      >
        <Plus className="h-4 w-4" /> Nuevo miembro
      </Button>
    </div>
  ) : isTrainer ? (
    <Button
      size="sm"
      onClick={() => {
        setIsAdding(true);
      }}
    >
      <Plus className="h-4 w-4" /> Nuevo miembro
    </Button>
  ) : undefined;

  const mobileIconBtnClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-brand hover:bg-brand/10 transition-colors';

  return (
    <PullToRefreshContainer pullDistance={pullMembers} isRefreshing={refreshingMembers}>
      <div className="page-stack" {...membersHandlers}>
        <PageHeader
          compact
          title={
            isTrainer ? (
              <>
                Mis <span className="text-brand">miembros</span>
              </>
            ) : isReceptionist ? (
              <>
                Registro de <span className="text-brand">miembros</span>
              </>
            ) : (
              <>
                Gestión de <span className="text-brand">usuarios</span>
              </>
            )
          }
          subtitle={
            nutritionFocus && isTrainer
              ? 'Elige un miembro y abre Nutrición desde las acciones de la fila o tarjeta.'
              : isTrainer
                ? 'Consulta tus miembros asignados y gestiona sus rutinas de entrenamiento'
                : isReceptionist
                  ? 'Cree cuentas aquí. Para cobrar y activar membresía el mismo día, use Modo mostrador → Registro walk-in.'
                  : 'Administra usuarios del gym. Solo puedes eliminar miembros (atletas), no entrenadores ni administradores.'
          }
          action={<BackToDashboardLink />}
        />

        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <SearchInput
              containerClassName="flex-1 min-w-0"
              placeholder="Buscar por nombre o identificación..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
              }}
            />
            {canAddUser && (
              <Button
                size="sm"
                className="h-11 min-h-11 shrink-0 gap-1.5 rounded-xl px-3 whitespace-nowrap"
                onClick={() => {
                  setIsAdding(true);
                }}
                aria-label={addUserLabel}
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="text-xs font-semibold sm:text-sm">{addUserLabel}</span>
              </Button>
            )}
          </div>
          {(user?.role === 'admin' || user?.role === 'receptionist') && (
            <ShiftFilter value={shiftFilter} onChange={handleShiftFilterChange} />
          )}
          {(user?.role === 'admin' || isTrainer) && (
            <FilterChips
              fullWidth
              className="sm:w-auto sm:shrink-0"
              options={[
                { value: '', label: 'Todos' },
                { value: 'expiring', label: `Por vencer (${alertDays}d)` },
              ]}
              value={expiringFilter ? 'expiring' : ''}
              onChange={(v) => {
                setExpiringFilter(v === 'expiring');
                setPage(1);
              }}
            />
          )}
        </div>

        {isTrainer && membersWithoutPlan.length > 0 && !loading && (
          <Card padding="sm" rounded="xl" className="border-amber-500/30 bg-amber-500/5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-zinc-900 dark:text-white">
                  {membersWithoutPlan.length === 1
                    ? '1 miembro sin membresía activa'
                    : `${membersWithoutPlan.length} miembros sin membresía activa`}
                </p>
                <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                  Puedes asignar rutinas y entrenar. Para check-in y cobros en mostrador, recepción
                  debe activar el plan del socio.
                </p>
              </div>
            </div>
          </Card>
        )}

        <Modal
          open={isAdding}
          onClose={() => {
            setIsAdding(false);
          }}
          title={
            <>
              Nuevo <span className="text-brand">usuario</span>
            </>
          }
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
                Modo mostrador → Registro walk-in
              </strong>
              .
            </p>
          )}
          <div className="form-stack">
            <div>
              <Label>Nombre Completo</Label>
              <Input
                type="text"
                error={errors.full_name}
                value={newMember.full_name}
                onChange={(e) => {
                  setNewMember({ ...newMember, full_name: e.target.value });
                  if (errors.full_name) setErrors({ ...errors, full_name: '' });
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
                  setNewMember({ ...newMember, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: '' });
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
                  setNewMember({ ...newMember, cedula: value });
                  if (errors.cedula) setErrors({ ...errors, cedula: '' });
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
                  setNewMember({ ...newMember, password: e.target.value });
                  if (errors.password) setErrors({ ...errors, password: '' });
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
                  setNewMember({ ...newMember, confirm_password: e.target.value });
                  if (errors.confirm_password) setErrors({ ...errors, confirm_password: '' });
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
                    setNewMember({ ...newMember, role: e.target.value, training_shift: '' });
                  }}
                >
                  <option value="member">Miembro / Atleta</option>
                  <option value="trainer">Entrenador / Staff</option>
                  <option value="receptionist">Recepcionista</option>
                  {user?.role === 'admin' && <option value="admin">Administrador</option>}
                </select>
              </div>
            )}
            {(newMember.role === 'member' || newMember.role === 'trainer') && (
              <div>
                <Label>
                  {newMember.role === 'trainer' ? 'Turno exclusivo' : 'Turno de entrenamiento'}
                </Label>
                <select
                  className="focus:ring-brand w-full appearance-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-bold text-zinc-900 transition-all outline-none focus:ring-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  value={newMember.training_shift}
                  onChange={(e) => {
                    setNewMember({ ...newMember, training_shift: e.target.value as TrainingShift });
                  }}
                >
                  <option value="">Seleccionar turno...</option>
                  <option value="diurno">Diurno / Mañana</option>
                  <option value="vespertino">Vespertino / Tarde</option>
                  <option value="nocturno">Nocturno / Noche</option>
                </select>
              </div>
            )}
            {errors.submit && (
              <p className="text-center text-xs font-medium text-red-500">{errors.submit}</p>
            )}
            <Button onClick={handleAddMember} className="mt-4 w-full" size="lg">
              Crear Usuario
            </Button>
          </div>
        </Modal>

        <ResponsiveTable
          items={filteredMembers}
          keyExtractor={(member) => member.id}
          breakpoint="lg"
          desktopInCard
          loading={loading}
          loadingSkeleton={
            <>
              <div className="space-y-2 lg:hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="space-y-1.5 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  </div>
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
                      <TableRowSkeleton cols={colCount} />
                      <TableRowSkeleton cols={colCount} />
                      <TableRowSkeleton cols={colCount} />
                      <TableRowSkeleton cols={colCount} />
                      <TableRowSkeleton cols={colCount} />
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          }
          emptyState={
            <EmptyState
              icon={showTrainerAssignCta ? Dumbbell : Search}
              title={membersEmptyState.title}
              description={membersEmptyState.description}
              action={membersEmptyAction}
            />
          }
          mobileClassName="space-y-2"
          mobileWrapper={(children) => <StaggerContainer>{children}</StaggerContainer>}
          mobile={(member) => (
            <StaggerItem>
              <MemberCardMobile
                member={member}
                userRole={user?.role ?? 'member'}
                currentUserId={user?.id}
                isStaffMember={isStaffMember}
                alertDays={alertDays}
                roleBadgeClass={roleBadgeClass}
                mobileIconBtnClass={mobileIconBtnClass}
                onAssignSubscription={openAssignSubscription}
                onToggleStatus={handleToggleClick}
                onDelete={handleDeleteClick}
                onShowBadge={openMemberBadge}
                onEditShift={openEditShift}
              />
            </StaggerItem>
          )}
          header={
            <tr>
              <th className="px-4 py-2.5 lg:px-5">Nombre</th>
              {!isStaffMember && <th className="px-4 py-2.5 lg:px-5">Rol</th>}
              <th className="px-4 py-2.5 lg:px-5">Identificación</th>
              <th className="px-4 py-2.5 lg:px-5">Membresía</th>
              <th className="px-4 py-2.5 lg:px-5">Estado</th>
              <th className="px-4 py-2.5 text-right lg:px-5">Acciones</th>
            </tr>
          }
          desktop={(member) => (
            <MemberTableRow
              member={member}
              userRole={user?.role ?? 'member'}
              currentUserId={user?.id}
              isStaffMember={isStaffMember}
              alertDays={alertDays}
              roleBadgeClass={roleBadgeClass}
              onAssignSubscription={openAssignSubscription}
              onToggleStatus={handleToggleClick}
              onDelete={handleDeleteClick}
              onShowBadge={openMemberBadge}
              onEditShift={openEditShift}
            />
          )}
        />
        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          label="usuarios"
        />

        <Modal
          open={!!assignTarget}
          onClose={() => {
            setAssignTarget(null);
          }}
          title={
            assignTarget ? (
              <>
                Membresía — <span className="text-brand">{assignTarget.full_name}</span>
              </>
            ) : (
              ''
            )
          }
        >
          {assignTarget && (
            <>
              {assignTarget.membership_name && (
                <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                  Plan actual: <strong>{assignTarget.membership_name}</strong> (
                  {assignTarget.days_remaining} días). La nueva suscripción se encadena al
                  vencimiento.
                </p>
              )}
              {isReceptionist && (
                <div className="mb-4">
                  <Label>Pago aprobado (obligatorio)</Label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-bold dark:border-zinc-700 dark:bg-zinc-800"
                    value={selectedPaymentId}
                    onChange={(e) => {
                      setSelectedPaymentId(e.target.value);
                      setAssignError('');
                    }}
                  >
                    <option value="">Seleccionar pago aprobado…</option>
                    {approvedPayments.map((payment) => (
                      <option key={payment.id} value={payment.id}>
                        ${payment.amount_usd} — {payment.method} —{' '}
                        {new Date(payment.created_at).toLocaleDateString('es-VE')}
                      </option>
                    ))}
                  </select>
                  {approvedPayments.length === 0 && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      No hay pagos aprobados para este miembro. Registre y apruebe un pago primero.
                    </p>
                  )}
                </div>
              )}
              <select
                className="mb-4 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-bold dark:border-zinc-700 dark:bg-zinc-800"
                value={selectedPlanId}
                onChange={(e) => {
                  setSelectedPlanId(e.target.value);
                }}
              >
                <option value="">Seleccionar plan...</option>
                {membershipPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — {plan.duration_days} días — ${plan.price_usd}
                  </option>
                ))}
              </select>
              {assignError && <p className="mb-3 text-xs text-red-500">{assignError}</p>}
              <Button onClick={handleAssignSubscription} className="w-full">
                Asignar / Renovar
              </Button>
            </>
          )}
        </Modal>

        <Modal
          open={!!toggleTarget}
          onClose={() => !toggling && setToggleTarget(null)}
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
                  onClick={() => {
                    setToggleTarget(null);
                  }}
                  disabled={toggling}
                >
                  Cancelar
                </Button>
                <Button
                  variant={toggleTarget.status === 'active' ? 'danger' : 'primary'}
                  className="flex-1"
                  onClick={confirmToggleStatus}
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
          onClose={() => !deleting && setDeleteTarget(null)}
          title="Eliminar usuario"
        >
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            ¿Eliminar a <strong>{deleteTarget?.full_name}</strong>? Esta acción no se puede
            deshacer.
          </p>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => {
                setDeleteTarget(null);
              }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={confirmDeleteUser}
              disabled={deleting}
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </Modal>

        <MemberBadgeModal
          open={!!badgeTarget}
          onClose={() => {
            setBadgeTarget(null);
          }}
          member={badgeTarget}
        />

        <Modal
          open={!!editShiftTarget}
          onClose={() => !savingShift && setEditShiftTarget(null)}
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
                onChange={setEditShiftValue}
              />
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setEditShiftTarget(null);
                  }}
                  disabled={savingShift}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={saveMemberShift}
                  disabled={savingShift || !editShiftValue}
                >
                  {savingShift ? 'Guardando...' : 'Guardar turno'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </PullToRefreshContainer>
  );
}
