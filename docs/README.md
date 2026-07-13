# Documentación — GymApure

Índice maestro del sistema. Versión documentada: **2.5.0** (julio 2026).

---

## Empezar aquí — ¿qué leer según tu rol?

| Si eres…                                     | Empieza por…                                                                                                          |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Técnico** instalando en otro PC o servidor | [INICIO-RAPIDO.md](./INICIO-RAPIDO.md) → [tecnico/INSTALACION-NUEVO-EQUIPO.md](./tecnico/INSTALACION-NUEVO-EQUIPO.md) |
| **Administrador** del gimnasio               | [manual/MANUAL-ADMIN.md](./manual/MANUAL-ADMIN.md)                                                                    |
| **Recepcionista**                            | [manual/MANUAL-RECEPCION.md](./manual/MANUAL-RECEPCION.md)                                                            |
| **Entrenador**                               | [manual/MANUAL-ENTRENADOR.md](./manual/MANUAL-ENTRENADOR.md)                                                          |
| **Cliente / miembro**                        | [manual/MANUAL-CLIENTE.md](./manual/MANUAL-CLIENTE.md)                                                                |
| **Desarrollador** que modifica código        | [DESARROLLO.md](./DESARROLLO.md)                                                                                      |
| **DevOps** desplegando a producción          | [DEPLOY.md](./DEPLOY.md) + [tecnico/ENTORNOS-Y-SEGURIDAD.md](./tecnico/ENTORNOS-Y-SEGURIDAD.md)                       |

> **Reglas de oro antes de tocar la base de datos:** lee [tecnico/ENTORNOS-Y-SEGURIDAD.md](./tecnico/ENTORNOS-Y-SEGURIDAD.md).

---

## Manual de uso (por rol)

| Documento                                                    | Contenido                                                                                   |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| [manual/MANUAL-ADMIN.md](./manual/MANUAL-ADMIN.md)           | Dashboard, miembros, membresías, pagos, equipamiento, entrenadores, reportes, configuración |
| [manual/MANUAL-RECEPCION.md](./manual/MANUAL-RECEPCION.md)   | Panel recepción, walk-in, check-in, pagos                                                   |
| [manual/MANUAL-ENTRENADOR.md](./manual/MANUAL-ENTRENADOR.md) | Miembros asignados, rutinas, ejercicios, nutrición, historial                               |
| [manual/MANUAL-CLIENTE.md](./manual/MANUAL-CLIENTE.md)       | Inicio, rutinas, entrenamiento activo, biblioteca, nutrición, pagos, PWA                    |

---

## Guías por módulo

| Módulo                     | Documento                                                                  |
| -------------------------- | -------------------------------------------------------------------------- |
| Equipamiento (CMMS)        | [modulos/EQUIPAMIENTO.md](./modulos/EQUIPAMIENTO.md)                       |
| Pagos y tipo de cambio BCV | [modulos/PAGOS-Y-TIPO-DE-CAMBIO.md](./modulos/PAGOS-Y-TIPO-DE-CAMBIO.md)   |
| Rutinas y entrenamiento    | [modulos/RUTINAS-Y-ENTRENAMIENTO.md](./modulos/RUTINAS-Y-ENTRENAMIENTO.md) |
| Chat y notificaciones      | [modulos/CHAT-Y-NOTIFICACIONES.md](./modulos/CHAT-Y-NOTIFICACIONES.md)     |
| Nutrición                  | [modulos/NUTRICION.md](./modulos/NUTRICION.md)                             |
| Entrenadores y turnos      | [modulos/ENTRENADORES-Y-TURNOS.md](./modulos/ENTRENADORES-Y-TURNOS.md)     |
| Móvil y PWA                | [modulos/MOVIL-Y-PWA.md](./modulos/MOVIL-Y-PWA.md)                         |
| Membresías y asistencia    | [modulos/MEMBRESIAS-Y-ASISTENCIA.md](./modulos/MEMBRESIAS-Y-ASISTENCIA.md) |

---

## Documentación técnica

