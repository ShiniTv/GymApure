import React, { useMemo, useRef, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, UserPlus, Dumbbell, Users } from 'lucide-react';
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
  differenceInCalendarDays,
} from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { Button, Badge } from '../../components/ui';
import { formatDifficulty, cn } from '../../lib/utils';
import type { CalendarAssignment } from './types';

export const ASSIGN_DND_MIME = 'application/x-gymapure-assign';

export interface AssignDragPayload {
  kind: 'routine' | 'member';
  id: number;
}

export interface CalendarPaletteRoutine {
  id: number;
  name: string;
}

export interface CalendarPaletteMember {
  id: number;
  full_name: string;
}

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
  /** Desktop drag sources for assign-on-drop */
  paletteRoutines?: CalendarPaletteRoutine[];
  paletteMembers?: CalendarPaletteMember[];
  onDropAssign?: (dateStr: string, payload: AssignDragPayload) => void;
}

function difficultyVariant(difficulty: string): 'danger' | 'warning' | 'success' {
  if (difficulty === 'Advanced') return 'danger';
  if (difficulty === 'Intermediate') return 'warning';
  return 'success';
}

const SWIPE_THRESHOLD_PX = 48;
const LIGHT =
  'rounded-xl border border-zinc-200/70 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-900/50';

