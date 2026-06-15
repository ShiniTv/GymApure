import React, { useState } from 'react';
import { apiFetch } from '../lib/api';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, CreditCard, Phone, ArrowLeft } from 'lucide-react';
import Logo from '../components/Logo';

export default function Register() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    cedula: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirm_password) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (!formData.cedula.trim()) {
      setError('La cédula es obligatoria para el check-in en el gym');
      return;
    }

    setLoading(true);
    
    try {
      const { confirm_password: _, ...payload } = formData;
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'No se pudo completar el registro');
      
      login(data.user);
      if (data.message) setSuccess(data.message);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors duration-300">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-xl border border-zinc-200 dark:border-zinc-800">
        <div className="text-center relative">
          <Link to="/login" className="absolute left-0 top-1 text-zinc-400 hover:text-orange-500 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 ring-1 ring-orange-500/50">
            <Logo className="h-10 w-10" />
          </div>
          <h2 className="mt-6 text-2xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase italic">
            ÚNETE A <span className="text-orange-500">CARIBEAN</span>
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Crea tu cuenta de miembro ahora</p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {success && (
            <div className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              {success}
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-500 border border-red-500/20">
              {error}
            </div>
          )}
          
          <div className="space-y-3">
            <div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 py-2.5 pl-10 text-zinc-900 dark:text-white placeholder:text-[10px] placeholder:font-black placeholder:uppercase placeholder:tracking-widest focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 sm:text-sm transition-all shadow-inner"
                  placeholder="NOMBRE COMPLETO"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 py-2.5 pl-10 text-zinc-900 dark:text-white placeholder:text-[10px] placeholder:font-black placeholder:uppercase placeholder:tracking-widest focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 sm:text-sm transition-all shadow-inner"
                  placeholder="CORREO ELECTRÓNICO"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <CreditCard className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 py-2.5 pl-10 text-zinc-900 dark:text-white placeholder:text-[10px] placeholder:font-black placeholder:uppercase placeholder:tracking-widest focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 sm:text-sm transition-all shadow-inner"
                  placeholder="CÉDULA (OBLIGATORIA)"
                  value={formData.cedula}
                  onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                />
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Phone className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="text"
                  className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 py-2.5 pl-10 text-zinc-900 dark:text-white placeholder:text-[10px] placeholder:font-black placeholder:uppercase placeholder:tracking-widest focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 sm:text-sm transition-all shadow-inner"
                  placeholder="TELÉFONO"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 py-2.5 pl-10 text-zinc-900 dark:text-white placeholder:text-[10px] placeholder:font-black placeholder:uppercase placeholder:tracking-widest focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 sm:text-sm transition-all shadow-inner"
                  placeholder="CONTRASEÑA (MÍN. 8 CARACTERES)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 py-2.5 pl-10 text-zinc-900 dark:text-white placeholder:text-[10px] placeholder:font-black placeholder:uppercase placeholder:tracking-widest focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 sm:text-sm transition-all shadow-inner"
                  placeholder="CONFIRMAR CONTRASEÑA"
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-orange-600 py-3 px-4 text-sm font-black text-white hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-lg shadow-orange-900/20 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'REGISTRANDO...' : 'CREAR CUENTA'}
            </button>
          </div>

          <div className="text-center mt-4">
            <p className="text-xs text-zinc-500">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="font-bold text-orange-600 hover:text-orange-500 uppercase tracking-tighter italic">
                Inicia Sesión
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
