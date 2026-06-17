# Notificaciones en Render — Gmail + Meta WhatsApp

Guía para activar email y WhatsApp en producción (Render) y desarrollo local.

---

## 1. Gmail SMTP

1. En tu cuenta Google: **Seguridad** → activar **Verificación en 2 pasos**
2. **Contraseñas de aplicaciones** → crear una para "Caribean Gym"
3. Añade en Render → **Environment** (Web Service):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM=Caribean Gym <tu@gmail.com>
ADMIN_NOTIFY_EMAILS=admin@gym.com,otro@correo.com
```

4. Reinicia el servicio
5. Dashboard → **Probar email** → badge **SMTP: Configurado**

> Usa la contraseña de aplicación, no tu contraseña normal de Gmail.

---

## 2. Meta WhatsApp Cloud API

Sigue la guía completa: [GUIA-WHATSAPP-META.md](./GUIA-WHATSAPP-META.md)

Variables mínimas en Render:

```env
WHATSAPP_PROVIDER=meta
WHATSAPP_ACCESS_TOKEN=EAA...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_API_VERSION=v21.0
```

En **desarrollo Meta**, registra cada número destino en el panel Meta (Manage phone number list).

---

## 3. Plantillas WhatsApp (producción)

Meta exige plantillas aprobadas para mensajes iniciados por el negocio. Crea en Meta Business Manager:

| Plantilla (nombre sugerido) | Variables body | Uso |
|----------------------------|----------------|-----|
| `membership_expiring` | nombre, plan, días | Vencimiento próximo |
| `membership_expired` | nombre, plan | Ya venció |
| `caribean_gym_alert` | nombre, mensaje | Pagos, rutinas, pruebas |

Variables opcionales en Render (defaults en código):

```env
WHATSAPP_TEMPLATE_EXPIRING=membership_expiring
WHATSAPP_TEMPLATE_EXPIRED=membership_expired
WHATSAPP_TEMPLATE_GENERIC=caribean_gym_alert
WHATSAPP_USE_TEMPLATES=true
```

Si la plantilla falla, el sistema intenta envío de texto plano (útil en dev).

---

## 4. Cron en Render (recomendado)

El cron interno (`EXPIRY_CRON_INTERVAL_MS`) solo corre mientras el web service está activo. Para mayor fiabilidad:

1. Genera un secreto: `openssl rand -base64 32`
2. Añade en **Web Service** → Environment:

```env
CRON_SECRET=tu_secreto_largo_aleatorio
```

3. Crea **Render Cron Job**:
   - **Schedule:** `0 * * * *` (cada hora)
   - **Command:**

```bash
curl -sS -X POST "https://TU-APP.onrender.com/api/settings/expiry/run" \
  -H "X-Cron-Secret: tu_secreto_largo_aleatorio"
```

El endpoint acepta `X-Cron-Secret` o `Authorization: Bearer <CRON_SECRET>`, además del login admin habitual.

---

## 5. Activar en el Dashboard

1. **Email activo** + **Email a miembros**
2. **WhatsApp activo** + **WhatsApp a miembros**
3. **Días de anticipación** (ej. 14)
4. **Resumen admin** (email diario)
5. **Guardar** → **Ejecutar ahora** para probar el job

Los miembros necesitan `email` y/o `phone` (+58412...) en su perfil.

---

## 6. Verificación

```bash
npm run test:notifications-checklist
```

Requiere servidor corriendo y usuario admin configurado.
