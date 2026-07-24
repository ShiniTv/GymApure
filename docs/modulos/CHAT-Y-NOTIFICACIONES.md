# Chat y notificaciones

Dos sistemas complementarios: conversaciones en tiempo real y centro de avisos.

---

## Chat (`/messages`)

### Qué es

Mensajería por **canal de rol** entre miembros y staff. Cada miembro puede tener hasta tres chats separados:

| Canal (`channel`) | Quién escribe como staff | Uso típico                  |
| ----------------- | ------------------------ | --------------------------- |
| `receptionist`    | Recepción                | Pagos, membresía, mostrador |
| `admin`           | Administración           | Consultas administrativas   |
| `trainer`         | Entrenador (asignado)    | Rutinas y coaching          |

Los mensajes de un canal **no** aparecen en los otros. Admin no ve el hilo de recepción ni el de entrenador (y viceversa).

### Características

- WebSocket con rooms por rol (`staff:admin`, `staff:receptionist`, `staff:trainer`)
- Badge de no leídos por canal (agregado en campana / sheet)
- Historial persistente; identidad de conversación = `(member_id, channel)`

### Flujos

**Miembro → staff:**

1. **Mensajes** → elige canal (Recepción / Administración / Entrenador).
2. Escribe y envía en ese hilo.

**Staff → miembro:**

1. **Mensajes** → busca por nombre o cédula (solo conversaciones de **su** canal).
2. Si ya hay conversación en su canal, ábrela; si no, **Iniciar chat** crea `(miembro, miRol)`.
3. Responde consultas y avisos manuales.

### Mensajes automáticos del sistema

Se insertan en el canal operativo del tema (no en un canal “Sistema” genérico):

| Evento                                 | Canal                                        |
| -------------------------------------- | -------------------------------------------- |
| `payment_approved`, `payment_rejected` | `receptionist`                               |
| `expiring_soon`, `expired`             | `receptionist`                               |
| `routine_assigned`                     | `trainer`                                    |
| `payment_reported`                     | Solo notificación in-app al staff (sin chat) |

La campana de notificaciones (admin/entrenador) enlaza membresías por vencer a `/members?expiring=true`.

El job de avisos de vencimiento (`POST /api/settings/expiry/run`) acepta `CRON_SECRET` o sesión **admin**.

### Avisos de vencimiento

El cron de vencimientos envía mensajes automáticos al chat de **recepción** del miembro, notificación in-app y, si SMTP está configurado, correo transaccional. Configurable en **Configuración → Alertas**.

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

Si `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` están configurados:

- Toggle en **Perfil** y tarjeta de onboarding en inicio member.
- El service worker (`public/sw.js`) solo se registra en builds de producción.
- **Android / Chrome:** push en barra y pantalla de bloqueo con la app cerrada.
- **iOS:** requiere PWA instalada (Añadir a Inicio) y Safari 16.4+.
- Tras rotación de VAPID, el SW emite `pushsubscriptionchange` y el cliente re-suscribe en silencio si el permiso sigue en `granted`.

El temporizador de **descanso del workout** no usa este push de servidor: usa notificaciones locales vía el mismo SW (ver [Móvil y PWA](./MOVIL-Y-PWA.md)).
