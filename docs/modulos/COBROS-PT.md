# Cobros PT (entrenador privado)

Cobros de entrenamiento personalizado **solo entre entrenador y cliente asignado**.  
No usa la tabla `payments` ni los destinos de cobro del gym (`payment_destinations`).

**Ruta:** `/pt-billing`  
**Roles:** trainer (crear/confirmar); member (reportar con comprobante)

---

## Qué es / qué no es

| Sí                                                     | No                                |
| ------------------------------------------------------ | --------------------------------- |
| Tarifas del entrenador (`trainer_service_offers`)      | Membresía del gym                 |
| Datos de cobro del PT (`trainer_payment_destinations`) | Destinos admin en Configuración   |
| Facturas PT (`trainer_invoices`)                       | Aprobación → plan / BCV membresía |
| Solo miembros con `trainer_member_assignments`         | Admin/recepción viendo montos PT  |

---

## Flujo entrenador

1. **Más → Cobros PT** (o menú lateral).
2. Publica **Mis datos de cobro (PT)** (pago móvil, transferencia, Zelle, USDT/Binance, efectivo USD).
3. Elige **tasa de referencia**: BCV (oficial del gym) o **tasa euro** (Bs por 1 USD, valor manual del entrenador).
4. Opcional: guarda **tarifas** reutilizables.
5. **Nuevo cobro** → elige cliente asignado, concepto y monto USD (se muestra equivalente en Bs).
6. Cuando el cliente reporta (referencia ± comprobante) → **Confirmar** o **Rechazar** (motivo obligatorio).

---

## Flujo miembro

1. **Cuenta → Cobros PT**.
2. Ve cobros pendientes de su entrenador.
3. **Reportar pago** → elige método (incluye USDT), ve datos del entrenador, equivalente Bs según su tasa, referencia y comprobante opcional.
4. Espera confirmación del entrenador.

---

## API

Base: `/api/trainer-billing`

| Método   | Ruta                                              | Rol                                      |
| -------- | ------------------------------------------------- | ---------------------------------------- |
| GET/POST | `/offers`                                         | trainer                                  |
| PATCH    | `/offers/:id`                                     | trainer                                  |
| GET/PUT  | `/destinations`                                   | trainer                                  |
| GET      | `/destinations/:trainerId`                        | member (si asignado) o el propio trainer |
| GET      | `/rate-context`                                   | trainer                                  |
| GET      | `/rate-context/:trainerId`                        | member (si asignado)                     |
| PUT      | `/rate-preference`                                | trainer                                  |
| GET      | `/invoices`                                       | trainer \| member (solo los suyos)       |
| POST     | `/invoices`                                       | trainer (solo asignados)                 |
| POST     | `/invoices/:id/report`                            | member (multipart)                       |
| POST     | `/invoices/:id/confirm` \| `/reject` \| `/cancel` | trainer                                  |
| GET      | `/invoices/:id/proof`                             | trainer \| member de esa factura         |
| GET      | `/members`                                        | trainer (picker asignados)               |

Admin/receptionist **no** tienen endpoints de montos PT a propósito.

**Tasa euro:** preferencia del entrenador; no reemplaza el BCV de membresía del gym. El monto del cobro sigue en USD; solo cambia el equivalente en Bs mostrado.

---

## Seguridad (IDOR)

- Crear factura exige asignación activa (API + trigger DB).
- Confirmar/rechazar/comprobante: solo el `trainer_id` o `member_id` de la fila.
- Destinos de otro trainer: 403 si el miembro no está asignado.
- Ledger separado: no mezcla con `/api/payments`.

Ver también `npm run test:security-checklist` (casos PT).
