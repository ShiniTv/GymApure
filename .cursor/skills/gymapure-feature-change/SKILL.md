---
name: gymapure-feature-change
description: >-
  Guía cambios de feature en GymApure por capas: src/api, hooks React Query,
  pages/components, y scripts/test del dominio. Usar al implementar o extender
  módulos (rutinas, pagos, chat, miembros, equipamiento, recepción, etc.) o cuando
  el usuario pida añadir endpoints, pantallas o checklists de un dominio.
---

# GymApure — Feature change

## Capas (orden típico)

```
1. API / servidor     src/api/*  (+ auth/RBAC)
2. Cliente API        si aplica wrappers existentes
3. Hooks Query        src/hooks/queries/*
4. UI                 src/pages/*, src/components/*
5. Test               scripts/test/test-*.ts + npm script
6. Docs módulo        docs/modulos/* si el comportamiento es de producto
```

Conservar patrones del repo: TypeScript strict, React Query, paginación de listas, ownership por rol.

## Mapa dominio → docs y tests

| Dominio                 | Doc                                       | Test sugerido                                    |
| ----------------------- | ----------------------------------------- | ------------------------------------------------ |
| Rutinas / workout       | `docs/modulos/RUTINAS-Y-ENTRENAMIENTO.md` | `test:routine-exercises`                         |
| Pagos / BCV             | `docs/modulos/PAGOS-Y-TIPO-DE-CAMBIO.md`  | `test:payments-checklist`, `test:exchange-rate`  |
| Membresías / asistencia | `docs/modulos/MEMBRESIAS-Y-ASISTENCIA.md` | `test:memberships-checkin`                       |
| Chat / notifs           | `docs/modulos/CHAT-Y-NOTIFICACIONES.md`   | `test:chat-checklist`, `test:sprint6`            |
| Entrenadores / turnos   | `docs/modulos/ENTRENADORES-Y-TURNOS.md`   | `test:trainer-shifts`, `test:trainer-auth`       |
| Equipamiento            | `docs/modulos/EQUIPAMIENTO.md`            | smoke + UX manual                                |
| Nutrición               | `docs/modulos/NUTRICION.md`               | según alcance                                    |
| Clases / reservas       | `docs/modulos/CLASES-Y-RESERVAS.md`       | según alcance                                    |
| Móvil / PWA             | `docs/modulos/MOVIL-Y-PWA.md`             | `gymapure-ux-playwright`                         |
| Auth / RBAC             | `docs/TESTING.md`                         | `test:security-checklist`, `test:auth-checklist` |
| Recepción               | `docs/TESTING.md`                         | `test:reception-checklist`                       |
| Listas API              | —                                         | `test:pagination-contracts`                      |

## Checklist de implementación

```
- [ ] Leer código/doc del módulo existente (no reinventar)
- [ ] Cambios de esquema → migración en supabase/migrations/ (skill db-ops)
- [ ] Endpoints con authz correcta (admin/receptionist/trainer/member)
- [ ] Listas: paginación por defecto; `?all=1` solo pickers justificados
- [ ] Hook React Query: keys e invalidación alineadas al dominio
- [ ] UI: copy en español; sin "Dashboard"/"Kiosk" en UI principal
- [ ] Script de test o extensión del checklist existente
- [ ] npm run lint
- [ ] Test mínimo del dominio en verde (servidor + demo si hace falta)
```

## Al terminar

1. Aplicar `gymapure-quality-gate` con la matriz de alcance.
2. Si tocó auth/ownership → `gymapure-security-review`.
3. Si tocó nav/layout/viewports → `gymapure-ux-playwright`.

## Anti-patrones

- Bypass de RBAC “temporal” en API.
- Cargar listas completas sin paginar en pantallas de datos.
- Commitear `.env*` reales o secretos.
- Migraciones ad-hoc solo en Dashboard.
