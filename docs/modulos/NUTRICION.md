# Nutrición

Planes nutricionales asignados por el entrenador al miembro, con seguimiento diario de macros y registro de comidas (manual o por foto con IA).

**Rutas:** `/nutrition` (miembro), `/nutrition-overview` (entrenador), `/members/:id/nutrition` (entrenador)

---

## Flujo: entrenador asigna plan

1. Abre ficha del miembro asignado.
2. **Nutrición** o `/members/:id/nutrition`.
3. Define macros objetivo (kcal, proteína, carbos, grasas), márgenes y notas.
4. Guardar.

**Resultado esperado:** El miembro ve el plan en **Nutrición**.

---

## Flujo: miembro consulta y registra

1. Tab **Nutrición** en bottom nav (móvil) o menú.
2. Selector de semana + gauge semi-circular de calorías + anillos P/C/G vs el plan.
3. **Registrar comida** (manual) o **Analizar foto** (IA).
4. Con foto: cámara/galería → análisis → preview editable → guardar en el log del día.

**Resultado esperado:** Los macros del día se suman al progreso frente al plan del entrenador.

---

## Flujo: foto → IA (opcional)

1. Configura en el servidor (nunca en el frontend):
   - `FOOD_VISION_PROVIDER=mock` — macros de ejemplo (desarrollo).
   - `FOOD_VISION_PROVIDER=openrouter` + `OPENROUTER_API_KEY` — modelos gratis vía [OpenRouter](https://openrouter.ai/keys).
   - `FOOD_VISION_PROVIDER=gemini` + `GEMINI_API_KEY` — Gemini Flash.
   - Si no defines proveedor: openrouter → gemini → mock (solo fuera de producción).
2. `POST /api/nutrition/analyze-food` (solo `member`), multipart campo `photo` (JPEG/PNG/WebP, máx. 5 MB).
3. Rate limit: análisis por usuario/hora + rate limit de uploads.
4. La foto no se persiste; solo se estiman macros. El cliente debe confirmar/editar antes de guardar el log.
5. Sin clave / error de red: mensaje claro y fallback a registro manual.

---

## Flujo: overview del entrenador

1. **Nutrición** (`/nutrition-overview`) — solo clientes asignados.
2. Filtros: todos / con plan / sin plan; adherencia de los últimos 7 días.

---

## Permisos

| Acción                     | admin | trainer       | member |
| -------------------------- | ----- | ------------- | ------ |
| Ver propio plan / logs     | —     | —             | ✓      |
| Editar plan de miembro     | —     | ✓ (asignados) | —      |
| Overview de clientes       | —     | ✓ (asignados) | —      |
| Analizar foto de comida    | —     | —             | ✓      |

> Nota: `GET /api/admin/overview` permanece en API por compatibilidad, pero la UI de overview es solo entrenador.

---

## Enlaces

- [Manual entrenador](../manual/MANUAL-ENTRENADOR.md)
- [Manual cliente](../manual/MANUAL-CLIENTE.md)
