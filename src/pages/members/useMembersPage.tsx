import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch, parseJsonResponse, parseJsonSafe, connectionOrApiError } from '../../lib/api';
import {
  Plus,
  Dumbbell,
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
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useAdminStatsOptional } from '../../context/AdminStatsContext';
import { Button } from '../../components/ui';
import { useToastOptional } from '../../context/ToastContext';
import {
  useMembersQuery,
  useInvalidateMembers,
  useMembershipStatusMutation,
  type Member,
} from '../../hooks/queries/useMembersQuery';
import { useInvalidateMemberOptions } from '../../hooks/queries/useRoutinesQuery';
import { clientLogger } from '../../lib/clientLogger';
import { validateCedula } from '../../lib/cedulaUtils';
import { type MemberQuickAction } from './MemberQuickSheet';
import { type MembershipPlan } from './MemberAssignModal';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import type { MemberBadgeData } from '../../components/member/MemberBadgeCard';
import { usePageTitle } from '../../hooks/usePageTitle';
import { type TrainingShift } from '../../lib/trainingShift';
import { ROLE_LABELS, type UserRole } from '../../lib/roles';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useTrainerStatsQuery } from '../../hooks/queries/useDashboardQuery';
import {
  hubTabForNeeds,
  memberCoachingHref,
  parseTrainerNeedsFilter,
  TRAINER_NEEDS_LABELS,
} from '../../lib/trainerNeeds';

export const MEMBER_ROLE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'member', label: ROLE_LABELS.member },
  { value: 'trainer', label: ROLE_LABELS.trainer },
  { value: 'receptionist', label: ROLE_LABELS.receptionist },
  { value: 'admin', label: ROLE_LABELS.admin },
];

const NO_PLAN_ALERT_DISMISS_KEY = 'gymapure_members_no_plan_alert_dismissed';

