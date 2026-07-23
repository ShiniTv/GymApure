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

1. **Mensajes** → busca por nombre o cédula.
2. Si ya hay conversación, ábrela; si no, **Iniciar chat** con el miembro.
3. Responde consultas y avisos manuales.

La campana de notificaciones (admin/entrenador) enlaza membresías por vencer a `/members?expiring=true`.

El job de avisos de vencimiento (`POST /api/settings/expiry/run`) acepta `CRON_SECRET` o sesión **admin**.

### Avisos de vencimiento

El cron de vencimientos envía mensajes automáticos al chat del miembro, notificación in-app y, si SMTP está configurado, correo transaccional. Configurable en **Configuración → Alertas**.

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
