# Scorecard de calidad — GymApure

**Fecha baseline:** 2026-07-25  
**Alcance del 10/10:** gimnasio único VE/LATAM en producción (Render + Supabase). Multi-sede / Stripe / POS = Fase 5 a demanda.

## Notas por dimensión

| Dimensión                 | Baseline | Meta post-ruta | Notas                                      |
| ------------------------- | -------- | -------------- | ------------------------------------------ |
| Producto / dominio        | 8.0      | 8.5            | Core profundo; Reservas/GTM más delgados   |
| Arquitectura / ingeniería | 7.5      | 9.0            | React Query hot paths + god-files + Vitest |
| Seguridad                 | 7.5      | 9.0            | MFA staff, secretos MFA cifrados, IDOR     |
| Datos / ops / deploy      | 8.5      | 9.0            | Ya fuerte; runbooks + Sentry               |
| UX / UI / design system   | 7.0      | 9.0            | Marca unificada, landing, Reservas         |
| Calidad / tests           | 7.5      | 9.0            | Unit + CI domain checklists                |
| Go-to-market / PWA        | 6.0      | 8.5            | Manifest GymApure, landing, demo tokens    |

**Global baseline: 7.4 / 10** · **Tras implementación Fases 0–4 (2026-07-25): ~8.8 estimado** · **Techo ruta gym único: ~9.5**

### Avances aplicados en esta iteración

- MFA disponible + cifrado `mfa_secret` (obligatorio solo si `REQUIRE_MFA_FOR_STAFF=true`); trainer access por assignment; checklist IDOR ampliado
- React Query en Reception + ActiveWorkout; Vitest + CI domain checklists
- Landing `/`, manifest GymApure, demo con tokens, Reservas elevadas, palettes featured
- Runbooks Sentry/incidentes/PII; Lighthouse panel budgets más estrictos (advisory)

## Inventario técnico (2026-07-25)

| Métrica                       | Valor                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| Migraciones SQL               | 71                                                                                            |
| Páginas TSX (`src/pages`)     | 71                                                                                            |
| Specs Playwright (`tests/ux`) | 43                                                                                            |
| Páginas con hooks/queries     | ~27                                                                                           |
| God-files UI (>40 KB)         | MemberRoutine, Messages, ActiveWorkout, Profile, Equipment, WorkoutHistory, Payments, Members |
| God-files API (>20 KB)        | users, stats, nutrition, trainerCoaching, equipment, classes, workouts, routines, reports     |

### Hot paths pendientes de React Query (prioridad)

1. `ActiveWorkout.tsx` — carga de rutina / ejercicios
2. `Reception.tsx` — inside list + check-in PIN
3. `Equipment.tsx`, `Attendance.tsx`
4. `Messages.tsx` (parcial; ya usa chat query en parte)

## Re-evaluación

Re-puntuar este scorecard al cerrar cada fase (1–4). Actualizar fecha y notas; no borrar el baseline.
