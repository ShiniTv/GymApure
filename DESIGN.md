---
name: GymApure
description: Sistema operativo de gimnasio — Apple Operate, brand sky azul, ES
colors:
  brand: '#0c98ff'
  brand-hover-light: '#0284c7'
  brand-hover-dark: '#3aadff'
  secondary: '#704ca8'
  success: '#14b05c'
  danger: '#ff5c5c'
  warning: '#b49c44'
  bg-light: '#f5f5f7'
  bg-elevated-light: '#ffffff'
  surface-light: '#ffffff'
  surface-raised-light: '#f5f5f7'
  surface-overlay-light: '#e8e8ed'
  border-light: '#e4e4e7'
  text-light: '#18181b'
  text-secondary-light: '#3f3f46'
  text-muted-light: '#52525b'
  bg-dark: '#000000'
  bg-elevated-dark: '#1c1c1e'
  surface-dark: '#1c1c1e'
  surface-raised-dark: '#2c2c2e'
  surface-overlay-dark: '#3a3a3c'
  border-dark: '#38383a'
  text-dark: '#fafafa'
  text-secondary-dark: '#d4d4d8'
  text-muted-dark: '#a1a1aa'
typography:
  sans:
    fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, system-ui, sans-serif'
    letterSpacing: '-0.014em'
  mono:
    fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace'
  h1:
    fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, SF Pro Text, Segoe UI, system-ui, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '-0.02em'
  h2:
    fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, system-ui, sans-serif'
    fontSize: '0.9375rem'
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: '-0.015em'
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, system-ui, sans-serif'
    fontSize: '0.9375rem'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: '-0.011em'
  small:
    fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: '-0.006em'
rounded:
  chip: '6px'
  input: '8px'
  button: '8px'
  card: '10px'
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

GymApure usa **Apple Operate**: tipografía de sistema (SF Pro / Segoe), aire generoso, sidebar legible, canvas calmado con bordes hairline, bottom-nav / headers en isla, y acento de marca (default **sky** `#0c98ff`) solo en CTAs y estado — no para selección de sidebar. Light y dark son ciudadanos de primera; las paletas de `src/config/themes.ts` reescriben `--color-brand` en runtime. Fuente canónica de tokens: `src/index.css` (`@theme` + `:root` / `.dark`). Tipografía compartida: `src/lib/typography.ts`.

## Colors

- **Brand / status:** `--color-brand`, `--color-brand-hover`, success/danger/warning/info; check-out reusa brand.
- **Surfaces (light):** `bg` `#f5f5f7` → `surface` blanco → `surface-raised` / `surface-overlay` `#e8e8ed`.
- **Surfaces (dark):** canvas `#000000`, elevated/surface `#1c1c1e`, raised `#2c2c2e`, overlay `#3a3a3c`.
- **Texto:** light zinc-900/700/600; dark zinc-50/300/400 — pensado AA sobre las superficies.
- **Paletas opcionales:** sky, monochrome, ember, ocean, forest, indigo, rose, slate, gold — no cambiar la jerarquía de superficies al cambiar paleta.

## Typography

- Familia UI: **system / SF Pro Text** (`-apple-system`, `Segoe UI`); mono: **JetBrains Mono**.
- Escala Apple Operate equilibrada: h1 **20px** / h2 **15px** / base **15px** / chrome **13px** / small **12px**.
- Usar `typography.*` (`pageTitle`, `heroName`, `sectionTitle`, `label`, `labelCaps`, `body`, `statValue`, `statValueSm`) en vez de inventar pesos o tamaños ad hoc.
- KPIs: `statValueSm` (**18px**) en toolbars/`StatTile`; `statValue` (**20px**) solo en héroes.
- Labels de form: `typography.label`; meta uppercase solo cuando aporta (`labelCaps`).
- Nav: `text-chrome` 13px; secciones de sidebar en sentence case (no SCREAMING caps).

## Layout

- Gutters: 16px móvil → **20px** desktop (`ds-4` / `ds-5`).
- Gaps de página: `page-stack` 12→16px; `page-stack-tight` 10→12px.
- Mobile: bottom nav pill icon-only + `aria-label`; clearance `--*-nav-stack`; sin hamburger (sheet Más); isla inferior con glass Operate y selección hairline; top pad con fade suave (sin chrome flotante).
- Command palette (Ctrl/⌘K): mismo lenguaje que Modal (`surface-modal`, acciones agrupadas).
- Desktop: sidebar **224px** (`lg:w-56`), filas nav quietas (pill + hairline, sin brand wash), footer cuenta en `.nav-user-card`; drawer móvil con scrim blur.
- Viewports de QA: 390×844, 834×1194, 1280×720 — ver `docs/qa/UX-QA.md`.

## Elevation & Depth

- Cards: `--shadow-card: none` (profundidad por tono de superficie, no por sombra múltiple).
- Elevación puntual: `--shadow-xs`, `--shadow-elevated`; sheets: `--shadow-sheet`.
- Evitar glow de marca, multi-layer shadows y “glass” decorativo fuera de header isla / brand-logo.

## Shapes

- Controles: chip 6px, input/button 8px, card **10px**.
- Sheets móviles: 20px (`radius-sheet`).
- Pills de nav / FAB: `radius-pill`.
- No redondear todo a `rounded-2xl`/`rounded-full` salvo pills y hojas bottom-sheet.

## Components

Primitivos en `src/components/ui/`:

| Componente                                   | Notas                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `Button`                                     | `md` 44px / `sm` toolbar / `lg` 48px; no `h-*` en className                          |
| `Modal`                                      | Premium Operate dialog; móvil sheet-dock; `footer` + `ModalActions`; ver UI-CONTRACT |
| `Sheet`                                      | bottom sheet móvil (Más, acciones)                                                   |
| `Card`                                       | radio 10px; no anidar; padding `ds-*`                                                |
| `Input` / `Select` / `Textarea`              | radius-input; `Label` = `typography.label`; error `danger`                           |
| `PageHeader` / `PageState` / `EmptyState`    | jerarquía de página                                                                  |
| `SegmentedControl` / `FilterChips` / `Badge` | `text-small`; filtros y estado                                                       |
| `Alert` / `Skeleton` / `Spinner`             | feedback                                                                             |

Motion: `animate-page-enter` (~120ms opacity), landing-rise / kenburns (marketing), auth-fade-in; respetar `prefers-reduced-motion`.

## Do's and Don'ts

**Do**

- Reusar CSS variables (`bg-brand`, `text-text-muted`, `rounded-card`, `px-ds-4` / `lg:p-ds-5`).
- Mantener copy ES y patrones de nav documentados en UX-QA.
- Preferir sheets en móvil y modales centrados en desktop para formularios.
- Una sola escala: título, KPI, chip y sección deben sentirse de la misma familia (ni micro ni marketing).

**Don't**

- Inflar títulos (>20px Operate) o chips de atajo (>36px) en paneles de trabajo.
- Volver a densidades Linear micro (chrome 13px OK; filas aplastadas + gaps 2px en contenido no).
- Introducir purple-on-white / gradients genéricos / cream+terracotta “AI default” como identidad.
- Poner cards en el hero o rodear cada label con caja.
- Usar “Dashboard” / “Kiosk” en UI principal.
- Romper bottom nav en workout activo o tapar el composer de mensajes.
- Sustituir la stack de sistema por Inter u otra webfont de UI sin actualizar tokens y `DESIGN.md`.
