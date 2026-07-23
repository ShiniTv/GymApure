# Móvil y PWA

Comportamiento de la interfaz móvil, navegación inferior y aplicación instalable.

---

## Breakpoints

| Viewport | Comportamiento                          |
| -------- | --------------------------------------- |
| < 1024px | Shell móvil: bottom nav, drawer lateral |
| ≥ 1024px | Sidebar fijo desktop                    |

---

## Cliente (member)

### Bottom nav pill

Tabs: **Inicio**, **Rutinas**, **Nutrición**, **Más**. Cada tab muestra icono + etiqueta corta visible.

### Sheet Más

Mensajes, Reservas, Biblioteca, Historial, Pagos, Mi Perfil. Accesible desde tab Más.
Oculta en `/workout/:id` (entrenamiento inmersivo).

### FAB "Entrenar"

- Visible en `/routines`, `/exercises`, `/nutrition` (si hay rutina activa)
- Oculto en Inicio (`/panel`): el hero ya muestra el CTA de entrenar
- Oculto durante workout (`/workout/:id`)
- Anclado a la pill inferior (`--member-fab-overlap` / `--member-fab-protrude`)

### Drawer sidebar

Swipe desde borde izquierdo. Footer (tema, perfil, cerrar sesión) pegado al fondo del drawer.

### Pull-to-refresh

Disponible en Inicio, Rutinas e Historial. Recepción: PTR en resumen/KPIs.

### Offline

- Banner rojo cuando no hay conexión
- Service Worker cachea assets estáticos
- Cola offline de series en workout activo (sync al recuperar red)
- Cache local de la última rutina cargada
- Botón Reintentar en vistas con error de red

---

## Recepción

Bottom nav: **Acceso** (mostrador), Miembros, Pagos, Mensajes + Más (Resumen, Modo tablet, Equipamiento, Clases, MFA, Perfil).

En móvil, `/reception` abre por defecto el modo mostrador (`mode=counter`); el resumen queda como home secundaria vía Más / Salir del mostrador.

Admin también puede abrir `/reception` y `/check-in` (cubre mostrador).

---

## Entrenador

Bottom nav: Panel, Miembros, Rutinas, Mensajes + Más (Nutrición, asignaciones/calendario, Clases, Ejercicios, Equipamiento, MFA, Perfil).
Al abrir drawer: bottom nav oculta; footer sin hueco inferior.

Lista de miembros: tap en tarjeta → ficha rápida (`MemberQuickSheet`) con Ver rutinas / Mensaje / Historial / Nutrición.

---

## Admin móvil

Bottom nav: Panel, Miembros, Pagos, Mensajes, Más (incluye Mostrador, Modo tablet, Solicitudes demo, etc.).

---

## PWA (instalación)

1. Chrome/Edge móvil → menú → **Instalar app** / **Añadir a inicio**.
2. Icono en pantalla de inicio.
3. `InstallPrompt` en sidebar desktop.
4. En inicio member: tarjeta opcional para activar push tras instalar / primera visita.

### Push (opcional)

Requisitos para avisos con la app cerrada:

1. En el servidor: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` (ver [DEPLOY](../DEPLOY.md); el preflight avisa si faltan).
2. Build de **producción** (el service worker `/sw.js` solo se registra fuera de Vite dev).
3. El usuario concede permiso (tarjeta en inicio member o Perfil → Notificaciones push).
4. **iPhone:** Safari 16.4+ y la PWA añadida a **Inicio** (en pestaña suelta el push no suele funcionar).

Tras rotar claves VAPID, la app intenta re-suscribirse sola si el permiso sigue concedido; si no, el usuario reactiva en Perfil.

### Checklist QA en dispositivo real

Usar build de producción (o preview `npm run build && npm run preview`) con VAPID configurado. Marcar en [UX-QA](../UX-QA.md) al cerrar.

**Android (Chrome)**

- [ ] Inicio member muestra tarjeta “Activa avisos…” (si no está ya suscrito / no dismissed)
- [ ] **Activar notificaciones** → permiso del sistema → estado activo
- [ ] Perfil → Seguridad: toggle Activar/Desactivar coherente
- [ ] Con app en segundo plano: mensaje del gym genera notificación (o aviso in-app si el OS bloquea)
- [ ] Opcional: Instalar app / Añadir a inicio desde el menú del navegador

**iPhone (Safari 16.4+)**

- [ ] Sin PWA: tarjeta **“Añadir a Inicio para avisos”** visible en inicio (aunque Safari no tenga PushManager)
- [ ] Compartir → Añadir a Inicio → abrir desde el icono (standalone)
- [ ] Tras abrir desde Inicio: Perfil → Seguridad permite **Activar** push (si VAPID ok)
- [ ] En pestaña Safari suelta (sin Inicio): no exige push; copy de Añadir a Inicio en Settings/Perfil si aplica

**Escritorio**

- [ ] Sidebar: prompt de instalar PWA cuando el navegador lo soporte (`InstallPrompt`)
- [ ] Hover Miembros/Pagos no muestra “Cargando…” (skeleton o datos precargados)

---

### Descanso en pantalla de bloqueo

Durante el entrenamiento activo, el temporizador de descanso usa hora real (`endsAt`) y, con permiso de notificaciones:

- Muestra/actualiza una notificación local (tag `workout-rest`) con tiempo restante.
- Acciones **+30s** / **Saltar** (mejor en Android Chrome).
- Aviso al terminar + vibración.
- Wake Lock de pantalla mientras el descanso está en primer plano.

**Límites:** en iOS el countdown en vivo en bloqueo es limitado; se prioriza el aviso al terminar y reconciliar al desbloquear. Sin permiso, el overlay in-app sigue igual.

---

## CSS relevante

Variables en `src/index.css`:

- `--member-nav-stack`, `--trainer-nav-stack`, `--reception-nav-stack`
- `html.member-has-workout-fab` — padding extra para FAB
- `.scroll-to-top-btn` — evita solapamiento con FAB

---

## Tests Playwright

```bash
npm run test:ux:browser
# Specs: member-nav, member-fab, member-workout-pager, member-offline, member-ptr
```

---

## Enlaces

- [UX-QA](../UX-QA.md)
- [QA visual](../QA-VISUAL-CHECKLIST.md)
- [Manual cliente](../manual/MANUAL-CLIENTE.md)
