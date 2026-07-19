# Manual del cliente (miembro)

Guía para el rol **member** — uso de la app como cliente del gimnasio.

---

## Permisos

### Puede hacer

- Ver su dashboard, rutinas y entrenamientos
- Iniciar sesión de entrenamiento activa
- Consultar biblioteca de ejercicios, nutrición, pagos e historial
- Mensajes con entrenador/staff
- Editar su perfil

### No puede hacer

- Ver otros miembros, configuración del gym ni datos de staff
- Aprobar pagos ni gestionar equipamiento
- Mantener dos sesiones activas (teléfono + tablet); el último login cierra el anterior

---

## Inicio de sesión

1. `/login` con email y contraseña (o registro en `/register` si está habilitado).
2. Primera vez: puede aparecer onboarding de tema → **Empezar a entrenar**.

---

## Navegación móvil

### Sheet "Más"

| Opción     | Ruta         |
| ---------- | ------------ |
| Mensajes   | `/messages`  |
| Reservas   | `/reservas`  |
| Biblioteca | `/exercises` |
| Historial  | `/history`   |
| Pagos      | `/payments`  |
| Mi Perfil  | `/profile`   |

### Bottom nav (pill)

| Tab       | Ruta                   |
| --------- | ---------------------- |
| Inicio    | `/panel`               |
| Rutinas   | `/routines`            |
| Nutrición | `/nutrition`           |
| Más       | Sheet con más opciones |

### FAB "Entrenar"

Botón flotante central visible en Inicio, Rutinas y Biblioteca. Oculto en Nutrición y durante entrenamiento activo.

---

## Flujos principales

### Ver rutina del día

1. **Inicio** → tarjeta "Hoy toca: …" con nombre de rutina.
2. O **Rutinas** → expande la rutina asignada.

### Empezar entrenamiento

1. **Empezar entrenamiento** en rutina o FAB **Entrenar**.
2. Abre `/workout/:id` (pantalla inmersiva, sin bottom nav).

### Durante el entrenamiento

1. Navega ejercicios con pager inferior.
2. Por ejercicio:
   - Marca **Completar** cuando termines.
   - Abre **Video guía** o **Ejecución** (pasos).
   - Registra kg y reps por serie.
   - Usa temporizador de descanso.
3. **Finalizar entrenamiento** al terminar.

Detalle: [RUTINAS-Y-ENTRENAMIENTO.md](../modulos/RUTINAS-Y-ENTRENAMIENTO.md).

### Consultar nutrición

1. Tab **Nutrición** en bottom nav.
2. Ve plan asignado por tu entrenador.

### Registrar o ver pagos

1. **Más** → **Pagos**.
2. Historial y estado (pendiente, aprobado, rechazado).
3. Sube comprobante si aplica.

### Reservar clases grupales

1. **Más** → **Reservas** (`/reservas`).
2. Elige una sesión disponible (cupos, horario, entrenador).
3. Confirma la reserva. Si está llena, puedes unirte a la **lista de espera**.
4. Cancela desde la misma pantalla si aún no ha empezado (mín. 2 h antes).

### Marcar entrada / salida

1. En **Inicio**, usa **Marcar entrada** cuando estés en el gym (membresía activa).
2. O muestra el **QR del carné** en **Perfil** para que recepción lo escanee en el mostrador.
3. Al salir, **Marcar salida** o pide a recepción.

### Mensajes

1. **Más** → **Mensajes**.
2. Chat 1 a 1 con entrenador o recepción.
3. Avisos de vencimiento también llegan aquí.

### Instalar como app (PWA)

1. En Chrome móvil: menú → **Añadir a pantalla de inicio**.
2. Funciona parcialmente offline (ver [MOVIL-Y-PWA.md](../modulos/MOVIL-Y-PWA.md)).

---

## Accesos rápidos en Inicio

Grid de iconos: Rutinas, Nutrición, Historial, Pagos.

---

## Perfil de salud y metabolismo

En **Mi Perfil** → pestaña **Salud**:

1. Marca condiciones frecuentes (diabetes, lesiones, etc.) y describe patologías o limitaciones en texto libre.
2. Indica alergias y medicación relevante si aplica.
3. Acepta el aviso de información autodeclarada.
4. En la sección **Metabolismo**, selecciona sexo biológico y nivel de actividad.
5. Completa antes en **Datos**: fecha de nacimiento, altura y peso.
6. Pulsa **Calcular y guardar TMB/GET** para ver tu tasa metabólica basal y gasto energético total estimados.

Tu entrenador verá esta información (solo lectura) para adaptar rutinas y, en el futuro, planes alimenticios.

---

## Errores comunes

| Problema          | Solución                                               |
| ----------------- | ------------------------------------------------------ |
| No tengo rutina   | Tu entrenador aún no asignó una; contacta por Mensajes |
| Video no carga    | Verificar conexión; reintentar                         |
| Membresía vencida | Renueva en Pagos; recepción puede ayudar               |
| App offline       | Banner rojo; reconecta y usa Reintentar                |

---

## Enlaces

- [Rutinas y entrenamiento](../modulos/RUTINAS-Y-ENTRENAMIENTO.md)
- [Móvil y PWA](../modulos/MOVIL-Y-PWA.md)
- [Chat y notificaciones](../modulos/CHAT-Y-NOTIFICACIONES.md)
