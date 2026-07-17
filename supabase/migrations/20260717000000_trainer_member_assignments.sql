-- Explicit trainer ↔ member assignments (pre-assign without requiring a routine).

CREATE TABLE trainer_member_assignments (
  trainer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  PRIMARY KEY (trainer_id, member_id),
  CHECK (trainer_id <> member_id)
);

CREATE INDEX idx_trainer_member_assignments_member
  ON trainer_member_assignments (member_id);

CREATE INDEX idx_trainer_member_assignments_trainer
  ON trainer_member_assignments (trainer_id);

-- Backfill from existing routine assignments
INSERT INTO trainer_member_assignments (trainer_id, member_id, assigned_at)
SELECT DISTINCT r.trainer_id, ur.user_id, MIN(ur.assigned_at)
FROM user_routines ur
JOIN routines r ON r.id = ur.routine_id
WHERE r.trainer_id IS NOT NULL
GROUP BY r.trainer_id, ur.user_id
ON CONFLICT DO NOTHING;

ALTER TABLE trainer_member_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_member_assignments FORCE ROW LEVEL SECURITY;
REVOKE ALL ON trainer_member_assignments FROM anon, authenticated;
CREATE POLICY backend_only ON trainer_member_assignments
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
