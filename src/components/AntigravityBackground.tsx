import React, { useEffect, useRef } from 'react';

export default function AntigravityBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Detect if the user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let animId = 0;
    let isRunning = true;

    // Set initial position
    el.style.setProperty('--antigravity-x', `${targetX}px`);
    el.style.setProperty('--antigravity-y', `${targetY}px`);

    if (prefersReducedMotion) {
      return;
    }

    const handlePointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Physics lerp loop for weightless fluid motion (Antigravity feel)
    const updateMotion = () => {
      if (!isRunning) return;

      const dx = targetX - currentX;
      const dy = targetY - currentY;

      // Smooth inertia factor
      currentX += dx * 0.075;
      currentY += dy * 0.075;

      el.style.setProperty('--antigravity-x', `${currentX.toFixed(1)}px`);
      el.style.setProperty('--antigravity-y', `${currentY.toFixed(1)}px`);

      animId = requestAnimationFrame(updateMotion);
    };

    animId = requestAnimationFrame(updateMotion);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="antigravity-canvas pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* 1. Subtle static ambient depth core */}
      <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-amber-500/10 via-zinc-800/15 to-transparent blur-[120px]" />

      {/* 2. Secondary celestial violet halo following cursor */}
      <div className="antigravity-secondary-glow absolute inset-0" />

      {/* 3. Primary warm amber spotlight following cursor */}
      <div className="antigravity-primary-spotlight absolute inset-0" />

      {/* 4. Mathematical dot matrix revealed by the cursor light flashlight */}
      <div className="antigravity-dot-grid absolute inset-0" />

      {/* 5. Edge vignette to keep focus anchored */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_70%,rgba(0,0,0,0.85)_100%)]" />
    </div>
  );
}
