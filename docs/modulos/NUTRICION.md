# Nutrición

Planes nutricionales asignados por entrenador/admin al miembro.

**Rutas:** `/nutrition` (miembro), `/nutrition-overview` (admin), `/members/:id/nutrition` (entrenador)

---

## Flujo: entrenador asigna plan

1. Abre ficha del miembro asignado.
2. **Nutrición** o `/members/:id/nutrition`.
3. Define estructura del plan (comidas, notas, objetivos según formulario).
4. Guardar.

**Resultado esperado:** El miembro ve el plan en **Nutrición**.

---

## Flujo: miembro consulta plan

1. Tab **Nutrición** en bottom nav (móvil).
2. Revisa comidas y recomendaciones del día.

---

## Flujo: admin overview

1. **Nutrición overview** (`/nutrition-overview`).
2. Vista global de qué miembros tienen plan activo.

---

## Permisos

| Acción                 | admin | trainer       | member |
| ---------------------- | ----- | ------------- | ------ |
| Ver propio plan        | —     | —             | ✓      |
| Editar plan de miembro | ✓     | ✓ (asignados) | —      |
| Overview global        | ✓     | —             | —      |

---

## Enlaces

- [Manual entrenador](../manual/MANUAL-ENTRENADOR.md)
- [Manual cliente](../manual/MANUAL-CLIENTE.md)
