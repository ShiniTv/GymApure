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