export function useMembersPage() {
  const { user } = useAuth();
  usePageTitle('Miembros');
  const { isDesktop, isTablet } = useBreakpoint();
  /** Tablet+desktop: ficha en rail lateral. Solo móvil usa sheet modal. */
  const showDetailRail = isDesktop || isTablet;
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
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
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
      navigate('/nutrition-overview?filter=without', { replace: true });
    }
  }, [navigate, searchParams]);

  const needsFilter = parseTrainerNeedsFilter(searchParams.get('needs'));

  useEffect(() => {
    if (searchParams.get('expiring') === 'true') {
      setExpiringFilter(true);
    } else if (needsFilter) {
      setExpiringFilter(false);
    }
    const shiftParam = searchParams.get('shift');
    if (shiftParam === 'diurno' || shiftParam === 'vespertino' || shiftParam === 'nocturno') {
      setShiftFilter(shiftParam);
    } else if (!shiftParam) {
      setShiftFilter('');
    }
  }, [needsFilter, searchParams]);

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

  const handleTrainerRosterFilter = (value: string) => {
    setPage(1);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('expiring');
        next.delete('needs');
        if (value === 'expiring') {
          next.set('expiring', 'true');
        } else if (parseTrainerNeedsFilter(value)) {
          next.set('needs', value);
        }
        return next;
      },
      { replace: true }
    );
    setExpiringFilter(value === 'expiring');
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
  const coachingHubTab = hubTabForNeeds(needsFilter);
  const openMemberDetail = useCallback(
    (member: Member) => {
      if (isTrainer && coachingHubTab) {
        navigate(memberCoachingHref(member.id, coachingHubTab));
        return;
      }
      setDetailMember(member);
    },
    [coachingHubTab, isTrainer, navigate]
  );
  const { data: trainerStats, isPending: trainerStatsPending } = useTrainerStatsQuery(
    Boolean(isTrainer && needsFilter)
  );
  const cohortIds = useMemo(() => {
    if (!needsFilter) return undefined;
    const rows =
      needsFilter === 'assessment'
        ? trainerStats?.membersWithoutAssessment
        : needsFilter === 'checkin'
          ? trainerStats?.staleCheckins
          : needsFilter === 'choices'
            ? (trainerStats?.memberChoices ?? []).map((row) => ({
                id: row.member_id,
                full_name: row.member_name ?? `Miembro #${row.member_id}`,
              }))
            : trainerStats?.recoveryAlerts;
    return (rows ?? []).map((row) => row.id);
  }, [needsFilter, trainerStats]);
  const cohortReady = !needsFilter || !trainerStatsPending;
  const cohortEmpty = Boolean(needsFilter && cohortReady && (cohortIds?.length ?? 0) === 0);

  const membersQueryParams = {
    page,
    pageSize,
    search,
    expiringFilter: needsFilter ? false : expiringFilter,
    shiftFilter: shiftFilter || undefined,
    roleFilter: roleFilter || undefined,
    isTrainer,
    ids: cohortIds,
  };
  const {
    data: membersData,
    isPending: membersPending,
    isError: membersError,
    refetch: refetchMembers,
  } = useMembersQuery(membersQueryParams, {
    enabled: cohortReady && !cohortEmpty,
  });
  const loading =
    Boolean(needsFilter && trainerStatsPending) || (cohortReady && !cohortEmpty && membersPending);
  const membershipStatusMutation = useMembershipStatusMutation(membersQueryParams);
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

  const validateForm = async () => {
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
      const { passwordSchema } = await import('../../lib/passwordSchema');
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
    if (!(await validateForm())) return;

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
            'Cuenta creada. Asigna una rutina en el calendario; recepción debe activar la membresía.'
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
          await membershipStatusMutation.mutateAsync({
            memberId: member.id,
            status: 'active',
          });
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
    [adminStats, membershipStatusMutation, toast]
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
      await membershipStatusMutation.mutateAsync({
        memberId: pauseTarget.id,
        status: 'paused',
        reason,
      });
      setPauseTarget(null);
      setPauseReason('');
      await adminStats?.refresh();
      toast?.success('Membresía pausada');
    } catch (err) {
      setPauseError(err instanceof Error ? err.message : 'No se pudo pausar la membresía');
    } finally {
      setPausing(false);
      setMembershipOperationId(null);
    }
  }, [adminStats, membershipStatusMutation, pauseReason, pauseTarget, pausing, toast]);

  const filteredMembers = members;
  const canAddUser =
    user?.role === 'trainer' || user?.role === 'admin' || user?.role === 'receptionist';
  const addUserLabel = isStaffMember ? 'Nuevo miembro' : 'Nuevo usuario';

  useEffect(() => {
    if (!detailMember) return;
    if (!filteredMembers.some((m) => m.id === detailMember.id)) {
      setDetailMember(null);
    }
  }, [filteredMembers, detailMember]);

  const membersEmptyState = (() => {
    if (needsFilter) {
      return {
        title: 'Sin resultados',
        description: search
          ? 'Ningún miembro de esta lista coincide con tu búsqueda.'
          : `Nadie en ${TRAINER_NEEDS_LABELS[needsFilter].toLowerCase()} ahora.`,
      };
    }
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
          '1) Crea la cuenta del miembro. 2) Asigna una rutina en Rutinas → Calendario. 3) Recepción activa la membresía para acceso y cobros.',
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

  const showTrainerAssignCta = isTrainer && !search && !expiringFilter && !needsFilter;
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
            onClick: () => navigate(`/members/${member.id}/routines?assign=1`),
          });
          actions.push({
            key: 'routines',
            label: 'Ver rutinas',
            icon: Dumbbell,
            onClick: () => navigate(memberCoachingHref(member.id, coachingHubTab)),
          });
        } else {
          actions.push({
            key: 'routines',
            label: 'Ver rutinas',
            icon: Dumbbell,
            primary: true,
            onClick: () => navigate(memberCoachingHref(member.id, coachingHubTab)),
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
      coachingHubTab,
      openMemberBadge,
      openAssignSubscription,
      openEditShift,
      handleMembershipOperation,
      handleToggleClick,
      handleDeleteClick,
    ]
  );

  const clearRosterFilters = () => {
    handleTrainerRosterFilter('');
    setExpiringFilter(false);
    setSearchInput('');
    setPage(1);
  };

  const membersEmptyAction =
    needsFilter || expiringFilter ? (
      <Button size="sm" variant="secondary" onClick={clearRosterFilters}>
        Quitar filtro
      </Button>
    ) : showTrainerAssignCta ? (
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" onClick={() => navigate('/routines?view=calendar&assign=1')}>
          <Dumbbell className="h-4 w-4" /> Asignar rutina
        </Button>
        <Button
          size="sm"
          variant="secondary"
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

  return {
    user,
    isTrainer,
    isReceptionist,
    isStaffMember,
    showDetailRail,
    adminStats,
    alertDays,
    pullMembers,
    refreshingMembers,
    membersHandlers,
    searchInput,
    setSearchInput,
    page,
    setPage,
    pageSize,
    isAdding,
    setIsAdding,
    errors,
    setErrors,
    newMember,
    setNewMember,
    assignTarget,
    setAssignTarget,
    membershipPlans,
    selectedPlanId,
    setSelectedPlanId,
    selectedPaymentId,
    setSelectedPaymentId,
    approvedPayments,
    assignError,
    setAssignError,
    deleteTarget,
    deleteConfirmName,
    setDeleteConfirmName,
    deleteError,
    setDeleteError,
    deleting,
    toggleTarget,
    setToggleTarget,
    toggling,
    expiringFilter,
    setExpiringFilter,
    roleFilter,
    setRoleFilter,
    shiftFilter,
    handleShiftFilterChange,
    handleTrainerRosterFilter,
    needsFilter,
    coachingHubTab,
    openMemberDetail,
    badgeTarget,
    setBadgeTarget,
    editShiftTarget,
    setEditShiftTarget,
    editShiftValue,
    setEditShiftValue,
    savingShift,
    membershipOperationId,
    pauseTarget,
    setPauseTarget,
    pauseReason,
    setPauseReason,
    pauseError,
    setPauseError,
    pausing,
    detailMember,
    setDetailMember,
    noPlanAlertDismissed,
    dismissNoPlanAlert,
    navigate,
    loading,
    membersError,
    refetchMembers,
    members,
    total,
    filteredMembers,
    colCount,
    canAddUser,
    addUserLabel,
    membersEmptyState,
    membersEmptyAction,
    showTrainerAssignCta,
    membersWithoutPlan,
    buildQuickActions,
    openAssignSubscription,
    handleAddMember,
    confirmDeleteUser,
    closeDeleteModal,
    confirmToggleStatus,
    handleToggleClick,
    handleDeleteClick,
    openMemberBadge,
    openEditShift,
    saveMemberShift,
    handleAssignSubscription,
    handleMembershipOperation,
    confirmPauseMembership,
  };
}
