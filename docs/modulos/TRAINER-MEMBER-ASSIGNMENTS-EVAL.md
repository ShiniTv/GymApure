# Evaluación: asignación explícita entrenador ↔ miembro

Documento de diseño (Fase 4 de la auditoría del rol trainer). **No implementado** — referencia para decisión de producto.

---

## Situación actual

La relación entrenador–miembro es **implícita**: existe solo cuando hay al menos una fila en `user_routines` cuya rutina tiene `routines.trainer_id = trainer.id`.

| Ventaja                                                    | Limitación                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| Modelo simple, una sola fuente de verdad                   | No se puede “pre-asignar” un miembro sin rutina             |
| Revocar acceso = quitar última rutina                      | Alertas y listas dependen de rutinas ya creadas             |
| Coherente con permisos actuales (`trainerHasMemberAccess`) | Turno del entrenador y turno del miembro no se cruzan en UI |

---

## Propuesta: tabla `trainer_member_assignments`

```sql
CREATE TABLE trainer_member_assignments (
  trainer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  PRIMARY KEY (trainer_id, member_id),
  CHECK (trainer_id <> member_id)
);
```

### Cambios en autorización

1. `trainerHasMemberAccess` pasaría a:

   ```sql
   EXISTS (SELECT 1 FROM trainer_member_assignments WHERE trainer_id = $1 AND member_id = $2)
   OR EXISTS (SELECT 1 FROM user_routines ur JOIN routines r ... )
   ```

2. Al asignar la **primera rutina**, se crearía automáticamente la fila en `trainer_member_assignments` (o admin/recepción la crea antes).

3. `GET /api/users` para trainers filtraría por `trainer_member_assignments` **o** rutinas activas (unión).

### Flujos habilitados

- Admin/recepción vincula miembro del turno vespertino al entrenador vespertino **antes** de que exista rutina.
- Dashboard “sin rutina activa” vs “sin vincular” como métricas separadas.
- Desvinculación explícita sin borrar historial de rutinas pasadas.

---

## Coste de migración

| Área                                           | Esfuerzo estimado |
| ---------------------------------------------- | ----------------- |
| Migración SQL + backfill desde `user_routines` | Bajo              |
| `trainerAccess.ts`, `users.ts`, `stats.ts`     | Medio             |
| UI admin (`/trainers`, `/members`)             | Medio             |
| Tests de autorización                          | Bajo              |
| Documentación y manual entrenador              | Bajo              |

**Backfill sugerido:**

```sql
INSERT INTO trainer_member_assignments (trainer_id, member_id, assigned_at)
SELECT DISTINCT r.trainer_id, ur.user_id, MIN(ur.assigned_at)
FROM user_routines ur
JOIN routines r ON r.id = ur.routine_id
GROUP BY r.trainer_id, ur.user_id
ON CONFLICT DO NOTHING;
```

---

## Recomendación

| Escenario                                                       | Decisión                                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| El gym asigna miembros por turno **antes** de programar rutinas | **Implementar** tabla explícita                                                                         |
| El flujo actual (crear rutina → asignar = acceso) es suficiente | **Mantener** modelo implícito; las correcciones de seguridad y métricas de la auditoría son suficientes |
| Varios entrenadores comparten miembros con rutinas distintas    | Mantener modelo implícito + **scoping por `trainer_id`** en lecturas (ya aplicado en la auditoría)      |

---

## Enlaces

- [Entrenadores y turnos](./ENTRENADORES-Y-TURNOS.md)
- [Manual entrenador](../manual/MANUAL-ENTRENADOR.md)
