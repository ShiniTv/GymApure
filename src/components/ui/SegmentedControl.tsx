import { useCallback, useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  accent?: 'brand' | 'check-out';
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  /** Stretch tabs to fill the container width */
  fullWidth?: boolean;
  variant?: 'default' | 'kiosk' | 'compact';
  /** Horizontal scroll — better for many tabs on mobile */
  layout?: 'wrap' | 'scroll';
}

const accentActive: Record<'brand' | 'check-out', string> = {
  brand: 'brand-solid shadow-lg shadow-zinc-900/10',
  'check-out':
    'bg-[var(--color-check-out)] text-white shadow-lg shadow-[var(--color-check-out)]/20',
};

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  fullWidth = false,
  variant = 'default',
  layout = 'wrap',
}: SegmentedControlProps<T>) {
  const isKiosk = variant === 'kiosk';
  const isCompact = variant === 'compact';
  const scroll = layout === 'scroll' && !isKiosk;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !scroll) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(max > 2 && el.scrollLeft < max - 2);
  }, [scroll]);

  useEffect(() => {
    if (!scroll) return;
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollEdges();
    const onScroll = () => updateScrollEdges();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollEdges) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro?.disconnect();
    };
  }, [scroll, options.length, updateScrollEdges]);

  useEffect(() => {
    if (!scroll) return;
    const el = scrollerRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
    // After scrollIntoView settles, refresh fades
    const t = window.setTimeout(updateScrollEdges, 280);
    return () => window.clearTimeout(t);
  }, [value, scroll, updateScrollEdges]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      let nextIndex: number | null = null;

      if (e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % options.length;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + options.length) % options.length;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        const nextOption = options[nextIndex];
        if (nextOption) {
          onChange(nextOption.value);
        }
      }
    },
    [options, onChange]
  );

  const tablist = (
    <div
      ref={scrollerRef}
      className={cn(
        isKiosk
          ? 'flex gap-2 rounded-2xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900'
          : scroll
            ? 'flex w-full gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth pr-5 pb-0.5 [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
            : cn(
                'inline-flex flex-wrap gap-0.5 rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800',
                fullWidth ? 'w-full' : 'w-fit max-w-full'
              ),
        !scroll && className
      )}
      role="tablist"
    >
      {options.map((option, index) => {
        const active = value === option.value;
        const accent = option.accent ?? 'brand';
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'focus-visible:ring-brand/50 flex items-center justify-center gap-2 transition-all focus-visible:ring-2 focus-visible:outline-none',
              fullWidth && !scroll && 'flex-1',
              isKiosk
                ? cn(
                    'rounded-xl py-3 text-xs font-semibold',
                    active
                      ? accentActive[accent]
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                  )
                : scroll
                  ? cn(
                      'h-7 shrink-0 rounded-full px-2.5 text-[11px] font-semibold',
                      active
                        ? 'bg-brand/10 text-brand'
                        : 'bg-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                    )
                  : cn(
                      isCompact
                        ? 'min-h-9 rounded-md px-2.5 py-1.5 text-[11px] font-semibold'
                        : 'min-h-[var(--touch-min)] rounded-md px-3 py-1.5 text-xs font-bold',
                      active
                        ? 'text-brand dark:text-brand bg-white shadow-sm dark:bg-zinc-700'
                        : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                    )
            )}
          >
            {Icon && (
              <Icon className={cn('shrink-0', isCompact || scroll ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
            )}
            <span>{option.label}</span>
            {option.count != null && option.count > 0 && (
              <span
                className={cn(
                  'min-w-[1.25rem] rounded-md px-1.5 py-0.5 text-[10px] leading-none font-bold tabular-nums',
                  active
                    ? 'bg-brand/15 text-brand dark:text-brand'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  if (!scroll) return tablist;

  return (
    <div className={cn('relative w-full', className)}>
      {canScrollLeft && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-6 bg-gradient-to-r from-zinc-50 to-transparent dark:from-zinc-950"
        />
      )}
      {canScrollRight && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-8 bg-gradient-to-l from-zinc-50 to-transparent dark:from-zinc-950"
        />
      )}
      {tablist}
    </div>
  );
}
