import React, { useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, Play, UserPlus } from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
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

  const mobileWeekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    return calendarDays.filter((d) => isWithinInterval(d, { start: weekStart, end: weekEnd }));
  }, [calendarDays, currentDate]);

  return (
    <div className="page-stack-tight">
      <Card padding="md" rounded="xl">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white capitalize">
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

        {/* Desktop month grid — xl+ only; tablets use week agenda below */}
        <div className="hidden xl:block scroll-x-bleed">
          <div className="grid grid-cols-7 gap-px min-w-[640px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-inner">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <div key={day} className="bg-zinc-50 dark:bg-zinc-900/50 py-3 text-center text-xs font-semibold text-zinc-400">
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
                    <span className={`text-xs font-semibold ${isToday ? 'bg-orange-500 text-white h-6 w-6 rounded-full flex items-center justify-center' : 'text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>
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
                          <span className="text-[10px] font-semibold text-orange-600">+{dayAssignments.length - 4}</span>
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
                      <div className="text-[10px] font-medium text-zinc-400 text-center cursor-help" title={dayAssignments.slice(3).map((a) => a.member_name).join(', ')}>
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

        {/* Tablet & mobile: current week agenda */}
        <div className="xl:hidden space-y-2">
          <p className="text-xs font-medium text-zinc-500 mb-2">Semana actual</p>
          {mobileWeekDays.map((day) => {
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
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left min-h-[var(--touch-comfort)]
                  ${isSelected ? 'border-orange-500 bg-orange-500/5 dark:bg-orange-500/10' : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900'}
                  ${isOtherMonth ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${isToday ? 'bg-orange-500 text-white h-8 w-8 rounded-full flex items-center justify-center' : 'text-zinc-900 dark:text-white'}`}>
                    {format(day, 'd')}
                  </span>
                  <span className="text-xs font-medium text-zinc-500 capitalize">
                    {format(day, 'EEE', { locale: es })}
                  </span>
                </div>
                {dayAssignments.length > 0 ? (
                  <span className="text-xs font-semibold text-orange-600 bg-orange-500/10 px-2.5 py-1 rounded-full">
                    {dayAssignments.length} asignación{dayAssignments.length !== 1 ? 'es' : ''}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-400">Sin actividad</span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {selectedDay && (
        <Card padding="md" rounded="2xl" className="animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white capitalize">
                {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
              </h3>
              <p className="text-xs text-zinc-500 mt-1">Asignaciones programadas</p>
            </div>
            <Button size="sm" onClick={() => onAssignOnDay(format(selectedDay, 'yyyy-MM-dd'))}>
              <UserPlus className="h-4 w-4" />
              Asignar
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedDayAssignments.map((a, i) => (
              <div key={i} className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                  <Play className="h-5 w-5 flex-shrink-0" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">{a.member_name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">
                    {a.routine_name} · <span className={a.difficulty === 'Advanced' ? 'text-red-500' : 'text-emerald-500'}>{formatDifficulty(a.difficulty)}</span>
                  </p>
                </div>
              </div>
            ))}
            {selectedDayAssignments.length === 0 && (
              <div className="col-span-full py-10 text-center text-zinc-400 text-sm border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl">
                No hay asignaciones para este día
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
