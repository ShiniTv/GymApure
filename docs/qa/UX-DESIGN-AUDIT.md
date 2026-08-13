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

Siguiente: nutrition glows (`MacroRing`), Landing hex, `TrainerPtBilling` tipografía.

## Comandos

```powershell
npx impeccable detect src/
npm run test:ux:browser   # con npm run dev
```
