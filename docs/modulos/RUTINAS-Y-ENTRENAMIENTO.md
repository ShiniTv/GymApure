# Rutinas y entrenamiento

Creación de rutinas, prescripción por serie, sesión activa e historial.

**Rutas:** `/routines`, `/workout/:id`, `/history`, `/members/:id/routines`, `/members/:id/history`

---

## Conceptos

| Concepto                   | Descripción                                             |
| -------------------------- | ------------------------------------------------------- |
| **Rutina**                 | Conjunto de ejercicios asignados a un miembro           |
| **Prescripción por serie** | Peso y reps específicos por cada serie (JSON)           |
| **Sesión activa**          | Entrenamiento en curso (`/workout/:id`)                 |
| **Meta semanal**           | Objetivo de sesiones por semana (1–7) en perfil miembro |
| **Guía de ejecución**      | Pasos de texto por ejercicio (catálogo sistema)         |

---

## Flujo: entrenador crea rutina

**Objetivo:** Asignar rutina a un miembro asignado.

1. **Rutinas** → **Nueva rutina** o desde ficha del miembro.
2. Nombre, descripción, días de la semana.
3. Añade ejercicios desde biblioteca (sistema o propios).
4. Por ejercicio: series, reps, descanso, peso sugerido.
5. Opcional: prescripción detallada por serie.
6. Asigna al **miembro**.
7. Guarda.

**Resultado esperado:** El miembro ve la rutina en **Rutinas**.

---

## Flujo: miembro inicia entrenamiento

1. **Inicio** o **Rutinas** → expande rutina → **Empezar entrenamiento**.
2. También: FAB central "Entrenar" en `/`, `/routines`, `/exercises`.
3. Redirige a `/workout/:id`.

### Durante la sesión

- **Modo pager móvil:** un ejercicio a la vez; navegación inferior.
- Por ejercicio: título, **Completar**, toggles video/pasos, tabla de series.
- Registra kg y reps por serie; marca serie completada.
- **Temporizador de descanso** entre series.
- Video guía y pasos de ejecución a ancho completo del card.

### Finalizar

- Marca ejercicios completados.
- **Finalizar entrenamiento** → guarda sesión en historial.

---

## Flujo: consultar historial

| Rol        | Ruta                         |
| ---------- | ---------------------------- |
| Miembro    | `/history` o Más → Historial |
| Entrenador | `/members/:id/history`       |

Muestra sesiones pasadas, ejercicios, volúmenes y fechas.

---

## Meta semanal

Configurada en perfil del miembro (admin/entrenador). El dashboard de inicio muestra progreso `X/Y sesiones esta semana`.

---

## Biblioteca de ejercicios

- **Ejercicios** (`/exercises`): catálogo con filtros por grupo muscular.
- Ejercicios del **sistema** incluyen video y pasos de ejecución.
- Entrenador puede crear ejercicios propios con video (upload a `exercise-videos`).

---

## Layout móvil (sesión activa)

Estructura del card de ejercicio:

1. Fila 1: número + nombre + botón Completar
2. Toggles: Video guía / Ejecución (N pasos)
3. Pasos (`ExerciseExecutionSteps`) a ancho completo
4. Video (`ExerciseVideoPlayer`) a ancho completo
5. Tabla de series (grid compacto en móvil)

Bottom nav **oculta** durante `/workout/:id`.

---

## Tests

```bash
npm run test:routine-exercises
npm run test:ux:browser   # member-workout-pager, member-fab
```

---

## Enlaces

- [Manual entrenador](../manual/MANUAL-ENTRENADOR.md)
- [Manual cliente](../manual/MANUAL-CLIENTE.md)
- [Móvil y PWA](./MOVIL-Y-PWA.md)
