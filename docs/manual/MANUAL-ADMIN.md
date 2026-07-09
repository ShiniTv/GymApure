# Manual del administrador

Guía de uso diario para el rol **admin** en GymApure.

---

## Permisos

### Puede hacer

- Gestionar todos los miembros y staff
- Crear planes de membresía
- Aprobar/rechazar pagos
- Configurar alertas, tipo de cambio BCV, notificaciones
- Ver reportes, auditoría y asistencia global
- Gestionar equipamiento, entrenadores y zonas
- Ver overview de nutrición

### No debe hacer

- Usar `db:restore-demo` ni scripts de base de datos en producción
- Compartir credenciales de admin o `SUPABASE_SERVICE_ROLE_KEY`
- Editar SQL directo en Supabase sin migración versionada
- Compartir la misma cuenta entre varias personas (solo una sesión activa; nuevo login cierra la anterior)

---

## Inicio de sesión

1. Abre `/login`.
2. Ingresa email y contraseña de admin.
3. Redirige al **Panel** (`/`).

[captura: dashboard admin]

---

## Flujos principales

### Crear usuario (staff o miembro)

1. **Miembros** → **Nuevo usuario**.
2. Completa nombre, email, cédula, rol (`admin`, `receptionist`, `trainer`, `member`).
3. Contraseña inicial (el usuario puede cambiarla en Perfil).
4. Si es miembro: asigna plan y entrenador opcional.
5. Guardar.

### Gestionar membresías

1. **Membresías** → **Nuevo plan**.
2. Nombre, duración (días), precio en VES.
3. Los pagos aprobados extienden la vigencia según el plan.

Ver [MEMBRESIAS-Y-ASISTENCIA.md](../modulos/MEMBRESIAS-Y-ASISTENCIA.md).

### Aprobar pagos

1. **Pagos** → filtro **Pendientes**.
2. Revisa comprobante.
3. Aprobar o Rechazar con motivo.

Ver [PAGOS-Y-TIPO-DE-CAMBIO.md](../modulos/PAGOS-Y-TIPO-DE-CAMBIO.md).

### Configurar alertas de vencimiento

1. **Configuración** → **Alertas de vencimiento**.
2. Días de anticipación (ej. 7, 3, 1).
3. Guardar. El cron envía avisos al chat de cada miembro.

### Configurar tipo de cambio

1. **Configuración** → **Tasa de cambio USD**.
2. Revisa tasa automática BCV.
3. Override manual si es necesario.

### Gestionar equipamiento

1. **Equipamiento** → zonas, catálogo, inventario.
2. Registrar máquinas sin duplicar entradas del catálogo.

Ver [EQUIPAMIENTO.md](../modulos/EQUIPAMIENTO.md).

### Gestionar entrenadores

1. **Entrenadores** → perfiles, niveles, turnos.
2. Asignar miembros a cada entrenador.

Ver [ENTRENADORES-Y-TURNOS.md](../modulos/ENTRENADORES-Y-TURNOS.md).

### Reportes y auditoría

- **Reportes:** exportaciones de asistencia, pagos, miembros.
- **Auditoría:** log de acciones sensibles del sistema.

### Nutrición (overview)

**Nutrición overview** (`/nutrition-overview`): vista global de planes nutricionales por miembro.

Ver [NUTRICION.md](../modulos/NUTRICION.md).

---

## Navegación

| Sección        | Ruta             |
| -------------- | ---------------- |
| Panel          | `/`              |
| Miembros       | `/members`       |
| Membresías     | `/memberships`   |
| Pagos          | `/payments`      |
| Entrenadores   | `/trainers`      |
| Equipamiento   | `/equipment`     |
| Asistencia     | `/attendance`    |
| Reportes       | `/reports`       |
| Auditoría      | `/audit-logs`    |
| Configuración  | `/settings`      |
| Mensajes       | `/messages`      |
| Notificaciones | `/notifications` |

---

## Errores comunes

| Problema                | Solución                                                         |
| ----------------------- | ---------------------------------------------------------------- |
| No llegan correos       | Verificar SMTP en Render; `GET /api/health` → `email.configured` |
| Tasa BCV desactualizada | Override manual o esperar cron; revisar logs servidor            |
| No puedo aprobar pago   | Verificar que el comprobante subió correctamente                 |
| Miembro no ve rutina    | Asignar entrenador y rutina desde Miembros/Rutinas               |

---

## Enlaces

- [Inicio rápido](../INICIO-RAPIDO.md)
- [Índice documentación](../README.md)
- [Entornos y seguridad](../tecnico/ENTORNOS-Y-SEGURIDAD.md)
