-- The Express backend is the only access path; Supabase Data API remains deny-all.
ALTER TABLE web_vitals_metrics FORCE ROW LEVEL SECURITY;

REVOKE ALL ON web_vitals_metrics FROM anon, authenticated;
REVOKE ALL ON SEQUENCE web_vitals_metrics_id_seq FROM anon, authenticated;

CREATE POLICY backend_only ON web_vitals_metrics
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);
