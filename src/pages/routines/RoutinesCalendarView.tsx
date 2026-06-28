import React, { useMemo, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight, Play, UserPlus } from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  addDays,
  subDays,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { Button, Card, Badge } from '../../components/ui';
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
  onNavigateToMemberRoutines: (memberId: number) => void;
}

function difficultyVariant(difficulty: string): 'danger' | 'warning' | 'success' {
  if (difficulty === 'Advanced') return 'danger';
  if (difficulty === 'Intermediate') return 'warning';
  return 'success';
}

const SWIPE_THRESHOLD_PX = 48;

export function RoutinesCalendarView({
  currentDate,
  setCurrentDate,
  selectedDay,
  setSelectedDay,
  calendarDays,
  assignmentsByDay,
  onAssignDirect,
  onAssignOnDay,
  onNavigateToMemberRoutines,
}: RoutinesCalendarViewProps) {
  const touchStartX = useRef<number | null>(null);

  const selectedDayStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedDayAssignments = selectedDayStr ? (assignmentsByDay[selectedDayStr] || []) : [];

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));

  const mobileWeekDays = useMemo(() => {
    return calendarDays.filter((d) => isWithinInterval(d, { start: weekStart, end: weekEnd }));
  }, [calendarDays, weekStart, weekEnd]);

  const weekAssignmentCount = mobileWeekDays.reduce(
    (sum, day) => sum + (assignmentsByDay[format(day, 'yyyy-MM-dd')]?.length ?? 0),
    0
  );

  const shiftWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'next' ? addDays(currentDate, 7) : subDays(currentDate, 7));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const deltaX = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
    shiftWeek(deltaX < 0 ? 'next' : 'prev');
  };

  return (
    <div className="space-y-2.5">
      <Card padding="sm" rounded="xl">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white capitalize truncate">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </h2>
            <div className="flex items-center shrink-0 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="h-8 w-8 inline-flex items-center justify-center hover:bg-white dark:hover:bg-zinc-700 rounded-md text-zinc-500 transition-colors"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="h-8 w-8 inline-flex items-center justify-center hover:bg-white dark:hover:bg-zinc-700 rounded-md text-zinc-500 transition-colors"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <Button
            size="sm"
            className="h-9 w-9 shrink-0 p-0"
            onClick={onAssignDirect}
            aria-label="Asignar directo"
            title="Asignar directo"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Desktop month grid — xl+ only; tablets use week agenda below */}
        <div className="hidden xl:block scroll-x-bleed">
          <div className="grid grid-cols-7 gap-px min-w-[640px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <div key={day} className="bg-zinc-50 dark:bg-zinc-900/50 py-2 text-center text-[10px] font-semibold text-zinc-400">
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
                  className={`min-h-[100px] p-1.5 bg-white dark:bg-zinc-900 transition-all cursor-pointer border-t border-l border-zinc-100 dark:border-zinc-800 relative group
                    ${isOtherMonth ? 'opacity-30' : 'opacity-100'}
                    ${isSelected ? 'bg-brand/5 dark:bg-brand/10' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <span
                      className={`text-[10px] font-semibold ${
                        isToday
                          ? 'brand-solid h-5 w-5 rounded-full flex items-center justify-center'
                          : 'text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayAssignments.length > 0 && (
                      <div className="flex items-center gap-0.5">
                        {dayAssignments.slice(0, 4).map((_, dotIdx) => (
                          <span
                            key={dotIdx}
                            className="h-1.5 w-1.5 rounded-full bg-brand"
                            title={`${dayAssignments.length} asignación(es)`}
                          />
                        ))}
                        {dayAssignments.length > 4 && (
                          <span className="text-[9px] font-semibold text-brand">+{dayAssignments.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-1.5 space-y-0.5 overflow-hidden h-[68px]">
                    {dayAssignments.slice(0, 3).map((a, i) => (
                      <button
                        key={`${a.member_id}-${a.routine_name}-${i}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToMemberRoutines(a.member_id);
                        }}
                        className="w-full text-left text-[8px] font-bold truncate bg-zinc-100 dark:bg-zinc-800/50 px-1 py-0.5 rounded text-zinc-600 dark:text-zinc-400 border-l-2 border-brand hover:bg-brand/10 transition-colors"
                        title={`${a.member_name}: ${a.routine_name}`}
                      >
                        {a.member_name}: {a.routine_name}
                      </button>
                    ))}
                    {dayAssignments.length > 3 && (
                      <div
                        className="text-[9px] font-medium text-zinc-400 text-center cursor-help"
                        title={dayAssignments.slice(3).map((a) => a.member_name).join(', ')}
                      >
                        + {dayAssignments.length - 3} más
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-brand pointer-events-none rounded-sm" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tablet & mobile: week agenda with swipe */}
        <div
          className="xl:hidden touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
            <p className="text-[11px] text-zinc-500 min-w-0 truncate">
              {isCurrentWeek ? 'Semana actual' : `Semana del ${format(weekStart, 'd MMM', { locale: es })}`}
              {' · '}
              {weekAssignmentCount} asignación{weekAssignmentCount !== 1 ? 'es' : ''}
            </p>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => shiftWeek('prev')}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Semana anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => shiftWeek('next')}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Semana siguiente"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-zinc-400 px-0.5 mb-1.5">Desliza horizontalmente para cambiar semana</p>
          <div className="space-y-1">
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
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border transition-colors text-left min-h-[44px]
                    ${isSelected ? 'border-brand bg-brand/5 dark:bg-brand/10' : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50'}
                    ${isToday && !isSelected ? 'ring-1 ring-brand/30' : ''}
                    ${isOtherMonth ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-xs font-semibold shrink-0 ${
                        isToday
                          ? 'brand-solid h-7 w-7 rounded-full flex items-center justify-center'
                          : 'text-zinc-900 dark:text-white w-7 text-center tabular-nums'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    <span className="text-[10px] font-medium text-zinc-500 capitalize truncate">
                      {format(day, 'EEE', { locale: es })}
                    </span>
                  </div>
                  {dayAssignments.length > 0 ? (
                    <Badge variant="warning" className="shrink-0 text-[9px] px-1.5 py-0">
                      {dayAssignments.length}
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-zinc-400 shrink-0">—</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {selectedDay && (
        <Card padding="sm" rounded="xl" className="animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white capitalize truncate">
                {format(selectedDay, 'EEE d MMM', { locale: es })}
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {selectedDayAssignments.length} asignación{selectedDayAssignments.length !== 1 ? 'es' : ''}
              </p>
            </div>
            <Button
              size="sm"
              className="h-9 w-9 shrink-0 p-0"
              onClick={() => onAssignOnDay(format(selectedDay, 'yyyy-MM-dd'))}
              aria-label="Asignar en este día"
              title="Asignar"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {selectedDayAssignments.map((a, i) => (
              <button
                key={`${a.member_id}-${a.routine_name}-${i}`}
                type="button"
                onClick={() => onNavigateToMemberRoutines(a.member_id)}
                className="flex items-center gap-2.5 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-2 rounded-lg border border-zinc-100 dark:border-zinc-800 text-left hover:border-brand/40 hover:bg-brand/5 transition-colors w-full"
              >
                <div className="h-8 w-8 shrink-0 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                  <Play className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-zinc-900 dark:text-white truncate">{a.member_name}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{a.routine_name}</p>
                </div>
                <Badge variant={difficultyVariant(a.difficulty)} className="shrink-0 text-[9px] px-1.5 py-0">
                  {formatDifficulty(a.difficulty)}
                </Badge>
              </button>
            ))}
            {selectedDayAssignments.length === 0 && (
              <div className="col-span-full py-6 text-center text-zinc-400 text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                Sin asignaciones este día
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
