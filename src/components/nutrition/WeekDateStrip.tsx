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
        className="flex justify-center overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="listbox"
        aria-label="Días de la semana"
      >
        <div className="inline-flex items-end gap-1.5 px-1 sm:gap-2">
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
                className="group flex w-8 flex-col items-center gap-1 sm:w-9"
              >
                <span
                  className={cn(
                    'text-[10px] font-medium tracking-wide transition-colors',
                    selected
                      ? 'text-text'
                      : 'text-text-muted group-hover:text-text-secondary'
                  )}
                >
                  {dayLetter}
                </span>
                <span
                  className={cn(
                    'relative flex h-8 w-8 items-center justify-center text-[13px] font-semibold tabular-nums transition-all duration-200',
                    selected
                      ? 'rounded-full bg-brand text-white shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-brand)_18%,transparent)]'
                      : isToday
                        ? 'rounded-full text-text ring-1 ring-border ring-inset'
                        : 'rounded-full text-text-secondary'
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
        <div className="mt-1.5 flex justify-center">
          <button
            type="button"
            onClick={() => onSelect(today)}
            className="text-brand text-[11px] font-semibold tracking-wide"
          >
            Ir a hoy
          </button>
        </div>
      )}
    </div>
  );
}
