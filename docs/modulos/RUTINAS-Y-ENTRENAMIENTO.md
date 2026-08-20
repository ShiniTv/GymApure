# Rutinas y entrenamiento

Creación de rutinas, prescripción por serie, sesión activa e historial.

**Rutas:** `/routines`, `/workout/:id`, `/history`, `/members/:id/routines`, `/members/:id/history`

---

## Conceptos

| Concepto                   | Descripción                                             |
| -------------------------- | ------------------------------------------------------- |
| **Rutina**                 | Conjunto de ejercicios asignados a un miembro           |
| **Prescripción por serie** | Reps o tiempo, kg o placas, por serie (JSON)            |
| **Sesión activa**          | Entrenamiento en curso (`/workout/:id`)                 |
| **Meta semanal**           | Objetivo de sesiones por semana (1–7) en perfil miembro |
| **Guía de ejecución**      | Pasos de texto por ejercicio (catálogo sistema)         |

---

## Flujo: entrenador crea rutina

**Objetivo:** Asignar rutina a un miembro asignado.

1. **Rutinas** → **Nueva rutina** o desde ficha del miembro.
2. Nombre, descripción, días de la semana.
3. Añade ejercicios desde biblioteca (sistema o propios).
4. Por ejercicio: cómo se mide la serie (repeticiones o **tiempo**), carga (**kg**, **placas** de polea/máquina, o sin carga), descanso y nota.
5. Opcional: variar reps, segundos o placas entre series.
6. Asigna al **miembro**.
7. Guarda.

**Resultado esperado:** El miembro ve la rutina en **Rutinas**.

---

## Flujo: miembro inicia entrenamiento

1. **Inicio** o **Rutinas** → expande rutina → **Empezar entrenamiento**.
2. Si no tiene rutina: **Plantillas para empezar** → auto-asignación → **Entrenar**.
3. Con varias rutinas activas: selector **Hoy hago…** (persiste solo el día).
4. También: FAB central "Entrenar" en `/routines`, `/exercises`, `/nutrition` (no en Inicio).
5. Redirige a `/workout/:id`.

### Autonomía guiada (miembro)

| Acción                 | API / UI                                                                   |
| ---------------------- | -------------------------------------------------------------------------- |
| Elegir rutina de hoy   | `PUT /api/stats/member/today-routine`                                      |
| Auto-asignar plantilla | `POST /api/routines/:id/self-assign` (solo `member_selectable`)            |
| Sustituir ejercicio    | `POST /api/routines/:id/exercises/:reId/substitute` (mismo grupo muscular) |
| Saltar en sesión       | `POST /api/workouts/sessions/:id/skip-exercise`                            |

El entrenador recibe aviso in-app de auto-asignación, sustitución y saltos (`member_activity_events`).

### Durante la sesión

- **Modo pager móvil:** un ejercicio a la vez; navegación inferior.
- Por ejercicio: título, **Completar**, toggles video/pasos, tabla de series.
- Registra kg o placas, y reps o segundos, según cómo se recetó el ejercicio; marca serie completada.
- **Temporizador de descanso** entre series (hora real; no se frena al cambiar de app).
- Con permiso de notificaciones: countdown / aviso al terminar en la sombra del sistema (mejor en Android; en iOS PWA al menos aviso al volver/terminar). Acciones +30s y Saltar desde la notificación cuando el SO las soporte.
- Video guía y pasos de ejecución a ancho completo del card.

### Finalizar

- **Finalizar entrenamiento** → la sesión pasa al historial (Exitoso o Fallido según confirmación).
- Si sales de la app sin finalizar, la sesión queda **en curso**: puedes **Continuar** desde Inicio, Rutinas o Historial.
- **Descartar** (historial o Reiniciar en la sesión) elimina la sesión incompleta; **no** crea registro fallido.

| Acción             | Resultado                         |
| ------------------ | --------------------------------- |
| Salir / cerrar app | Sigue en curso (reanudable)       |
| Continuar          | Retoma series ya registradas      |
| Finalizar          | Entra al historial                |
| Descartar          | Se borra; no aparece en historial |

---

## Flujo: consultar historial

| Rol        | Ruta                         |
| ---------- | ---------------------------- |
| Miembro    | `/history` o Más → Historial |
| Entrenador | `/members/:id/history`       |

Muestra sesiones pasadas, ejercicios, volúmenes y fechas.

Desde el detalle de una sesión finalizada puedes **Eliminar del historial** (con confirmación). Útil si se cargó un entrenamiento por error. Las series de esa sesión se borran; la acción no se puede deshacer.

Las sesiones **en curso** se descartan con **Descartar** (no usan este botón).

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
