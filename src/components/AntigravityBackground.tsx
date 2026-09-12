import { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function AntigravityBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { authBgEffect } = useTheme();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    const initialX = window.innerWidth / 2;
    const initialY = window.innerHeight / 2;
    let targetX = initialX;
    let targetY = initialY;
    let currentX = initialX;
    let currentY = initialY;
    let animId = 0;
    let isMoving = false;

    // Set initial position statically
    el.style.setProperty('--antigravity-x', `${initialX}px`);
    el.style.setProperty('--antigravity-y', `${initialY}px`);

    if (prefersReducedMotion) {
      return;
    }

    // Physics lerp loop that runs ON-DEMAND only when the mouse is moving
    const updateMotion = () => {
      const dx = targetX - currentX;
      const dy = targetY - currentY;

      if (Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2) {
        currentX = targetX;
        currentY = targetY;
        el.style.setProperty('--antigravity-x', `${currentX.toFixed(1)}px`);
        el.style.setProperty('--antigravity-y', `${currentY.toFixed(1)}px`);
        isMoving = false;
        return;
      }

      currentX += dx * 0.08;
      currentY += dy * 0.08;

      el.style.setProperty('--antigravity-x', `${currentX.toFixed(1)}px`);
      el.style.setProperty('--antigravity-y', `${currentY.toFixed(1)}px`);

      animId = requestAnimationFrame(updateMotion);
    };

    const handlePointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;

      if (!isMoving) {
        isMoving = true;
        animId = requestAnimationFrame(updateMotion);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      data-mode={authBgEffect}
      className="antigravity-canvas pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* 1. Ambient depth core */}
      <div
        className={
          authBgEffect === 'theme'
            ? 'absolute top-1/2 left-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-brand)_15%,transparent)_0%,transparent_70%)] blur-[100px]'
            : 'absolute top-1/2 left-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-amber-500/10 via-cyan-500/10 to-transparent blur-[120px]'
        }
      />

      {/* 2. Secondary halo following cursor */}
      <div className="antigravity-secondary-glow absolute inset-0" />

      {/* 3. Primary spotlight following cursor */}
      <div className="antigravity-primary-spotlight absolute inset-0" />

      {/* 4. Mathematical dot matrix revealed by the cursor light flashlight */}
      <div className="antigravity-dot-grid absolute inset-0" />

      {/* 5. Edge vignette to keep focus anchored */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_70%,rgba(0,0,0,0.85)_100%)]" />
    </div>
  );
}
