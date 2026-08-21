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
- [ ] **Alerta Sentry:** Pegar `SENTRY_DSN` + `VITE_SENTRY_DSN` en Render Environment (y `.env.prod`
      local). Redeploy. Generar evento controlado en staging local → confirmar alerta &lt; 15 min.
      Guía paso a paso: [SENTRY-Y-ALERTAS.md](./SENTRY-Y-ALERTAS.md). Preflight:
      `npm run deploy:preflight:prod` (WARN si faltan).
- [x] **Clave MFA dedicada (local):** 2026-07-28 — `MFA_ENCRYPTION_KEY` en `.env.prod` local.
      **Acción humana restante:** copiar la misma clave a Render Environment; si hay secrets legacy,
      `npm run security:reencrypt-mfa:prod -- --allow-prod`. Preflight avisa si falta o coincide con JWT.

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
