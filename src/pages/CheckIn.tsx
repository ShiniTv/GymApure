import React, { useState } from 'react';
import { apiFetch } from '../lib/api';
import { Fingerprint, CheckCircle, XCircle, ArrowLeft, LogIn, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getKioskClientKey } from '../lib/kiosk.ts';
import clsx from 'clsx';

type KioskMode = 'check-in' | 'check-out';

export default function CheckIn() {
  const [mode, setMode] = useState<KioskMode>('check-in');
  const [cedula, setCedula] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [expiryWarning, setExpiryWarning] = useState('');
  const [durationLabel, setDurationLabel] = useState('');
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  const isCheckIn = mode === 'check-in';

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cedula && status === 'idle') return;

    setStatus('scanning');
    setDurationLabel('');

    setTimeout(async () => {
      const kioskKey = getKioskClientKey();
      if (!kioskKey) {
        setStatus('error');
        setMessage('Kiosk no configurado (falta VITE_KIOSK_KEY en el servidor).');
        setTimeout(() => setStatus('idle'), 5000);
        return;
      }

      const endpoint = isCheckIn ? '/api/attendance/check-in' : '/api/attendance/check-out';

      try {
        const res = await apiFetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Kiosk-Key': kioskKey,
          },
          body: JSON.stringify({ cedula: cedula.trim() }),
        });

        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setUserName(data.user_name);
          setExpiryWarning(data.expiry_warning || '');
          setDurationLabel(data.duration_label || '');

          if (isCheckIn) {
            setMessage(
              data.already_checked_in
                ? 'Ya tienes un ingreso activo hoy.'
                : '¡Bienvenido! Que tengas un excelente entrenamiento.'
            );
          } else {
            setMessage(
              data.already_checked_out
                ? 'Ya registraste tu salida hoy.'
                : data.message || '¡Hasta pronto! Salida registrada.'
            );
          }

          setCedula('');
          setTimeout(() => {
            setStatus('idle');
            setExpiryWarning('');
            setDurationLabel('');
          }, 4500);
        } else {
          setStatus('error');
          setMessage(data.error || (isCheckIn ? 'Ingreso fallido' : 'Salida fallida'));
          setExpiryWarning('');
          if (data.user_name) setUserName(data.user_name);
          setTimeout(() => setStatus('idle'), 4000);
        }
      } catch {
        setStatus('error');
        setMessage('Error de red');
        setTimeout(() => setStatus('idle'), 4000);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/10 blur-[120px] rounded-full" />
      </div>

      <button
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </button>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div
            className={clsx(
              'inline-flex p-3 rounded-2xl mb-4 ring-1',
              isCheckIn ? 'bg-orange-500/10 ring-orange-500/20' : 'bg-blue-500/10 ring-blue-500/20'
            )}
          >
            <Fingerprint className={clsx('h-8 w-8', isCheckIn ? 'text-orange-500' : 'text-blue-500')} />
          </div>
          <h1 className="text-4xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase">
            CARIBEAN <span className="text-orange-500">GYM</span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">CONTROL DE ACCESO BIOMÉTRICO</p>
        </div>

        <div className="flex gap-2 mb-6 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => { setMode('check-in'); setStatus('idle'); }}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
              isCheckIn
                ? 'bg-orange-600 text-white shadow-lg'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            )}
          >
            <LogIn className="h-4 w-4" />
            Entrada
          </button>
          <button
            type="button"
            onClick={() => { setMode('check-out'); setStatus('idle'); }}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
              !isCheckIn
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            )}
          >
            <LogOut className="h-4 w-4" />
            Salida
          </button>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl transition-all">
          {status === 'idle' || status === 'scanning' ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="text-center space-y-4">
                <div
                  className={clsx(
                    'mx-auto h-32 w-32 rounded-3xl border-2 flex items-center justify-center transition-all cursor-pointer relative overflow-hidden group',
                    status === 'scanning'
                      ? isCheckIn
                        ? 'border-orange-500 ring-4 ring-orange-500/20'
                        : 'border-blue-500 ring-4 ring-blue-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-orange-500/50'
                  )}
                  onClick={() => status === 'idle' && handleSubmit()}
                >
                  {status === 'scanning' && (
                    <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 to-transparent animate-scan-line" />
                  )}
                  <Fingerprint
                    className={clsx(
                      'h-16 w-16 transition-colors',
                      status === 'scanning'
                        ? isCheckIn ? 'text-orange-500' : 'text-blue-500'
                        : 'text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-500'
                    )}
                  />
                </div>
                <div>
                  <h3 className="text-zinc-900 dark:text-white font-bold text-lg">
                    {status === 'scanning'
                      ? 'Escaneando Huella...'
                      : isCheckIn
                      ? 'Registro de entrada'
                      : 'Registro de salida'}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {isCheckIn
                      ? 'Coloque su huella o ingrese su cédula'
                      : 'Confirme su salida con huella o cédula'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  className="w-full bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-4 text-center text-xl font-mono text-zinc-900 dark:text-white tracking-widest focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder-zinc-300 dark:placeholder-zinc-700"
                  placeholder="V-00000000"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  disabled={status === 'scanning'}
                />

                <button
                  type="submit"
                  disabled={status === 'scanning' || !cedula}
                  className={clsx(
                    'w-full disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-600 text-white font-bold py-4 rounded-2xl text-lg transition-all shadow-lg',
                    isCheckIn
                      ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20'
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                  )}
                >
                  {isCheckIn ? 'REGISTRAR ENTRADA' : 'REGISTRAR SALIDA'}
                </button>
              </div>
            </form>
          ) : (
            <div
              className={clsx(
                'py-8 text-center animate-in zoom-in-95 duration-300',
                status === 'success' ? (isCheckIn ? 'text-emerald-500' : 'text-blue-500') : 'text-red-500'
              )}
            >
              <div
                className={clsx(
                  'mx-auto h-24 w-24 rounded-full flex items-center justify-center mb-6',
                  status === 'success'
                    ? isCheckIn ? 'bg-emerald-500/10' : 'bg-blue-500/10'
                    : 'bg-red-500/10'
                )}
              >
                {status === 'success' ? (
                  <CheckCircle className="h-12 w-12" />
                ) : (
                  <XCircle className="h-12 w-12" />
                )}
              </div>
              <h2 className="text-3xl font-black mb-2 uppercase italic tracking-tight">
                {status === 'success'
                  ? isCheckIn ? 'ACCESO CONCEDIDO' : 'SALIDA REGISTRADA'
                  : 'ACCESO DENEGADO'}
              </h2>
              <div className="space-y-1">
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {status === 'success' ? userName : userName || 'Error de validación'}
                </p>
                <p className="text-zinc-500 dark:text-zinc-400">{message}</p>
                {durationLabel && (
                  <p className="text-sm font-black uppercase tracking-widest text-blue-500 mt-2">
                    Tiempo en gym: {durationLabel}
                  </p>
                )}
                {expiryWarning && (
                  <p className="text-sm font-black uppercase tracking-widest text-orange-500 mt-2">
                    {expiryWarning}
                  </p>
                )}
              </div>

              <button
                onClick={() => setStatus('idle')}
                className="mt-8 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Volver a escanear
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-center gap-6">
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            SISTEMA ACTIVO
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span className="w-2 h-2 rounded-full bg-zinc-800" />
            V 2.5.0
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan-line {
          0% { transform: translateY(100%); }
          100% { transform: translateY(-100%); }
        }
        .animate-scan-line {
          animation: scan-line 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
