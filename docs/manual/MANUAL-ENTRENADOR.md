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
- Cobros PT privados con clientes asignados (`/pt-billing`) — aparte de la membresía del gym

### No puede hacer

- Ver miembros no asignados (403)
- Aprobar pagos de membresía, configurar sistema, ver reportes globales
- Gestionar membresías o entrenadores
- Ver destinos/cobros PT de otros entrenadores

---

## Inicio de sesión

1. `/login` con cuenta de entrenador.
2. Panel con resumen de miembros y rutinas activas.

---

## Navegación móvil

Bottom nav entrenador (visible con drawer cerrado; **icon-only** + `aria-label`):

- **Panel**, **Miembros**, **Rutinas**, **Mensajes** + **Más** (Nutrición, Cobros PT, asignaciones, …)

Al abrir drawer lateral: footer pegado al fondo; bottom nav se oculta.

---

## Flujos principales

### Ver mis miembros

1. **Miembros** → lista filtrada a asignados.
2. Filtros de atención: sin evaluación, check-in, recuperación, **elecciones del cliente**.
3. Clic en miembro → hub 1:1 con pestañas **Plan**, **Coaching**, **Progreso** (+ Más: perfil, nutrición, marcas).
4. **Asignar rutina** desde la ficha (`?assign=1`) sin pasar obligatoriamente por el calendario.

### Revisar elecciones del cliente

1. Panel → **Requiere atención** → **Elecciones del cliente** (auto-asignó plantilla, sustituyó ejercicio, saltó en sesión).
2. Abre el hub del miembro en pestaña **Plan** para ajustar o responder.

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

### Cobros PT (entrenamiento personalizado)

1. **Más** → **Cobros PT** (`/pt-billing`).
2. Publica tus **datos de cobro** (pago móvil, transferencia, etc.).
3. Crea un cobro a un miembro asignado (monto USD).
4. Cuando el cliente reporte → **Confirmar** o **Rechazar**.

Esto es independiente de **Pagos** de membresía del gym. Detalle: [COBROS-PT.md](../modulos/COBROS-PT.md).

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

### Seguridad MFA

1. **Más** → **Seguridad MFA** o **Perfil → Configurar MFA**.
2. Recomendado para proteger el acceso a datos de miembros.

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
