# scripts/_archive — legacy

Material histórico **conservado**. No borrar sin aprobación.

| Archivo                    | Estado               | Notas                                                                  |
| -------------------------- | -------------------- | ---------------------------------------------------------------------- |
| `test-sprint1.ts`          | Histórico / opcional | `npm run test:sprint1` — membresías/pagos legacy                       |
| `test-sprint2.ts`          | Histórico / opcional | `npm run test:sprint2`                                                 |
| `test-sprint3.ts`          | Histórico / opcional | `npm run test:sprint3`                                                 |
| `migrate-sqlite-to-pg.ts`  | Histórico one-shot   | `npm run db:migrate-from-sqlite` — solo migraciones antiguas SQLite→PG |
| `test-prod-video-smoke.ts` | Histórico            | Smoke manual contra URL de prod; no CI                                 |

## Movido a `scripts/test/` (activos en CI)

| Antes             | Ahora                                       | Comando                             |
| ----------------- | ------------------------------------------- | ----------------------------------- |
| `test-sprint4.ts` | `scripts/test/test-domain-core.ts`          | `npm run test:domain-core`          |
| `test-sprint5.ts` | `scripts/test/test-domain-chat.ts`          | `npm run test:domain-chat`          |
| `test-sprint6.ts` | `scripts/test/test-domain-notifications.ts` | `npm run test:domain-notifications` |

Los aliases `test:sprint4|5|6` siguen apuntando a los dominios activos.
