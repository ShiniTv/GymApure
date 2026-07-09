# Manual de recepción

Guía para el rol **receptionist** (recepcionista).

---

## Permisos

### Puede hacer

- Panel de recepción: walk-in, entrada/salida
- Check-in por cédula (mostrador y modo tablet)
- Ver y crear miembros
- Registrar y consultar pagos
- Ver equipamiento y reportar mantenimiento
- Mensajes con miembros

### No puede hacer

- Acceder a Configuración, Reportes, Membresías, Entrenadores, Auditoría
- Aprobar pagos (solo admin)
- Crear rutinas o gestionar nutrición

---

## Inicio de sesión

1. `/login` con cuenta de recepcionista.
2. Redirige al **Panel de recepción** o **Inicio**.

---

## Navegación móvil

Bottom nav (pill flotante):

| Tab      | Destino     |
| -------- | ----------- |
| Inicio   | `/`         |
| Miembros | `/members`  |
| Pagos    | `/payments` |
| Mensajes | `/messages` |

Drawer lateral (swipe): acceso a Check-in, Equipamiento, Perfil, Cerrar sesión.

---

## Flujos principales

### Walk-in (nuevo visitante)

**Objetivo:** Registrar visitante, plan, pago y entrada en un solo flujo.

1. **Recepción** → pestaña **Registro**.
2. Wizard paso a paso:
   - Datos personales (nombre, cédula, contacto)
   - Selección de plan
   - Registro de pago (comprobante)
   - Check-in de entrada
3. Confirmar.

**Resultado esperado:** Miembro creado, pago pendiente de aprobación (admin), entrada registrada.

### Entrada / salida por cédula

1. **Recepción** → pestaña **Entrada / Salida**.
2. Busca por cédula (ej. `V-12345678`).
3. El sistema muestra estado de membresía.
4. **Autorizar entrada** o **Registrar salida**.

### Modo tablet (check-in dedicado)

1. Desde Inicio recepción: **Modo tablet** o **Abrir mostrador**.
2. Abre `/check-in?kiosk=1` (requiere sesión activa).
3. Interfaz simplificada para tablet en mostrador.

> No existe API pública de kiosk. Siempre requiere login de recepcionista.

### Registrar pago

1. **Pagos** → **Nuevo pago**.
2. Selecciona miembro, plan, sube comprobante.
3. El admin aprueba posteriormente.

Ver [PAGOS-Y-TIPO-DE-CAMBIO.md](../modulos/PAGOS-Y-TIPO-DE-CAMBIO.md).

### Reportar problema de equipamiento

1. **Equipamiento** → localiza máquina.
2. **Nuevo evento** de mantenimiento o cambio de estado.

---

## Errores comunes

| Problema                         | Solución                                                 |
| -------------------------------- | -------------------------------------------------------- |
| Cédula no encontrada             | Verificar formato `V-` o `E-`; crear miembro si es nuevo |
| Membresía vencida                | Informar al miembro; registrar pago para renovación      |
| No puedo acceder a Configuración | Normal — ese módulo es solo admin                        |

---

## Enlaces

- [Membresías y asistencia](../modulos/MEMBRESIAS-Y-ASISTENCIA.md)
- [Manual administrador](./MANUAL-ADMIN.md) (flujos de aprobación)
- [Móvil y PWA](../modulos/MOVIL-Y-PWA.md)
