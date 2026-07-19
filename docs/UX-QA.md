# Checklist QA UX — GymApure

Matriz manual por rol y viewport. Complementa las suites automatizadas (`npm run test:ux`, `npm run test:ux:browser`).

**Última revisión:** 2026-07-19 (shell móvil: isla unificada, header flotante, sin hamburger en todos los roles, Admin Más con secciones)

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

| #   | Flujo                 | Criterio                                                                                     | Auto    | Resultado |
| --- | --------------------- | -------------------------------------------------------------------------------------------- | ------- | --------- |
| 1   | Bottom nav            | Pill en `/`, `/routines`, `/nutrition`; **oculta** en `/workout/:id`                         | Browser | ☑         |
| 2   | Rutinas               | Tap tarjeta → expande → botón **Empezar entrenamiento**                                      | Browser | ☑         |
| 3   | Workout activo        | Pager inferior sin solapamiento con nav; pasos de ejecución colapsados por defecto           | Browser | ☑         |
| 4   | Mensajes              | Composer visible; acceso desde Más; no tapado por pill                                       | Browser | ☑         |
| 5   | Más / logout          | Sheet "Más"; cerrar sesión; sin hamburger; header flotante tipo isla                         | Browser | ☑         |
| 6   | PTR inicio            | Pull-to-refresh en dashboard member                                                          | Manual  | ☑         |
| 6b  | PTR rutinas/historial | PTR en `/routines` y `/history` (member)                                                     | Browser | ☑         |
| 7   | Errores               | Offline → Reintentar en rutinas                                                              | Browser | ☑         |
| —   | FAB entrenar          | Centrado en `/`, `/routines`, `/exercises`, `/nutrition` (si hay rutina activa)              | Browser | ☑         |
| —   | Sidebar drawer        | Footer pegado al fondo (admin, trainer, reception, member)                                   | Manual  | ☑         |
| —   | Workout layout        | Completar, pasos y video a ancho completo del card                                           | Manual  | ☑         |
| —   | Descanso / notifs     | Android: notif con tiempo y +30s/Saltar; iOS PWA: aviso al terminar; sin permiso: overlay OK | Manual  | ☐         |
| —   | Push onboarding       | Tarjeta en inicio; iPhone pide Añadir a Inicio; Perfil toggle                                | Manual  | ☐         |

---

## Admin — mobile / desktop

| #   | Flujo          | Criterio                                                                    | Auto    | Resultado |
| --- | -------------- | --------------------------------------------------------------------------- | ------- | --------- |
| 16  | Equipamiento   | Registrar desde catálogo; badge "Registrado"                                | API     | ☑         |
| 17  | Tipo de cambio | Settings → override manual → refleja en pagos                               | API     | ☑         |
| 18  | Equipamiento   | Sin duplicados al registrar misma máquina                                   | API     | ☑         |
| 18b | Más (móvil)    | Sheet con secciones Operación/Finanzas/Supervisión/Cuenta; scroll; gap isla | Browser | ☑         |

---

## Trainer — mobile (390px)

| #   | Flujo          | Criterio                                                                 | Auto    | Resultado |
| --- | -------------- | ------------------------------------------------------------------------ | ------- | --------- |
| 19  | Bottom nav     | Visible con drawer cerrado; oculta con drawer abierto; **sin hamburger** | Browser | ☑         |
| 20  | Sidebar footer | Sin hueco vacío debajo del footer al abrir drawer                        | Manual  | ☑         |

## Recepción — mobile (390px)

| #   | Flujo          | Criterio                                                      | Auto              | Resultado |
| --- | -------------- | ------------------------------------------------------------- | ----------------- | --------- |
| 8   | Bottom nav     | Acceso + Miembros + Pagos + Mensajes + Más; **sin hamburger** | Browser           | ☑         |
| 9   | Check-in nav   | Sidebar Check-in → `/reception?mode=counter&tab=access`       | Browser (desktop) | ☑         |
| 9b  | Check-in móvil | Tab Acceso / CTA "Abrir mostrador" → counter access           | Browser           | ☑         |
| 10  | Modo tablet    | Atajo "Modo tablet" abre `/check-in?kiosk=1`                  | Browser           | ☑         |
| —   | Clearance isla | Contenido y sheet Más con gap visible sobre la pill           | Manual            | ☑         |

---

## Shell móvil (todos los roles)

