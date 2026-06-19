import { useState, useEffect, useCallback } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { Search, Plus, MoreVertical, Dumbbell, History, X, Trash2, Power, CreditCard, AlertTriangle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminStatsOptional } from '../context/AdminStatsContext';
import { Button, Badge, Input, Label, Modal, PageHeader, PaginationBar, Spinner, DataCard, Avatar } from '../components/ui';
import { useToastOptional } from '../context/ToastContext';
import { clientLogger } from '../lib/clientLogger';
import {
  getExpiryBadgeInfo,
} from '../lib/expiryUtils';

interface PaginatedUsers {
  items: Member[];
  total: number;
  page: number;
  pageSize: number;
}

interface Member {
  id: number;
  full_name: string;
  email: string;
  cedula: string;
  status: 'active' | 'inactive';
  role: string;
  last_workout: string | null;
  membership_name?: string | null;
  subscription_end?: string | null;
  days_remaining?: number | null;
}

interface MembershipPlan {
  id: number;
  name: string;
  duration_days: number;
  price_usd: number;
}

export default function Members() {
  const { user } = useAuth();
  const adminStats = useAdminStatsOptional();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
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
  const colCount = isTrainer ? 5 : 6;

  const apiFetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (search) params.set('q', search);
      if (expiringFilter) params.set('expiring', 'true');
      if (isTrainer) params.set('role', 'member');

      const res = await apiFetch(`/api/users?${params.toString()}`);
      const data = await parseJsonResponse<PaginatedUsers>(res);
      setMembers(Array.isArray(data.items) ? data.items : []);
      setTotal(data.total ?? 0);
    } catch (err) {
      clientLogger.error('Failed to fetch members', err);
      setMembers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, expiringFilter, isTrainer]);

  useEffect(() => {
    void apiFetchMembers();
  }, [apiFetchMembers]);

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

    if (newMember.cedula.trim()) {
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
        apiFetchMembers();
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
        apiFetchMembers();
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
        apiFetchMembers();
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
      apiFetchMembers();
      await adminStats?.refresh();
      toast?.success('Membresía asignada');
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Error al asignar');
    }
  };

  const filteredMembers = members;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          isTrainer ? (
            <>Mis <span className="text-orange-500">miembros</span></>
          ) : (
            <>Gestión de <span className="text-orange-500">usuarios</span></>
          )
        }
        subtitle={
          isTrainer
            ? 'Consulta tus miembros asignados y gestiona sus rutinas de entrenamiento'
            : 'Administra usuarios del gym. Solo puedes eliminar miembros (atletas), no entrenadores ni administradores.'
        }
        action={
          (user?.role === 'trainer' || user?.role === 'admin') ? (
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="h-5 w-5" />
              {isTrainer ? 'Nuevo miembro' : 'Nuevo usuario'}
            </Button>
          ) : undefined
        }
      />

      <Modal
        open={isAdding}
        onClose={() => setIsAdding(false)}
        title={<>NUEVO <span className="text-orange-500">USUARIO</span></>}
      >
        <div className="space-y-4">
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
              {!isTrainer && (
              <div>
                <Label>Rol de Usuario</Label>
                <select
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-zinc-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all appearance-none"
                  value={newMember.role}
                  onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                >
                  <option value="member">Miembro / Atleta</option>
                  <option value="trainer">Entrenador / Staff</option>
                  {user?.role === 'admin' && <option value="admin">Administrador</option>}
                </select>
              </div>
              )}
              {errors.submit && <p className="text-xs font-black text-red-500 text-center uppercase tracking-widest">{errors.submit}</p>}
              <Button onClick={handleAddMember} className="w-full mt-4" size="lg">
                Crear Usuario
              </Button>
        </div>
      </Modal>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 z-10 pointer-events-none" />
          <Input
            type="text"
            placeholder="Buscar por nombre o identificación..."
            className="pl-12 py-4 bg-white dark:bg-zinc-900 shadow-sm"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        {user?.role === 'admin' && (
          <button
            type="button"
            onClick={() => {
              setExpiringFilter((v) => !v);
              setPage(1);
            }}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              expiringFilter
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-500'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Por vencer ({alertDays}d)
          </button>
        )}
      </div>

      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="py-12 flex justify-center"><Spinner /></div>
        ) : filteredMembers.length === 0 ? (
          <p className="text-center text-zinc-400 text-sm py-12">No se encontraron miembros</p>
        ) : (
          filteredMembers.map((member) => (
            <DataCard key={member.id}>
              <div className="flex items-start gap-3">
                <Avatar name={member.full_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black text-zinc-900 dark:text-white uppercase tracking-tight truncate">
                      {member.full_name}
                    </p>
                    <Badge variant={member.status === 'active' ? 'success' : 'danger'}>
                      {member.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{member.cedula || 'Sin cédula'}</p>
                  {!isTrainer && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1">
                      {member.role}
                    </p>
                  )}
                  {member.membership_name && (
                    <p className="text-[10px] font-black uppercase text-emerald-600 mt-2">
                      {member.membership_name} · {member.days_remaining ?? 0}d
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                {isTrainer && member.role === 'member' && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/members/${member.id}/routines`)}>
                      <Dumbbell className="h-4 w-4" /> Rutinas
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/members/${member.id}/history`)}>
                      <History className="h-4 w-4" /> Historial
                    </Button>
                  </>
                )}
                {user?.role === 'admin' && member.role === 'member' && (
                  <Button size="sm" variant="ghost" onClick={() => openAssignSubscription(member)}>
                    <CreditCard className="h-4 w-4" /> Membresía
                  </Button>
                )}
              </div>
            </DataCard>
          ))
        )}
        <PaginationBar page={page} pageSize={pageSize} total={total} onPageChange={setPage} label="usuarios" />
      </div>

      <div className="hidden md:block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-500">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 uppercase font-black text-[10px] tracking-widest">
              <tr>
                <th className="px-4 md:px-8 py-5">Nombre</th>
                {!isTrainer && <th className="px-4 md:px-8 py-5">Rol</th>}
                <th className="px-4 md:px-8 py-5">Identificación</th>
                <th className="px-4 md:px-8 py-5">Membresía</th>
                <th className="px-4 md:px-8 py-5">Estado</th>
                <th className="px-4 md:px-8 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={colCount} className="px-8 py-12 text-center">
                    <Spinner />
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-8 py-12 text-center text-zinc-400 text-sm">No se encontraron miembros</td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-4 md:px-8 py-5 font-bold text-zinc-700 dark:text-zinc-200">{member.full_name}</td>
                    {!isTrainer && (
                    <td className="px-4 md:px-8 py-5">
                       <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black tracking-widest ${
                        member.role === 'admin' 
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-500' 
                          : member.role === 'trainer'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-500'
                          : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                      }`}>
                        {member.role.toUpperCase()}
                      </span>
                    </td>
                    )}
                    <td className="px-4 md:px-8 py-5 text-zinc-500">{member.cedula || '-'}</td>
                    <td className="px-4 md:px-8 py-5">
                      {member.role === 'member' ? (
                        member.membership_name ? (
                          (() => {
                            const badge = getExpiryBadgeInfo(member.days_remaining, alertDays);
                            return (
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-500">{member.membership_name}</p>
                              {badge && (
                                <Badge className={badge.className}>{badge.label}</Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400">{member.days_remaining ?? 0} días restantes</p>
                          </div>
                            );
                          })()
                        ) : (
                          <span className="text-[10px] font-black uppercase text-zinc-400">Sin plan</span>
                        )
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 md:px-8 py-5">
                      <Badge variant={member.status === 'active' ? 'success' : 'danger'}>
                        {member.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 md:px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-100 transition-all">
                        {user?.role === 'trainer' && member.role === 'member' && (
                          <>
                            <button 
                              onClick={() => navigate(`/members/${member.id}/routines`)}
                              className="p-2 text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
                              title="Ver Rutinas"
                            >
                              <Dumbbell className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => navigate(`/members/${member.id}/history`)}
                              className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="Historial de Entrenamiento"
                            >
                              <History className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        {user?.role === 'admin' && member.role === 'member' && (
                          <button
                            onClick={() => openAssignSubscription(member)}
                            className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="Asignar membresía"
                          >
                            <CreditCard className="h-5 w-5" />
                          </button>
                        )}
                        {user?.role === 'admin' && (
                          <>
                            <button 
                              onClick={() => handleToggleStatus(member)}
                              className={`p-2 rounded-lg transition-colors ${member.status === 'active' ? 'text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                              title={member.status === 'active' ? 'Desactivar' : 'Activar'}
                            >
                              <Power className="h-5 w-5" />
                            </button>
                            {member.role === 'member' && member.id !== user?.id && (
                              <button 
                                onClick={() => setDeleteTarget(member)}
                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Eliminar miembro"
                              >
                                <Trash2 className="h-5 w-5" />
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
      </div>

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
