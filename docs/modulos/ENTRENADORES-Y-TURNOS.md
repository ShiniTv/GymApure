# Entrenadores y turnos

Gestión de perfiles de entrenador, niveles y turnos de trabajo.

**Ruta:** `/trainers` (solo admin)

---

## Conceptos

| Concepto              | Descripción                                    |
| --------------------- | ---------------------------------------------- |
| **Perfil entrenador** | Datos extendidos del usuario con rol `trainer` |
| **Nivel**             | Clasificación (ej. junior, senior)             |
| **Turno**             | `diurno`, `vespertino`, `nocturno`             |
| **Asignación**        | Miembros vinculados a un entrenador            |

---

## Flujo: configurar entrenador

1. Admin crea usuario con rol **trainer** en Miembros.
2. **Entrenadores** → selecciona o crea perfil.
3. Asigna nivel y turno.
4. Vincula miembros asignados.

**Resultado esperado:** El entrenador solo ve esos miembros en su lista.

---

## Turno del miembro

Los miembros pueden tener preferencia de turno (`training_shift`) para filtrado y organización.

---

## Sesiones 1:1

Desde la ficha de un miembro asignado, el entrenador puede usar la pestaña **Agenda 1:1** para:

1. Agendar una sesión individual con inicio, fin y objetivo.
2. Vincularla opcionalmente al bloque de entrenamiento del cliente.
3. Reprogramarla mientras esté agendada.
4. Marcarla como completada, cancelada o no asistida.

Las sesiones finalizadas no se reprograman: se conserva el registro para seguimiento. La agenda solo muestra y permite modificar sesiones de miembros a los que el entrenador mantiene acceso.

---

## Seguridad

Entrenadores **no** pueden acceder a datos de miembros no asignados. El backend valida con `requireMemberAccess`.

---

## Tests

```bash
npm run test:trainer-shifts
```

---

## Enlaces

- [Manual administrador](../manual/MANUAL-ADMIN.md)
- [Manual entrenador](../manual/MANUAL-ENTRENADOR.md)
- [Evaluación histórica (archivada): asignación trainer↔miembro](../../archive/docs/TRAINER-MEMBER-ASSIGNMENTS-EVAL.md)
