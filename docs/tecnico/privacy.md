# Privacidad y derechos del titular (DSR) — GymApure

Runbook de due diligence: exportar y cerrar cuenta, consentimiento de salud versionado y postura MFA.

Complementa [DATOS-PERSONALES.md](./DATOS-PERSONALES.md).

---

## Endpoints de autoservicio

| Método | Ruta                     | Auth          | Efecto                                                                                                                                                                  |
| ------ | ------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/me/data-export`    | Sesión        | JSON con perfil, pagos, asistencia, medidas, salud, rutinas, workouts, notificaciones, notas de coach. Sin hash de contraseña ni secretos MFA ni bytes de comprobantes. |
| `POST` | `/api/me/delete-account` | Sesión + CSRF | Body `{ "confirm": true }`. Desactiva la cuenta, anonimiza PII (`deleted+{id}@invalid.local`), limpia salud sensible y push tokens, invalida JWT.                       |

UI: **Perfil → Seguridad → Privacidad y datos**.

Auditoría (sin PII en detalle): `user.data_export`, `user.delete_account`.

### Cascada / conservación

- **Anonimizar + inactivar** (preferido): filas de pagos/asistencia quedan con `user_id` pero el perfil ya no identifica a la persona.
- Hard `DELETE` sigue disponible solo para **admin** en Miembros (cascada SQL).
- El último admin activo **no** puede auto-eliminarse.

---

## Consentimiento de salud versionado

Constante de app: `HEALTH_CONSENT_VERSION` en `src/lib/privacy/constants.ts` (hoy `2026-09-09`).

Columnas en `member_health_profiles`:

- `health_consent_at`
- `health_consent_version`
- `health_consent_policy_at`

Si la versión almacenada ≠ constante vigente, la API exige nuevo `health_consent: true` antes de guardar el perfil de salud. Respuesta incluye `consent_current` y `required_consent_version`.

Al cambiar el texto legal del aviso: **incrementar** `HEALTH_CONSENT_VERSION` y redeploy.

---

## MFA staff (decisión de producto — due diligence)

| Entorno                       | `REQUIRE_MFA_FOR_STAFF` | Justificación                                                |
| ----------------------------- | ----------------------- | ------------------------------------------------------------ |
| Producción (Render blueprint) | `false` (ADR-003)       | Recepción rápida en mostrador; MFA disponible en `/security` |
| Excepción documentada         | Firmada por ops         | Aceptar riesgo residual de cuentas staff sin TOTP            |

**Para cerrar hallazgo de auditoría sin forzar MFA aún:**

1. Enrolar todo el staff en `/security`.
2. Verificar con `npm run security:audit-mfa:prod -- --allow-prod`.
3. Cuando el enrolamiento sea 100 %, cambiar Render a `REQUIRE_MFA_FOR_STAFF=true` y redeploy.

No se considera gap de código la MFA opcional; sí es gap operativo staff sin enrolar + clave `MFA_ENCRYPTION_KEY` ausente.

---

## Checklist de verificación

```powershell
npm run db:migrate:dev
npm run test:privacy-checklist   # servidor en marcha + demo/checklist users
```

---

## Enlaces

- [DATOS-PERSONALES.md](./DATOS-PERSONALES.md)
- [ADR-003 MFA opcional](../adr/003-mfa-optional.md)
- [Sentry y alertas](./SENTRY-Y-ALERTAS.md)
- [OPS verify / backup](./OPS-VERIFY-CHECKLIST.md)
