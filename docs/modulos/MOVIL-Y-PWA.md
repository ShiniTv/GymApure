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

Tabs: **Inicio**, **Rutinas**, **Mensajes**, **Más**.

Oculta en `/workout/:id` (entrenamiento inmersivo).

### FAB "Entrenar"

- Visible en `/`, `/routines`, `/exercises`
- Oculto en `/nutrition` y durante workout
- Posición ajustada con CSS `--member-nav-stack` y `--member-fab-gap`

### Sheet "Más"

Reservas, Nutrición, Biblioteca, Historial, Pagos, Mi Perfil. Accesible desde tab Más.

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

Bottom nav: Inicio, Miembros, Pagos, Mensajes. Drawer / Más con Modo tablet, Equipamiento, Clases.

Admin también puede abrir `/reception` y `/check-in` (cubre mostrador).

---

## Entrenador

Bottom nav con drawer. Al abrir drawer: bottom nav oculta; footer sin hueco inferior.

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
