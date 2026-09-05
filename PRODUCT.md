# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Miembros del gimnasio** (primario en móvil): entrenan con rutinas asignadas, nutrición, mensajes con su entrenador, check-in y perfil. Usan la app entre series, con una mano, a menudo en dark mode.
- **Entrenadores**: asignan y ajustan rutinas/nutrición, hablan con miembros, ven progreso. Desktop + móvil.
- **Recepción**: acceso/check-in, miembros, pagos, mensajes. Móvil y tablet (mostrador / modo tablet).
- **Admin**: operación del gym (equipamiento, finanzas, settings, miembros). Sobre todo desktop; móvil con sheet "Más".

## Product Purpose

GymApure es el sistema operativo del gimnasio: membresías, acceso, entrenamiento, nutrición, pagos y mensajería en un solo producto web (PWA-friendly), no un marketplace genérico de fitness.

Éxito = el staff opera el día a día sin fricción y el miembro abre la app y entrena sin buscar dónde está el botón.

**Principio de autonomía guiada:** el cliente elige y arranca (rutina de hoy, plantillas del gym, sustituciones); el entrenador coachea, revisa y ajusta — no prescribe cada detalle antes de que el miembro pueda actuar.

## Positioning

Software de gym de barrio / cadena local con roles reales (member, trainer, reception, admin), datos en español (VE: cédula, tipo de cambio), y flujos de piso (check-in, workout activo, bottom nav) — no un clon de “fitness tracker” B2C.

## Operating Context

- Desarrollo y demos sobre `.env.dev` + seed demo; producción aislada.
- Viewports críticos: mobile 390×844 (member/reception), tablet 834×1194 (recepción), desktop ≥1280 (admin/trainer).
- Copy UI en **español**; evitar “Dashboard” / “Kiosk” en chrome principal (usar Panel/Inicio, mostrador / modo tablet).
- Auth por roles; workouts activos ocultan bottom nav; sheets “Más” sustituyen hamburger en móvil.

## Capabilities and Constraints

- Stack: React 19 + Vite + Tailwind, Express, Supabase/Postgres, TypeScript strict.
- Temas light/dark + paletas de marca seleccionables (`src/config/themes.ts`).
- Tokens y tipografía en `src/index.css` y `src/lib/typography.ts`; UI primitives en `src/components/ui/`.
- QA UX documentado en `docs/qa/UX-QA.md`; Playwright en `tests/ux` (`npm run test:ux:browser`).
- No inventar testimonios, precios ni claims de marketing no existentes en el repo.

## Brand Commitments

- Nombre de producto: **GymApure**.
- Dirección visual: **Apple Operate** — tipografía de sistema (SF Pro / Segoe), escala equilibrada (títulos ~20px, no marketing-large), sidebar ~224px; superficies calmadas y bordes hairline; acento de marca por defecto azul `#0c98ff` (palette sky), no púrpura genérico como identidad.
- Figma móvil de referencia: Mobile App UI (`WwEtNcIqpDNxYZx4ZpiE7m`).
- Touch targets: `--touch-min` 44px / `--touch-comfort` 48px (piso / CTAs).
- Idioma de interfaz: español.

## Evidence on Hand

- Design tokens y temas reales en código (`src/index.css`, `src/config/themes.ts`).
- Checklists UX/QA: `docs/qa/UX-QA.md`, `docs/qa/QA-VISUAL-CHECKLIST.md`.
- Demo credentials / flujos: `docs/TESTING.md`.
- No hay `PRODUCT.md`/`DESIGN.md` previos; este archivo es la verdad de producto para agentes de diseño.

## Product Principles

1. **Un trabajo por pantalla** — el miembro entrena; recepción registra acceso; admin opera. No meter marketing ni stats decorativos en el primer viewport operativo.
2. **Móvil primero para member/reception** — bottom nav icon-only con `aria-label`; sin hamburger; clearance sobre la isla.
3. **Apple Operate, no Linear denso** — tipografía profesional, gutters amplios en desktop, chrome legible; sheets móviles suaves; no “AI slop” (purple gradients, cards por doquier, glow).
4. **Copy ES y roles** — terminología del gym local; Access Denied cuando el rol no corresponde.
5. **Motion con propósito** — page-enter / sheets / modales cortos; respetar `prefers-reduced-motion`.

## Accessibility & Inclusion

- Contraste AA para texto secondary/muted sobre superficies light y dark (documentado en tokens).
- Controles táctiles ≥44px; focus-visible rings con brand.
- Modales: Escape, trap de foco, `aria` de diálogo; sheets para acciones móviles.
