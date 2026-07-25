# Scorecard de calidad — GymApure

**Fecha baseline:** 2026-07-25  
**Re-evaluación:** 2026-07-25 (ruta gym único; MFA **opcional**)
**Alcance del 10/10:** gimnasio único VE/LATAM en producción (Render + Supabase). Multi-sede / Stripe / POS = Fase 5 a demanda.

## Notas por dimensión

| Dimensión                 | Baseline | Re-eval | Meta ruta | Notas                                             |
| ------------------------- | -------- | ------- | --------- | ------------------------------------------------- |
| Producto / dominio        | 8.0      | 8.3     | 8.8       | Core profundo; Reservas discovery + día           |
| Arquitectura / ingeniería | 7.5      | 8.0     | 9.5       | RQ hot reads; god-files + mutations pendientes    |
| Seguridad                 | 7.5      | 8.5     | 9.3       | MFA opcional OK; cifrar key dedicada + re-encrypt |
| Datos / ops / deploy      | 8.5      | 8.7     | 9.3       | Runbooks; staging/backup/Sentry a verificar       |
| UX / UI / design system   | 7.0      | 7.6     | 9.2       | Landing foto + contraste AA; device QA abierto    |
| Calidad / tests           | 7.5      | 8.1     | 9.3       | Vitest fino; checklists dominio → CI              |
| Go-to-market / PWA        | 6.0      | 6.8     | 8.8       | PNG icons + screenshots; landing brand-first      |

**Global baseline: 7.4 / 10** · **Re-eval: ~8.1 / 10** · **Tras Fases A–D (objetivo): ~9.4–9.5**

### MFA (decisión de producto)

MFA staff permanece **opcional** (`REQUIRE_MFA_FOR_STAFF=false`). No se puntúa como gap la ausencia de MFA obligatorio. Sí cuenta: cifrado at-rest, `MFA_ENCRYPTION_KEY` independiente de JWT, re-encrypt legacy.

### Avances aplicados (ruta 9.5)

- PWA: `icon-192/512` PNG + maskable, screenshots Chrome, `theme_color` alineado
- Landing full-bleed gym + motion; contraste AA tokens; Reservas chip-día + CTA Inicio
- React Query lecturas: Reception, ActiveWorkout, Equipment
- Chat retención configurable (admin)

## Inventario técnico

Ver [INVENTARIO-DEUDA.md](./INVENTARIO-DEUDA.md). Actualizar este scorecard al cerrar cada fase A–D.
Los gates mensuales de staging, backup, alertas y clave MFA se registran en
[OPS-VERIFY-CHECKLIST.md](./OPS-VERIFY-CHECKLIST.md).
