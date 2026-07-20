import { format, subDays } from 'date-fns';
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

  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(formatLocalDate(subDays(endDate, i)));
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div
        className="flex flex-1 justify-between gap-0.5 overflow-x-auto px-0.5 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:justify-center sm:gap-3 [&::-webkit-scrollbar]:hidden"
        role="listbox"
        aria-label="Días de la semana"
      >
        {dates.map((date) => {
          const d = new Date(date + 'T12:00:00');
          const selected = date === selectedDate;
          const dayLetter = format(d, 'EEEEEE', { locale: es }).toUpperCase();
          const dayNum = format(d, 'd');

          return (
            <button
              key={date}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(date)}
              className="flex min-w-[2.5rem] flex-col items-center gap-1.5 rounded-2xl px-1 py-1 transition-colors"
            >
              <span
                className={cn(
                  'text-[10px] font-semibold tracking-[0.08em]',
                  selected ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'
                )}
              >
                {dayLetter}
              </span>
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center text-sm font-bold tabular-nums transition-all',
                  selected
                    ? 'rounded-full bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900'
                    : 'rounded-full border border-dashed border-zinc-300 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300'
                )}
              >
                {dayNum}
              </span>
            </button>
          );
        })}
      </div>
      {selectedDate !== today && (
        <button
          type="button"
          onClick={() => onSelect(today)}
          className="text-brand shrink-0 px-1.5 text-xs font-semibold"
        >
          Hoy
        </button>
      )}
    </div>
  );
}
