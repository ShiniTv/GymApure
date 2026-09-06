# Auditoría UX / diseño — GymApure

Fecha: 2026-08-13  
Herramientas: Impeccable detect (`npx impeccable detect src/` → **668** hallazgos), skills Emil / Taste, cruce con [`UX-QA.md`](./UX-QA.md).

Contexto de agentes: [`PRODUCT.md`](../../PRODUCT.md), [`DESIGN.md`](../../DESIGN.md).

## Resumen

El sistema de tokens (Linear-like) es sólido; la deuda está en **call sites**: tipografía off-ramp (`text-[9px]`–`text-[13px]`), zinc/hex fuera de tokens, **cards anidados** en member home / rutinas / mensajes, y **Modal sin exit** frente a Sheet.

## P0

| Área         | Dónde                                   | Problema                                                                           |
| ------------ | --------------------------------------- | ---------------------------------------------------------------------------------- |
| Member home  | `MemberDashboard.tsx`, `MemberHero.tsx` | Stack de cards + pills + gradient en hero; CTA duplicado                           |
| Modal motion | `Modal.tsx` vs `Sheet.tsx`              | `if (!open) return null` → sin animación de salida; enter casi invisible           |
| EmptyState   | `EmptyState.tsx`                        | Siempre `Card` dashed → box-in-box                                                 |
| Tokens       | messages, memberRoutine, CheckIn, Auth  | zinc-* / hex vs `bg-surface` / `text-text-*`                                       |
| Detector     | varios                                  | `design-system-font-size` dominante; `gray-on-color` en acciones danger (Trainers) |

## P1

| Área     | Dónde                     | Problema                                  |
| -------- | ------------------------- | ----------------------------------------- |
| Rutinas  | `MemberRoutinesList.tsx`  | Card + tiles zinc + badges densos         |
| Progreso | `MemberProgressPanel.tsx` | Tres StatCards + pill adherencia          |
| Mensajes | Chat views / `ChatBubble` | Bordes + gradients zinc                   |
| Auth     | `AuthShell.tsx`           | Glow orbs / hex `#09090b` fuera de linear |
| Check-in | `CheckIn.tsx`, recepción  | Rings, glow, banners custom vs `Alert`    |
| FAB      | `MemberBottomNav.tsx`     | `shadow-lg` compite con isla              |

## P2

- `PageHeader` badge chip innecesario cuando no es interactivo
- `Alert` sin variante quiet/inline
- Landing / nutrition glows (`MacroRing`, `CalorieSemiGauge`)
- Sheet focusables incompletos (solo `a`/`button`)
- Tipografía ad hoc en `WorkoutHistory`, `TrainerPtBilling`

## Viewports / roles (criterio UX-QA)

- **Member mobile:** home clutter + bottom nav / workout clearance
- **Reception tablet:** check-in ruido visual
- **Admin/Trainer desktop:** tablas zinc + modales sin exit

## Primer polish

1. `Modal` — enter/exit alineado a Sheet
2. `EmptyState` — variante sin marco Card (`framed={false}`)
3. `MemberHero` — quitar gradient/pill cluster; tipografía de escala

## Segunda oleada (2026-08-13)

- `Sheet` — trap de foco incluye inputs/select/textarea
- `MemberDashboard` — asignaciones sin cajas rellenas; banner de pagos con tokens; `text-small`
- `MemberRoutinesList` / `MemberProgressPanel` — zinc → tokens; stats de progreso sin 3 Cards
- Mensajes (`ChatBubble`, `ChatComposer`, listas, paneles) — zinc/gradientes → `bg-surface` / `text-text-*`
- `MemberBottomNav` — sin `shadow-lg` en FAB/sheet

## Tercera oleada (2026-08-13)

- `AuthShell` — sin orbs/blur; canvas `bg-bg`; linear fuerza `dark` + tokens
- `CheckIn` — rings más finos, success/danger tokens, kiosk en `dark`/`bg-bg`
- `MemberSelfCheckInCard` — sin glow en el punto de estado
- `Sheet` / `Modal` — `motion-reduce:transition-none`
- `WorkoutHistory` / `Trainers` — zinc → tokens

## Cuarta oleada (2026-08-13)

- `MacroRing` / `CalorieSemiGauge` — sin Gaussian glow ni hex; stroke con tokens
- `MacroProgressBar` / `AdherenceBar` / `WeekDateStrip` — zinc/glow → tokens
- `Nutrition` / `MemberNutrition` — call sites zinc → `bg-surface` / `text-text-*`
- `Landing` — `dark` + `bg-bg`; radial con `var(--color-brand)` (sin `#0c98ff`)
- `TrainerPtBilling` — tipografía `text-sm` / `text-small`; amber/emerald → warning/success

## Quinta oleada — biblioteca trainer (2026-08-13)

- `RoutinesLibraryView` — SearchInput + filtro dificultad (Select); sin stacks de Badge
- Duplicar / «Desde plantilla» vía `POST /routines/:id/clone`
- `RoutinePicker` + `AssignRoutineForm` — typeahead; días `radius-chip` (no `rounded-full`)
- Asignaciones / calendario / highlights — meta `text-small` en lugar de Badge

Siguiente: residual FilterChips walls (Equipment/Members); `PageHeader` quiet.

## Sexta oleada — contrato UI (2026-09-04)

Cierre de primitivos y call sites de consistencia (no rediseño de marca):

- Contrato: [`UI-CONTRACT.md`](./UI-CONTRACT.md); `npm run lint:ui-contract`
- `Button` ignora `h-*`/`min-h-*`; `Modal` maxWidth honesto (sm→3xl); `ghost` → `secondary`
- Tipografía `text-[9–13px]` → `text-small` / `text-sm` en ~120 archivos
- `chartTheme` + alturas 180/240; EmptyState en asignaciones; nav miembro `Home` unificado
- Chrome: `IconButton` en Layout; sin stagger en AdminDashboard / lista miembros

## Séptima oleada — cierre verificación (2026-09-04)

- Errores de form: `Textarea` / `SearchInput` / `CedulaInput` + ~43 call sites `red-*` → `danger`
- `PageHeader` badge quiet (meta tipográfica, sin chip)
- `StaffBottomNav`: cerrar sheet «Más» solo en cambio de `pathname` (el redirect mobile `mode=counter` ya no lo cierra a medias)
- Playwright: reception-nav (mobile) verde; copy ES desktop; tablet staff; member/trainer nav

### Residual documentado

- `expiryUtils` / `ErrorBoundary` pueden seguir con paletas severity/`red-*` a propósito
- FilterChips densos en Equipment/Members: pendiente de producto (no regresiona contrato)
- Suite Playwright completa (`npm run test:ux:browser`): **87/87 verde** (2026-09-05) tras restore-demo + fixes timezone nutrición / seed fechas / a11y banner

### Impeccable detect (`npx impeccable detect src/ --no-advisory`)

4 anti-patterns: `BrandName` gradient-text; email Roboto; `EquipmentListCard`/`RoutinesCalendarView` side-tab borders. ~46 advisory (ramp/radius/color literals, email HTML).

## Comandos

```powershell
npx impeccable detect src/
npm run lint:ui-contract
npm run test:ux:browser   # con npm run dev
```
