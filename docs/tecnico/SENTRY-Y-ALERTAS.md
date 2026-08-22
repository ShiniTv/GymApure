# Sentry y alertas — GymApure

## Configuración

| Variable          | Dónde           | Uso                               |
| ----------------- | --------------- | --------------------------------- |
| `SENTRY_DSN`      | Render (server) | Errores Express / Node            |
| `VITE_SENTRY_DSN` | Render (build)  | Errores React + web-vitals bridge |

Ambas deben apuntar al **mismo proyecto** Sentry (o proyectos separados claramente nombrados `gymapure-server` / `gymapure-web`).

## Alertas recomendadas (Sentry UI)

Configurar en **Alerts → Create Alert**:

1. **Error rate** — Issues nuevas o spike > umbral en 5–15 min (notificar Slack/email ops).
2. **Release health** — crash-free sessions < 99% en release nueva.
3. **Regression** — issue reaparece tras marcar resolved.

Objetivo: errores visibles en **&lt; 15 minutos**.

## Releases

El build Vite puede inyectar release vía plugin Sentry (`@sentry/vite-plugin`) cuando hay auth token en CI. En Render, el `git` commit SHA como `release` basta para correlacionar.

## Qué no alertar

- 401 esperados (sesión expirada / dual login).
- 403 IDOR (trainer sin acceso) — ruido; sí revisar en checklist de seguridad.
- Health checks de Render a `/api/health`.

## Verificación post-deploy

1. Abrir la app → forzar un error de prueba en staging (no prod).
2. Confirmar evento en Sentry &lt; 2 min.
3. `npm run lighthouse:ci` en CI ya mide budgets de login/panel.

## Pendiente ops (auditoría 360° — actualizado 2026-08-22)

Hecho: proyecto Sentry, DSN en `.env.prod` y Render, bundle prod con ingest (2026-08-22),
gate en [OPS-VERIFY-CHECKLIST.md](./OPS-VERIFY-CHECKLIST.md), MFA re-encrypt prod → 0 legacy.

Restante (cuenta Sentry, no CLI):

1. Alerts → Create Alert → **Issues nuevas** (email/Slack ops).
2. Confirmar un evento real en staging si hace falta (no inyectar error en prod).

### Render — pasos concretos

1. Dashboard Sentry → Create project → Node + React (o uno solo).
2. Copiar DSN → Render service `caribean-gym` → Environment:
   - `SENTRY_DSN` = DSN server
   - `VITE_SENTRY_DSN` = DSN browser (puede ser el mismo)
3. Manual Deploy → Clear build cache & deploy.
4. Verificar: `npm run deploy:preflight:prod` deja de avisar Sentry cuando `.env.prod` local también tenga los DSN.

### MFA en Render (pareja)

1. Confirmar `MFA_ENCRYPTION_KEY` en `.env.prod` local (`npm run deploy:preflight:prod`).
2. Copiar **exactamente** la misma clave a Render Environment.
3. Si hubo secrets MFA cifrados con JWT antiguo:
   `npm run security:reencrypt-mfa:prod -- --allow-prod`
4. No rotar MFA y JWT en el mismo deploy sin re-encrypt.
