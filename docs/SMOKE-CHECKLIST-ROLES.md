## Smoke checklist por rol (post auditoría UI/UX)

### Admin

- [ ] Login OK → Panel carga KPIs o muestra EmptyState de error con Reintentar
- [ ] `/trainers` → Nuevo entrenador con password débil muestra mensaje Zod (no "Error de conexión")
- [ ] Crear entrenador con password válida (Mayús+minús+número+especial) funciona
- [ ] Bottom nav móvil: Panel / Miembros / Pagos / Mensajes / Más
- [ ] `/clases` → crear tipo + programar sesión

### Recepcionista

- [ ] Sidebar "Mostrador" → `/reception?mode=counter&tab=access`
- [ ] Más → "Kiosk / tablet" → `/check-in?kiosk=1`
- [ ] `/clases` muestra sesiones del día / cupos

### Entrenador

- [ ] Nav "Planes nutricionales" → `/members?focus=nutrition` con copy de ayuda
- [ ] Panel muestra loading/error shell si falla stats
- [ ] `/clases` permite programar sesión propia

### Cliente

- [ ] Bottom nav incluye Reservas
- [ ] `/reservas` lista clases / empty state
- [ ] Sin membresía: card de pasos 1-2-3 + CTA renovación
- [ ] Nutrición sin plan: CTA a Mensajes
- [ ] Profile: tab Progreso solo para member
