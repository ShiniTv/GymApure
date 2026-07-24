# Evaluación: asignación explícita entrenador ↔ miembro

Documento de diseño (Fase 4 de la auditoría del rol trainer). **Implementado** (julio 2026).

---

## Situación actual

La relación entrenador–miembro es **explícita** vía `trainer_member_assignments`, con compatibilidad legacy: también cuenta si hay rutinas con `routines.trainer_id`.

| Ventaja                             | Detalle                                                     |
| ----------------------------------- | ----------------------------------------------------------- |
| Pre-asignar sin rutina              | Admin/recepción vincula desde Entrenadores → icono Miembros |
| Revocar acceso sin borrar historial | DELETE de la fila de asignación                             |
| Primera rutina auto-vincula         | `ensureTrainerMemberAssignment` al asignar rutina           |

Migración: `supabase/migrations/20260717000000_trainer_member_assignments.sql`

API:

- `GET /api/trainers/:id/members`
- `POST /api/trainers/:id/members` `{ member_id }`
- `DELETE /api/trainers/:id/members/:memberId`

---

## Enlaces

- [Entrenadores y turnos](./ENTRENADORES-Y-TURNOS.md)
- [Manual entrenador](../manual/MANUAL-ENTRENADOR.md)
- [Manual administrador](../manual/MANUAL-ADMIN.md)
