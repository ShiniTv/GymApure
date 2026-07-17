# Clases grupales y reservas

Módulo de sesiones grupales y reservas de miembros (v2.5+).

---

## Roles

| Rol        | Qué puede hacer                                 |
| ---------- | ----------------------------------------------- |
| Admin      | Crear/editar/cancelar sesiones, ver inscritos   |
| Entrenador | Crear/gestionar sesiones propias, ver inscritos |
| Recepción  | Ver clases del día y cupos                      |
| Miembro    | Reservar y cancelar desde `/reservas`           |

---

## Rutas

| UI           | Ruta        | API                     |
| ------------ | ----------- | ----------------------- |
| Staff clases | `/clases`   | `/api/classes`          |
| Reservas     | `/reservas` | `/api/classes/.../book` |

---

## Flujo miembro

1. Abre **Reservas** (tab en bottom nav).
2. Elige sesión con cupos disponibles.
3. Confirma → notificación in-app / push.
4. Cancela desde la misma pantalla si la sesión no ha empezado.

## Flujo staff

1. **Clases** → nueva sesión (fecha, hora, cupo, entrenador).
2. Recepción consulta la lista del día en mostrador.
3. Al completar cupo, nuevas reservas fallan con mensaje claro.

---

## Esquema

Migración: `supabase/migrations/20260716120000_class_bookings.sql`

Tablas principales: sesiones de clase + reservas (bookings) con estados y cupos.

---

## Enlaces

- [Manual cliente](../manual/MANUAL-CLIENTE.md)
- [Manual recepción](../manual/MANUAL-RECEPCION.md)
- [Manual entrenador](../manual/MANUAL-ENTRENADOR.md)
- [Smoke checklist roles](../SMOKE-CHECKLIST-ROLES.md)
