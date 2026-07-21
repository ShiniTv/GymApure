import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch, parseJsonResponse, parseJsonSafe, connectionOrApiError } from '../lib/api';
import {
  Search,
  Plus,
  Dumbbell,
  AlertTriangle,
  X,
  History,
  MessageSquare,
  UtensilsCrossed,
  IdCard,
  Clock,
  CalendarClock,
  CreditCard,
  Pause,
  Play,
  Power,
  Trash2,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminStatsOptional } from '../context/AdminStatsContext';
import {
  Button,
  PageHeader,
  PaginationBar,
  Card,
  FilterChips,
  EmptyState,
  TableRowSkeleton,
  SearchInput,
  BackToDashboardLink,
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
import { MemberQuickSheet, type MemberQuickAction } from './members/MemberQuickSheet';
import { MemberTableRow } from './members/MemberTableRow';
import { MemberAddModal } from './members/MemberAddModal';
import { MemberAssignModal, type MembershipPlan } from './members/MemberAssignModal';
import { MemberActionModals } from './members/MemberActionModals';
import { StaggerContainer, StaggerItem } from '../components/animations';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshContainer } from '../components/PullToRefresh';
import { ShiftFilter } from '../components/trainers/ShiftFilter';
import { MemberBadgeModal, type MemberBadgeData } from '../components/member/MemberBadgeModal';
import { usePageTitle } from '../hooks/usePageTitle';
import { passwordSchema } from '../lib/passwordSchema';
import { type TrainingShift } from '../lib/trainingShift';

