# Test integral del sistema — GymApure

Simulación de **uso moderado realista** durante **2 meses** con **6 días laborables por semana**, diseñada para verificar que todas las funcionalidades del sistema operan correctamente bajo carga representativa.

## Población simulada

| Rol           | Cantidad            | Email de ejemplo                                  |
| ------------- | ------------------- | ------------------------------------------------- |
| Administrador | 1                   | `sim.admin@gym.test`                              |
| Recepcionista | 1                   | `sim.reception@gym.test`                          |
| Entrenadores  | 5                   | `sim.trainer1@gym.test` … `sim.trainer5@gym.test` |
| Miembros      | 100 (20/entrenador) | `sim.t1.m1@gym.test` … `sim.t5.m20@gym.test`      |

### Distribución de niveles (por entrenador)

Cada entrenador tiene **20 miembros** distribuidos equitativamente:

- **7 principiantes** (`Beginner`)
- **7 intermedios** (`Intermediate`)
- **6 avanzados** (`Advanced`)

Total global: **35 principiantes**, **35 intermedios**, **30 avanzados**.

## Periodo de simulación

- **Duración:** 60 días calendario (~2 meses)
- **Jornada:** lunes a sábado (domingo = descanso)
- **Días laborables simulados:** ~52 días
- **Probabilidades diarias:**
  - 72% de miembros asisten al gimnasio
  - 65% de asistentes completan entrenamiento
  - 35% registran comida
  - 8% intercambian mensajes con entrenador

## Funcionalidades verificadas

El test cubre **todas las áreas desarrolladas**:

| Módulo             | Qué se prueba                                     |
| ------------------ | ------------------------------------------------- |
| **Auth & RBAC**    | Login por rol, IDOR entrenador, sesiones          |
| **Recepción**      | Lookup cédula, check-in/out en vivo               |
| **Asistencia**     | Registros históricos, analytics admin             |
| **Membresías**     | Planes, suscripciones activas                     |
| **Pagos**          | Reporte y aprobación simulados                    |
| **Rutinas**        | Biblioteca por nivel, asignaciones                |
| **Entrenamientos** | Sesiones, logs de series, historial               |
| **Nutrición**      | Planes por nivel, logs diarios, resumen           |
| **Chat**           | Conversaciones miembro ↔ entrenador               |
| **Notificaciones** | Centro de alertas                                 |
| **Equipamiento**   | Inventario CMMS                                   |
| **Reportes**       | Preview admin, exportación                        |
| **Tasa BCV**       | Exchange rate                                     |
| **Dashboard**      | Stats por rol (admin, trainer, member, reception) |

Además ejecuta los **10 checklists existentes** del proyecto (`test:smoke`, `test:security-checklist`, etc.).

---

## Requisitos previos

```bash
# 1. Variables de entorno
cp .env.example .env
# Completar: JWT_SECRET, DATABASE_URL, DEMO_PASSWORD (mín. 12 chars)

# 2. Base de datos
npm run db:migrate
npm run db:seed-system-exercises   # recomendado para rutinas completas

# 3. Servidor (terminal 1)
npm run dev
```

---

## Ejecución

### Simulación completa (recomendada)

```bash
npm run test:full-system
```

### Con servidor automático

```bash
npm run test:full-system -- --with-server
```

### Modo rápido (2 semanas)

```bash
npm run test:full-system -- --fast
```

### Solo crear población (sin simular)

```bash
npm run test:full-system -- --seed-only
```

### Sin checklists del proyecto (más rápido)

```bash
npm run test:full-system -- --skip-checklists
```

### Limpiar datos de simulación

```bash
npm run test:full-system -- --cleanup
```

### Variables opcionales

| Variable              | Default                 | Descripción               |
| --------------------- | ----------------------- | ------------------------- |
| `SIMULATION_PASSWORD` | `DEMO_PASSWORD`         | Contraseña de cuentas sim |
| `SIMULATION_DAYS`     | `60`                    | Días calendario a simular |
| `SMOKE_BASE_URL`      | `http://localhost:3000` | URL del servidor          |

---

## Salida

Al finalizar, el script genera:

1. **Reporte en consola** con estadísticas y recomendaciones
2. **JSON en `reports/`** con métricas detalladas para análisis

Ejemplo de métricas:

```
SIMULACIÓN (2 meses, 6 días/semana)
  Días laborables: 52
  Asistencias: ~3700
  Entrenamientos: ~1700
  Logs nutrición: ~900
  Mensajes chat: ~80
```

---

## Evaluación UX/UI por clientes

Tras la simulación, distribuir la encuesta en [`UX-EVALUACION-CLIENTES.md`](./UX-EVALUACION-CLIENTES.md) a una muestra representativa:

- **5 principiantes** (ej. `sim.t1.m1` … `sim.t1.m5`)
- **5 intermedios** (ej. `sim.t2.m8` … `sim.t2.m14`)
- **5 avanzados** (ej. `sim.t3.m15` … `sim.t3.m20`)

Los clientes inician sesión con la contraseña de simulación y evalúan la experiencia en su dispositivo habitual.

---

## Flujo recomendado completo

```bash
# 1. Preparar entorno
npm run db:migrate
npm run db:seed-system-exercises

# 2. Ejecutar test integral
npm run test:full-system -- --with-server

# 3. Revisar reporte
cat reports/full-system-test-*.json

# 4. Distribuir encuesta UX a clientes simulados
# Ver docs/UX-EVALUACION-CLIENTES.md

# 5. Tras correcciones UX
npm run test:ux:browser
npm run test:full-system -- --skip-checklists --fast
```

---

## Solución de problemas

| Error                    | Solución                                     |
| ------------------------ | -------------------------------------------- |
| `ECONNREFUSED`           | Iniciar `npm run dev` o usar `--with-server` |
| `DEMO_PASSWORD` faltante | Definir en `.env` (mín. 12 caracteres)       |
| Pocos ejercicios         | `npm run db:seed-system-exercises`           |
| Checklist auth falla     | Crear admin checklist: ver `docs/TESTING.md` |
| Datos duplicados         | `npm run test:full-system -- --cleanup`      |

---

## Archivos del test

```
scripts/test/
  run-full-system-test.ts       # Orquestador principal
  lib/
    simulation-config.ts        # Configuración y constantes
    simulation-api-client.ts    # Cliente HTTP con CSRF
    simulation-seed.ts          # Seed de población
    simulation-engine.ts        # Motor de simulación + verificación API
    simulation-report.ts        # Reporte final
docs/
  FULL-SYSTEM-TEST.md           # Esta guía
  UX-EVALUACION-CLIENTES.md     # Encuesta para clientes
reports/                        # JSON generados (gitignored)
```
