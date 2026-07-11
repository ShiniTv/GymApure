-- Deny direct Storage API access for anon/authenticated roles (defense in depth)
-- Hosted Supabase already enables RLS on storage.objects; ALTER requires supabase_storage_admin.
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE storage.objects FORCE ROW LEVEL SECURITY;

REVOKE ALL ON storage.objects FROM anon, authenticated;

DROP POLICY IF EXISTS backend_only_storage_objects ON storage.objects;
CREATE POLICY backend_only_storage_objects ON storage.objects
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
