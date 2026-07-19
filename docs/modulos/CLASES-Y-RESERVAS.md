# Clases grupales y reservas

Módulo de sesiones grupales y reservas de miembros (v2.5+).

---

## Roles

| Rol        | Qué puede hacer                                                      |
| ---------- | -------------------------------------------------------------------- |
| Admin      | Crear/editar/cancelar sesiones, asignar instructor, ver inscritos    |
| Entrenador | Crear/gestionar **sus** sesiones, ver inscritos                      |
| Recepción  | Ver **clases del día** y cupos/lista de espera (no cancela sesiones) |
| Miembro    | Reservar y cancelar desde `/reservas`                                |

---

## Rutas

| UI           | Ruta        | API                     |
| ------------ | ----------- | ----------------------- |
| Staff clases | `/clases`   | `/api/classes`          |
| Reservas     | `/reservas` | `/api/classes/.../book` |

---

## Flujo miembro

1. Abre **Reservas** (Más → Reservas, o sidebar en desktop).
2. Elige sesión con cupos disponibles (o entra a lista de espera si está llena).
3. Confirma → notificación in-app / push.
4. Cancela desde la misma pantalla si la sesión no ha empezado.

## Flujo staff

1. **Clases** → programar sesión (fecha, hora, cupo; admin elige **instructor**).
2. Recepción abre `/clases` → vista **del día** con cupos y espera.
3. Admin / instructor dueño pueden **Cancelar clase**; recepción no.
4. Al completar cupo, nuevas reservas van a waitlist o fallan con mensaje claro.

---

## Esquema

Migración: `supabase/migrations/20260716120000_class_bookings.sql`  
Waitlist: `supabase/migrations/20260717000001_class_waitlist.sql`

Tablas principales: sesiones de clase + reservas (bookings) con estados y cupos.

---

## Tests

```bash
npm run test:classes-checklist
```

---

## Enlaces

- [Manual cliente](../manual/MANUAL-CLIENTE.md)
- [Manual recepción](../manual/MANUAL-RECEPCION.md)
- [Manual entrenador](../manual/MANUAL-ENTRENADOR.md)
- [Smoke checklist roles](../SMOKE-CHECKLIST-ROLES.md)
