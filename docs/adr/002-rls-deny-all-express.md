# ADR-002: RLS deny-all y acceso solo vía Express

## Estado

Aceptado (julio 2026)

## Contexto

Postgres vive en Supabase. Exponer PostgREST/anon a la app multiplicaría superficie IDOR y bypassaría RBAC de Express.

## Decisión

RLS enabled + forced en tablas `public` con policy `backend_only` `USING (false)`. Grants a `anon`/`authenticated` revocados. La app usa `pg.Pool` + `SUPABASE_SERVICE_ROLE_KEY` solo en servidor para Storage.

## Consecuencias

- Toda autorización vive en Express (`authorize`, `trainerAccess`).
- `db:health` falla si aparece grant público o tabla sin RLS.
- No se usa Supabase Client en el browser para datos de negocio.
