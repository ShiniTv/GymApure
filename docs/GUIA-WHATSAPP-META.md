# Guía paso a paso — WhatsApp con Meta Cloud API

Configura WhatsApp Business para Caribean Gym usando la **Meta WhatsApp Cloud API** (ya integrada en el proyecto).

**Tiempo estimado (modo prueba):** 30–45 min  
**Costo inicial:** gratis en sandbox / números de prueba  
**Para producción real:** verificación de negocio Meta + plantillas de mensaje

---

## Qué vas a lograr

- Probar **Probar WhatsApp** desde el Dashboard (admin)
- Enviar alertas a miembros (vencimiento, pagos, rutinas) si tienen teléfono en el perfil
- Badge **WhatsApp: Configurado** en lugar de *Mock / sin credenciales*

---

## Antes de empezar

| Requisito | Detalle |
|-----------|---------|
| Cuenta Facebook/Meta | Personal, verificada |
| Meta Business (recomendado) | [business.facebook.com](https://business.facebook.com) — crea “Caribean Gym” |
| Teléfono de prueba | Tu móvil con WhatsApp (formato `+58412xxxxxxx`) |
| Servidor local | `npm run dev` corriendo |

---

## Parte 1 — Modo desarrollo / prueba (haz esto primero)

### Paso 1: Crear app en Meta for Developers

1. Entra en [developers.facebook.com](https://developers.facebook.com)
2. **Mis apps** → **Crear app**
3. Tipo: **Otro** → **Negocio**
4. Nombre: `Caribean Gym`
5. Email de contacto: tu correo
6. Asocia tu **Portfolio comercial** (Business) si te lo pide

### Paso 2: Añadir producto WhatsApp

1. En el panel de la app → **Añadir productos**
2. Busca **WhatsApp** → **Configurar**
3. Te lleva a **WhatsApp → API Setup** (Configuración de API)

### Paso 3: Copiar credenciales temporales

En **API Setup** verás:

| Campo en Meta | Variable en `.env` |
|---------------|-------------------|
| **Temporary access token** (token temporal) | `WHATSAPP_ACCESS_TOKEN` |
| **Phone number ID** (ID del número de prueba) | `WHATSAPP_PHONE_NUMBER_ID` |

> El token temporal dura ~24 h. Sirve para probar. En producción usarás un **token permanente** (Parte 2).

### Paso 4: Registrar tu número como destinatario de prueba

Meta solo permite enviar a números autorizados mientras la app está en desarrollo.

1. En la misma página **API Setup**, baja a **To** (Para) / **Manage phone number list**
2. **Add phone number** → ingresa tu WhatsApp en formato internacional: `+584121234567`
3. Recibes un código por WhatsApp → confírmalo

Repite si quieres probar con otro teléfono (otro admin, etc.).

### Paso 5: Configurar `.env`

Añade o completa en la raíz del proyecto:

```env
WHATSAPP_PROVIDER=meta

WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxx...pega_el_token_de_meta
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_API_VERSION=v21.0
```

Guarda el archivo.

### Paso 6: Reiniciar el servidor

```powershell
# Ctrl+C en la terminal del servidor, luego:
npm run dev
```

Node **no** recarga `.env` solo; hay que reiniciar.

### Paso 7: Probar desde el Dashboard

1. Login como **admin** → [http://localhost:3000](http://localhost:3000)
2. **Dashboard** → sección **Notificaciones (Email / WhatsApp)**
3. Verifica el badge: **WhatsApp: Configurado (Meta Cloud API)**
4. En **Enviar prueba**, escribe tu número: `+584121234567` (o `04121234567` — el sistema añade `58`)
5. Pulsa **Probar WhatsApp**
6. Deberías recibir el mensaje en WhatsApp en segundos

**Checklist automático (opcional):**

```bash
npm run test:notifications-checklist
```

### Paso 8: Teléfonos de miembros

Para que un miembro reciba alertas automáticas:

1. Debe tener **teléfono** en su perfil (formato Venezuela: `0414…` o `+58414…`)
2. En Dashboard, activa **WhatsApp Activo** y **WhatsApp a miembros**
3. Pulsa **Guardar**

---

## Parte 2 — Producción (cuando vayas a Render / clientes reales)

### 2.1 Token permanente (no expira en 24 h)

1. [business.facebook.com](https://business.facebook.com) → **Configuración del negocio** → **Usuarios del sistema**
2. **Añadir** → crea un usuario del sistema (ej. `caribean-gym-api`)
3. Asígnale activos: tu app de WhatsApp + permiso **WhatsApp Business Management**
4. Genera un **token de acceso** con permisos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Sustituye `WHATSAPP_ACCESS_TOKEN` en Render por ese token

### 2.2 Número de WhatsApp del gym (no el de prueba de Meta)

1. En Meta Developers → WhatsApp → **Phone numbers**
2. Añade un número real del negocio (puede ser línea móvil con WhatsApp Business)
3. Verifica por SMS/voz
4. Actualiza `WHATSAPP_PHONE_NUMBER_ID` con el ID del número **producción**

### 2.3 Plantillas de mensaje (importante)

En producción, los mensajes **iniciados por el gym** (alertas automáticas sin que el cliente escriba primero) deben usar **plantillas aprobadas** por Meta.

Ejemplos que necesitarás crear en **WhatsApp Manager → Plantillas de mensajes**:

| Uso en Caribean Gym | Ejemplo de plantilla |
|---------------------|----------------------|
| Membresía por vencer | `Hola {{1}}, tu membresía "{{2}}" vence en {{3}} días.` |
| Pago aprobado | `Hola {{1}}, tu pago de ${{2}} USD fue aprobado.` |
| Rutina asignada | `Hola {{1}}, tienes una nueva rutina: "{{2}}".` |

> **Estado actual del código:** envía texto libre. Funciona en **modo prueba** y dentro de la ventana de 24 h si el usuario te escribió. Para producción masiva, habrá que adaptar el código a plantillas (próximo sprint).

### 2.4 Variables en Render

En el servicio web → **Environment**:

```
WHATSAPP_PROVIDER=meta
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_API_VERSION=v21.0
```

Redeploy después de guardar.

---

## Formato de teléfonos (Venezuela)

El proyecto normaliza automáticamente:

| Lo que escribes | Se envía como |
|---------------|---------------|
| `04121234567` | `584121234567` |
| `+584121234567` | `584121234567` |
| `584121234567` | `584121234567` |

Mínimo 10 dígitos. Sin teléfono válido en el perfil → no se envía WhatsApp a ese miembro.

---

## Solución de problemas

| Síntoma | Causa probable | Qué hacer |
|---------|----------------|-----------|
| Badge sigue *Mock* | `.env` sin vars o servidor sin reiniciar | Revisa vars y `npm run dev` de nuevo |
| `(#131030) Recipient phone number not in allowed list` | Número no registrado como prueba | Añádelo en API Setup → phone list |
| Token expirado | Token temporal (~24 h) | Genera uno nuevo o usa token permanente |
| `401 Unauthorized` | Token incorrecto o revocado | Regenera token en Meta |
| Mensaje no llega | Formato de teléfono | Usa `+58…` |
| Error en producción con clientes nuevos | Falta plantilla aprobada | Crea plantillas en WhatsApp Manager |

Revisa la **consola del servidor** (`npm run dev`): errores de Meta aparecen como `[whatsapp:meta] Graph API error: …`

---

## Alternativa: Twilio WhatsApp

Si prefieres onboarding más guiado (de pago):

```env
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

Sandbox Twilio: solo números que hayas unido al sandbox. Ver `.env.example`.

---

## Resumen rápido (checklist)

- [ ] App Meta Developers + producto WhatsApp
- [ ] Copiar `WHATSAPP_ACCESS_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`
- [ ] Registrar tu móvil como número de prueba en Meta
- [ ] Pegar vars en `.env` + `WHATSAPP_PROVIDER=meta`
- [ ] Reiniciar `npm run dev`
- [ ] Dashboard → badge **Configurado** → **Probar WhatsApp**
- [ ] (Producción) Token permanente + número del gym + plantillas Meta

---

## Enlaces útiles

- [Meta WhatsApp Cloud API — Get Started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [API Setup (panel)](https://developers.facebook.com/apps/)
- [Plantillas de mensajes](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Precios WhatsApp Business](https://developers.facebook.com/docs/whatsapp/pricing)
