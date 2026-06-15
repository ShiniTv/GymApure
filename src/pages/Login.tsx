import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock } from 'lucide-react';
import Logo from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [registerAllowed, setRegisterAllowed] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch('/api/health')
      .then((res) => res.json())
      .then((data) => setRegisterAllowed(data.allowPublicRegister !== false))
      .catch(() => setRegisterAllowed(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      login(data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors duration-300">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-xl border border-zinc-200 dark:border-zinc-800">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-500/10 ring-1 ring-orange-500/50">
            <Logo className="h-12 w-12" />
          </div>
          <h2 className="mt-6 text-3xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase italic">
            CARIBEAN <span className="text-orange-500">GYM</span>
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Inicia sesión en tu cuenta</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-500 border border-red-500/20">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">Correo Electrónico</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 py-3 pl-10 text-zinc-900 dark:text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 sm:text-sm transition-all"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Contraseña</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 py-3 pl-10 text-zinc-900 dark:text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 sm:text-sm transition-all"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative flex w-full justify-center rounded-xl bg-orange-600 py-3 px-4 text-sm font-bold text-white hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-lg shadow-orange-900/20"
            >
              ENTRAR
            </button>
          </div>

          {registerAllowed && (
            <div className="text-center pt-2">
              <p className="text-xs text-zinc-500">
                ¿No tienes una cuenta?{' '}
                <Link to="/register" className="font-bold text-orange-600 hover:text-orange-500 uppercase tracking-tighter italic">
                  Regístrate Aquí
                </Link>
              </p>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
