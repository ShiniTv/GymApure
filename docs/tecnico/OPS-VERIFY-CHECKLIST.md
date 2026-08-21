# Verificación mensual de operaciones

Ejecutar una vez al mes y antes de una ventana de cambios importante. Registrar fecha, responsable,
entorno y enlace a la evidencia en el sistema interno; no guardar secretos ni datos personales en
este archivo.

## Gates

- [x] **Smoke de staging:** 2026-07-28 — staging local PG `gymapure_staging` + servidor `:3001`.
      `SMOKE_BASE_URL=http://localhost:3001 npm run test:smoke:staging` → 6 passed (health + auth
      guards). Cloud Supabase staging bloqueado por Free 2-project limit; ver [STAGING.md](./STAGING.md).
- [x] **Preparación de backup:** 2026-07-28 — `npm run db:backup-check` → controles locales OK.
      Confirmar PITR/retención en Supabase Dashboard (ítem manual del Dashboard sigue pendiente de captura).
- [x] **Alerta Sentry (DSN configurado):** 2026-08-21 — `SENTRY_DSN` + `VITE_SENTRY_DSN` en `.env.prod`
      local y en Render (bundle prod incluye DSN). **Restante humano:** crear alerta “new issues” en
      Sentry UI y confirmar un evento real. Guía: [SENTRY-Y-ALERTAS.md](./SENTRY-Y-ALERTAS.md).
- [x] **Clave MFA dedicada (local + Render):** 2026-08-21 — `MFA_ENCRYPTION_KEY` en `.env.prod` y
      copiada a Render. Sin MFA activo en staff → no hace falta re-encrypt.

## Ritual metrics autenticado (mensual)

```powershell
# Con sesión admin (cookie) contra prod:
# GET https://caribean-gym.onrender.com/api/health/ops
# GET https://caribean-gym.onrender.com/api/health/metrics
# Revisar sessionCache hit rate (≥85% meta en pico) y db latency
```

Evidencia 2026-07-28 (público, sin auth): `GET /api/health` → `ok`, `db_latency_ms` ≈ 21.

## Evidencia mínima

- Fecha UTC y responsable.
- Commit/release verificado.
- Resultado de cada comando (pass/fail) y enlace al job o captura.
- Incidencia y fecha objetivo para cualquier gate fallido.

Un gate sin evidencia se considera pendiente. Consultar
[Rotación de secretos](./ROTACION-SECRETOS.md) antes de cambiar una clave.
