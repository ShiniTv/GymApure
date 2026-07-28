# Checklist device — PWA / Push / latencia percibida

Complementa [MOVIL-Y-PWA.md](../modulos/MOVIL-Y-PWA.md) y [UX-QA.md](./UX-QA.md).  
Objetivo: cerrar el último tramo a 10/10 con evidencia en dispositivo real.

## Prep (PC)

```powershell
# VAPID en .env.dev (o prod) — ver .env.example
npm run build
npm run preview
# o deploy a un HTTPS público (push requiere secure context)
```

Credenciales demo: `docs/TESTING.md` (`DEMO_PASSWORD`).

## Android — Chrome

| #   | Paso                                                               | OK  |
| --- | ------------------------------------------------------------------ | --- |
| A1  | Login `member@…` → inicio muestra tarjeta avisos (si no dismissed) | ☑   |
| A2  | Activar notificaciones → permiso sistema                           | ☑   |
| A3  | Perfil → Seguridad: toggle coherente                               | ☑   |
| A4  | Staff manda mensaje → notificación con app en segundo plano        | ☐   |
| A5  | Menú Chrome → Instalar app / Añadir a inicio                       | ☑   |

A1/A3 verificados en Playwright mobile (`qa-device-push.mobile.spec.ts`, 2026-07-23). A2/A4/A5 requieren Chrome real en Android.

**Auditoría 360° (2026-07-28):** axe ampliado a `/payments`, `/check-in?kiosk=1`, `/routines`. Flujo profundo workout: `tests/ux/workout-deep-flow.spec.ts`. Filas A4/I2–I4 siguen requiriendo dispositivo físico — no marcar sin plantilla de evidencia abajo.

**PWA nombre:** el manifest usa **GymApure** (no “Caribean Gym”). Tras instalar, el icono/nombre en el launcher debe coincidir.

## iPhone — Safari 16.4+

| #   | Paso                                                                        | OK  |
| --- | --------------------------------------------------------------------------- | --- |
| I1  | Sin PWA: tarjeta **Añadir a Inicio para avisos** en inicio                  | ☑   |
| I2  | Compartir → Añadir a Inicio → abrir desde icono                             | ☐   |
| I3  | En standalone: Perfil → Seguridad → Activar push                            | ☐   |
| I4  | En pestaña Safari (sin Inicio): no fuerza push; copy de instalación visible | ☐   |

I1 cubierto por el mismo smoke (viewport iPhone 14). I2–I4 requieren dispositivo real.

## Evidencia para cerrar A4 / I2–I4

No marcar una fila como aprobada sin completar una evidencia real. Copiar esta plantilla por cada
caso:

```text
Caso: A4 | I2 | I3 | I4
Fecha/hora y zona:
Responsable:
Entorno + commit/release:
Dispositivo y modelo:
OS + versión:
Navegador/PWA + versión:
Estado inicial (permiso push, instalada/no instalada, sesión):
Pasos ejecutados:
Resultado observado:
Resultado: PASS | FAIL | BLOCKED
Evidencia: enlace a video/captura/log sin datos personales
Incidencia (si FAIL/BLOCKED):
```

| Caso | CI / Playwright puede verificar                                    | Solo dispositivo real puede cerrar                                      |
| ---- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| A4   | Flujo web, registro de suscripción y copy/estado visible           | Entrega de notificación del sistema con Chrome Android en segundo plano |
| I2   | Manifest, iconos, rutas y copy de instalación                      | Añadir a Inicio desde Safari y arranque real desde el icono             |
| I3   | UI de Seguridad y llamadas esperadas con APIs simuladas            | Permiso y suscripción push en una PWA standalone iOS                    |
| I4   | Copy condicional y ausencia de bloqueo en viewport iPhone simulado | Comportamiento en pestaña Safari real sin instalación                   |

La cobertura CI reduce regresiones, pero no sustituye la evidencia device-only indicada en la
última columna.

## Escritorio — latencia percibida

Ejecutado 2026-07-23 con Playwright (`tests/ux/qa-device-desktop.desktop.spec.ts`) contra demo local.

| #   | Paso                                                                             | OK  |
| --- | -------------------------------------------------------------------------------- | --- |
| D1  | Login admin → Panel: skeleton, no texto “Cargando…”                              | ☑   |
| D2  | Hover sidebar Miembros → abrir: lista casi inmediata                             | ☑   |
| D3  | Hover Pagos → cola pendientes precargada                                         | ☑   |
| D4  | Miembros/Pagos desktop: click fila → rail lateral                                | ☑   |
| D5  | Reportes: preview de filas al seleccionar tarjeta                                | ☑   |
| D6  | Settings xl: nav lateral con anclas                                              | ☑   |
| D7  | `/exercises`: expandir → video + ejecución a ancho de fila (no columna estrecha) | ☑   |

Cobertura auto (con `npm run db:restore-demo` + `npm run test:ux:browser`):  
`qa-device-desktop.desktop.spec.ts`, `trainer-exercises.desktop.spec.ts`, `staff-payments-approve.desktop.spec.ts`, `tablet-staff.tablet.spec.ts`.

## Al cerrar

- [ ] Filas UX-QA push/PWA marcadas o con nota de OS _(pendiente: Android / iPhone reales)_
- [x] Índices en prod: migración `20260723120000_users_list_and_paused_indexes` aplicada
