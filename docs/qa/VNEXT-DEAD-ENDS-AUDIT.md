# Auditoría dead-ends / claridad — vNext (Fase 0)

Fecha: 2026-09-04  
Alcance: member (P0), staff (spot-check). Seed demo + rutas en código.

| ruta                      | rol    | problema                                             | severidad | fix                                        |
| ------------------------- | ------ | ---------------------------------------------------- | --------- | ------------------------------------------ |
| `/routines?tab=templates` | member | Deep-link `tab=` no abre Plantillas (UI lee `view=`) | P0        | Unificar a `view=templates`; aceptar ambos |
| `/panel` desktop          | member | CTA entrenar duplicado (hero + card)                 | P1        | Un solo CTA primario                       |
| `/panel` sin rutina       | member | Plantillas ×3 superficies                            | P1        | Una superficie; resto quiet links          |
| `/panel` + `/payments`    | member | CTAs de pago apilados                                | P1        | Banner = único CTA fuerte                  |
| `/pt-billing` + Más       | member | Cobros PT siempre visible                            | P1        | Condicionar por PT/invoices                |
| `/routines` vacío         | member | Empty sin botón a Plantillas                         | P1        | CTA Ver plantillas                         |
| `/nutrition` sin plan     | member | Empty sin next step                                  | P1        | CTA a Mensajes (entrenador)                |
| `/access-denied`          | todos  | Sin `state.from`; hints muertos                      | P1        | Pasar `from` en ProtectedRoute             |
| `/messages` trainer       | member | Empty sin aviso si no hay entrenador                 | P2        | Copy + CTA recepción                       |
| `/panel` clutter          | member | Check-in + remoto + banners densos                   | P2        | Colapsar secundarios                       |

## Prioridad de implementación (Fase 1+)

1. Fix `tab` vs `view` (P0)
2. Cobros PT condicional + empties accionables + AccessDenied `from`
3. Limpiar CTAs duplicados en Inicio
4. Constructor rutinas miembro (Fase 2)
5. Comms / finanzas (Fases 3–4)

## Wontfix / diferido

- Reescritura de home member a una sola card (P2 clutter): mitigación parcial en Fase 1
- Device push A4 / I2–I4: evidencia física (Fase 3 QA, no código nuevo)
