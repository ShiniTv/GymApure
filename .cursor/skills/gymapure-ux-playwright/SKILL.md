---
name: gymapure-ux-playwright
description: >-
  Valida UX de GymApure por rol y viewport: test:ux, Playwright (mobile iPhone 14,
  desktop, tablet iPad), y criterios de docs/UX-QA.md (bottom nav, workout, check-in,
  copy ES). Usar al cambiar UI, navegación, layout, workout activo, recepción tablet,
  o cuando el usuario pida QA visual / Playwright.
---

# GymApure — UX / Playwright

Refs: `docs/UX-QA.md`, `docs/TESTING.md`, `docs/QA-VISUAL-CHECKLIST.md`.

## Setup

```powershell
npm run db:migrate
npm run db:restore-demo
npm run dev
```

Primera vez Playwright:

```powershell
npx playwright install chromium
```

Credenciales demo: `DEMO_PASSWORD` en `.env.dev` — ver `docs/TESTING.md`.

## Automatizado (siempre que el diff toque UI)

```powershell
# otra terminal: npm run dev
npm run test:ux
npm run test:ux:browser
npm run test:ux:visual-gaps   # gaps manuales (#6, T2–T3, trainer footer)
```

Proyectos Playwright: `mobile` (iPhone 14 390×844), `desktop` (≥1024 / 1280), `tablet` (iPad 834×1194).

Debug: `npm run test:ux:browser:ui`

## Criterios críticos (manual o al leer fallos)

### Member — mobile

- Bottom nav pill en `/`, `/routines`, `/nutrition`; **oculta** en `/workout/:id`
- Tabs de pill **icon-only** con `aria-label` (sin caption visible); accesibles por nombre
- Rutinas: tap → expandir → Empezar entrenamiento
- Workout activo: pager inferior sin solapar nav
- Mensajes: composer visible, no tapado por pill
- FAB entrenar centrado en home/rutinas/ejercicios/nutrición; oculto en workout

### Recepción — mobile

- 4 tabs icon-only: Acceso (mostrador), Miembros, Pagos, Mensajes (+ Más)
- Check-in: tab Acceso / CTA mostrador → counter access; atajo tablet → `/check-in?kiosk=1` solo como ruta documentada (copy UI sin “Kiosk”)

### Admin / Trainer — desktop

- Admin miembros: sin acciones Rutinas/Nutrición → Access Denied
- Trainer: quick action nutrición → plan del miembro
- Copy ES: Panel/Inicio; sin “Dashboard” ni “Kiosk” en UI principal

### Sidebar / drawer

- Footer pegado al fondo (admin, trainer, reception, member)
- Trainer / reception / admin mobile: bottom nav visible con drawer cerrado; oculta con drawer abierto; **sin hamburger** (Más + swipe)

## Done UX

```
- [ ] test:ux verde (si flujos API UX afectados)
- [ ] test:ux:browser verde (o proyecto Playwright del viewport tocado)
- [ ] Criterios manuales del diff marcados / no regresionados
```

## Scope el run

| Diff toca…                        | Mínimo                                            |
| --------------------------------- | ------------------------------------------------- |
| Solo copy / componente aislado    | `test:ux` + spec Playwright relacionada si existe |
| Nav / layout / workout / messages | `test:ux:browser` completo                        |
| Solo recepción check-in           | browser + filas recepción de UX-QA                |
| Release                           | `test:ux` + `test:ux:browser`                     |

## Output al usuario

Comandos, pass/fail, viewport(s), y cualquier ítem manual pendiente del diff.
