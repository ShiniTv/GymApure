## Smoke checklist por rol (post auditoría UI/UX)

### Admin

- [ ] Login OK → Panel carga KPIs o muestra EmptyState de error con Reintentar
- [ ] `/trainers` → Nuevo entrenador con password débil muestra mensaje Zod (no "Error de conexión")
- [ ] Crear entrenador con password válida (Mayús+minús+número+especial) funciona
- [ ] Bottom nav móvil: Panel / Miembros / Pagos / Mensajes / Más
- [ ] `/clases` → crear tipo + programar sesión (con instructor) + badge espera si hay waitlist

### Recepcionista

- [ ] Sidebar "Mostrador" → `/reception?mode=counter&tab=access`
- [ ] Más → "Kiosk / tablet" → `/check-in?kiosk=1`
- [ ] `/clases` → **Clases del día** con cupos y badge de espera (no cancela sesiones)

### Entrenador

- [ ] Más → Nutrición → `/nutrition-overview`; ficha de miembro → Plan nutricional
- [ ] Panel muestra loading/error shell si falla stats
- [ ] `/clases` permite programar sesión propia
- [ ] Miembros: tap tarjeta → sheet con Ver rutinas

### Cliente

- [ ] Bottom nav: Inicio / Rutinas / Nutrición / Más (Reservas está en Más)
- [ ] `/reservas` lista clases / empty state
- [ ] Sin membresía: un banner de prioridad (pending > activate > expiry)
- [ ] Nutrición sin plan: CTA a Mensajes
- [ ] Profile: tab Progreso solo para member
- [ ] Push onboarding card en inicio (o iPhone: Añadir a Inicio)
