import React from 'react';
import { cn } from '../../lib/utils';
import { Flame } from 'lucide-react';

export interface FitnessRingData {
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
  bgColor?: string;
  icon?: 'workouts' | 'volume' | 'days';
}

interface FitnessRingsProps {
  size?: number;
  rings: [FitnessRingData, FitnessRingData, FitnessRingData];
  className?: string;
  showLegend?: boolean;
}

export function FitnessRings({
  size = 140,
  rings,
  className,
  showLegend = true,
}: FitnessRingsProps) {
  const strokeWidth = Math.max(size * 0.08, 9);
  const gap = 3;
  const center = size / 2;

  // Ring 1 (Outer), Ring 2 (Middle), Ring 3 (Inner)
  const r1 = center - strokeWidth / 2 - 2;
  const r2 = r1 - strokeWidth - gap;
  const r3 = r2 - strokeWidth - gap;
  const radiuses = [r1, r2, r3];

  const ringConfigs = rings.map((ring, idx) => {
    const r = radiuses[idx];
    const circ = 2 * Math.PI * r;
    const pct = ring.goal > 0 ? Math.min(Math.max(ring.value / ring.goal, 0), 1.5) : 0;
    const offset = circ - Math.min(pct, 1) * circ;
    return {
      ...ring,
      r,
      circ,
      pct,
      offset,
    };
  });

  return (
    <div
      className={cn(
        'glass-panel border-border/60 flex flex-col items-center gap-4 rounded-[var(--radius-card)] p-4 sm:flex-row sm:items-center sm:gap-6',
        className
      )}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90 transform overflow-visible"
          aria-label="Anillos de actividad física"
        >
          <defs>
            {ringConfigs.map((ring, idx) => (
              <filter
                key={`shadow-${idx}`}
                id={`ring-shadow-${idx}`}
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="1"
                  stdDeviation="2"
                  floodColor={ring.color}
                  floodOpacity="0.4"
                />
              </filter>
            ))}
          </defs>

          {/* Background track rings */}
          {ringConfigs.map((ring, idx) => (
            <circle
              key={`bg-${idx}`}
              cx={center}
              cy={center}
              r={ring.r}
              fill="none"
              stroke={ring.bgColor || ring.color}
              strokeWidth={strokeWidth}
              strokeOpacity="0.18"
            />
          ))}

          {/* Active progress rings */}
          {ringConfigs.map((ring, idx) => (
            <circle
              key={`fg-${idx}`}
              cx={center}
              cy={center}
              r={ring.r}
              fill="none"
              stroke={ring.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={ring.circ}
              strokeDashoffset={ring.offset}
              filter={`url(#ring-shadow-${idx})`}
              className="transition-[stroke-dashoffset] duration-1000 ease-out"
            />
          ))}
        </svg>

        {/* Center Glow Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Flame className="h-5 w-5 text-amber-500 opacity-90 transition-transform duration-300 hover:scale-110" />
        </div>
      </div>

      {/* Legend & Metric stats */}
      {showLegend && (
        <div className="flex w-full min-w-0 flex-1 flex-col justify-center gap-2.5 sm:w-auto">
          {ringConfigs.map((ring, idx) => {
            const percentLabel = Math.round((ring.goal > 0 ? ring.value / ring.goal : 0) * 100);
            return (
              <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full shadow-xs"
                    style={{ backgroundColor: ring.color }}
                    aria-hidden
                  />
                  <div className="truncate">
                    <span className="text-text font-medium">{ring.label}</span>
                    <span className="text-text-muted ml-1 font-normal">
                      ({ring.value}/{ring.goal} {ring.unit})
                    </span>
                  </div>
                </div>
                <span
                  className="font-mono font-semibold tabular-nums"
                  style={{ color: ring.color }}
                >
                  {percentLabel}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
