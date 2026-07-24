# Archivo del repositorio

Fecha de creación: **2026-07-24**

Área versionada para material histórico o fuera del árbol de producto.
Nada aquí se elimina en la primera pasada de higiene: se conserva con trazabilidad.

## Contenido

| Ruta                                      | Origen                       | Motivo                                      | Reemplazo / estado                                                                   |
| ----------------------------------------- | ---------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| `docs/TRAINER-MEMBER-ASSIGNMENTS-EVAL.md` | `docs/modulos/`              | Evaluación de diseño ya implementada        | Ver `docs/modulos/ENTRENADORES-Y-TURNOS.md` + migración `trainer_member_assignments` |
| `ux-audit-evidence/`                      | `.cursor/ux-audit-evidence/` | Capturas locales de auditoría UX (binarios) | **No versionar** — regenerar con Playwright / QA manual. Ver `findings.summary.md`   |

## Política

1. **Archivar primero**, no borrar.
2. Binarios de evidencia UX → carpeta local ignorada por git.
3. Scripts legacy activos en CI viven en `scripts/test/`; solo lo histórico queda en `scripts/_archive/` (ver su README).
4. Para borrar definitivamente algo de este archivo: aprobación explícita del maintainer.
