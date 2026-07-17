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

Tabs: **Inicio**, **Rutinas**, **Reservas**, **Más**.

Oculta en `/workout/:id` (entrenamiento inmersivo).

### FAB "Entrenar"

- Visible en `/`, `/routines`, `/exercises`
- Oculto en `/nutrition` y durante workout
- Posición ajustada con CSS `--member-nav-stack` y `--member-fab-gap`

### Sheet "Más"

Biblioteca, Nutrición, Mensajes, Historial, Pagos, Mi Perfil. Accesible desde tab Más.

### Drawer sidebar

Swipe desde borde izquierdo. Footer (tema, perfil, cerrar sesión) pegado al fondo del drawer.

### Pull-to-refresh

Disponible en Inicio, Rutinas e Historial.

### Offline

- Banner rojo cuando no hay conexión
- Service Worker cachea assets estáticos
- Botón Reintentar en vistas con error de red

---

## Recepción

Bottom nav: Inicio, Miembros, Pagos, Mensajes. Drawer / Más con Kiosk, Equipamiento, Clases.

Admin también puede abrir `/reception` y `/check-in` (cubre mostrador).

---

## Entrenador

Bottom nav con drawer. Al abrir drawer: bottom nav oculta; footer sin hueco inferior.

---

## Admin móvil

Bottom nav: Panel, Miembros, Pagos, Mensajes, Más (incluye Mostrador, Kiosk, Solicitudes demo, etc.).

---

## PWA (instalación)

1. Chrome/Edge móvil → menú → **Instalar app** / **Añadir a inicio**.
2. Icono en pantalla de inicio.
3. `InstallPrompt` en sidebar desktop.

### Push (opcional)

Con VAPID configurado: toggle en Perfil para notificaciones push.

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
