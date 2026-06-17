-- Bloqueo explícito de la Data API de Supabase en tablas del backend.
-- Resuelve lint 0008 (RLS enabled, no policy): política deny-all para anon/authenticated.
-- El servidor Express accede con postgres/service_role y no se ve afectado.

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
    ORDER BY c.relname
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', tbl);
    EXECUTE format('DROP POLICY IF EXISTS backend_only ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY backend_only ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      tbl
    );
  END LOOP;
END $$;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
