import React, { useState, useEffect } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { getKioskClientKey } from '../lib/kiosk';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Fingerprint, TrendingUp, Users, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExpiringMember {
  user_id: number;
  full_name: string;
  membership_name: string;
  days_remaining: number;
  end_date: string;
}

interface LastDoorAlert {
  full_name: string;
  membership_name: string;
  days_remaining: number;
  check_in_time: string;
}

export default function Attendance() {
  const [data, setData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<ExpiringMember[]>([]);
  const [lastDoorAlert, setLastDoorAlert] = useState<LastDoorAlert | null>(null);
  const [alertDays, setAlertDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/attendance/volume').then(res => res.json()),
      apiFetch('/api/attendance/hourly').then(res => res.json()),
      apiFetch('/api/memberships/expiring').then(res => parseJsonResponse<{
        expiring: ExpiringMember[];
        lastDoorAlert: LastDoorAlert | null;
        days: number;
      }>(res)),
    ])
      .then(([volume, hourly, expiry]) => {
        setData(Array.isArray(volume) ? volume : []);
        setHourlyData(Array.isArray(hourly) ? hourly : []);
        setExpiring(Array.isArray(expiry.expiring) ? expiry.expiring : []);
        setLastDoorAlert(expiry.lastDoorAlert ?? null);
        setAlertDays(expiry.days ?? 7);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setData([]);
        setHourlyData([]);
        setExpiring([]);
        setLastDoorAlert(null);
        setLoading(false);
      });
  }, []);

  const totalEntries = data.reduce((sum, item) => sum + item.count, 0);
  const avgEntries = data.length > 0 ? (totalEntries / data.length).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase whitespace-pre-line leading-tight">
            CONTROL <span className="text-orange-500">BIOMÉTRICO</span>
          </h1>
          <p className="text-zinc-500 font-medium">Análisis de volumen de usuarios y frecuencia de ingreso</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 rounded-xl">
              <Fingerprint className="h-6 w-6 text-orange-600 dark:text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Total Ingresos (7d)</p>
              <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter italic">{totalEntries}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Promedio Diario</p>
              <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter italic">{avgEntries} <span className="text-xs uppercase">users</span></p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Pico de Ingreso</p>
              <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter italic">
                {data.length > 0 ? Math.max(...data.map(d => d.count)) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
          <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-8 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-orange-500" />
            Volumen Diario (7d)
          </h3>
          <div className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center text-zinc-400 font-bold uppercase tracking-widest text-xs">Cargando...</div>
            ) : data.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-400 font-bold uppercase tracking-widest text-xs">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" />
                  <XAxis 
                    dataKey="date" 
                    stroke="currentColor" 
                    className="text-zinc-400" 
                    fontSize={10} 
                    fontWeight="900"
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(str) => {
                      const date = new Date(str + 'T00:00:00');
                      return date.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
                    }}
                  />
                  <YAxis stroke="currentColor" className="text-zinc-400" fontSize={10} fontWeight="900" tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'currentColor', opacity: 0.05 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-2xl">
                            <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">{payload[0].payload.date}</p>
                            <p className="text-lg font-black text-orange-500 italic tracking-tighter uppercase">{payload[0].value} Ingresos</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} className="fill-orange-500 opacity-80 hover:opacity-100 transition-opacity" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
          <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-8 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            Horas Pico (30d)
          </h3>
          <div className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center text-zinc-400 font-bold uppercase tracking-widest text-xs">Cargando...</div>
            ) : hourlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-400 font-bold uppercase tracking-widest text-xs">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="currentColor" 
                    className="text-zinc-400" 
                    fontSize={10} 
                    fontWeight="900"
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => `${val}h`}
                  />
                  <YAxis stroke="currentColor" className="text-zinc-400" fontSize={10} fontWeight="900" tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'currentColor', opacity: 0.05 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-2xl">
                            <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">{payload[0].payload.hour}:00 HS</p>
                            <p className="text-lg font-black text-blue-500 italic tracking-tighter uppercase">{payload[0].value} Ingresos</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {hourlyData.map((entry, index) => (
                      <Cell key={`cell-h-${index}`} className="fill-blue-500 opacity-80 hover:opacity-100 transition-opacity" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm overflow-hidden relative">
          <div className="flex items-center gap-3 mb-6">
            < Fingerprint className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Simulador Biométrico</h3>
          </div>
          
          <div className="space-y-4">
             <p className="text-xs font-medium text-zinc-500">Ingresa la cédula para simular entrada o salida en el kiosk.</p>
             <div className="flex gap-2">
                <input 
                  id="sim-cedula"
                  type="text" 
                  placeholder="V-12345678"
                  className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500"
                />
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const el = document.getElementById('sim-cedula') as HTMLInputElement;
                    const cedula = el.value;
                    if (!cedula) return;
                    
                    const feedbackEl = document.getElementById('sim-feedback');
                    if (feedbackEl) {
                      feedbackEl.innerText = 'Validando entrada...';
                      feedbackEl.className = 'text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-2 text-center';
                    }

                    const kioskKey = getKioskClientKey();
                    if (!kioskKey) {
                      if (feedbackEl) {
                        feedbackEl.innerText = 'Kiosk no configurado (falta VITE_KIOSK_KEY)';
                        feedbackEl.className = 'text-[10px] font-black uppercase tracking-widest text-red-500 mt-2 text-center';
                      }
                      return;
                    }

                    apiFetch('/api/attendance/check-in', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Kiosk-Key': kioskKey,
                      },
                      body: JSON.stringify({ cedula })
                    })
                    .then(res => res.json())
                    .then(data => {
                      if (feedbackEl) {
                        if (data.error) {
                          feedbackEl.innerText = `Entrada denegada: ${data.error}`;
                          feedbackEl.className = 'text-[10px] font-black uppercase tracking-widest text-red-500 mt-2 text-center';
                        } else {
                          const base = data.already_checked_in
                            ? `Ingreso activo: ${data.user_name}`
                            : `Entrada OK: ${data.user_name}`;
                          feedbackEl.innerText = data.expiry_warning
                            ? `${base} — ${data.expiry_warning}`
                            : base;
                          feedbackEl.className = data.expiry_warning
                            ? 'text-[10px] font-black uppercase tracking-widest text-orange-500 mt-2 text-center'
                            : 'text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-2 text-center';
                          if (!data.already_checked_in) {
                            setTimeout(() => window.location.reload(), 1500);
                          }
                        }
                      }
                    });
                  }}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  SIMULAR ENTRADA
                </button>
                <button 
                  onClick={() => {
                    const el = document.getElementById('sim-cedula') as HTMLInputElement;
                    const cedula = el.value;
                    if (!cedula) return;
                    
                    const feedbackEl = document.getElementById('sim-feedback');
                    if (feedbackEl) {
                      feedbackEl.innerText = 'Validando salida...';
                      feedbackEl.className = 'text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-2 text-center';
                    }

                    const kioskKey = getKioskClientKey();
                    if (!kioskKey) {
                      if (feedbackEl) {
                        feedbackEl.innerText = 'Kiosk no configurado (falta VITE_KIOSK_KEY)';
                        feedbackEl.className = 'text-[10px] font-black uppercase tracking-widest text-red-500 mt-2 text-center';
                      }
                      return;
                    }

                    apiFetch('/api/attendance/check-out', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Kiosk-Key': kioskKey,
                      },
                      body: JSON.stringify({ cedula })
                    })
                    .then(res => res.json())
                    .then(data => {
                      if (feedbackEl) {
                        if (data.error) {
                          feedbackEl.innerText = `Salida denegada: ${data.error}`;
                          feedbackEl.className = 'text-[10px] font-black uppercase tracking-widest text-red-500 mt-2 text-center';
                        } else {
                          const base = data.already_checked_out
                            ? `Ya salió hoy: ${data.user_name}`
                            : `Salida OK: ${data.user_name}${data.duration_label ? ` (${data.duration_label})` : ''}`;
                          feedbackEl.innerText = base;
                          feedbackEl.className = 'text-[10px] font-black uppercase tracking-widest text-blue-500 mt-2 text-center';
                          el.value = '';
                          if (!data.already_checked_out) {
                            setTimeout(() => window.location.reload(), 1500);
                          }
                        }
                      }
                    });
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  SIMULAR SALIDA
                </button>
             </div>
             <p id="sim-feedback" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-2 text-center"></p>
          </div>

          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse"></div>
              <div className="relative h-20 w-20 rounded-full border-4 border-emerald-500/30 flex items-center justify-center">
                <Fingerprint className="h-10 w-10 text-emerald-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
           <h3 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
             <AlertTriangle className="h-4 w-4 text-orange-500" />
             Próximos Vencimientos ({alertDays}d)
           </h3>
           <div className="space-y-4">
              {lastDoorAlert && (
                <div className="p-4 border border-orange-500/20 rounded-2xl bg-orange-500/5">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Última alerta en puerta:</p>
                  <p className="text-sm font-black text-zinc-700 dark:text-zinc-200 uppercase tracking-tight">
                    {lastDoorAlert.full_name} — {lastDoorAlert.membership_name} —{' '}
                    {lastDoorAlert.days_remaining === 0
                      ? 'vence hoy'
                      : lastDoorAlert.days_remaining === 1
                      ? 'vence mañana'
                      : `vence en ${lastDoorAlert.days_remaining} días`}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    {format(new Date(lastDoorAlert.check_in_time), "dd MMM yyyy · HH:mm", { locale: es })}
                  </p>
                </div>
              )}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {expiring.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                    No hay membresías por vencer en los próximos {alertDays} días.
                  </p>
                ) : (
                  expiring.map((member) => (
                    <div
                      key={member.user_id}
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        member.days_remaining <= 3
                          ? 'border-red-500/20 bg-red-500/5'
                          : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase">{member.full_name}</p>
                        <p className="text-[10px] text-zinc-400">{member.membership_name}</p>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        member.days_remaining <= 3 ? 'text-red-500' : 'text-orange-500'
                      }`}>
                        {member.days_remaining === 0 ? 'Hoy' : `${member.days_remaining}d`}
                      </span>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
