import { useState, useEffect } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { Search, Plus, MoreVertical, Dumbbell, History, X, Trash2, Power, CreditCard, AlertTriangle, MessageSquare } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminStatsOptional } from '../context/AdminStatsContext';
import { Button, Badge, Input, Label, Modal, PageHeader, PaginationBar, DataCard, Avatar, FilterChips, EmptyState, TableRowSkeleton, SearchInput, Card, BackToDashboardLink } from '../components/ui';
import { useToastOptional } from '../context/ToastContext';
import { useMembersQuery, useInvalidateMembers, type Member } from '../hooks/queries/useMembersQuery';
import { clientLogger } from '../lib/clientLogger';
import {
  getExpiryBadgeInfo,
} from '../lib/expiryUtils';
import { ROLE_LABELS, type UserRole } from '../lib/roles';
import { cn } from '../lib/utils';

interface MembershipPlan {
  id: number;
  name: string;
  duration_days: number;
  price_usd: number;
}

export default function Members() {
  const { user } = useAuth();
  const adminStats = useAdminStatsOptional();
  const invalidateMembers = useInvalidateMembers();
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
  });
  const [assignTarget, setAssignTarget] = useState<Member | null>(null);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [assignError, setAssignError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expiringFilter, setExpiringFilter] = useState(false);
  const alertDays = adminStats?.stats?.expiryAlertDays ?? 7;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToastOptional();

  useEffect(() => {
    if (searchParams.get('expiring') === 'true') {
      setExpiringFilter(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
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
    isTrainer,
  });
  const members = membersData?.items ?? [];
  const total = membersData?.total ?? 0;

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

    if (!newMember.cedula.trim()) {
      newErrors.cedula = 'La cédula es obligatoria para el check-in';
    } else {
      const cedulaRegex = /^([VEve]-)?\d{5,10}$/;
      if (!cedulaRegex.test(newMember.cedula.trim())) {
        newErrors.cedula = 'Formato de cédula inválido (ej: V-12345678)';
      }
    }

    if (!newMember.password || newMember.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
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
        }),
      });

      if (res.ok) {
        setIsAdding(false);
        setErrors({});
        setNewMember({
          full_name: '',
          email: '',
          cedula: '',
          password: '',
          confirm_password: '',
          role: 'member',
        });
        invalidateMembers();
      } else {
        const data = await parseJsonResponse<{ error?: string }>(res);
        setErrors({ submit: data.error || 'Error al crear usuario' });
      }
    } catch (err) {
      clientLogger.error('Failed to add member', err);
      setErrors({ submit: 'Error de conexión' });
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

  const handleToggleStatus = async (member: Member) => {
    const newStatus = member.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await apiFetch(`/api/users/${member.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        invalidateMembers();
      }
    } catch (err) {
      clientLogger.error('Failed to toggle member status', err);
    }
  };

  const openAssignSubscription = async (member: Member) => {
    setAssignTarget(member);
    setAssignError('');
    setSelectedPlanId('');
    try {
      const res = await apiFetch('/api/memberships');
      const data = await parseJsonResponse<MembershipPlan[]>(res);
      setMembershipPlans(Array.isArray(data) ? data : []);
    } catch {
      setMembershipPlans([]);
    }
  };

  const handleAssignSubscription = async () => {
    if (!assignTarget || !selectedPlanId) {
      setAssignError('Selecciona un plan');
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
          }),
        })
      );

      setAssignTarget(null);
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

  const roleBadgeClass = (role: string) => {
    if (role === 'admin') return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
    if (role === 'trainer') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    if (role === 'receptionist') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400';
  };

  const mobileIconBtnClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:text-orange-500 hover:bg-orange-500/10 transition-colors';

  return (
    <div className="page-stack">
      <PageHeader
        compact
        title={
          isTrainer ? (
            <>Mis <span className="text-orange-500">miembros</span></>
          ) : isReceptionist ? (
            <>Registro de <span className="text-orange-500">miembros</span></>
          ) : (
            <>Gestión de <span className="text-orange-500">usuarios</span></>
          )
        }
        subtitle={
          isTrainer
            ? 'Consulta tus miembros asignados y gestiona sus rutinas de entrenamiento'
            : isReceptionist
              ? 'Registra personas nuevas en mostrador. La cédula es obligatoria para el check-in.'
              : 'Administra usuarios del gym. Solo puedes eliminar miembros (atletas), no entrenadores ni administradores.'
        }
        action={user?.role === 'admin' || user?.role === 'trainer' ? <BackToDashboardLink /> : undefined}
      />

      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <SearchInput
            containerClassName="flex-1 min-w-0"
            placeholder="Buscar por nombre o identificación..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {canAddUser && (
            <Button
              size="sm"
              className="h-11 min-h-11 w-11 shrink-0 rounded-xl p-0 sm:w-auto sm:px-4 whitespace-nowrap"
              onClick={() => setIsAdding(true)}
              aria-label={addUserLabel}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{addUserLabel}</span>
            </Button>
          )}
        </div>
        {user?.role === 'admin' && (
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

      <Modal
        open={isAdding}
        onClose={() => setIsAdding(false)}
        title={<>Nuevo <span className="text-orange-500">usuario</span></>}
      >
        <div className="form-stack">
              <div>
                <Label>Nombre Completo</Label>
                <Input
                  type="text"
                  error={errors.full_name}
                  value={newMember.full_name}
                  onChange={(e) => {
                    setNewMember({...newMember, full_name: e.target.value});
                    if (errors.full_name) setErrors({...errors, full_name: ''});
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
                    setNewMember({...newMember, email: e.target.value});
                    if (errors.email) setErrors({...errors, email: ''});
                  }}
                  placeholder="juan@ejemplo.com"
                />
              </div>
              <div>
                <Label>Cédula / ID</Label>
                <Input
                  type="text"
                  error={errors.cedula}
                  value={newMember.cedula}
                  onChange={(e) => {
                    setNewMember({...newMember, cedula: e.target.value});
                    if (errors.cedula) setErrors({...errors, cedula: ''});
                  }}
                  placeholder="V-00000000"
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
                  placeholder="Mínimo 8 caracteres"
                />
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
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-zinc-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all appearance-none"
                  value={newMember.role}
                  onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                >
                  <option value="member">Miembro / Atleta</option>
                  <option value="trainer">Entrenador / Staff</option>
                  <option value="receptionist">Recepcionista</option>
                  {user?.role === 'admin' && <option value="admin">Administrador</option>}
                </select>
              </div>
              )}
              {errors.submit && <p className="text-xs font-medium text-red-500 text-center">{errors.submit}</p>}
              <Button onClick={handleAddMember} className="w-full mt-4" size="lg">
                Crear Usuario
              </Button>
        </div>
      </Modal>

      <div className="md:hidden space-y-2">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-1.5">
                <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Sin resultados"
            description={expiringFilter ? 'No hay miembros por vencer en este periodo.' : 'Prueba con otro nombre o cédula.'}
            action={
              isTrainer ? (
                <Button size="sm" onClick={() => setIsAdding(true)}>
                  <Plus className="h-4 w-4" /> Nuevo miembro
                </Button>
              ) : undefined
            }
          />
        ) : (
          filteredMembers.map((member) => {
            const expiryBadge =
              member.role === 'member' && member.membership_name
                ? getExpiryBadgeInfo(member.days_remaining, alertDays)
                : null;
            const showMobileActions =
              (isTrainer && member.role === 'member') ||
              ((user?.role === 'admin' || user?.role === 'receptionist') && member.role === 'member') ||
              user?.role === 'admin';

            return (
              <DataCard key={member.id} className="!p-3">
                <div className="flex items-start gap-3 min-w-0">
                  <Avatar name={member.full_name} size="sm" className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate leading-tight">
                        {member.full_name}
                      </p>
                      <Badge
                        variant={member.status === 'active' ? 'success' : 'danger'}
                        className="shrink-0"
                      >
                        {member.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-zinc-500">
                      <span className="truncate">{member.cedula || 'Sin cédula'}</span>
                      {!isStaffMember && (
                        <>
                          <span className="text-zinc-300 dark:text-zinc-600">·</span>
                          <span
                            className={cn(
                              'inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                              roleBadgeClass(member.role)
                            )}
                          >
                            {ROLE_LABELS[member.role as UserRole] ?? member.role}
                          </span>
                        </>
                      )}
                    </div>
                    {member.membership_name && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-500 truncate">
                          {member.membership_name} · {member.days_remaining ?? 0}d
                        </p>
                        {expiryBadge && (
                          <Badge className={cn('shrink-0 text-[10px]', expiryBadge.className)}>
                            {expiryBadge.label}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {showMobileActions && (
                  <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-1">
                    {isTrainer && member.role === 'member' && (
                      <>
                        <button
                          type="button"
                          onClick={() => navigate(`/members/${member.id}/routines`)}
                          className={mobileIconBtnClass}
                          aria-label="Asignar rutina"
                        >
                          <Dumbbell className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/members/${member.id}/history`)}
                          className={mobileIconBtnClass}
                          aria-label="Historial"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/messages?member=${member.id}`)}
                          className={mobileIconBtnClass}
                          aria-label="Enviar mensaje"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {(user?.role === 'admin' || user?.role === 'receptionist') && member.role === 'member' && (
                      <>
                        <button
                          type="button"
                          onClick={() => navigate(`/messages?member=${member.id}`)}
                          className={mobileIconBtnClass}
                          aria-label="Enviar mensaje"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openAssignSubscription(member)}
                          className={mobileIconBtnClass}
                          aria-label="Asignar membresía"
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {user?.role === 'admin' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(member)}
                          className={cn(
                            mobileIconBtnClass,
                            member.status !== 'active' && 'text-emerald-500'
                          )}
                          aria-label={member.status === 'active' ? 'Desactivar' : 'Activar'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        {member.role === 'member' && member.id !== user?.id && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(member)}
                            className={cn(mobileIconBtnClass, 'hover:text-red-500 hover:bg-red-500/10')}
                            aria-label="Eliminar miembro"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </DataCard>
            );
          })
        )}
        <PaginationBar page={page} pageSize={pageSize} total={total} onPageChange={setPage} label="usuarios" />
      </div>

      <Card padding="none" rounded="xl" className="hidden md:block table-shell overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-500">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 text-xs font-semibold">
              <tr>
                <th className="px-4 lg:px-5 py-2.5">Nombre</th>
                {!isStaffMember && <th className="px-4 lg:px-5 py-2.5">Rol</th>}
                <th className="px-4 lg:px-5 py-2.5">Identificación</th>
                <th className="px-4 lg:px-5 py-2.5">Membresía</th>
                <th className="px-4 lg:px-5 py-2.5">Estado</th>
                <th className="px-4 lg:px-5 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <>
                  <TableRowSkeleton cols={colCount} />
                  <TableRowSkeleton cols={colCount} />
                  <TableRowSkeleton cols={colCount} />
                  <TableRowSkeleton cols={colCount} />
                  <TableRowSkeleton cols={colCount} />
                </>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-8 py-12 text-center text-zinc-400 text-sm">No se encontraron miembros</td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-4 lg:px-5 py-2.5 font-semibold text-zinc-800 dark:text-zinc-100">{member.full_name}</td>
                    {!isStaffMember && (
                    <td className="px-4 lg:px-5 py-2.5">
                       <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize ${
                        member.role === 'admin' 
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-500' 
                          : member.role === 'trainer'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-500'
                          : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                      }`}>
                        {member.role}
                      </span>
                    </td>
                    )}
                    <td className="px-4 lg:px-5 py-2.5 text-zinc-500">{member.cedula || '-'}</td>
                    <td className="px-4 lg:px-5 py-2.5">
                      {member.role === 'member' ? (
                        member.membership_name ? (
                          (() => {
                            const badge = getExpiryBadgeInfo(member.days_remaining, alertDays);
                            return (
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-500">{member.membership_name}</p>
                              {badge && (
                                <Badge className={badge.className}>{badge.label}</Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400">{member.days_remaining ?? 0} días restantes</p>
                          </div>
                            );
                          })()
                        ) : (
                          <span className="text-xs text-zinc-400">Sin plan</span>
                        )
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 lg:px-5 py-2.5">
                      <Badge variant={member.status === 'active' ? 'success' : 'danger'}>
                        {member.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 lg:px-5 py-2.5 text-right">
                      <div className="flex justify-end gap-1 opacity-100 transition-all">
                        {user?.role === 'trainer' && member.role === 'member' && (
                          <>
                            <button 
                              onClick={() => navigate(`/members/${member.id}/routines`)}
                              className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
                              title="Ver Rutinas"
                            >
                              <Dumbbell className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => navigate(`/members/${member.id}/history`)}
                              className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="Historial de Entrenamiento"
                            >
                              <History className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/messages?member=${member.id}`)}
                              className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
                              title="Enviar mensaje"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {(user?.role === 'admin' || user?.role === 'receptionist') && member.role === 'member' && (
                          <>
                            <button
                              onClick={() => navigate(`/messages?member=${member.id}`)}
                              className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
                              title="Enviar mensaje"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openAssignSubscription(member)}
                              className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              title="Asignar membresía"
                            >
                              <CreditCard className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {user?.role === 'admin' && (
                          <>
                            <button 
                              onClick={() => handleToggleStatus(member)}
                              className={`p-1.5 rounded-lg transition-colors ${member.status === 'active' ? 'text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                              title={member.status === 'active' ? 'Desactivar' : 'Activar'}
                            >
                              <Power className="h-4 w-4" />
                            </button>
                            {member.role === 'member' && member.id !== user?.id && (
                              <button 
                                onClick={() => setDeleteTarget(member)}
                                className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Eliminar miembro"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          label="usuarios"
        />
      </Card>

      <Modal
        open={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title={assignTarget ? <>Membresía — <span className="text-orange-500">{assignTarget.full_name}</span></> : ''}
      >
        {assignTarget && (
          <>
            {assignTarget.membership_name && (
              <p className="text-xs text-zinc-500 mb-4">
                Plan actual: <strong>{assignTarget.membership_name}</strong> ({assignTarget.days_remaining} días).
                La nueva suscripción se encadena al vencimiento.
              </p>
            )}
            <select
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 font-bold mb-4"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              <option value="">Seleccionar plan...</option>
              {membershipPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — {plan.duration_days} días — ${plan.price_usd}
                </option>
              ))}
            </select>
            {assignError && <p className="text-xs text-red-500 mb-3">{assignError}</p>}
            <Button onClick={handleAssignSubscription} className="w-full bg-emerald-600 hover:bg-emerald-500">
              Asignar / Renovar
            </Button>
          </>
        )}
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Eliminar usuario"
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          ¿Eliminar a <strong>{deleteTarget?.full_name}</strong>? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1" onClick={confirmDeleteUser} disabled={deleting}>
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
