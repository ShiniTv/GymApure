# ADR-001: Sesión única con `token_version`

## Estado

Aceptado (julio 2026)

## Contexto

GymApure gestiona staff y miembros con JWT en cookie httpOnly. Se necesitaba invalidar sesiones al login en otro dispositivo, logout, cambio de contraseña o desactivación.

## Decisión

Cada usuario tiene `users.token_version`. El JWT incluye la versión; el middleware la compara con la BD (caché 45s + Redis opcional). Login/logout/password/disable incrementan la versión e invalidan sesiones previas. WebSocket emite `session:revoked`.

## Consecuencias

- Un solo dispositivo activo por cuenta (producto).
- Hit rate de caché de sesión es métrica operativa (`/api/health/metrics`).
- No hay refresh-token rotativo separado.