function parseAssignDrag(dataTransfer: DataTransfer): AssignDragPayload | null {
  const raw = dataTransfer.getData(ASSIGN_DND_MIME) || dataTransfer.getData('text/plain');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AssignDragPayload;
    if (
      (parsed.kind === 'routine' || parsed.kind === 'member') &&
      typeof parsed.id === 'number' &&
      Number.isFinite(parsed.id)
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function setAssignDrag(dataTransfer: DataTransfer, payload: AssignDragPayload) {
  const raw = JSON.stringify(payload);
  dataTransfer.setData(ASSIGN_DND_MIME, raw);
  dataTransfer.setData('text/plain', raw);
  dataTransfer.effectAllowed = 'copy';
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
  onNavigateToMemberRoutines,
  paletteRoutines = [],
  paletteMembers = [],
  onDropAssign,
}: RoutinesCalendarViewProps) {
  const touchStartX = useRef<number | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const canDrop = Boolean(onDropAssign);

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
    const next = direction === 'next' ? addDays(currentDate, 7) : subDays(currentDate, 7);
    setCurrentDate(next);
    const nextWeekStart = startOfWeek(next, { weekStartsOn: 1 });
    const nextWeekEnd = endOfWeek(next, { weekStartsOn: 1 });
    const today = new Date();
    if (isWithinInterval(today, { start: nextWeekStart, end: nextWeekEnd })) {
      setSelectedDay(today);
      return;
    }
    if (selectedDay) {
      const offset = Math.min(6, Math.max(0, differenceInCalendarDays(selectedDay, weekStart)));
      setSelectedDay(addDays(nextWeekStart, offset));
      return;
    }
    setSelectedDay(nextWeekStart);
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

  const handleDayDragOver = (e: React.DragEvent, dateStr: string) => {
    if (!canDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverDay(dateStr);
  };

  const handleDayDrop = (e: React.DragEvent, dateStr: string) => {
    if (!canDrop || !onDropAssign) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverDay(null);
    const payload = parseAssignDrag(e.dataTransfer);
    if (payload) onDropAssign(dateStr, payload);
  };

  const showPalette = canDrop && (paletteRoutines.length > 0 || paletteMembers.length > 0);

  return (
    <div className="space-y-2.5">
      {/* Header: month label + week nav + ghost assign */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900 capitalize dark:text-white">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {isCurrentWeek
              ? 'Semana actual'
              : `Semana del ${format(weekStart, 'd MMM', { locale: es })}`}
            {' · '}
            {weekAssignmentCount} asignación{weekAssignmentCount !== 1 ? 'es' : ''}
            {showPalette ? (
              <span className="hidden text-zinc-400 lg:inline">
                {' '}
                · Arrastra rutina o miembro a un día
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => shiftWeek('prev')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => shiftWeek('next')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Semana siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 shrink-0 p-0"
            onClick={onAssignDirect}
            aria-label="Asignar rutina"
            title="Asignar rutina"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showPalette ? (
        <div className={cn(LIGHT, 'hidden space-y-2 p-2.5 lg:block')}>
          <p className="px-0.5 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Arrastra a un día para asignar
          </p>
          <div className="flex flex-wrap gap-1.5">
            {paletteRoutines.slice(0, 8).map((r) => (
              <button
                key={`r-${r.id}`}
                type="button"
                draggable
                onDragStart={(e) => {
                  setAssignDrag(e.dataTransfer, { kind: 'routine', id: r.id });
                }}
                className="border-brand/20 bg-brand/5 inline-flex max-w-[10rem] cursor-grab items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold text-zinc-800 active:cursor-grabbing dark:text-zinc-100"
                title={`Arrastrar rutina «${r.name}»`}
              >
                <Dumbbell className="text-brand h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{r.name}</span>
              </button>
            ))}
            {paletteMembers.slice(0, 8).map((m) => (
              <button
                key={`m-${m.id}`}
                type="button"
                draggable
                onDragStart={(e) => {
                  setAssignDrag(e.dataTransfer, { kind: 'member', id: m.id });
                }}
                className="inline-flex max-w-[10rem] cursor-grab items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200"
                title={`Arrastrar miembro «${m.full_name}»`}
              >
                <Users className="h-3 w-3 shrink-0 text-zinc-400" aria-hidden />
                <span className="truncate">{m.full_name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Desktop month grid — xl+ */}
      <div className={cn(LIGHT, 'hidden overflow-hidden xl:block')}>
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="scroll-x-bleed">
          <div className="grid min-w-[640px] grid-cols-7 gap-px bg-zinc-100 dark:bg-zinc-800">
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
                  onDragOver={(e) => handleDayDragOver(e, dateStr)}
                  onDragLeave={() => {
                    setDragOverDay((prev) => (prev === dateStr ? null : prev));
                  }}
                  onDrop={(e) => handleDayDrop(e, dateStr)}
                  className={cn(
                    'group relative min-h-[100px] cursor-pointer border-t border-l border-zinc-100 bg-white p-1.5 transition-all dark:border-zinc-800 dark:bg-zinc-900',
                    isOtherMonth && 'opacity-30',
                    isSelected && 'bg-brand/5 dark:bg-brand/10',
                    dragOverDay === dateStr && 'bg-brand/15 ring-brand/40 ring-2 ring-inset'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        'text-[10px] font-semibold',
                        isToday
                          ? 'brand-solid flex h-5 w-5 items-center justify-center rounded-full'
                          : 'text-zinc-400 group-hover:text-zinc-900 dark:text-zinc-300 dark:group-hover:text-white'
                      )}
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
                      <div className="text-center text-[9px] font-medium text-zinc-400">
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
      </div>

      {/* Mobile / tablet: horizontal week strip */}
      <div
        className={cn(LIGHT, 'touch-pan-y p-2 xl:hidden')}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid grid-cols-7 gap-1">
          {mobileWeekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const count = assignmentsByDay[dateStr]?.length ?? 0;
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const isToday = isSameDay(day, new Date());
            const isOtherMonth = !isSameMonth(day, currentDate);

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDay(day)}
                onDragOver={(e) => handleDayDragOver(e, dateStr)}
                onDragLeave={() => {
                  setDragOverDay((prev) => (prev === dateStr ? null : prev));
                }}
                onDrop={(e) => handleDayDrop(e, dateStr)}
                className={cn(
                  'flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 transition-colors',
                  isSelected
                    ? 'bg-brand/10 text-brand ring-brand/30 ring-1'
                    : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50',
                  isOtherMonth && 'opacity-45',
                  dragOverDay === dateStr && 'bg-brand/20 ring-brand/50 ring-2'
                )}
                aria-pressed={isSelected || undefined}
                aria-label={`${format(day, 'EEEE d', { locale: es })}${count ? `, ${count} asignaciones` : ''}`}
              >
                <span className="text-[9px] font-medium tracking-wide uppercase opacity-70">
                  {format(day, 'EEE', { locale: es }).slice(0, 3)}
                </span>
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                    isToday && !isSelected && 'brand-solid',
                    isSelected && !isToday && 'font-bold'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {count > 0 ? (
                  <span className="bg-brand h-1 w-1 rounded-full" aria-hidden />
                ) : (
                  <span className="h-1 w-1" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div
          className={cn(
            LIGHT,
            'animate-in fade-in p-3 duration-150',
            dragOverDay === format(selectedDay, 'yyyy-MM-dd') && 'ring-brand/40 ring-2'
          )}
          onDragOver={(e) => handleDayDragOver(e, format(selectedDay, 'yyyy-MM-dd'))}
          onDragLeave={() => {
            const dateStr = format(selectedDay, 'yyyy-MM-dd');
            setDragOverDay((prev) => (prev === dateStr ? null : prev));
          }}
          onDrop={(e) => handleDayDrop(e, format(selectedDay, 'yyyy-MM-dd'))}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-zinc-900 capitalize dark:text-white">
                {format(selectedDay, 'EEE d MMM', { locale: es })}
              </h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {selectedDayAssignments.length} asignación
                {selectedDayAssignments.length !== 1 ? 'es' : ''}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 w-9 shrink-0 p-0"
              onClick={() => onAssignOnDay(format(selectedDay, 'yyyy-MM-dd'))}
              aria-label="Asignar en este día"
              title="Asignar en este día"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>

          {selectedDayAssignments.length > 0 ? (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {selectedDayAssignments.map((a, i) => (
                <li key={`${a.member_id}-${a.routine_name}-${i}`}>
                  <button
                    type="button"
                    onClick={() => onNavigateToMemberRoutines(a.member_id)}
                    className="flex w-full items-center gap-2.5 py-2 text-left transition-colors first:pt-0 last:pb-0 hover:opacity-90"
                  >
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
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-zinc-200 py-5 text-center text-xs text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
              Sin asignaciones este día
            </p>
          )}
        </div>
      )}
    </div>
  );
}
