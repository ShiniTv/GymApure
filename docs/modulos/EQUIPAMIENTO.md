# Equipamiento (CMMS)

Gestión de inventario, zonas, mantenimiento y fotos del equipamiento del gimnasio.

**Ruta:** `/equipment`  
**Roles:** admin, trainer, receptionist (lectura y reporte; admin gestiona inventario completo)

---

## Conceptos

| Concepto                    | Descripción                                                   |
| --------------------------- | ------------------------------------------------------------- |
| **Zona**                    | Área del gym (ej. Cardio, Pesas libres, Funcional)            |
| **Catálogo**                | Lista predefinida de tipos de máquina (sembrada en migración) |
| **Inventario**              | Instancia registrada de una máquina en el gym                 |
| **Evento de mantenimiento** | Registro de servicio, inspección o reparación                 |
| **Estado**                  | `operational`, `maintenance`, `out_of_service`                |

---

## Flujo: registrar equipamiento

**Objetivo:** Añadir una máquina al inventario sin duplicar registros.

**Prerrequisitos:** Rol admin o permiso de gestión.

1. Abre **Equipamiento** en el menú.
2. Pestaña **Inventario** → **Registrar equipo**.
3. Elige del **catálogo** o ingresa nombre personalizado.
4. Selecciona **zona**, cantidad y estado inicial.
5. Opcional: sube foto.
6. Guarda.

**Resultado esperado:** La máquina aparece en el inventario de la zona.

**Si algo falla:**

- Error **409 / ya registrado**: esa máquina del catálogo ya existe. Edita la existente o aumenta cantidad.
- Nombre personalizado duplicado: el sistema no permite dos registros con el mismo nombre (ignorando mayúsculas).

---

## Reglas anti-duplicado

Desde la migración `20260709120000_gym_equipment_unique`:

- Una entrada por `catalog_id` en el inventario.
- Nombres personalizados únicos (comparación sin distinguir mayúsculas ni espacios extra).
- Si había duplicados previos, la migración los fusionó automáticamente.

**No intentes** insertar duplicados directamente en Supabase; usa la UI o la API.

---

## Flujo: reportar mantenimiento

1. Localiza el equipo en **Inventario**.
2. Abre detalle → **Nuevo evento**.
3. Tipo: inspección, preventivo, correctivo.
4. Describe el trabajo y fecha.
5. Cambia estado si aplica (`maintenance`, `out_of_service`).

---

## Flujo: inspección y alertas

Los equipos con inspección vencida generan alertas en el **centro de notificaciones** (`/notifications`). Admin y staff ven avisos según configuración.

---

## Exportación

Admin puede exportar inventario a CSV desde la barra de herramientas.

---

## Storage

Fotos en bucket Supabase `equipment-photos` (privado, acceso vía backend).

---

## Roles

| Acción                   | admin | trainer | receptionist |
| ------------------------ | ----- | ------- | ------------ |
| Ver inventario           | ✓     | ✓       | ✓            |
| Registrar/editar         | ✓     | —       | —            |
| Reportar mantenimiento   | ✓     | ✓       | ✓            |
| Gestionar zonas/catálogo | ✓     | —       | —            |

---

## Enlaces

- [Manual administrador](../manual/MANUAL-ADMIN.md)
- [Chat y notificaciones](./CHAT-Y-NOTIFICACIONES.md)
- [Despliegue — Storage](../DEPLOY.md)
