# Scorecard de calidad — GymApure

**Fecha baseline:** 2026-07-25  
**Re-evaluación:** 2026-07-25 (ruta gym único; MFA **opcional**)  
**Auditoría 360°:** 2026-07-28 (código + prod runtime + staging local PG)  
**Alcance del 10/10:** gimnasio único VE/LATAM en producción (Render + Supabase). Multi-sede / Stripe / POS = Fase 5 a demanda.

## Notas por dimensión

| Dimensión                 | Baseline | Re-eval | Audit 360 | Meta ruta | Notas                                                                |
| ------------------------- | -------- | ------- | --------- | --------- | -------------------------------------------------------------------- |
| Producto / dominio        | 8.0      | 8.3     | 8.3       | 8.8       | Core profundo (sin clases grupales)                                  |
| Arquitectura / ingeniería | 7.5      | 8.0     | **8.2**   | 9.5       | God-files Profile/Equipment/Members/Messages partidos (2026-07-28)   |
| Seguridad                 | 7.5      | 8.5     | 8.5       | 9.3       | MFA opcional; clave en Render; re-encrypt prod 0 legacy (2026-08-22) |
| Datos / ops / deploy      | 8.5      | 8.7     | **8.5**   | 9.3       | Health prod OK; DSN Sentry en bundle 2026-08-22; alerta UI pendiente |
| UX / UI / design system   | 7.0      | 7.6     | **7.8**   | 9.2       | Linear DS + AA; device QA físico abierto                             |
| Calidad / tests           | 7.5      | 8.1     | **8.2**   | 9.3       | CI Playwright+e2e; unit thin                                         |
| Go-to-market / PWA        | 6.0      | 6.8     | 6.8       | 8.8       | PNG icons + screenshots; landing brand-first                         |
| **Rendimiento**           | —        | —       | **8.5**   | 9.0       | Login LH 0.97 / LCP ~1.1s; prod DB ~21 ms                            |

**Global baseline: 7.4 / 10** · **Re-eval: ~8.1 / 10** · **Audit 360 (2026-07-28): ~8.3 / 10** · **Meta Fases A–D: ~9.4–9.5**

### vNext (2026-09) — en curso / entregado en código

- Member: dead-ends P0/P1, Cobros PT condicional, constructor de rutinas propias (migración `owner_member_id`)
- Comms: adjuntos PDF, notifs agrupadas, onboarding canales
- Admin: caja del día, reporte conciliación
- Ops: alerta Sentry documentada (UI cuenta); device push sigue pendiente de hardware
- Gates locales: `lint` + `build` OK (2026-09-04); migrate/tests requieren BD dev alcanzable

### Evidencia runtime (2026-07-28)

- Prod `GET /api/health` → `ok`, `db_latency_ms` ≈ 21
- `db:health:dev` OK · `db:health:prod` OK (purge 1 `password_reset_tokens` usado)
- `db:verify-isolation` PASS
- `deploy:preflight:prod` OK (2026-08-22): Sentry DSN + MFA key; avisos REDIS local / SSL CA
- Prod JS incluye ingest Sentry; `security:reencrypt-mfa:prod` → 0 secretos legacy
- Staging: PostgreSQL local `gymapure_staging` (Supabase Free = límite 2 proyectos)

### MFA (decisión de producto)

MFA staff permanece **opcional** (`REQUIRE_MFA_FOR_STAFF=false`). No se puntúa como gap la ausencia de MFA obligatorio. Sí cuenta: cifrado at-rest, `MFA_ENCRYPTION_KEY` independiente de JWT, re-encrypt legacy.

### Avances aplicados (ruta 9.5)

- PWA: `icon-192/512` PNG + maskable, screenshots Chrome, `theme_color` alineado
- Landing full-bleed gym + motion; contraste AA tokens; CTA Inicio
- React Query lecturas: Reception, ActiveWorkout, Equipment
- Chat retención configurable (admin)

## Inventario técnico

Ver [INVENTARIO-DEUDA.md](./INVENTARIO-DEUDA.md). Actualizar este scorecard al cerrar cada fase A–D.
Los gates mensuales de staging, backup, alertas y clave MFA se registran en
[OPS-VERIFY-CHECKLIST.md](./OPS-VERIFY-CHECKLIST.md).