const NO_PLAN_ALERT_DISMISS_KEY = 'gymapure_members_no_plan_alert_dismissed';
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
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<Member | null>(null);
  const [toggling, setToggling] = useState(false);
  const [expiringFilter, setExpiringFilter] = useState(false);
  const [shiftFilter, setShiftFilter] = useState<TrainingShift | ''>('');
  const [badgeTarget, setBadgeTarget] = useState<MemberBadgeData | null>(null);
  const [editShiftTarget, setEditShiftTarget] = useState<Member | null>(null);
  const [editShiftValue, setEditShiftValue] = useState<TrainingShift | ''>('');
  const [savingShift, setSavingShift] = useState(false);
  const [membershipOperationId, setMembershipOperationId] = useState<number | null>(null);
  const [pauseTarget, setPauseTarget] = useState<Member | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [pauseError, setPauseError] = useState('');
  const [pausing, setPausing] = useState(false);
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [noPlanAlertDismissed, setNoPlanAlertDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(NO_PLAN_ALERT_DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const alertDays = adminStats?.stats?.expiryAlertDays ?? 7;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToastOptional();

  useEffect(() => {
    if (searchParams.get('focus') === 'nutrition') {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('focus');
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams]);

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

  const {
    data: membersData,
    isPending: loading,
    isError: membersError,
    refetch: refetchMembers,
  } = useMembersQuery({
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
          const paymentsRes = await apiFetch(
            `/api/payments?pageSize=50&status=approved&userId=${member.id}`
          );
          const paymentsData = await parseJsonResponse<{
            items: {
              id: number;
              user_id: number;
              amount_usd: number;
              method: string;
              created_at: string;
            }[];
          }>(paymentsRes);
          setApprovedPayments(paymentsData.items ?? []);
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
    const isTrainer = deleteTarget.role === 'trainer';
    if (
      isTrainer &&
      deleteConfirmName.trim().toLowerCase() !== deleteTarget.full_name.trim().toLowerCase()
    ) {
      setDeleteError('Escribe el nombre exacto del entrenador para confirmar');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await apiFetch(`/api/users/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: isTrainer ? { 'Content-Type': 'application/json' } : undefined,
        body: isTrainer ? JSON.stringify({ confirm_name: deleteConfirmName.trim() }) : undefined,
      });
      const data = await parseJsonSafe<{ success?: boolean; error?: string }>(res);
      if (!res.ok) {
        setDeleteError(data.error ?? 'No se pudo eliminar el usuario');
        return;
      }
      setDeleteTarget(null);
      setDeleteConfirmName('');
      setDeleteError('');
      invalidateMembers();
      toast?.success(isTrainer ? 'Entrenador eliminado' : 'Usuario eliminado');
    } catch (err) {
      clientLogger.error('Failed to delete user', err);
      setDeleteError(connectionOrApiError(err, 'No se pudo eliminar el usuario'));
    } finally {
      setDeleting(false);
    }
  };

  const closeDeleteModal = useCallback(() => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteConfirmName('');
    setDeleteError('');
  }, [deleting]);

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
    setDeleteConfirmName('');
    setDeleteError('');
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

  const handleMembershipOperation = useCallback(
    async (member: Member) => {
      if (member.subscription_status === 'paused') {
        setMembershipOperationId(member.id);
        try {
          await parseJsonResponse(
            await apiFetch('/api/memberships/resume', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: member.id }),
            })
          );
          invalidateMembers();
          await adminStats?.refresh();
          toast?.success('Membresía reanudada');
        } catch (err) {
          toast?.error(err instanceof Error ? err.message : 'No se pudo actualizar la membresía');
        } finally {
          setMembershipOperationId(null);
        }
        return;
      }

      setPauseTarget(member);
      setPauseReason('');
      setPauseError('');
    },
    [adminStats, invalidateMembers, toast]
  );

  const confirmPauseMembership = useCallback(async () => {
    if (!pauseTarget || pausing) return;
    const reason = pauseReason.trim();
    if (reason.length < 3) {
      setPauseError('Indica un motivo de al menos 3 caracteres');
      return;
    }

    setPausing(true);
    setMembershipOperationId(pauseTarget.id);
    try {
      await parseJsonResponse(
        await apiFetch('/api/memberships/pause', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: pauseTarget.id, reason }),
        })
      );
      setPauseTarget(null);
      setPauseReason('');
      invalidateMembers();
      await adminStats?.refresh();
      toast?.success('Membresía pausada');
    } catch (err) {
      setPauseError(err instanceof Error ? err.message : 'No se pudo pausar la membresía');
    } finally {
      setPausing(false);
      setMembershipOperationId(null);
    }
  }, [adminStats, invalidateMembers, pauseReason, pauseTarget, pausing, toast]);

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

  const dismissNoPlanAlert = useCallback(() => {
    setNoPlanAlertDismissed(true);
    try {
      sessionStorage.setItem(NO_PLAN_ALERT_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const buildQuickActions = useCallback(
    (member: Member): MemberQuickAction[] => {
      const role = user?.role ?? 'member';
      const actions: MemberQuickAction[] = [];

      if (role === 'trainer' && member.role === 'member') {
        const needsRoutine = member.onboarding && !member.onboarding.has_active_routine;
        if (needsRoutine) {
          actions.push({
            key: 'assign-routine',
            label: 'Asignar rutina',
            icon: CalendarClock,
            primary: true,
            onClick: () => navigate(`/routines?view=calendar&assign=1&member=${member.id}`),
          });
          actions.push({
            key: 'routines',
            label: 'Ver rutinas',
            icon: Dumbbell,
            onClick: () => navigate(`/members/${member.id}/routines`),
          });
        } else {
          actions.push({
            key: 'routines',
            label: 'Ver rutinas',
            icon: Dumbbell,
            primary: true,
            onClick: () => navigate(`/members/${member.id}/routines`),
          });
        }
        actions.push({
          key: 'message',
          label: 'Mensaje',
          icon: MessageSquare,
          onClick: () => navigate(`/messages?member=${member.id}`),
        });
        actions.push({
          key: 'history',
          label: 'Historial',
          icon: History,
          onClick: () => navigate(`/members/${member.id}/history`),
        });
        actions.push({
          key: 'nutrition',
          label: 'Nutrición',
          icon: UtensilsCrossed,
          onClick: () => navigate(`/members/${member.id}/nutrition`),
        });
      }

      if ((role === 'admin' || role === 'receptionist') && member.role === 'member') {
        actions.push({
          key: 'badge',
          label: 'Ver carné',
          icon: IdCard,
          primary: true,
          onClick: () => openMemberBadge(member),
        });
        actions.push({
          key: 'message',
          label: 'Enviar mensaje',
          icon: MessageSquare,
          onClick: () => navigate(`/messages?member=${member.id}`),
        });
        actions.push({
          key: 'assign',
          label: 'Asignar membresía',
          icon: CreditCard,
          onClick: () => {
            void openAssignSubscription(member);
          },
        });
        actions.push({
          key: 'shift',
          label: member.training_shift ? 'Editar turno' : 'Asignar turno',
          icon: Clock,
          onClick: () => openEditShift(member),
        });
        if (member.subscription_status) {
          actions.push({
            key: 'pause',
            label:
              member.subscription_status === 'paused' ? 'Reanudar membresía' : 'Pausar membresía',
            icon: member.subscription_status === 'paused' ? Play : Pause,
            onClick: () => handleMembershipOperation(member),
          });
        }
      }

      if (role === 'admin' && member.role === 'member') {
        actions.push({
          key: 'toggle',
          label: member.status === 'active' ? 'Desactivar' : 'Activar',
          icon: Power,
          onClick: () => handleToggleClick(member),
        });
      }

      if (
        role === 'admin' &&
        (member.role === 'member' || member.role === 'trainer') &&
        member.id !== user?.id
      ) {
        actions.push({
          key: 'delete',
          label: member.role === 'trainer' ? 'Eliminar entrenador' : 'Eliminar miembro',
          icon: Trash2,
          danger: true,
          onClick: () => handleDeleteClick(member),
        });
      }

      return actions;
    },
    [
      user?.role,
      user?.id,
      navigate,
      openMemberBadge,
      openAssignSubscription,
      openEditShift,
      handleMembershipOperation,
      handleToggleClick,
      handleDeleteClick,
    ]
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

  return (
    <PullToRefreshContainer pullDistance={pullMembers} isRefreshing={refreshingMembers}>
      <div className="page-stack-tight mx-auto w-full max-w-7xl" {...membersHandlers}>
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
            isTrainer
              ? 'Tus miembros asignados'
              : isReceptionist
                ? 'Altas y cuentas del gym'
                : 'Usuarios del gym'
          }
          action={<BackToDashboardLink />}
        />

        {user?.role === 'admin' && adminStats?.stats && (
          <div className="hidden grid-cols-4 gap-2 lg:grid">
            <div className="rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Activas
              </p>
              <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums dark:text-white">
                {adminStats.stats.activeSubscriptions}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Por vencer ({alertDays}d)
              </p>
              <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums dark:text-white">
                {adminStats.stats.expiringSoon}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Pagos pend.
              </p>
              <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums dark:text-white">
                {adminStats.stats.pendingPayments}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                En lista
              </p>
              <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums dark:text-white">
                {total}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <SearchInput
              containerClassName="min-w-0 flex-1"
              placeholder="Buscar nombre o cédula…"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
              }}
            />
            {canAddUser && (
              <Button
                size="sm"
                className="h-10 min-h-10 w-10 shrink-0 rounded-xl p-0 sm:h-11 sm:min-h-11 sm:w-auto sm:gap-1.5 sm:px-3"
                onClick={() => {
                  setIsAdding(true);
                }}
                aria-label={addUserLabel}
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="hidden text-xs font-semibold sm:inline sm:text-sm">
                  {addUserLabel}
                </span>
              </Button>
            )}
          </div>
          {(user?.role === 'admin' || user?.role === 'receptionist' || isTrainer) && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {(user?.role === 'admin' || user?.role === 'receptionist') && (
                <ShiftFilter value={shiftFilter} onChange={handleShiftFilterChange} label="Turno" />
              )}
              {(user?.role === 'admin' || isTrainer) && (
                <FilterChips
                  className="w-fit max-w-full shrink-0"
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
          )}
        </div>

        {isTrainer && membersWithoutPlan.length > 0 && !loading && !noPlanAlertDismissed && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5 text-[11px]">
            <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="min-w-0 flex-1 text-zinc-600 dark:text-zinc-300">
              <span className="font-semibold text-zinc-900 dark:text-white">
                {membersWithoutPlan.length === 1
                  ? '1 sin plan'
                  : `${membersWithoutPlan.length} sin plan`}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {' '}
                · recepción activa el check-in
              </span>
            </p>
            <button
              type="button"
              onClick={dismissNoPlanAlert}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-amber-500/10 hover:text-zinc-700 dark:hover:text-zinc-200"
              aria-label="Cerrar aviso"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <MemberAddModal
          open={isAdding}
          onClose={() => setIsAdding(false)}
          isTrainer={isTrainer}
          isReceptionist={isReceptionist}
          isStaffMember={isStaffMember}
          canCreateAdmin={user?.role === 'admin'}
          newMember={newMember}
          onNewMemberChange={setNewMember}
          errors={errors}
          onErrorsChange={setErrors}
          onSubmit={handleAddMember}
        />

        {membersError ? (
          <EmptyState
            icon={AlertTriangle}
            title="No se pudieron cargar los miembros"
            description="Revisa tu conexión e inténtalo de nuevo."
            action={
              <Button size="sm" onClick={() => void refetchMembers()}>
                Reintentar
              </Button>
            }
          />
        ) : (
          <>
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
              mobileClassName=""
              mobileWrapper={(children) => (
                <StaggerContainer className="flex flex-col gap-2.5">{children}</StaggerContainer>
              )}
              mobile={(member) => (
                <StaggerItem>
                  <MemberCardMobile
                    member={member}
                    isStaffMember={isStaffMember}
                    alertDays={alertDays}
                    roleBadgeClass={roleBadgeClass}
                    onOpenDetail={setDetailMember}
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
                  onMembershipOperation={handleMembershipOperation}
                  membershipOperationLoading={membershipOperationId === member.id}
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
          </>
        )}

        <MemberAssignModal
          target={assignTarget}
          onClose={() => setAssignTarget(null)}
          isReceptionist={isReceptionist}
          membershipPlans={membershipPlans}
          selectedPlanId={selectedPlanId}
          onSelectedPlanIdChange={setSelectedPlanId}
          approvedPayments={approvedPayments}
          selectedPaymentId={selectedPaymentId}
          onSelectedPaymentIdChange={setSelectedPaymentId}
          assignError={assignError}
          onClearAssignError={() => setAssignError('')}
          onAssign={handleAssignSubscription}
        />

        <MemberActionModals
          toggleTarget={toggleTarget}
          toggling={toggling}
          onCloseToggle={() => setToggleTarget(null)}
          onConfirmToggle={confirmToggleStatus}
          deleteTarget={deleteTarget}
          deleteConfirmName={deleteConfirmName}
          onDeleteConfirmNameChange={setDeleteConfirmName}
          deleteError={deleteError}
          onClearDeleteError={() => setDeleteError('')}
          deleting={deleting}
          onCloseDelete={closeDeleteModal}
          onConfirmDelete={confirmDeleteUser}
          pauseTarget={pauseTarget}
          pauseReason={pauseReason}
          onPauseReasonChange={setPauseReason}
          pauseError={pauseError}
          pausing={pausing}
          onClosePause={() => {
            setPauseTarget(null);
            setPauseReason('');
            setPauseError('');
          }}
          onConfirmPause={() => void confirmPauseMembership()}
          editShiftTarget={editShiftTarget}
          editShiftValue={editShiftValue}
          onEditShiftValueChange={setEditShiftValue}
          savingShift={savingShift}
          onCloseEditShift={() => setEditShiftTarget(null)}
          onSaveShift={saveMemberShift}
        />

        <MemberBadgeModal
          open={!!badgeTarget}
          onClose={() => {
            setBadgeTarget(null);
          }}
          member={badgeTarget}
        />

        <MemberQuickSheet
          member={detailMember}
          open={!!detailMember}
          onClose={() => setDetailMember(null)}
          alertDays={alertDays}
          actions={detailMember ? buildQuickActions(detailMember) : []}
        />
      </div>
    </PullToRefreshContainer>
  );
}
