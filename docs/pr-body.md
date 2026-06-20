## Summary
- Add receptionist role with dashboard, counter mode, walk-in wizard, and access-control panel backed by new API routes and migration.
- Introduce a shared design system (typography tokens, FilterChips, softer Modal/Table/EmptyState) and apply visual polish across admin, trainer, member, login/register, and kiosk check-in.
- Improve mobile workout flow, reception shortcuts, and admin/trainer dashboards with grouped KPIs, filter chips, and consistent section titles.

## Test plan
- [x] `npm run lint`
- [x] `npm run test:reception-checklist` (14/14)
- [x] `npm run test:auth-checklist` (12/12)
- [x] `npm run verify:local-e2e`
- [x] Visual pass in browser by role
- [x] Migration `20260619000000_add_receptionist_role.sql` applied locally
- [ ] Manual smoke: counter mode shortcuts (Enter/F1/F2) on `/reception?mode=counter`
