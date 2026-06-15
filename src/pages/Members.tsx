import { useState, useEffect } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { Search, Plus, MoreVertical, Dumbbell, History, X, Trash2, Power, CreditCard, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newMember, setNewMember] = useState({
    full_name: '',
    email: '',
    cedula: '',
    role: 'member'
  });
  const [assignTarget, setAssignTarget] = useState<Member | null>(null);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [assignError, setAssignError] = useState('');
  const [expiringFilter, setExpiringFilter] = useState(false);
  const [alertDays, setAlertDays] = useState(7);
  const navigate = useNavigate();

  const getExpiryBadge = (days: number | null | undefined) => {
    if (days == null) return null;
    if (days <= 3) return { label: days === 0 ? 'Vence hoy' : `${days}d`, className: 'bg-red-500/10 text-red-600 dark:text-red-500' };
    if (days <= 7) return { label: `${days}d`, className: 'bg-orange-500/10 text-orange-600 dark:text-orange-500' };
    return null;
  };

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const apiFetchMembers = async () => {
    try {
      const res = await apiFetch('/api/users');
      const data = await parseJsonResponse<Member[]>(res);
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiFetchMembers();
    if (user?.role === 'admin') {
      apiFetch('/api/settings/expiry')
        .then((res) => parseJsonResponse<{ expiry_alert_days: number }>(res))
        .then((data) => setAlertDays(data.expiry_alert_days ?? 7))
        .catch(() => setAlertDays(7));
    }
  }, [user?.role]);

  const handleAddMember = async () => {
    if (!validateForm()) return;

    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember),
      });

      if (res.ok) {
        setIsAdding(false);
        setErrors({});
        setNewMember({ full_name: '', email: '', cedula: '', role: 'member' });
        apiFetchMembers();
      } else {
        const data = await res.json();
        setErrors({ submit: data.error || 'Error al crear usuario' });
      }
    } catch (err) {
      console.error('Failed to add member', err);
      setErrors({ submit: 'Error de conexión' });
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) return;

    try {
      const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        apiFetchMembers();
      }
    } catch (err) {
      console.error('Failed to delete user', err);
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
      console.error('Failed to toggle status', err);
    }
  };

  const openAssignSubscription = async (member: Member) => {
    setAssignTarget(member);
    setAssignError('');
    setSelectedPlanId('');
    try {
      const res = await apiFetch('/api/memberships');
      const data = await res.json();
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

    const res = await apiFetch('/api/memberships/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: assignTarget.id,
        membership_id: Number(selectedPlanId),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setAssignError(data.error || 'Error al asignar');
      return;
    }

    setAssignTarget(null);
    apiFetchMembers();
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch =
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.cedula?.includes(search);
    const matchesExpiring =
      !expiringFilter ||
      (m.role === 'member' && m.days_remaining != null && m.days_remaining <= alertDays);
    return matchesSearch && matchesExpiring;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase whitespace-pre-line leading-tight">
            GESTIÓN DE <span className="text-orange-500">USUARIOS</span>
          </h1>
          <p className="text-zinc-500 font-medium">
            Administra usuarios del gym. Solo puedes <strong className="text-zinc-700 dark:text-zinc-300">eliminar miembros</strong> (atletas), no entrenadores ni administradores.
          </p>
        </div>
        {(user?.role === 'trainer' || user?.role === 'admin') && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-900/20 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Nuevo Usuario
          </button>
        )}
      </div>

      {/* Add Member Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">NUEVO <span className="text-orange-500">USUARIO</span></h2>
              <button onClick={() => setIsAdding(false)} className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Nombre Completo</label>
                <input 
                  type="text"
                  className={`w-full bg-zinc-50 dark:bg-zinc-800 border ${errors.full_name ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-700'} rounded-2xl px-4 py-3 text-zinc-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all`}
                  value={newMember.full_name}
                  onChange={(e) => {
                    setNewMember({...newMember, full_name: e.target.value});
                    if (errors.full_name) setErrors({...errors, full_name: ''});
                  }}
                  placeholder="Ej: Juan Pérez"
                />
                {errors.full_name && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase ml-1">{errors.full_name}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Email</label>
                <input 
                  type="email"
                  className={`w-full bg-zinc-50 dark:bg-zinc-800 border ${errors.email ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-700'} rounded-2xl px-4 py-3 text-zinc-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all`}
                  value={newMember.email}
                  onChange={(e) => {
                    setNewMember({...newMember, email: e.target.value});
                    if (errors.email) setErrors({...errors, email: ''});
                  }}
                  placeholder="juan@ejemplo.com"
                />
                {errors.email && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase ml-1">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Cédula / ID</label>
                <input 
                  type="text"
                  className={`w-full bg-zinc-50 dark:bg-zinc-800 border ${errors.cedula ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-700'} rounded-2xl px-4 py-3 text-zinc-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all`}
                  value={newMember.cedula}
                  onChange={(e) => {
                    setNewMember({...newMember, cedula: e.target.value});
                    if (errors.cedula) setErrors({...errors, cedula: ''});
                  }}
                  placeholder="V-00000000"
                />
                {errors.cedula && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase ml-1">{errors.cedula}</p>}
              </div>
              
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Rol de Usuario</label>
                <select 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-zinc-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all appearance-none"
                  value={newMember.role}
                  onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                >
                  <option value="member">MIEMBRO / ATLETA</option>
                  <option value="trainer">ENTRENADOR / STAFF</option>
                  {user?.role === 'admin' && <option value="admin">ADMINISTRADOR</option>}
                </select>
              </div>

              {errors.submit && <p className="text-xs font-black text-red-500 text-center uppercase tracking-widest">{errors.submit}</p>}
              
              <button 
                onClick={handleAddMember}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-900/20 active:scale-95 mt-4"
              >
                Crear Usuario
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-4 w-full max-w-md shadow-sm focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
          <Search className="h-5 w-5 text-zinc-400" />
          <input 
            type="text"
            placeholder="Buscar por nombre o identificación..."
            className="bg-transparent border-none focus:outline-none text-zinc-900 dark:text-white ml-3 w-full placeholder-zinc-400 font-bold"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {user?.role === 'admin' && (
          <button
            type="button"
            onClick={() => setExpiringFilter((v) => !v)}
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

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-500">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 uppercase font-black text-[10px] tracking-widest">
              <tr>
                <th className="px-8 py-5">Nombre</th>
                <th className="px-8 py-5">Rol</th>
                <th className="px-8 py-5">Identificación</th>
                <th className="px-8 py-5">Membresía</th>
                <th className="px-8 py-5">Estado</th>
                <th className="px-8 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-zinc-400 font-bold uppercase tracking-widest">Cargando miembros...</td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px]">No se encontraron miembros</td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-8 py-5 font-black text-zinc-700 dark:text-zinc-200 uppercase tracking-tight">{member.full_name}</td>
                    <td className="px-8 py-5">
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
                    <td className="px-8 py-5 font-black tracking-tighter text-zinc-500 dark:text-zinc-500">{member.cedula || '-'}</td>
                    <td className="px-8 py-5">
                      {member.role === 'member' ? (
                        member.membership_name ? (
                          (() => {
                            const badge = getExpiryBadge(member.days_remaining);
                            return (
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-500">{member.membership_name}</p>
                              {badge && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${badge.className}`}>
                                  {badge.label}
                                </span>
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
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black tracking-widest ${
                        member.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' 
                          : 'bg-red-500/10 text-red-600 dark:text-red-500'
                      }`}>
                        {member.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
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
                                onClick={() => handleDeleteUser(member.id)}
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
      </div>

      {assignTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black uppercase italic tracking-tighter text-zinc-900 dark:text-white">
                Membresía — <span className="text-orange-500">{assignTarget.full_name}</span>
              </h2>
              <button onClick={() => setAssignTarget(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-5 w-5" />
              </button>
            </div>
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
            <button
              onClick={handleAssignSubscription}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-2xl font-black uppercase tracking-widest"
            >
              Asignar / Renovar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
