-- Private coaching notes per member (trainer/admin journal).

CREATE TABLE coach_notes (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coach_notes_body_len CHECK (
    char_length(trim(body)) >= 1 AND char_length(body) <= 4000
  )
);

CREATE INDEX idx_coach_notes_member_created
  ON coach_notes (member_id, created_at DESC);

CREATE INDEX idx_coach_notes_author
  ON coach_notes (author_id);

ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_notes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON coach_notes FROM anon, authenticated;
CREATE POLICY backend_only ON coach_notes
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
