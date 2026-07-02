import { useEffect, useState } from 'react';

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ec4899', '#8b5cf6'];

interface WorkoutCelebrationProps {
  active: boolean;
  onDone?: () => void;
}

export function WorkoutCelebration({ active, onDone }: WorkoutCelebrationProps) {
  const [pieces, setPieces] = useState<{ id: number; left: string; color: string; delay: string }[]>([]);

  useEffect(() => {
    if (!active) return;
    const next = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: COLORS[i % COLORS.length] ?? '#f97316',
      delay: `${Math.random() * 0.4}s`,
    }));
    setPieces(next);
    const timer = window.setTimeout(() => {
      setPieces([]);
      onDone?.();
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [active, onDone]);

  if (!active || pieces.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            backgroundColor: p.color,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
