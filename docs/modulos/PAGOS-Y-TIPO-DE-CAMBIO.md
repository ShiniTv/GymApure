# Pagos y tipo de cambio

Gestión de pagos de membresía, comprobantes y conversión USD/VES con tasa BCV.

**Ruta:** `/payments`  
**Roles:** admin, receptionist (gestión); member (propios pagos)

---

## Flujo: registrar pago (recepción/admin)

**Objetivo:** Registrar un pago con comprobante para aprobación.

1. Abre **Pagos** → **Nuevo pago**.
2. Selecciona el **miembro**.
3. Elige **plan** o monto.
4. El sistema muestra equivalente en USD si hay tasa BCV activa.
5. Sube **comprobante** (imagen o PDF).
6. Guarda como pendiente.

**Resultado esperado:** Pago en estado `pending`; admin puede aprobar/rechazar.

---

## Flujo: aprobar o rechazar (admin)

1. **Pagos** → filtra por `pending` (o busca por nombre/referencia).
2. Revisa comprobante (clic para ampliar).
3. **Aprobar** → **elige el plan** a asignar (obligatorio) → activa/extiende membresía del miembro.
4. **Rechazar** → **indica el motivo** (obligatorio) → el miembro ve el motivo y recibe notificación.

> Ya no se “detecta” el plan por monto: evita asignar un plan incorrecto.

Staff puede buscar con `?q=` (nombre del miembro o referencia del pago).

---

## Tipo de cambio BCV

### Automático

- El servidor actualiza la tasa periódicamente (cron + scraper bcv.org.ve).
- En producción: cron in-process + opcional Render Cron Job con `CRON_SECRET`.

### Manual (override)

1. **Configuración** → sección **Tasa de cambio USD**.
2. Ver tasa actual, última actualización y fuente.
3. Para override: ingresa valor manual → Guardar.
4. Los pagos nuevos usan la tasa vigente.

**Variables:** ver [VARIABLES-ENTORNO.md](../tecnico/VARIABLES-ENTORNO.md) (`EXCHANGE_RATE_CRON_IN_DEV`).

### Si BCV no está disponible

El sistema conserva la última tasa conocida. Admin puede fijar override manual hasta que el scraper recupere.

---

## Flujo: miembro consulta pagos

1. Cliente → **Más** → **Pagos** (móvil) o menú **Pagos** (desktop).
2. Ve historial, estado y montos en VES/USD según configuración.

---

## Comprobantes (Storage)

Bucket `payment-proofs` (privado). Solo acceso vía API autenticada.

---

## Notificaciones

- Pago aprobado/rechazado: notificación in-app y correo (si SMTP configurado).
- Vencimiento de membresía: chat in-app (no correo por defecto).

---

## Tests

```bash
npm run test:payments-checklist
npm run test:exchange-rate
```

---

## Enlaces

- [Manual administrador](../manual/MANUAL-ADMIN.md)
- [Manual recepción](../manual/MANUAL-RECEPCION.md)
- [Membresías y asistencia](./MEMBRESIAS-Y-ASISTENCIA.md)
