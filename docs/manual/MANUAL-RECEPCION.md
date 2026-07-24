# Manual de recepción

Guía para el rol **receptionist** (recepcionista / mostrador).

---

## Permisos

### Puede hacer

- Panel de recepción: walk-in, entrada/salida, KPIs del día
- Check-in por cédula (mostrador y modo tablet)
- Ver y crear miembros (solo rol `member`)
- **Registrar pagos** en mostrador para un miembro existente
- **Aprobar y rechazar** pagos pendientes (renovaciones y reportes de la app)
- Asignar membresía **vinculada a un pago aprobado**
- Corregir cédula de un miembro desde el lookup del mostrador
- Ver equipamiento y reportar mantenimiento
- Mensajes con miembros

### No puede hacer

- Acceder a Configuración, Reportes, Membresías (CRUD de planes), Entrenadores, Auditoría, Asistencia analítica
- Crear staff (entrenadores, admin, otros recepcionistas)
- Desactivar o eliminar miembros
- Asignar membresía sin vincular un pago aprobado
- Crear rutinas o gestionar nutrición

---

## Inicio de sesión

1. `/login` con cuenta de recepcionista.
2. Redirige automáticamente a **`/reception`** (Inicio / Mostrador).

---

## Navegación

### Escritorio (sidebar)

| Sección     | Ítems                                     |
| ----------- | ----------------------------------------- |
| Mostrador   | Inicio, Check-in (modo mostrador), Clases |
| Operaciones | Miembros, Equipamiento, Pagos, Mensajes   |
| Cuenta      | Mi Perfil, Seguridad MFA                  |

### Móvil (bottom nav)

| Tab (aria-label) | Destino                                   |
| ---------------- | ----------------------------------------- |
| Acceso           | Mostrador / check-in                      |
| Miembros         | `/members`                                |
| Pagos            | `/payments`                               |
| Mensajes         | `/messages`                               |
| Más              | Tablet, Clases, Equipamiento, MFA, Perfil |

---

## Flujos principales

### Walk-in (nuevo visitante con pago hoy)

**Objetivo:** Registrar visitante, cobrar, activar membresía y opcionalmente autorizar entrada.

1. **Recepción** → **Modo mostrador** → pestaña **Registro** (o walk-in desde cédula no encontrada).
2. Wizard paso a paso:
   - Datos personales (nombre, cédula, contacto, turno)
   - Selección de plan
   - Registro de pago (método, referencia, comprobante opcional)
   - Confirmación y check-in opcional
3. Confirmar.

**Resultado:** Miembro creado, pago **aprobado** de inmediato, membresía activa, email de contraseña (o contraseña temporal si falla el correo).

### Entrada / salida por cédula

1. **Recepción** → **Modo mostrador** → pestaña **Acceso**.
2. Busca por cédula (ej. `V-12345678`).
3. El sistema muestra estado de membresía y si puede ingresar o salir.
4. **Autorizar entrada** (F1) o **Registrar salida** (F2).

Si la membresía está vencida, aparecen accesos directos a **Registrar pago**, **Asignar plan** o **Ver pendientes**.

### Renovación (miembro existente)

1. Lookup por cédula → **Registrar pago** (desde el aviso o en **Pagos**).
2. Seleccionar miembro, monto, método y comprobante.
3. El pago queda **pendiente** hasta aprobación.
4. En **Pagos**, **Aprobar** → se extiende la membresía automáticamente.

Alternativa manual: **Asignar plan** en Miembros requiere elegir un **pago aprobado** del mismo miembro.

### Modo tablet (check-in dedicado)

1. Desde Inicio recepción o menú **Más** → **Modo tablet / Check-in**.
2. Abre `/check-in?kiosk=1` (requiere sesión activa de recepcionista).
3. Interfaz simplificada para tablet en mostrador.

> No existe API pública de kiosk. Siempre requiere login de recepcionista u administrador.

### Registrar pago en mostrador

1. **Pagos** → **Registrar pago**.
2. Selecciona miembro, plan (referencia de monto), método y comprobante.
3. Aprueba el pago desde la misma pantalla cuando corresponda.

Ver [PAGOS-Y-TIPO-DE-CAMBIO.md](../modulos/PAGOS-Y-TIPO-DE-CAMBIO.md).

### Corregir cédula

1. En **Modo mostrador** → buscar miembro.
2. **Corregir cédula** en el panel del miembro.
3. Guardar (valida formato y unicidad).

### Reportar problema de equipamiento

1. **Equipamiento** → localiza máquina.
2. **Nuevo evento** de tipo reporte de mantenimiento.

### Clases del día

1. **Clases del día** (`/clases`) desde sidebar o **Más** en móvil.
2. Revisa cupos y lista de inscritos de las sesiones de hoy.
3. Coordina con entrenadores si hay overbooking o cancelaciones.

### Seguridad MFA

1. **Más** → **Seguridad MFA** (`/security`) o desde Perfil.
2. Activa verificación en dos pasos con app TOTP.

---

## Errores comunes

| Problema                         | Solución                                                           |
| -------------------------------- | ------------------------------------------------------------------ |
| Cédula no encontrada             | Verificar formato `V-` o `E-`; usar **Iniciar walk-in** con cédula |
| Membresía vencida                | **Registrar pago** → aprobar, o walk-in si es cliente nuevo        |
| No puedo asignar plan            | Debe existir un **pago aprobado** para ese miembro                 |
| No puedo acceder a Configuración | Normal — ese módulo es solo admin                                  |

---

## Enlaces

- [Membresías y asistencia](../modulos/MEMBRESIAS-Y-ASISTENCIA.md)
- [Manual administrador](./MANUAL-ADMIN.md)
- [Móvil y PWA](../modulos/MOVIL-Y-PWA.md)
