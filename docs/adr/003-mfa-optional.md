# ADR-003: MFA staff opcional

## Estado

Aceptado (julio 2026). Confirmado para due diligence 2026-09 (ver `docs/tecnico/privacy.md`).

## Contexto

Staff (admin/receptionist/trainer) puede necesitar TOTP, pero el gym opera con recepción rápida y no todos los dispositivos están listos para MFA obligatorio.

## Decisión

`REQUIRE_MFA_FOR_STAFF=false` por defecto (también en `render.yaml`). MFA disponible en `/security`. Secretos cifrados at-rest (`MFA_ENCRYPTION_KEY` preferido sobre derivar de `JWT_SECRET`).

**Postura due diligence:** la MFA opcional es una **excepción de producto documentada**, no un olvido. El path a obligatorio es: enrolar 100 % del staff → `security:audit-mfa:prod` limpio → `REQUIRE_MFA_FOR_STAFF=true` en Render.

## Consecuencias

- No se puntúa como gap de seguridad de código la MFA no obligatoria.
- Sí es gap: clave de cifrado dedicada ausente, secrets legacy sin re-encrypt, o staff sin enrolar ante una auditoría de cuentas.
- Activar obligatorio requiere enrolar staff antes del deploy.
