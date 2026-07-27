# Linear UX + performance playbook

GymApure stays a **Vite SPA** (same model as Linear): persistent shell, React Query cache, optimistic UI, keyboard navigation. Do not migrate to Next for “speed.”

## Visual contract

- Surfaces: `bg` → `surface` → `surface-raised` → `surface-overlay` (see `src/index.css` `@theme`).
- Radii desktop panels: `--radius-card` ≈ 8px; sheets keep softer mobile radii.
- Hairline borders, no card shadows (`--shadow-card: none`).
- Brand color for CTAs/status only — not sidebar active state.
- Dense desktop; mobile keeps `--touch-min` (44px) / `--touch-comfort` (48px).

## Command palette

- Component: `src/components/CommandPalette.tsx`
- Wired in `Layout` (search button + Ctrl/⌘K)
- Sources: role nav + role quick actions
- Prefetches route modules on hover/select

## Speed contracts

| Pattern                | Where                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Route + data prefetch  | `src/lib/routePrefetch.ts` + nav hover                                                 |
| Optimistic mutations   | `src/lib/optimisticMutation.ts` + payments/memberships hooks                           |
| Virtualized long lists | Virtuoso on members/payments/attendance/audit (mobile/card paths) + messages/equipment |
| Lazy heavy UI          | Charts, QR, secondary MemberRoutine panels                                             |

## Measuring

See [PERF-BASELINE.md](./PERF-BASELINE.md). Gate scripts: `npm run lint`, `npm run build`, `npm run lighthouse:ci`.

Before merge of UX-heavy PRs: `npm run test:ux` and Playwright viewports per `docs/qa/UX-QA.md`.

## Role surfaces

| Role      | Primary home                | Notes                      |
| --------- | --------------------------- | -------------------------- |
| Admin     | `/panel` (`AdminDashboard`) | Dense KPIs + action lists  |
| Trainer   | trainer dashboard           | Flat `StaffPortalBanner`   |
| Reception | `/reception` counter        | Touch-first, ≥44px targets |
| Member    | member dashboard            | List density + workout CTA |

## Do not

- Add MUI/shadcn wholesale — evolve `src/components/ui`
- Shrink tablet counter buttons below touch minimum
- Ship without phase quality gate (`lint`/`build` + domain checklists)
