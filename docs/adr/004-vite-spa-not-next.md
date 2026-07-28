# ADR-004: Vite SPA (no Next.js) para velocidad percibida

## Estado

Aceptado (julio 2026)

## Contexto

Se evaluó migrar a Next por “performance”. El producto es un panel autenticado denso (Linear-like) con shell persistente, React Query y WebSocket.

## Decisión

Permanecer en Vite SPA + Express. Optimizar con lazy routes, `manualChunks`, Virtuoso, prefetch y Lighthouse gates — no SSR/Next.

## Consecuencias

- SEO limitado a landing pública (aceptable).
- Playbook en `docs/tecnico/LINEAR-UX-Y-PERF.md` y `PERF-BASELINE.md`.
- PWA vía service worker propio (`public/sw.js`).
