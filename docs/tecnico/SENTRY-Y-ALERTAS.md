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

## Pendiente ops (auditoría 360° — 2026-07-28)

Checklist humano restante:

1. Crear proyecto(s) Sentry (`gymapure-server` / `gymapure-web` o uno compartido).
2. Pegar `SENTRY_DSN` y `VITE_SENTRY_DSN` en **Render Environment** y en `.env.prod` local.
3. Redeploy Render (para que el build Vite tome `VITE_SENTRY_DSN`).
4. En staging local o preview: forzar un error controlado → confirmar evento + regla de alerta.
5. Marcar el gate en [OPS-VERIFY-CHECKLIST.md](./OPS-VERIFY-CHECKLIST.md).
