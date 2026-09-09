# Alta disponibilidad y SLOs — GymApure

Objetivos operativos para due diligence (gym único VE/LATAM → camino a N instancias).

---

## Arquitectura de procesos

| Rol      | `PROCESS_ROLE`  | Qué corre                                           |
| -------- | --------------- | --------------------------------------------------- |
| Web      | `web`           | HTTP + Socket.IO (Redis adapter si hay `REDIS_URL`) |
| Worker   | `worker`        | BullMQ + publishers de cron                         |
| Monolito | `all` (default) | Ambos — desarrollo local / CI                       |

Render blueprint: servicio `caribean-gym` (`web`) + `caribean-gym-worker` (`worker`) + KV Redis.

Probes:

- Liveness: `GET /api/health/live`
- Readiness: `GET /api/health/ready`
- Compat: `GET /api/health`

---

## SLOs (iniciales)

| Señal                       | Objetivo | Fuente                              |
| --------------------------- | -------- | ----------------------------------- |
| Disponibilidad mensual API  | ≥ 99.5 % | Uptime Render + `/api/health/ready` |
| Latencia check-in p95       | ≤ 800 ms | `request_metrics` / Sentry          |
| Latencia login p95          | ≤ 1.5 s  | k6 nightly + Lighthouse             |
| Error rate 5xx (ex. 503 DB) | &lt; 1 % | Sentry + metrics admin              |
| Crash-free sessions web     | ≥ 99 %   | Sentry release health               |

Error budget: si se quema el 50 % del mes, congelar features no críticas y priorizar fiabilidad.

---

## RPO / RTO

|         | Objetivo | Cómo                                               |
| ------- | -------- | -------------------------------------------------- |
| **RPO** | ≤ 24 h   | Backups / PITR Supabase plan actual                |
| **RTO** | ≤ 4 h    | Redeploy Render + `DATABASE_URL` + migrate + admin |

Drill: `npm run db:backup-restore-drill` + evidencia en [OPS-VERIFY-CHECKLIST.md](./OPS-VERIFY-CHECKLIST.md).

---

## Tenant (`gym_id`)

Migración `20260909130000_gyms_tenant_foundation.sql`:

- Tabla `gyms` con fila `id=1` (“GymApure”).
- `users.gym_id NOT NULL DEFAULT 1`.

**Aún no** se filtra toda la API por tenant. El día 1 de multi-sede (ver [ROADMAP-P3](../ROADMAP-P3-ESCALABILIDAD.md)):

1. Propagar `gym_id` a tablas de negocio.
2. Inyectar tenant en sesión JWT / `req.user`.
3. Tests IDOR cross-tenant antes de un segundo cliente.

---

## Escalado horizontal — checklist

- [x] Redis rate-limit store
- [x] Socket.IO Redis adapter (best-effort)
- [x] Worker separado + BullMQ
- [ ] Sticky sessions o 100 % eventos vía Redis adapter en prod verificado
- [ ] CDN para assets estáticos
- [ ] Réplica de lectura Postgres cuando reportes lo justifiquen

---

## Enlaces

- [privacy.md](./privacy.md)
- [SENTRY-Y-ALERTAS.md](./SENTRY-Y-ALERTAS.md)
- [ARQUITECTURA.md](./ARQUITECTURA.md)
- OpenAPI: `GET /api/openapi.yaml`
- k6: `scripts/load/smoke.js` · workflow `load-smoke.yml`
