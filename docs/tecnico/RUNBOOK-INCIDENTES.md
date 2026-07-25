# Runbook de incidentes — GymApure

Procedimientos cortos para degradaciones frecuentes. Complementa [ROTACION-SECRETOS.md](./ROTACION-SECRETOS.md) y [DEPLOY.md](../DEPLOY.md).

---

## 1. Sesiones revocadas en masa / “me echó del login”

**Síntomas:** muchos 401 en `/api/auth/me`; WebSocket `session:revoked`.

| Causa probable                         | Acción                                 |
| -------------------------------------- | -------------------------------------- |
| Rotación de `JWT_SECRET`               | Esperado — comunicar re-login al staff |
| Segundo login en otro dispositivo      | Política single-session; no es bug     |
| `token_version` bump (password/status) | Verificar auditoría `auth.*`           |

**Chequeo:** Sentry (errores 401 spike) + `GET /api/health`. No reverts de JWT sin plan de comunicación.

---

## 2. Redis caído / rate limit inconsistente

**Síntomas:** avisos en logs “REDIS_URL”; rate limit solo en memoria; lockouts no compartidos entre instancias.

| Paso | Acción                                          |
| ---- | ----------------------------------------------- |
| 1    | Render → Key Value → estado del servicio        |
| 2    | Verificar `REDIS_URL` en Environment            |
| 3    | Redeploy web si la URL cambió                   |
| 4    | Confirmar login lockout con 3 intentos fallidos |

La app **sigue sirviendo** sin Redis (memoria local). En multi-instancia, restaurar Redis cuanto antes.

---

## 3. Cron BCV / tasa de cambio stale

**Síntomas:** tasa USD desactualizada; pagos con conversión rara.

| Paso | Acción                                                                  |
| ---- | ----------------------------------------------------------------------- |
| 1    | `POST /api/exchange-rate/refresh` con header `x-cron-secret`            |
| 2    | Si falla scraper: override manual en **Configuración → Tasa de cambio** |
| 3    | Revisar Cron Job en Render (secret alineado)                            |
| 4    | `npm run test:exchange-rate` en staging/dev                             |

---

## 4. Storage / uploads fallan

**Síntomas:** 500 al subir comprobantes, avatares o videos.

| Paso | Acción                                                             |
| ---- | ------------------------------------------------------------------ |
| 1    | Verificar `SUPABASE_SERVICE_ROLE_KEY` y buckets privados           |
| 2    | `npm run db:audit-storage:prod`                                    |
| 3    | Revisar RLS deny-all en `storage.objects` (esperado) + API Express |
| 4    | Rotar service role solo si hay fuga (ver rotación)                 |

---

## 5. MFA bloquea al staff (REQUIRE_MFA_FOR_STAFF=true)

**Síntomas:** 403 `mfa_setup_required`; redirect a `/security`.

| Paso | Acción                                                                             |
| ---- | ---------------------------------------------------------------------------------- |
| 1    | Staff completa enrolamiento en `/security`                                         |
| 2    | Si perdió el autenticador: admin desactiva MFA vía SQL/proceso interno y re-enrola |
| 3    | Temporal: `REQUIRE_MFA_FOR_STAFF=false` + redeploy (solo emergencia; documentar)   |

---

## Contacto / evidencia

1. Capturar `GET /api/health` y (admin) `GET /api/health/ops`.
2. Issue Sentry con release/environment.
3. No pegar secretos ni `mfa_secret` en tickets.
