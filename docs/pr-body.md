## Summary
- Remove public kiosk check-in API and require authenticated staff for reception/check-in flows.
- Revalidate JWT sessions against the database with `token_version` invalidation on password and status changes.
- Enforce trainer IDOR guards, routine filtering by role, upload validation, global `asyncRouter`, API/upload rate limits, and React Query on key pages.
- Add `test:security-checklist` and `test:e2e`, unify CI on the full E2E suite, enable TypeScript `strict`, and document testing in `docs/TESTING.md`.

## Test plan
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run db:restore-demo`
- [x] `npm run verify:local-e2e` (integration + security + auth + reception)
