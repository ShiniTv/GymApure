# Manual del entrenador

Guía para el rol **trainer** (entrenador).

---

## Permisos

### Puede hacer

- Ver **solo miembros asignados**
- Crear y editar rutinas para sus miembros
- Gestionar biblioteca de ejercicios (propios + sistema)
- Ver y editar plan nutricional por miembro
- Consultar historial de entrenamientos de sus miembros
- Ver equipamiento y reportar mantenimiento
- Mensajes con miembros y staff

### No puede hacer

- Ver miembros no asignados (403)
- Aprobar pagos, configurar sistema, ver reportes globales
- Gestionar membresías o entrenadores

---

## Inicio de sesión

1. `/login` con cuenta de entrenador.
2. Panel con resumen de miembros y rutinas activas.

---

## Navegación móvil

Bottom nav entrenador (visible con drawer cerrado):

- Inicio, Miembros, Rutinas, Mensajes (según configuración actual)

Al abrir drawer lateral: footer pegado al fondo; bottom nav se oculta.

---

## Flujos principales

### Ver mis miembros

1. **Miembros** → lista filtrada a asignados.
2. Clic en miembro → ficha con rutinas, nutrición, historial.

### Crear rutina

1. **Rutinas** → **Nueva rutina**.
2. Añade ejercicios, series, reps, descanso.
3. Asigna a miembro.
4. Guardar.

Detalle: [RUTINAS-Y-ENTRENAMIENTO.md](../modulos/RUTINAS-Y-ENTRENAMIENTO.md).

### Editar rutina de un miembro

1. Desde ficha del miembro → **Rutinas**.
2. O: `/members/:id/routines`.

### Plan nutricional

1. Ficha del miembro → **Nutrición**.
2. O: `/members/:id/nutrition`.
3. Define comidas, macros o notas según el formulario.

Ver [NUTRICION.md](../modulos/NUTRICION.md).

### Perfil de salud y metabolismo del miembro

1. Ficha del miembro → pestaña **Perfil**.
2. Revisa **Salud y limitaciones** (condiciones marcadas, notas, alergias).
3. Revisa **Metabolismo estimado** (TMB/GET en kcal, nivel de actividad, fecha del cálculo).
4. Si aparece badge **Salud** en la cabecera, hay condiciones que requieren atención (cardiovascular o post-operatorio).

El miembro completa y actualiza estos datos en su **Perfil → Salud**. Son estimaciones autodeclaradas; no sustituyen evaluación médica.

### Historial de entrenamientos

1. Ficha del miembro → **Historial**.
2. Revisa sesiones completadas, volumen, fechas.

### Biblioteca de ejercicios

1. **Ejercicios** → catálogo con filtros.
2. Crear ejercicio propio con video opcional.
3. Ejercicios del sistema incluyen pasos y video guía.

---

## Errores comunes

| Problema                      | Solución                                                                 |
| ----------------------------- | ------------------------------------------------------------------------ |
| No veo un miembro             | Solo ves asignados; pide al admin la asignación                          |
| Access Denied en rutina ajena | Comportamiento esperado (seguridad IDOR)                                 |
| Video no sube                 | Verificar formato; en prod revisar Storage y `SUPABASE_SERVICE_ROLE_KEY` |

---

## Enlaces

- [Rutinas y entrenamiento](../modulos/RUTINAS-Y-ENTRENAMIENTO.md)
- [Entrenadores y turnos](../modulos/ENTRENADORES-Y-TURNOS.md)
- [Manual cliente](./MANUAL-CLIENTE.md) (qué ve el miembro)
