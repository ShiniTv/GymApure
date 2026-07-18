# Membresías y asistencia

Planes de membresía, check-in y registro de asistencia.

---

## Membresías (`/memberships` — admin)

### Crear plan

1. **Membresías** → **Nuevo plan**.
2. Nombre, duración en días, precio VES.
3. Activo/inactivo.

### Vigencia del miembro

- Se extiende al **aprobar un pago** vinculado al plan.
- Alertas de vencimiento según días configurados en Settings.
- **Pausar** congela días restantes; en recepción el lookup muestra estado `paused` con CTA **Reanudar** (no “sin membresía”).
- Check-in con membresía pausada → 403 con mensaje claro.

---

## Check-in

### Recepción (mostrador)

1. **Recepción** → **Entrada / Salida**.
2. Busca cédula → Autorizar entrada / Registrar salida.

### Modo tablet

`/check-in?kiosk=1` — interfaz simplificada. **Requiere sesión de recepcionista.**

> No hay API pública de kiosk. Seguridad Fase 1 eliminó endpoints anónimos.

---

## Asistencia global (`/attendance` — admin)

Reporte de entradas/salidas, filtros por fecha y miembro.

---

## Walk-in

Flujo unificado en recepción: datos + plan + pago + entrada. Ver [MANUAL-RECEPCION.md](../manual/MANUAL-RECEPCION.md).

---

## Tests

```bash
npm run test:memberships-checkin
npm run test:reception-checklist
```

---

## Enlaces

- [Pagos y tipo de cambio](./PAGOS-Y-TIPO-DE-CAMBIO.md)
- [Manual recepción](../manual/MANUAL-RECEPCION.md)
