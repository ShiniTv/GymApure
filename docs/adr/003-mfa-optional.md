# ADR-003: MFA staff opcional

## Estado

Aceptado (julio 2026)

## Contexto

Staff (admin/receptionist/trainer) puede necesitar TOTP, pero el gym opera con recepción rápida y no todos los dispositivos están listos para MFA obligatorio.

## Decisión

`REQUIRE_MFA_FOR_STAFF=false` por defecto. MFA disponible en `/security`. Secretos cifrados at-rest (`MFA_ENCRYPTION_KEY` preferido sobre derivar de `JWT_SECRET`).

## Consecuencias

- No se puntúa como gap de seguridad la MFA no obligatoria.
- Sí es gap: clave de cifrado dedicada ausente o secrets legacy sin re-encrypt.
- Activar obligatorio requiere enrolar staff antes del deploy.
