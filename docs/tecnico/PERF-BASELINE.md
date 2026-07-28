# Performance baseline — Linear redesign F0

Captured as part of the Linear + speed initiative. Re-run after significant FE changes.

## How to measure

```powershell
npm run build
npm run lighthouse:ci
# Optional authenticated panel (advisory unless LIGHTHOUSE_PANEL_STRICT=1):
# With `npm run dev` up and DEMO_PASSWORD set:
# $env:LIGHTHOUSE_AUTH_PANEL=1; npm run lighthouse:ci

# Bundle composition:
$env:ANALYZE=1; npm run build
# Open dist/stats.html
```

## Contracts (targets)

| Surface                      | Metric                       | Target                          |
| ---------------------------- | ---------------------------- | ------------------------------- |
| `/login`                     | Lighthouse performance       | ≥ 0.85                          |
| `/login`                     | LCP                          | ≤ 2500 ms                       |
| `/login`                     | Accessibility                | ≥ 0.95                          |
| `/panel` (auth, advisory)    | Lighthouse performance       | ≥ 0.72                          |
| `/panel` (auth, advisory)    | LCP                          | ≤ 3200 ms                       |
| Route change (shell mounted) | Perceived                    | &lt; 100 ms (cache or skeleton) |
| JS chunk warning             | Vite `chunkSizeWarningLimit` | 300 KB                          |

## Baseline notes (F0)

- Stack: React 19 + Vite SPA + TanStack Query (`staleTime` 60s) + route/data prefetch.
- Charts (`recharts`) and QR scanners stay in separate manual chunks; not on admin first paint until expanded.
- Fonts: Inter only for UI chrome; JetBrains Mono deferred to authenticated shell.
- Command palette: Ctrl/⌘K (client-only, no new heavy dependency).

### Measured (2026-07-27, post-redesign gate)

| Check                           | Result                          |
| ------------------------------- | ------------------------------- |
| `/login` Lighthouse performance | 0.97                            |
| `/login` accessibility          | 1.00                            |
| `/login` LCP                    | 1066 ms (re-medida 2026-07-28)  |
| `bundle:budget`                 | OK (133 JS assets, 2026-07-28)  |
| `bundle:baseline` gzip delta    | +3.3% (under 5% fail threshold) |

### Soft gate panel (2026-07-28)

- Panel autenticado se mide en CI con `LIGHTHOUSE_AUTH_PANEL=1` (advisory).
- Endurecer: `$env:LIGHTHOUSE_PANEL_STRICT='1'; $env:LIGHTHOUSE_AUTH_PANEL='1'; npm run lighthouse:ci` cuando el panel cumpla ≥0.72 estable.
- Prod health 2026-07-28: `db_latency_ms` ≈ 21 ms. Redis session cache: confirmar hit-rate en `/api/health/metrics` con sesión admin (Render tiene `REDIS_URL` vía KV).

Update this file when `lighthouse:ci` numbers move meaningfully.
