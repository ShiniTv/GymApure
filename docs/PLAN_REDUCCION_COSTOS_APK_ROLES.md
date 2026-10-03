# Plan Estratégico: Reducción a Costo $0, Conversión a APK y Foco Entrenador-Cliente

Este documento detalla la arquitectura implementada por ingeniería para:

1. **Reducir el gasto de infraestructura de ~$21/mes a $0.00**.
2. **Eliminar la dependencia de pagos por dominios personalizados**.
3. **Pausar los roles de Admin y Recepción** (sin borrar una sola línea de código).
4. **Convertir el sistema en un APK instalable para Android**.

---

## 1. Arquitectura de Roles: Modo Coaching vs Modo Full Gym

Se implementó el módulo [`src/config/appMode.ts`](../src/config/appMode.ts), el cual controla la operatividad de la plataforma mediante la variable de entorno `VITE_APP_MODE`.

### Modos Disponibles:

- **`coaching` (Por defecto / Activo ahora):**
  - Todo el sistema se enfoca en **Entrenador ↔ Cliente**.
  - Las pantallas de recepción física, torniquetes (`/check-in`), inventario de equipos, reportes globales de sede y planes de membresía corporativa se encuentran **hibernadas**.
  - Si un usuario registrado con rol `admin` o `receptionist` inicia sesión, el sistema le entrega automáticamente la interfaz completa de **Entrenador** (`trainer`), permitiéndole crear rutinas, ver ejercicios, cobrar entrenamientos y gestionar alumnos.
  - Ninguna ruta de recepción aparece en la barra de navegación, menús ni en la paleta de comandos (`Ctrl+K`).
- **`full_gym` (Gimnasio Corporativo):**
  - Reactiva instantáneamente todos los módulos: recepción, torniquetes, equipos, auditoría y administración.

### ¿Cómo alternar entre modos?

En tu archivo `.env` o en las variables de entorno de tu hosting:

```env
# Modo actual enfocado en entrenadores y clientes:
VITE_APP_MODE=coaching

# Para cuando vendas el software a una cadena de gimnasios:
VITE_APP_MODE=full_gym
```

_(No requiere migraciones de base de datos ni modificaciones de código)._

---

## 2. Plan Costo CERO ($0 / mes) para Hosting y Dominio

### Diagnóstico de Costos en Render:

Tu factura actual en Render sumaba ~$21 USD/mes porque tenías 3 servicios activos en [`render.yaml`](../render.yaml):

1. Servicio Web (`caribean-gym`): ~$7 USD.
2. Servicio Background Worker (`caribean-gym-worker`): ~$7 USD.
3. Servicio Redis KeyValue (`caribean-gym-kv`): ~$7 USD.

### Pasos Inmediatos para Ahorrar en Render (Hoy mismo):

1. **Apagar el Worker:**
   - Tu código en `server.ts` ya tiene soporte nativo para monolito (`PROCESS_ROLE=all`).
   - Los crons de tasa BCV, vencimientos y recordatorios pueden correr dentro del mismo servidor web de Node.
   - En el Dashboard de Render, puedes **suspender o eliminar el servicio `caribean-gym-worker`** (Ahorro: $7/mes).
2. **Apagar el Redis de Pago:**
   - La base de datos PostgreSQL en Supabase y la memoria local del servidor ya gestionan la autenticación y las sesiones.
   - Si requieres colas BullMQ distribuidas, puedes usar [Upstash Redis](https://upstash.com/), que ofrece **10,000 comandos diarios 100% GRATIS** para siempre.
   - En Render, elimina el servicio `caribean-gym-kv` y borra la variable de pago (Ahorro: $7/mes).
3. **Poner el Web Service en Plan Free:**
   - Puedes cambiar el plan del Web Service de "Starter" ($7) a "Free" ($0).
   - _Nota del Free tier:_ Render duerme los servicios gratuitos tras 15 minutos sin peticiones. Para mantenerlo 100% despierto y respondiendo en milisegundos, crea un monitor gratuito en [UptimeRobot.com](https://uptimerobot.com/) que haga un ping cada 10 minutos a tu URL `/api/health/live`.

---

## 3. Despliegue en Cloudflare Pages + Koyeb / Render (Costo Total: $0.00)

La combinación más rápida y profesional recomendada:

### Frontend: Cloudflare Pages (100% Gratis para siempre)

- **Ventajas:**
  - Ancho de banda ilimitado.
  - Certificado SSL automático de por vida.
  - CDN global ultrarrápida (los clientes y entrenadores cargan la app al instante).
  - Subdominio gratuito: `https://gymapure.pages.dev` (sin pagar un solo centavo por renovación de dominio).
- **Despliegue:**
  1. Conecta tu repositorio de GitHub a [Cloudflare Pages](https://pages.cloudflare.com/).
  2. Framework preset: **Vite**.
  3. Build command: `npm run build`.
  4. Output directory: `dist`.
  5. Ya creamos el archivo [`public/_redirects`](../public/_redirects) para que todas las rutas SPA funcionen sin error 404 al recargar.

### Dominio:

- Al usar la APK o la PWA instalada en el teléfono, **el usuario nunca ve la URL**. Se abre en pantalla completa con el icono y nombre de tu aplicación.
- Por tanto, pagar $15 o $20 anuales por un dominio comercial deja de ser necesario en esta etapa.

---

## 4. Convertir el Sistema en APK para Android

Tu aplicación ya cuenta con:

- `public/manifest.webmanifest` configurado (icono, color de barra, orientación vertical, nombre).
- `public/sw.js` (Service Worker para soporte offline y cacheo inteligente).
- Vistas móviles optimizadas para teléfonos (`MemberBottomNav`, gestos táctiles, pantalla completa).

### Método Recomendado: TWA (Trusted Web Activity) con PWABuilder / Bubblewrap

Este es el estándar oficial de Google para transformar PWAs en archivos `.apk` reales para Android.

#### ¿Por qué es la mejor opción?

1. **Tamaño súper liviano:** El archivo `.apk` pesa apenas **2 a 3 MB** (ideal para que tus usuarios lo descarguen rápido por WhatsApp o enlace directo).
2. **Actualizaciones en tiempo real:** No necesitas compilar ni volver a mandar un APK cada vez que corrijas un botón o agregues una función; cada cambio que subas a tu servidor web se refleja automáticamente en la app del teléfono.
3. **Notificaciones Push:** Compatible de fábrica con las notificaciones Web Push (`web-push`) que tu backend ya tiene programadas.

#### Pasos para generar tu APK en 3 minutos:

1. Abre [PWABuilder.com](https://www.pwabuilder.com/) (herramienta gratuita respaldada por Microsoft y Google).
2. Introduce la URL de tu aplicación (ejemplo: `https://gymapure.pages.dev` o tu URL actual).
3. Haz clic en **Start** y verifica que el score de PWA sea superior a 100 puntos.
4. Haz clic en **Package for Stores** y selecciona **Android**.
5. Descarga el archivo `.apk` firmado listo para instalar o el paquete para Google Play Store.
