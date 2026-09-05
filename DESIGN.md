---
name: GymApure
description: Sistema operativo de gimnasio — shell denso Linear-like, brand sky azul, ES
colors:
  brand: '#0c98ff'
  brand-hover-light: '#0284c7'
  brand-hover-dark: '#3aadff'
  secondary: '#704ca8'
  success: '#14b05c'
  danger: '#ff5c5c'
  warning: '#b49c44'
  bg-light: '#f4f4f5'
  bg-elevated-light: '#ffffff'
  surface-light: '#ffffff'
  surface-raised-light: '#f4f4f5'
  surface-overlay-light: '#e4e4e7'
  border-light: '#e4e4e7'
  text-light: '#18181b'
  text-secondary-light: '#3f3f46'
  text-muted-light: '#52525b'
  bg-dark: '#09090b'
  bg-elevated-dark: '#111113'
  surface-dark: '#18181b'
  surface-raised-dark: '#1f1f23'
  surface-overlay-dark: '#27272a'
  border-dark: '#27272a'
  text-dark: '#fafafa'
  text-secondary-dark: '#d4d4d8'
  text-muted-dark: '#a1a1aa'
typography:
  sans:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    letterSpacing: '-0.011em'
  mono:
    fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace'
  h1:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.375rem'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '-0.025em'
  h2:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: '-0.015em'
  body:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: '-0.011em'
  small:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: '0.01em'
rounded:
  chip: '6px'
  input: '8px'
  button: '8px'
  card: '8px'
  sheet: '20px'
  pill: '9999px'
spacing:
  ds-1: '4px'
  ds-2: '8px'
  ds-3: '12px'
  ds-4: '16px'
  ds-5: '20px'
  ds-6: '24px'
  ds-8: '32px'
  touch-min: '44px'
  touch-comfort: '48px'
components:
  button-primary:
    backgroundColor: '{colors.brand}'
    textColor: '#ffffff'
    rounded: '{rounded.button}'
    padding: '12px 16px'
    height: '{spacing.touch-min}'
  button-secondary:
    backgroundColor: 'transparent'
    textColor: '{colors.text-light}'
    rounded: '{rounded.button}'
    padding: '12px 16px'
    height: '{spacing.touch-min}'
  card-surface:
    backgroundColor: '{colors.surface-light}'
    rounded: '{rounded.card}'
    padding: '{spacing.ds-4}'
  modal-panel:
    backgroundColor: '{colors.surface-light}'
    rounded: '{rounded.card}'
    padding: '{spacing.ds-4}'
---

# Design System — GymApure

## Overview

GymApure usa un chrome denso inspirado en Linear: canvas calmado, paneles con bordes hairline, bottom-nav / headers en forma de isla, y un acento de marca (default **sky** `#0c98ff`) solo en CTAs y estado — no para selección de sidebar. Light y dark son ciudadanos de primera; las paletas de `src/config/themes.ts` reescriben `--color-brand` en runtime. Fuente canónica de tokens: `src/index.css` (`@theme` + `:root` / `.dark`). Tipografía compartida: `src/lib/typography.ts`.

## Colors

- **Brand / status:** `--color-brand`, `--color-brand-hover`, success/danger/warning/info; check-out reusa brand.
- **Surfaces (light):** `bg` `#f4f4f5` → `surface` blanco → `surface-raised` / `surface-overlay` zinc.
- **Surfaces (dark):** canvas `#09090b`, surface `#18181b`, raised `#1f1f23`, overlay `#27272a`.
- **Texto:** light zinc-900/700/600; dark zinc-50/300/400 — pensado AA sobre las superficies.
- **Paletas opcionales:** sky, monochrome, ember, ocean, forest, indigo, rose, slate, gold — no cambiar la jerarquía de superficies al cambiar paleta.

## Typography

- Familia UI: **Inter**; mono: **JetBrains Mono**.
- Escala Operate densa: h1 **22px** / h2 **16px** / base 16px / chrome 13px / small 12px.
- Usar `typography.*` (`pageTitle`, `heroName`, `sectionTitle`, `label`, `labelCaps`, `body`, `statValue`, `statValueSm`) en vez de inventar pesos o tamaños ad hoc.
- KPIs: `statValueSm` (~18px) en toolbars/`StatTile`; `statValue` (20→24px) solo en héroes.
- Labels de form: `typography.label`; meta uppercase: `labelCaps` / `statLabel`.
- Chrome mínimo 12px (`text-small`); nav `text-chrome` 13px.

## Layout

- Gutters: 16px móvil → 20px desktop (`ds-4` / `ds-5`); gaps de sección 24px (`ds-6`) solo entre bloques mayores.
- Mobile: bottom nav pill icon-only + `aria-label`; clearance `--*-nav-stack` (~5rem + safe-area); sin hamburger (sheet Más).
- Desktop: densidades más apretadas; sidebar con footer pegado al fondo.
- Viewports de QA: 390×844, 834×1194, 1280×720 — ver `docs/qa/UX-QA.md`.

## Elevation & Depth

- Cards: `--shadow-card: none` (profundidad por tono de superficie, no por sombra múltiple).
- Elevación puntual: `--shadow-xs`, `--shadow-elevated`; sheets: `--shadow-sheet`.
- Evitar glow de marca, multi-layer shadows y “glass” decorativo fuera de header isla / brand-logo.

## Shapes

- Controles densos: chip 6px, input/button/card 8px.
- Sheets móviles: 20px (`radius-sheet`).
- Pills de nav / FAB: `radius-pill`.
- No redondear todo a `rounded-2xl`/`rounded-full` salvo pills y hojas bottom-sheet.

## Components

Primitivos en `src/components/ui/`:

| Componente                                   | Notas                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `Button`                                     | `md` 44px / `sm` toolbar / `lg` 48px; no `h-*` en className                    |
| `Modal`                                      | maxWidth honesto sm→3xl (ver [docs/qa/UI-CONTRACT.md](docs/qa/UI-CONTRACT.md)) |
| `Sheet`                                      | bottom sheet móvil (Más, acciones)                                             |
| `Card`                                       | radio 8px; no anidar; padding `ds-*`                                           |
| `Input` / `Select` / `Textarea`              | radius-input; `Label` = `typography.label`; error `danger`                     |
| `PageHeader` / `PageState` / `EmptyState`    | jerarquía de página                                                            |
| `SegmentedControl` / `FilterChips` / `Badge` | `text-small`; filtros y estado                                                 |
| `Alert` / `Skeleton` / `Spinner`             | feedback                                                                       |

Motion existente: `animate-page-enter` (~200ms), landing-rise / kenburns (marketing), auth-fade-in; respetar `prefers-reduced-motion`.

## Do's and Don'ts

**Do**

- Reusar CSS variables (`bg-brand`, `text-text-muted`, `rounded-card`, `px-ds-4`).
- Mantener copy ES y patrones de nav documentados en UX-QA.
- Preferir sheets en móvil y modales centrados en desktop para formularios.
- Animar entradas de overlay/sheet con duración corta y easing de salida suave.

**Don't**

- Introducir purple-on-white / gradients genéricos / cream+terracotta “AI default” como identidad.
- Poner cards en el hero o rodear cada label con caja.
- Usar “Dashboard” / “Kiosk” en UI principal.
- Romper bottom nav en workout activo o tapar el composer de mensajes.
- Sustituir Inter por otra familia sin actualizar tokens y `DESIGN.md`.
