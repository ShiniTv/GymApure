# Checklist QA UX — GymApure

Matriz manual por rol y viewport. Complementa las suites automatizadas (`npm run test:ux`, `npm run test:ux:browser`).

**Última revisión:** 2026-07-09 (equipamiento, BCV, UX móvil sidebar/workout)

## Setup

```powershell
npm run db:migrate
npm run db:restore-demo
npm run dev
```

- **Mobile:** Chrome DevTools → iPhone 14 (390×844)
- **Desktop:** ventana ≥ 1024px
- **Tablet (iPad):** 834×1194 — proyecto Playwright `tablet`

**Credenciales demo:** ver [`TESTING.md`](./TESTING.md) (`DEMO_PASSWORD` en `.env`).

---

## Member — mobile (390px)

| #   | Flujo                 | Criterio                                                             | Auto    | Resultado |
| --- | --------------------- | -------------------------------------------------------------------- | ------- | --------- |
| 1   | Bottom nav            | Pill en `/`, `/routines`, `/nutrition`; **oculta** en `/workout/:id` | Browser | ☐         |
| 2   | Rutinas               | Tap tarjeta → expande → botón **Empezar entrenamiento**              | Browser | ☐         |
| 3   | Workout activo        | Pager inferior sin solapamiento con nav                              | Browser | ☐         |
| 4   | Mensajes              | Composer visible; no tapado por pill                                 | Browser | ☐         |
| 5   | Más / logout          | Sheet "Más"; cerrar sesión; sin hamburger                            | Browser | ☐         |
| 6   | PTR inicio            | Pull-to-refresh en dashboard member                                  | Manual  | ☐         |
| 6b  | PTR rutinas/historial | PTR en `/routines` y `/history` (member)                             | Browser | ☐         |
| 7   | Errores               | Offline → Reintentar en rutinas                                      | Browser | ☐         |
| —   | FAB entrenar          | Centrado en `/`, `/routines`, `/exercises`; oculto en `/nutrition`   | Browser | ☐         |
| —   | Sidebar drawer        | Footer pegado al fondo (admin, trainer, reception, member)           | Manual  | ☐         |
| —   | Workout layout        | Completar, pasos y video a ancho completo del card                   | Manual  | ☐         |

---

## Admin — mobile / desktop

| #   | Flujo          | Criterio                                      | Auto   | Resultado |
| --- | -------------- | --------------------------------------------- | ------ | --------- |
| 16  | Equipamiento   | Registrar desde catálogo; badge "Registrado"  | Manual | ☐         |
| 17  | Tipo de cambio | Settings → override manual → refleja en pagos | Manual | ☐         |
| 18  | Equipamiento   | Sin duplicados al registrar misma máquina     | Manual | ☐         |

---

## Trainer — mobile (390px)

| #   | Flujo          | Criterio                                              | Auto   | Resultado |
| --- | -------------- | ----------------------------------------------------- | ------ | --------- |
| 19  | Bottom nav     | Visible con drawer cerrado; oculta con drawer abierto | Manual | ☐         |
| 20  | Sidebar footer | Sin hueco vacío debajo del footer al abrir drawer     | Manual | ☐         |

## Recepción — mobile (390px)

| #   | Flujo          | Criterio                                                | Auto              | Resultado |
| --- | -------------- | ------------------------------------------------------- | ----------------- | --------- |
| 8   | Bottom nav     | 4 tabs: Inicio, Miembros, Pagos, Mensajes               | Browser           | ☐         |
| 9   | Check-in nav   | Sidebar Check-in → `/reception?mode=counter&tab=access` | Browser (desktop) | ☐         |
| 9b  | Check-in móvil | CTA "Abrir mostrador" en home → counter access          | Browser           | ☐         |
| 10  | Modo tablet    | Atajo "Modo tablet" abre `/check-in?kiosk=1`            | Browser           | ☐         |

---

## Admin / Trainer — desktop (≥1024px)

| #   | Flujo             | Criterio                                                  | Auto    | Resultado |
| --- | ----------------- | --------------------------------------------------------- | ------- | --------- |
| 11  | Admin miembros    | Sin acciones Rutinas/Nutrición → Access Denied            | Browser | ☐         |
| 12  | Trainer nutrición | Quick action → plan de miembro (`/members/:id/nutrition`) | Browser | ☐         |
| 13  | Copy ES           | Panel/Inicio; sin "Dashboard" ni "Kiosk" en UI principal  | Browser | ☐         |

---

## Auth

| #   | Flujo           | Criterio                            | Auto          | Resultado |
| --- | --------------- | ----------------------------------- | ------------- | --------- |
| 14  | Forgot password | Correo o enlace dev; reset funciona | API + Browser | ☐         |
| 15  | Access Denied   | Sin ruta técnica en mensaje         | Browser       | ☐         |

---

## Tablet iPad (834×1194) — fase 3

| #   | Escenario            | Criterio                                      | Auto             | Resultado |
| --- | -------------------- | --------------------------------------------- | ---------------- | --------- |
| T1  | Admin `/members`     | Cards móviles; **sin** tabla desktop (`lg`)   | Browser (tablet) | ☐         |
| T2  | Recepción `/members` | Bottom nav recepción + cards (no tabla ancha) | Manual           | ☐         |
| T3  | Member `/`           | Bottom nav member; sin hamburger              | Manual           | ☐         |

**Nota:** Tablas staff (`Members`, `Payments`) usan breakpoint `lg` (1024px), alineado con shell móvil hasta 1023px.

---

## Accesibilidad — fase 3

| #   | Flujo     | Criterio                                       | Auto    | Resultado |
| --- | --------- | ---------------------------------------------- | ------- | --------- |
| A1  | Sheet Más | `aria-modal`, Escape cierra, foco vuelve a Más | Browser | ☐         |
| A2  | Sheet Más | Tab cicla dentro del sheet                     | Browser | ☐         |

---

## Cobertura automatizada

| Spec                                                                                                                                                                                                                                                        | Proyecto          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `member-nav`, `member-routines`, `member-messages`, `member-fab`, `member-more`, `member-workout-pager`, `member-offline`, `member-ptr`, `member-more-a11y`, `access-denied`, `auth-forgot`, `reception-kiosk`, `reception-checkin-mobile`, `admin-members` | mobile            |
| `reception-checkin-nav.desktop`, `trainer-nutrition.desktop`, `copy-es.desktop`                                                                                                                                                                             | desktop           |
| `tablet-staff.tablet`                                                                                                                                                                                                                                       | tablet (834×1194) |

**Total:** 19 archivos spec, ~27 casos de prueba.

---

## Comandos de verificación automatizada

```powershell
# API (servidor en marcha)
npm run test:ux

# Navegador móvil + desktop + tablet (servidor en marcha; primera vez: npx playwright install chromium)
npm run test:ux:browser

# Solo tablet
npx playwright test --project=tablet

# Suite completa pre-PR
npm run lint
npm run build
npm run test:e2e
npm run test:ux
```

---

## Cómo registrar resultados

1. Marca ☐ → ☑ en la columna **Resultado** tras probar manualmente lo no cubierto (#6 dashboard PTR, tablet T2–T3).
2. Anota fallos con fecha y captura en un issue.
3. Re-ejecuta `npm run test:ux` y `npm run test:ux:browser` tras cada fix UX.

---

## Backlog UX (no bloqueante)

- PTR en KPIs de recepción
- Mensajes en pill principal (intercambiar con Nutrición)
- FAB en `/nutrition` si hay rutina activa
- Skeleton en dashboards staff (sustituir flash CARGANDO)
- CI opcional: job `ux-browser` solo proyecto `mobile`
