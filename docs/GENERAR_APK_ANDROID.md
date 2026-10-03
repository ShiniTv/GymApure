# Guía Oficial: Cómo Generar y Distribuir el APK de GymApure para Android

Esta guía te explica cómo obtener tu archivo instalable `.apk` de **GymApure** para instalarlo en cualquier teléfono Android o enviarlo a tus clientes y entrenadores por WhatsApp.

---

## Método 1: PWABuilder (Recomendado — Toma 3 minutos y $0 costo)

PWABuilder es la plataforma oficial de código abierto desarrollada por Microsoft y respaldada por Google para convertir aplicaciones web modernas en APKs oficiales de Android.

### Requisitos previos:

- Tu aplicación debe estar publicada en una URL HTTPS (por ejemplo `https://caribean-gym.onrender.com` o tu URL de Cloudflare Pages).
- Los archivos `public/manifest.webmanifest` y `public/sw.js` ya están configurados y cumplen con el 100% de los requisitos de Google Play Store.

### Pasos paso a paso:

1. Abre tu navegador e ingresa a: **[https://www.pwabuilder.com/](https://www.pwabuilder.com/)**
2. En la barra central, escribe o pega la URL de tu app:
   ```text
   https://caribean-gym.onrender.com
   ```
3. Haz clic en el botón **Start**.
4. PWABuilder auditará tu aplicación. Verás que tu puntuación es verde (PWA Score > 100).
5. Haz clic en el botón superior derecho: **Package for Stores**.
6. En la opción **Android**, haz clic en **Generate Package**.
7. En las opciones de descarga:
   - Puedes descargar el archivo `.apk` directamente listo para instalar.
   - O descargar el paquete completo con el código fuente de Android Studio y los certificados `.aab` por si deseas publicarlo en Google Play Store en el futuro.
8. **¡Listo!** Ya tienes tu archivo `.apk` de ~2.5 MB.

---

## Ventajas Clave de este APK (Trusted Web Activity - TWA)

1. **Auto-actualizable al 100%:**
   - A diferencia de las apps tradicionales que requieren que el usuario descargue una actualización cada vez que cambias un botón o corriges un texto, **este APK se actualiza solo en tiempo real**.
   - Cada vez que haces un deploy en tu servidor, el teléfono del usuario carga inmediatamente la versión más reciente.
2. **Notificaciones Push Nativas:**
   - El sistema de notificaciones que ya tiene tu backend (`web-push`) envía alertas de recordatorios de entrenamiento, mensajes de chat y confirmación de pagos directamente a la barra de notificaciones del celular.
3. **Pantalla Completa (Standalone):**
   - El usuario no ve barra de navegación, no ve dominios ni URLs. Al tocar el icono de GymApure en su celular, la app se abre a pantalla completa con su splash screen y barra de estado del color de tu marca (`#0c98ff`).

---

## Método 2: Instalación Directa PWA (Sin necesidad de enviar archivo APK)

Si un cliente o entrenador no sabe cómo instalar un archivo `.apk`:

1. El usuario abre el enlace de la web en Chrome o Brave en su teléfono Android.
2. La app detectará su dispositivo y le mostrará el botón automático:
   **"Instalar GymApure en tu dispositivo"**.
3. El usuario pulsa el botón y la app se agrega a su pantalla de inicio como una aplicación nativa.