| #   | Criterio                                                           | Auto    | Resultado |
| --- | ------------------------------------------------------------------ | ------- | --------- |
| S1  | `--*-nav-stack` unificado (~4.75rem + safe-area); sheet con `mb-2` | Manual  | ☑         |
| S2  | Header sticky flotante (`rounded-2xl`, blur); sin barra full-bleed | Manual  | ☑         |
| S3  | Sin hamburger en member / reception / trainer / admin              | Browser | ☑         |
| S4  | Lista miembros móvil: `space-y-3` entre cards                      | Manual  | ☑         |

## Admin / Trainer — desktop (≥1024px)

| #   | Flujo             | Criterio                                                  | Auto    | Resultado |
| --- | ----------------- | --------------------------------------------------------- | ------- | --------- |
| 11  | Admin miembros    | Sin acciones Rutinas/Nutrición → Access Denied            | Browser | ☑         |
| 12  | Trainer nutrición | Quick action → plan de miembro (`/members/:id/nutrition`) | Browser | ☑         |
| 13  | Copy ES           | Panel/Inicio; sin "Dashboard" ni "Kiosk" en UI principal  | Browser | ☑         |

---

## Auth

| #   | Flujo           | Criterio                            | Auto          | Resultado |
| --- | --------------- | ----------------------------------- | ------------- | --------- |
| 14  | Forgot password | Correo o enlace dev; reset funciona | API + Browser | ☑         |
| 15  | Access Denied   | Sin ruta técnica en mensaje         | Browser       | ☑         |

---

## Tablet iPad (834×1194) — fase 3

| #   | Escenario            | Criterio                                      | Auto             | Resultado |
| --- | -------------------- | --------------------------------------------- | ---------------- | --------- |
| T1  | Admin `/members`     | Cards móviles; **sin** tabla desktop (`lg`)   | Browser (tablet) | ☑         |
| T2  | Recepción `/members` | Bottom nav recepción + cards (no tabla ancha) | Manual           | ☑         |
| T3  | Member `/`           | Bottom nav member; sin hamburger; header isla | Manual           | ☑         |

**Nota:** Tablas staff (`Members`, `Payments`) usan breakpoint `lg` (1024px), alineado con shell móvil hasta 1023px.

---

## Accesibilidad — fase 3

| #   | Flujo     | Criterio                                       | Auto    | Resultado |
| --- | --------- | ---------------------------------------------- | ------- | --------- |
| A1  | Sheet Más | `aria-modal`, Escape cierra, foco vuelve a Más | Browser | ☑         |
| A2  | Sheet Más | Tab cicla dentro del sheet                     | Browser | ☑         |

---

## Cobertura automatizada

| Spec                                                                                                                                                                                                                                                                                       | Proyecto          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| `member-nav`, `member-routines`, `member-messages`, `member-fab`, `member-more`, `member-workout-pager`, `member-offline`, `member-ptr`, `member-more-a11y`, `access-denied`, `auth-forgot`, `reception-kiosk`, `reception-checkin-mobile`, `reception-nav`, `admin-members`, `admin-more` | mobile            |
| `reception-checkin-nav.desktop`, `trainer-nutrition.desktop`, `copy-es.desktop`                                                                                                                                                                                                            | desktop           |
| `tablet-staff.tablet`                                                                                                                                                                                                                                                                      | tablet (834×1194) |

**Total:** 19 archivos spec, ~34 casos de prueba (mobile + desktop + tablet).

Gaps manuales: `npm run test:ux:visual-gaps` (requiere `dev` + `db:restore-demo`).

---

## Comandos de verificación automatizada

```powershell
# API (servidor en marcha)
npm run test:ux

# Navegador móvil + desktop + tablet (servidor en marcha; primera vez: npx playwright install chromium)
npm run test:ux:browser

# Gaps manuales (#6, T2–T3, trainer drawer footer)
npm run test:ux:visual-gaps

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

1. Marca ☐ → ☑ en la columna **Resultado** tras probar manualmente lo no cubierto (#16–18 equipamiento/BCV).
2. Anota fallos con fecha y captura en un issue.
3. Re-ejecuta `npm run test:ux` y `npm run test:ux:browser` tras cada fix UX.

---

## Backlog UX (no bloqueante)

- Skeleton en dashboards staff (sustituir flash CARGANDO)
- CI opcional: job `ux-browser` solo proyecto `mobile`

**Hecho en revisión full-stack:** PTR en KPIs de recepción; Nutrición en pill principal (Mensajes en Más); FAB en `/nutrition`; Acceso en pill de recepción; EmptyState nutrición con icono utensilios.

Verificación API #16–18:

```powershell
npm run test:equipment-bcv
```
