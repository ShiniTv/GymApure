# Chat y notificaciones

Dos sistemas complementarios: conversaciones en tiempo real y centro de avisos.

---

## Chat (`/messages`)

### Qué es

Mensajería 1 a 1 entre miembros y staff (admin, recepción, entrenador).

### Características

- WebSocket para mensajes en tiempo real
- Badge de no leídos en campana y en sheet "Más" (cliente)
- Historial persistente en base de datos

### Flujos

**Miembro → staff:**

1. **Mensajes** → selecciona conversación o inicia nueva.
2. Escribe y envía.

**Staff → miembro:**

1. **Mensajes** → busca miembro.
2. Responde consultas, avisos manuales.

### Avisos de vencimiento

El cron de vencimientos envía mensajes automáticos al chat del miembro (no correo por defecto). Configurable en **Configuración → Alertas**.

---

## Notificaciones (`/notifications`)

### Qué es

Centro de avisos del sistema (campana en header).

### Tipos comunes

| Tipo                    | Origen          |
| ----------------------- | --------------- |
| Vencimiento membresía   | Cron automático |
| Pago aprobado/rechazado | Flujo de pagos  |
| Inspección equipamiento | CMMS            |
| Rutina asignada         | Entrenador      |
| Sistema                 | Varios eventos  |

### Diferencia chat vs notificaciones

|             | Chat                       | Notificaciones                 |
| ----------- | -------------------------- | ------------------------------ |
| Formato     | Conversación bidireccional | Aviso unidireccional           |
| Respuesta   | Sí                         | No (enlaza a acción si aplica) |
| Tiempo real | WebSocket                  | Polling + WS según evento      |

---

## Push notifications (opcional)

Si `VAPID_*` está configurado, usuarios pueden activar push en Perfil. Requiere PWA instalada o navegador compatible.

---

## Tests

```bash
npm run test:chat-checklist
npm run test:alerts
```

---

## Enlaces

- [Manual administrador](../manual/MANUAL-ADMIN.md)
- [Equipamiento](./EQUIPAMIENTO.md) (alertas de inspección)
