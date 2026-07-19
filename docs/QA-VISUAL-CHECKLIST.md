# QA visual — checklist

Repetir tras cambios de UI. Nav móvil actualizado julio 2026.

## Móvil 390×844 — Cliente (`member@gym.com`)

- [ ] Sin scroll horizontal
- [ ] Bottom nav pill: **Inicio**, **Rutinas**, **Nutrición**, **Más**
- [ ] Sheet "Más": Mensajes, Reservas, Biblioteca, Historial, Pagos, Mi Perfil
- [ ] FAB "Entrenar" centrado en `/`, `/rutinas`, `/exercises`; oculto en `/nutrition`
- [ ] Bottom nav **oculta** en `/workout/:id`
- [ ] Drawer sidebar: footer pegado al fondo (sin hueco debajo)
- [ ] Inicio: grid 4 iconos (Rutinas, Nutrición, Historial, Pagos); hero + Tu rutina arriba
- [ ] Workout activo: Completar dentro del card; pasos colapsados por defecto; pager ≥44px

## Móvil 390×844 — Entrenador (`trainer@gym.com`)

- [ ] Bottom nav entrenador visible con drawer cerrado
- [ ] Drawer abierto: footer al fondo; bottom nav oculta
- [ ] Sin scroll horizontal en sidebar

## Móvil 390×844 — Recepción (`receptionist@gym.com`)

- [ ] Bottom nav: Inicio, Miembros, Pagos, Mensajes
- [ ] Drawer abierto: footer al fondo
- [ ] CTA "Abrir mostrador" en home → counter access

## Desktop 1440×900 — Admin

- [ ] Members: filtros, tabla, skeleton al cargar
- [ ] Payments: chips de estado, aprobar/rechazar, conversión USD
- [ ] Settings: panel de alertas + tasa de cambio BCV
- [ ] Equipment: zonas, catálogo, inventario, sin duplicados al registrar

## Desktop 1440×900 — Recepcionista

- [ ] Nav sin Configuración / Reportes / Rutinas
- [ ] Panel recepción: lookup, entrada/salida, wizard walk-in

## API / roles

- [ ] Recepcionista → `/api/settings/expiry` → 403
- [ ] Member → `/members` → redirige a `/`
- [ ] Trainer sin asignación → miembro ajeno → 403

## Comandos

```bash
npm run lint
npm run build
npm run test:reception-checklist
npm run test:ux:browser
npm run lighthouse:ci   # requiere build previo
```

## Design system (código)

Tokens y componentes: `src/index.css`, `src/lib/typography.ts`, `src/components/ui/`.