| Documento                                                                    | Contenido                                          |
| ---------------------------------------------------------------------------- | -------------------------------------------------- |
| [INICIO-RAPIDO.md](./INICIO-RAPIDO.md)                                       | 15 pasos para poner el gym operativo               |
| [tecnico/INSTALACION-NUEVO-EQUIPO.md](./tecnico/INSTALACION-NUEVO-EQUIPO.md) | Instalación completa en Windows/Mac                |
| [tecnico/ENTORNOS-Y-SEGURIDAD.md](./tecnico/ENTORNOS-Y-SEGURIDAD.md)         | Dev vs prod, comandos destructivos, reglas de oro  |
| [tecnico/VARIABLES-ENTORNO.md](./tecnico/VARIABLES-ENTORNO.md)               | Tabla completa de variables `.env`                 |
| [tecnico/ARQUITECTURA.md](./tecnico/ARQUITECTURA.md)                         | Stack, flujo de datos, auth, crons, Storage        |
| [tecnico/MIGRACIONES-Y-BD.md](./tecnico/MIGRACIONES-Y-BD.md)                 | Política de migraciones y resumen reciente         |
| [DESARROLLO.md](./DESARROLLO.md)                                             | Flujo diario de desarrollo, comandos, convenciones |
| [DEPLOY.md](./DEPLOY.md)                                                     | Despliegue Render + Supabase producción            |
| [TESTING.md](./TESTING.md)                                                   | Tests automatizados y CI                           |
| [UX-QA.md](./UX-QA.md)                                                       | Matriz UX manual por rol/viewport                  |
| [QA-VISUAL-CHECKLIST.md](./QA-VISUAL-CHECKLIST.md)                           | Checklist visual pre-release                       |

---

## Estructura del repositorio

| Ruta                   | Propósito                                   |
| ---------------------- | ------------------------------------------- |
| `src/`                 | Frontend React + API Express                |
| `scripts/db/`          | Migraciones, reset, admin, entorno dev/prod |
| `scripts/test/`        | Checklists e integración API                |
| `scripts/deploy/`      | Preflight, Lighthouse, bundle baseline      |
| `supabase/migrations/` | Esquema SQL (fuente de verdad)              |
| `tests/ux/`            | Playwright E2E                              |
| `docs/`                | Esta documentación                          |

---

## Entorno dev vs producción

| Entorno             | Supabase ref           | Archivo env                    |
| ------------------- | ---------------------- | ------------------------------ |
| Desarrollo local    | `sqjyxmbtgmiorckigrrg` | `.env.dev`                     |
| Producción (Render) | `ffjwvlcwhyskddqqojnp` | `.env.prod` / variables Render |

```powershell
npm run env:configure-dev -- <password>   # tras reset de contraseña en Dashboard dev
npm run db:setup:dev                      # migrar + health + activar .env
npm run db:create-admin:dev               # admin solo en dev
npm run db:verify-isolation               # confirmar que reset local no toca prod
npm run dev                               # servidor local con .env.dev
```

---

## Cuándo actualizar la documentación

| Cambio en el código             | Actualizar                                            |
| ------------------------------- | ----------------------------------------------------- |
| Nueva migración SQL             | `tecnico/MIGRACIONES-Y-BD.md` + sección en DESARROLLO |
| Nueva ruta o cambio de permisos | `DESARROLLO.md` §6 + manual del rol afectado          |
| Nuevo módulo visible en UI      | `docs/modulos/` + manual admin si aplica              |
| Cambio en nav móvil o layout    | `modulos/MOVIL-Y-PWA.md` + `QA-VISUAL-CHECKLIST.md`   |
| Nueva variable de entorno       | `tecnico/VARIABLES-ENTORNO.md` + `.env.example`       |
| Nuevo script npm                | `DESARROLLO.md` §5 + `TESTING.md` si es test          |

---

## Changelog de documentación

| Fecha      | Cambios                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------ |
| 2026-07-09 | Estructura híbrida: manuales por rol, módulos, anexos técnicos, sincronización con código v2.5.0 |
