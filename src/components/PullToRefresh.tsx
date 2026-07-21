import { type ReactNode } from 'react';
import { cn } from '../lib/utils';

interface PullToRefreshContainerProps {
  pullDistance: number;
  isRefreshing: boolean;
  children: ReactNode;
  className?: string;
}

export function PullToRefreshContainer({
  pullDistance,
  isRefreshing,
  children,
  className,
}: PullToRefreshContainerProps) {
  return (
    <div className={cn('relative', className)}>
      <div
        className="pointer-events-none absolute right-0 left-0 z-10 flex items-center justify-center"
        style={{
          top: Math.max(-8, pullDistance - 48),
          opacity: Math.min(pullDistance / 50, 1),
          transition: isRefreshing ? 'top 0.3s ease, opacity 0.3s ease' : 'none',
        }}
      >
        {isRefreshing ? (
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <svg className="text-brand h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Actualizando…
          </div>
        ) : (
          <div
            className="text-zinc-400 dark:text-zinc-500"
            style={{ transform: `rotate(${String(rot(pullDistance))}deg)` }}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </div>
        )}
      </div>
      <div
        className={cn(isRefreshing && 'overflow-hidden')}
        style={
          pullDistance > 0 || isRefreshing
            ? {
                // Prefer margin over transform so position:sticky children keep working.
                marginTop: isRefreshing ? 40 : Math.min(pullDistance, THRESHOLD),
                transition: isRefreshing
                  ? 'margin-top 0.3s ease'
                  : pullDistance > 0
                    ? 'none'
                    : 'margin-top 0.3s ease',
              }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}

const THRESHOLD = 80;
const rot = (d: number) => Math.min(d / (180 / THRESHOLD), 180);
