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
  const selectedDayAssignments = selectedDayStr ? assignmentsByDay[selectedDayStr] || [] : [];

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
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-sm font-bold text-zinc-900 capitalize sm:text-base dark:text-white">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </h2>
            <div className="flex shrink-0 items-center rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white dark:text-zinc-400 dark:hover:bg-zinc-700"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white dark:text-zinc-400 dark:hover:bg-zinc-700"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <Button
            size="sm"
            className="h-9 shrink-0 gap-1.5 px-2.5 sm:px-3"
            onClick={onAssignDirect}
            aria-label="Asignar rutina"
            title="Asignar rutina"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="text-xs font-semibold">Asignar rutina</span>
          </Button>
        </div>

        {/* Desktop month grid — xl+ only; tablets use week agenda below */}
        <div className="scroll-x-bleed hidden xl:block">
          <div className="grid min-w-[640px] grid-cols-7 gap-px overflow-hidden rounded-xl border border-zinc-100 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <div
                key={day}
                className="bg-zinc-50 py-2 text-center text-[10px] font-semibold text-zinc-400 dark:bg-zinc-900/50 dark:text-zinc-300"
              >
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
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDay(day)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedDay(day);
                    }
                  }}
                  className={`group relative min-h-[100px] cursor-pointer border-t border-l border-zinc-100 bg-white p-1.5 transition-all dark:border-zinc-800 dark:bg-zinc-900 ${isOtherMonth ? 'opacity-30' : 'opacity-100'} ${isSelected ? 'bg-brand/5 dark:bg-brand/10' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`text-[10px] font-semibold ${
                        isToday
                          ? 'brand-solid flex h-5 w-5 items-center justify-center rounded-full'
                          : 'text-zinc-400 group-hover:text-zinc-900 dark:text-zinc-300 dark:group-hover:text-white'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayAssignments.length > 0 && (
                      <div className="flex items-center gap-0.5">
                        {dayAssignments.slice(0, 4).map((_, dotIdx) => (
                          <span
                            key={dotIdx}
                            className="bg-brand h-1.5 w-1.5 rounded-full"
                            title={`${dayAssignments.length} asignación(es)`}
                          />
                        ))}
                        {dayAssignments.length > 4 && (
                          <span className="text-brand text-[9px] font-semibold">
                            +{dayAssignments.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-1.5 h-[68px] space-y-0.5 overflow-hidden">
                    {dayAssignments.slice(0, 3).map((a, i) => (
                      <button
                        key={`${a.member_id}-${a.routine_name}-${i}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToMemberRoutines(a.member_id);
                        }}
                        className="border-brand hover:bg-brand/10 w-full truncate rounded border-l-2 bg-zinc-100 px-1 py-0.5 text-left text-[8px] font-bold text-zinc-600 transition-colors dark:bg-zinc-800/50 dark:text-zinc-400"
                        title={`${a.member_name}: ${a.routine_name}`}
                      >
                        {a.member_name}: {a.routine_name}
                      </button>
                    ))}
                    {dayAssignments.length > 3 && (
                      <div
                        className="cursor-help text-center text-[9px] font-medium text-zinc-400 dark:text-zinc-300"
                        title={dayAssignments
                          .slice(3)
                          .map((a) => a.member_name)
                          .join(', ')}
                      >
                        + {dayAssignments.length - 3} más
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <div className="border-brand pointer-events-none absolute inset-0 rounded-sm border-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tablet & mobile: week agenda with swipe */}
        <div
          className="touch-pan-y xl:hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
            <p className="min-w-0 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
              {isCurrentWeek
                ? 'Semana actual'
                : `Semana del ${format(weekStart, 'd MMM', { locale: es })}`}
              {' · '}
              {weekAssignmentCount} asignación{weekAssignmentCount !== 1 ? 'es' : ''}
            </p>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => shiftWeek('prev')}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                aria-label="Semana anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => shiftWeek('next')}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                aria-label="Semana siguiente"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="mb-1.5 px-0.5 text-[10px] text-zinc-400 dark:text-zinc-300">
            Desliza horizontalmente para cambiar semana
          </p>
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
                  className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${isSelected ? 'border-brand bg-brand/5 dark:bg-brand/10' : 'border-zinc-100 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50'} ${isToday && !isSelected ? 'ring-brand/30 ring-1' : ''} ${isOtherMonth ? 'opacity-50' : ''}`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`shrink-0 text-xs font-semibold ${
                        isToday
                          ? 'brand-solid flex h-7 w-7 items-center justify-center rounded-full'
                          : 'w-7 text-center text-zinc-900 tabular-nums dark:text-white'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    <span className="truncate text-[10px] font-medium text-zinc-500 capitalize dark:text-zinc-400">
                      {format(day, 'EEE', { locale: es })}
                    </span>
                  </div>
                  {dayAssignments.length > 0 ? (
                    <Badge variant="warning" className="shrink-0 px-1.5 py-0 text-[9px]">
                      {dayAssignments.length}
                    </Badge>
                  ) : (
                    <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-300">—</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {selectedDay && (
        <Card padding="sm" rounded="xl" className="animate-in slide-in-from-bottom-2 duration-200">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-zinc-900 capitalize dark:text-white">
                {format(selectedDay, 'EEE d MMM', { locale: es })}
              </h3>
              <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                {selectedDayAssignments.length} asignación
                {selectedDayAssignments.length !== 1 ? 'es' : ''}
              </p>
            </div>
            <Button
              size="sm"
              className="h-9 shrink-0 gap-1.5 px-2.5 sm:px-3"
              onClick={() => onAssignOnDay(format(selectedDay, 'yyyy-MM-dd'))}
              aria-label="Asignar en este día"
              title="Asignar rutina"
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              <span className="text-xs font-semibold">Asignar rutina</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {selectedDayAssignments.map((a, i) => (
              <button
                key={`${a.member_id}-${a.routine_name}-${i}`}
                type="button"
                onClick={() => onNavigateToMemberRoutines(a.member_id)}
                className="hover:border-brand/40 hover:bg-brand/5 flex w-full items-center gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50 px-2.5 py-2 text-left transition-colors dark:border-zinc-800 dark:bg-zinc-800/50"
              >
                <div className="bg-brand/10 text-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                  <Play className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-zinc-900 dark:text-white">
                    {a.member_name}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                    {a.routine_name}
                  </p>
                </div>
                <Badge
                  variant={difficultyVariant(a.difficulty)}
                  className="shrink-0 px-1.5 py-0 text-[9px]"
                >
                  {formatDifficulty(a.difficulty)}
                </Badge>
              </button>
            ))}
            {selectedDayAssignments.length === 0 && (
              <div className="col-span-full rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-300">
                Sin asignaciones este día
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
