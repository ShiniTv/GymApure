# GymApure — mapa de carpetas

Fuente de verdad de la estructura del monorepo. Actualizar cuando cambie la organización de la raíz.

## Carpeta de trabajo

- Path local típico: clon del repo GymApure
- Remoto: https://github.com/ShiniTv/GymApure

Usa **una sola** carpeta de trabajo del repo. No dupliques clones salvo worktrees explícitos.

## Árbol (producto + tooling)

```
caribean-gym/
├── server.ts                 # Entry Express
├── index.html                # Entry Vite
├── src/                      # Frontend React + API Express
├── public/                   # Estáticos / PWA
├── supabase/migrations/      # Esquema SQL
├── scripts/
│   ├── dev/                  # Entorno local
│   ├── db/                   # BD, seeds, audits
│   ├── test/                 # Pruebas HTTP / checklists
│   ├── deploy/               # Release y calidad deploy
│   ├── lib/                  # Helpers compartidos
│   └── _archive/             # Legacy (ver README interno)
├── tests/ux/                 # Playwright
├── docs/                     # Documentación (índice: README.md)
│   ├── manual/
│   ├── modulos/
│   ├── tecnico/
│   └── qa/
├── archive/                  # Histórico versionado (+ evidencia local ignorada)
├── .github/                  # CI / Dependabot
└── .cursor/skills/           # Skills del agente (proyecto)
```

## No versionar

`node_modules/`, `dist/`, `uploads/`, `test-results/`, `playwright-report/`, `.env*` (salvo `*.example`), `gym.db`, evidencia UX en `archive/ux-audit-evidence/`.

## Referencias

- Índice docs: [README.md](./README.md)
- Inventario de higiene: [tecnico/INVENTARIO-REPO.md](./tecnico/INVENTARIO-REPO.md)
- Desarrollo: [DESARROLLO.md](./DESARROLLO.md)
