import { format, subDays, isSameDay } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { formatLocalDate } from '../../lib/nutrition';
import { cn } from '../../lib/utils';

interface WeekDateStripProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  maxDate?: string;
  days?: number;
  className?: string;
}

/**
 * Compact week strip — centered cluster, not stretched.
 * Selected = solid disc; today (if not selected) gets a soft ring.
 */
export function WeekDateStrip({
  selectedDate,
  onSelect,
  maxDate,
  days = 7,
  className,
}: WeekDateStripProps) {
  const today = formatLocalDate(new Date());
  const end = maxDate && maxDate < today ? maxDate : today;
  const endDate = new Date(end + 'T12:00:00');
  const todayDate = new Date(today + 'T12:00:00');

  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(formatLocalDate(subDays(endDate, i)));
  }

  return (
    <div className={cn('relative', className)}>
      <div
        className="flex justify-center overflow-x-auto px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="listbox"
        aria-label="Días de la semana"
      >
        <div className="inline-flex items-end gap-1.5 sm:gap-2">
          {dates.map((date) => {
            const d = new Date(date + 'T12:00:00');
            const selected = date === selectedDate;
            const isToday = isSameDay(d, todayDate);
            const dayLetter = format(d, 'EEEEEE', { locale: es }).toUpperCase();
            const dayNum = format(d, 'd');

            return (
              <button
                key={date}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(date)}
                className="group flex w-10 shrink-0 flex-col items-center gap-1.5 sm:w-11"
              >
                <span
                  className={cn(
                    'text-small font-medium tracking-wide transition-colors',
                    selected ? 'text-text' : 'text-text-muted group-hover:text-text-secondary'
                  )}
                >
                  {dayLetter}
                </span>
                <span
                  className={cn(
                    'relative flex h-8 w-8 items-center justify-center text-sm font-semibold tabular-nums transition-colors duration-200',
                    selected
                      ? 'bg-brand ring-brand/30 ring-offset-bg rounded-full text-white ring-2 ring-offset-2'
                      : isToday
                        ? 'text-text ring-border rounded-full ring-1 ring-inset'
                        : 'text-text-secondary rounded-full'
                  )}
                >
                  {dayNum}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate !== today && (
        <div className="mt-0.5 flex justify-center">
          <button
            type="button"
            onClick={() => onSelect(today)}
            className="text-brand text-small font-semibold tracking-wide"
          >
            Ir a hoy
          </button>
        </div>
      )}
    </div>
  );
}
