# Auditoría dead-ends / claridad — vNext (Fase 0)

Fecha: 2026-09-04 · Actualizado: 2026-09-05 (reforma UI/UX internacional)  
Alcance: member (P0), staff (spot-check). Seed demo + rutas en código.

| ruta                      | rol    | problema                                             | severidad | estado                                              |
| ------------------------- | ------ | ---------------------------------------------------- | --------- | --------------------------------------------------- |
| `/routines?tab=templates` | member | Deep-link `tab=` no abre Plantillas (UI lee `view=`) | P0        | Acepta `view` y `tab`                               |
| `/panel` desktop          | member | CTA entrenar duplicado (hero + card)                 | P1        | Hero único CTA; card solo link «Ver rutinas»        |
| `/panel` sin rutina       | member | Plantillas ×3 superficies                            | P1        | Templates solo si no hay rutina; resto quiet        |
| `/panel` + `/payments`    | member | CTAs de pago apilados                                | P1        | Banner único; empty membership quiet si pending     |
| `/pt-billing` + Más       | member | Cobros PT siempre visible                            | P1        | Condicionado por `showPtBilling`                    |
| `/routines` vacío         | member | Empty sin botón a Plantillas                         | P1        | CTA Ver plantillas                                  |
| `/nutrition` sin plan     | member | Empty sin next step                                  | P1        | CTA a Mensajes (entrenador)                         |
| `/access-denied`          | todos  | Sin `state.from`; hints muertos                      | P1        | Pendiente (fuera de esta pasada de proporciones/IA) |
| `/messages` trainer       | member | Empty sin aviso si no hay entrenador                 | P2        | Copy + CTA recepción                                |
| `/panel` clutter          | member | Check-in + remoto + banners densos                   | P2        | «Acceso y extras» colapsado por defecto             |

## Prioridad de implementación (Fase 1+)

1. Fix `tab` vs `view` (P0) — hecho
2. Cobros PT condicional + empties accionables — hecho; AccessDenied `from` queda abierto
3. Limpiar CTAs duplicados en Inicio — hecho
4. Constructor rutinas miembro (Fase 2)
5. Comms / finanzas (Fases 3–4)

## Wontfix / diferido

- Device push A4 / I2–I4: evidencia física (Fase 3 QA, no código nuevo)
- AccessDenied `from` state: seguimiento aparte
