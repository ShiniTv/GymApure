import React from 'react';
import { Plus, ChevronLeft, ChevronRight, Play, UserPlus } from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Button, Card } from '../../components/ui';
import { formatDifficulty } from '../../lib/utils';
import type { CalendarAssignment } from './types';

export interface RoutinesCalendarViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  selectedDay: Date | null;
  setSelectedDay: (day: Date | null) => void;
  calendarDays: Date[];
  assignmentsByDay: Record<string, CalendarAssignment[]>;
  onAssignDirect: () => void;
  onAssignOnDay: (dateStr: string) => void;
}

export function RoutinesCalendarView({
  currentDate,
  setCurrentDate,
  selectedDay,
  setSelectedDay,
  calendarDays,
  assignmentsByDay,
  onAssignDirect,
  onAssignOnDay,
}: RoutinesCalendarViewProps) {
  const selectedDayStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedDayAssignments = selectedDayStr ? (assignmentsByDay[selectedDayStr] || []) : [];

  return (
    <div className="space-y-6">
      <Card padding="lg" rounded="3xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </h2>
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
              <button
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-zinc-500 transition-all"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-zinc-500 transition-all"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <Button onClick={onAssignDirect} size="sm">
            <Plus className="h-4 w-4" />
            Asignar Directo
          </Button>
        </div>

        {/* Desktop: 7-column grid */}
        <div className="hidden lg:block overflow-x-auto -mx-1 px-1">
          <div className="grid grid-cols-7 gap-px min-w-[640px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-inner">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <div key={day} className="bg-zinc-50 dark:bg-zinc-900/50 py-3 text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {day}
              </div>
            ))}
            {calendarDays.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayAssignments = assignmentsByDay[dateStr] || [];
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const isToday = isSameDay(day, new Date());
              const isOtherMonth = !isSameMonth(day, currentDate);

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[120px] p-2 bg-white dark:bg-zinc-900 transition-all cursor-pointer border-t border-l border-zinc-100 dark:border-zinc-800 relative group
                    ${isOtherMonth ? 'opacity-30' : 'opacity-100'}
                    ${isSelected ? 'bg-orange-500/5 dark:bg-orange-500/10' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-xs font-black tracking-tighter ${isToday ? 'bg-orange-500 text-white h-6 w-6 rounded-full flex items-center justify-center' : 'text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>
                      {format(day, 'd')}
                    </span>
                    {dayAssignments.length > 0 && (
                      <div className="flex items-center gap-1">
                        {dayAssignments.slice(0, 4).map((_, dotIdx) => (
                          <span
                            key={dotIdx}
                            className="h-2 w-2 rounded-full bg-orange-500"
                            title={`${dayAssignments.length} asignación(es)`}
                          />
                        ))}
                        {dayAssignments.length > 4 && (
                          <span className="text-[8px] font-black text-orange-600">+{dayAssignments.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 space-y-1 overflow-hidden h-[80px]">
                    {dayAssignments.slice(0, 3).map((a, i) => (
                      <div key={i} className="text-[9px] font-bold truncate bg-zinc-100 dark:bg-zinc-800/50 px-1.5 py-1 rounded text-zinc-600 dark:text-zinc-400 border-l-2 border-orange-500">
                        {a.member_name}: {a.routine_name}
                      </div>
                    ))}
                    {dayAssignments.length > 3 && (
                      <div className="text-[8px] font-black uppercase text-zinc-400 text-center cursor-help" title={dayAssignments.slice(3).map((a) => a.member_name).join(', ')}>
                        + {dayAssignments.length - 3} más
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-orange-500 pointer-events-none rounded-sm"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: week agenda list */}
        <div className="lg:hidden space-y-2">
          {calendarDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayAssignments = assignmentsByDay[dateStr] || [];
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const isToday = isSameDay(day, new Date());
            const isOtherMonth = !isSameMonth(day, currentDate);

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left
                  ${isSelected ? 'border-orange-500 bg-orange-500/5 dark:bg-orange-500/10' : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900'}
                  ${isOtherMonth ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-black ${isToday ? 'bg-orange-500 text-white h-8 w-8 rounded-full flex items-center justify-center' : 'text-zinc-900 dark:text-white'}`}>
                    {format(day, 'd')}
                  </span>
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    {format(day, 'EEE', { locale: es })}
                  </span>
                </div>
                {dayAssignments.length > 0 ? (
                  <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-500/10 px-2 py-1 rounded-full">
                    {dayAssignments.length} asignación{dayAssignments.length !== 1 ? 'es' : ''}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Sin actividad</span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {selectedDay && (
        <Card padding="md" rounded="3xl" className="animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">
                DETALLES DEL <span className="text-orange-500">{format(selectedDay, 'dd MMMM', { locale: es }).toUpperCase()}</span>
              </h3>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Actividad deportiva programada</p>
            </div>
            <button
              onClick={() => onAssignOnDay(format(selectedDay, 'yyyy-MM-dd'))}
              className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105"
            >
              <UserPlus className="h-4 w-4" />
              Asignar en este día
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedDayAssignments.map((a, i) => (
              <div key={i} className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                  <Play className="h-5 w-5 flex-shrink-0" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-sm text-zinc-900 dark:text-white truncate uppercase tracking-tight leading-none">{a.member_name}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-1 truncate">
                    {a.routine_name} • <span className={a.difficulty === 'Advanced' ? 'text-red-500' : 'text-emerald-500'}>{formatDifficulty(a.difficulty)}</span>
                  </p>
                </div>
              </div>
            ))}
            {selectedDayAssignments.length === 0 && (
              <div className="col-span-full py-12 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl">
                No hay asignaciones para este día
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
