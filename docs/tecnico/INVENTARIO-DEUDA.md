# Inventario de deuda — ruta 10/10

Snapshot 2026-07-25. Orden de ataque alineado a Fases 1–4.

## God-files (partir / hooks)

| Archivo                       | ~KB | Acción                              |
| ----------------------------- | --- | ----------------------------------- |
| `src/pages/MemberRoutine.tsx` | 86  | Ya tiene paneles; seguir extrayendo |
| `src/pages/Messages.tsx`      | 66  | Extraer lista/composer              |
| `src/pages/ActiveWorkout.tsx` | 63  | Hook Query + tipos/helpers          |
| `src/pages/Profile.tsx`       | 52  | Tabs ya parciales                   |
| `src/api/users.ts`            | 40  | Sub-routers de dominio              |

## React Query gaps

Páginas con `apiFetch` dominante sin hook dedicado: ActiveWorkout, Reception, Equipment, Attendance, CheckIn, AuditLogs, Reports, Memberships, DemoLeads, MfaSecurity (aceptable).

## Seguridad

- [x] Montar `enforceMfaForStaff` (env-gated)
- [x] Cifrar `mfa_secret` at-rest
- [x] Acotar `trainerHasMemberAccess` a assignments
- [x] Ampliar checklist IDOR (nutrition/files/classes)

## UX / marca

- [x] Manifest nombre GymApure
- [x] Landing pública
- [x] SolicitarDemo con tokens de marca
- [x] Reservas más ricas
- [x] Palettes reducidas (featured 4)
