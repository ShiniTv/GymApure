# Verificación mensual de operaciones

Ejecutar una vez al mes y antes de una ventana de cambios importante. Registrar fecha, responsable,
entorno y enlace a la evidencia en el sistema interno; no guardar secretos ni datos personales en
este archivo.

## Gates

- [ ] **Smoke de staging:** desplegar la revisión candidata y ejecutar
      `npm run test:smoke:staging`. Guardar commit, fecha y salida.
- [ ] **Preparación de backup:** ejecutar `npm run db:backup-check` con el entorno operativo
      correcto. Confirmar que Supabase dispone de backup/PITR conforme al plan contratado y anotar
      la última restauración ensayada.
- [ ] **Alerta Sentry:** generar o verificar un evento controlado en staging, confirmar recepción,
      regla de alerta y destinatario. No provocar una excepción deliberada en producción.
- [ ] **Clave MFA dedicada:** confirmar que `MFA_ENCRYPTION_KEY` está definida en staging y
      producción, es independiente de `JWT_SECRET` y no aparece en logs. No exige activar MFA:
      `REQUIRE_MFA_FOR_STAFF` puede permanecer `false`.

## Evidencia mínima

- Fecha UTC y responsable.
- Commit/release verificado.
- Resultado de cada comando (pass/fail) y enlace al job o captura.
- Incidencia y fecha objetivo para cualquier gate fallido.

Un gate sin evidencia se considera pendiente. Consultar
[Rotación de secretos](./ROTACION-SECRETOS.md) antes de cambiar una clave.
