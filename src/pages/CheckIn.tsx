import React, { useState } from 'react';
import { apiFetch } from '../lib/api';
import { Fingerprint, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getKioskClientKey } from '../lib/kiosk.ts';

export default function CheckIn() {
  const [cedula, setCedula] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  const handleCheckIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cedula && status === 'idle') return;

    setStatus('scanning');
    
    // Simulate biometric scan delay
    setTimeout(async () => {
      const kioskKey = getKioskClientKey();
      if (!kioskKey) {
        setStatus('error');
        setMessage('Kiosk no configurado (falta VITE_KIOSK_KEY en el servidor).');
        setTimeout(() => setStatus('idle'), 5000);
        return;
      }

      try {
        const res = await apiFetch('/api/attendance/check-in', {
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
          setMessage(
            data.already_checked_in
              ? 'Ya registraste tu ingreso hoy.'
              : '¡Bienvenido! Que tengas un excelente entrenamiento.'
          );
          setCedula('');
          setTimeout(() => setStatus('idle'), 4000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Ingreso fallido');
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
      {/* Abstract Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/10 blur-[120px] rounded-full"></div>
      </div>

      <button 
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </button>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-12">
           <div className="inline-flex p-3 rounded-2xl bg-orange-500/10 mb-4 ring-1 ring-orange-500/20">
              <Fingerprint className="h-8 w-8 text-orange-500" />
           </div>
           <h1 className="text-4xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase">
             CARIBEAN <span className="text-orange-500">GYM</span>
           </h1>
           <p className="text-zinc-500 dark:text-zinc-400 font-medium">CONTROL DE ACCESO BIOMÉTRICO</p>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl transition-all">
          {status === 'idle' || status === 'scanning' ? (
            <form onSubmit={handleCheckIn} className="space-y-8">
              <div className="text-center space-y-4">
                <div 
                  className={`mx-auto h-32 w-32 rounded-3xl border-2 flex items-center justify-center transition-all cursor-pointer relative overflow-hidden group ${
                    status === 'scanning' ? 'border-orange-500 ring-4 ring-orange-500/20' : 'border-zinc-200 dark:border-zinc-800 hover:border-orange-500/50'
                  }`}
                  onClick={() => status === 'idle' && handleCheckIn()}
                >
                  {status === 'scanning' && (
                    <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 to-transparent animate-scan-line"></div>
                  )}
                  <Fingerprint className={`h-16 w-16 transition-colors ${status === 'scanning' ? 'text-orange-500' : 'text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-500'}`} />
                </div>
                <div>
                  <h3 className="text-zinc-900 dark:text-white font-bold text-lg">
                    {status === 'scanning' ? 'Escaneando Huella...' : 'Coloque su huella en el lector'}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">O ingrese su cédula manualmente debajo</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    className="w-full bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-4 text-center text-xl font-mono text-zinc-900 dark:text-white tracking-widest focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder-zinc-300 dark:placeholder-zinc-700"
                    placeholder="V-00000000"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    disabled={status === 'scanning'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'scanning' || !cedula}
                  className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-600 text-white font-bold py-4 rounded-2xl text-lg transition-all shadow-lg shadow-orange-900/20"
                >
                  VALIDAR IDENTIDAD
                </button>
              </div>
            </form>
          ) : (
            <div className={`py-8 text-center animate-in zoom-in-95 duration-300 ${
              status === 'success' ? 'text-emerald-500' : 'text-red-500'
            }`}>
              <div className={`mx-auto h-24 w-24 rounded-full flex items-center justify-center mb-6 ${
                status === 'success' ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`}>
                {status === 'success' ? (
                  <CheckCircle className="h-12 w-12" />
                ) : (
                  <XCircle className="h-12 w-12" />
                )}
              </div>
              <h2 className="text-3xl font-black mb-2 uppercase italic tracking-tight">
                {status === 'success' ? 'ACCESO CONCEDIDO' : 'ACCESO DENEGADO'}
              </h2>
              <div className="space-y-1">
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {status === 'success' ? userName : userName || 'Error de validación'}
                </p>
                <p className="text-zinc-500 dark:text-zinc-400">{message}</p>
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
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              SISTEMA ACTIVO
           </div>
           <div className="flex items-center gap-2 text-xs text-zinc-600">
              <span className="w-2 h-2 rounded-full bg-zinc-800"></span>
              V 2.4.1
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
