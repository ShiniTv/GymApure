# QA visual — checklist

Repetir tras cambios de UI.

## Móvil 390×844 — Cliente (`member@gym.com`)

- [ ] Sin scroll horizontal
- [ ] Nav: Dashboard, Pagos, Rutinas, Historial, Perfil
- [ ] CTA fijo «Empezar entrenamiento» visible
- [ ] Etiqueta rol «Cliente» en sidebar

## Desktop 1440×900 — Admin

- [ ] Members: filtros, tabla, skeleton al cargar
- [ ] Payments: chips de estado, aprobar/rechazar
- [ ] Settings: panel de alertas

## Desktop 1440×900 — Recepcionista (`receptionist@gym.com`)

- [ ] Nav sin Configuración / Reportes / Rutinas
- [ ] Panel recepción: lookup, entrada/salida, wizard walk-in

## API / roles

- [ ] Recepcionista → `/api/settings/expiry` → 403
- [ ] Member → `/members` → redirige a `/`

## Comandos

```bash
npm run lint
npm run build
npm run test:reception-checklist
npm run lighthouse:ci   # requiere build previo
```

## Design system (código)

Tokens y componentes: `src/index.css`, `src/lib/typography.ts`, `src/components/ui/`.
