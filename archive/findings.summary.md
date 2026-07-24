# Resumen — evidencia UX audit

Fecha de captura original: auditoría en `.cursor/ux-audit-evidence/` (reubicada).

## Ubicación de binarios

Los PNG y el `findings.json` completo viven en **`archive/ux-audit-evidence/`** (ignorados por git).

No versionar capturas: regenerar con:

```powershell
npm run test:ux:browser
# o checklist manual: docs/qa/UX-QA.md
```

## Hallazgos tipificados (muestra del JSON)

El JSON registra por rol/viewport/ruta: `hasCargando`, `hasReintentar`, `hScroll`, labels de nav (`aria`), título de página.

Roles cubiertos en la captura: member, admin, reception, trainer + pantallas auth.

## Política

- Conservar localmente mientras sirva de comparación visual.
- Eliminación definitiva de la carpeta: solo con aprobación explícita.
- Fuente de verdad de criterios: `docs/qa/UX-QA.md` y `docs/qa/QA-VISUAL-CHECKLIST.md`.
