-- Member-owned routines: clients create/edit their own; trainers keep visibility via trainer_id.

ALTER TABLE routines
  ADD COLUMN IF NOT EXISTS owner_member_id BIGINT REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE routines
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'trainer';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'routines_source_check'
  ) THEN
    ALTER TABLE routines
      ADD CONSTRAINT routines_source_check
      CHECK (source IN ('trainer', 'member_created', 'member_clone'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'routines_member_created_owner'
  ) THEN
    ALTER TABLE routines
      ADD CONSTRAINT routines_member_created_owner
      CHECK (source <> 'member_created' OR owner_member_id IS NOT NULL);
  END IF;
END $$;

COMMENT ON COLUMN routines.owner_member_id IS
  'When set, only this member may mutate the routine (plus admin). Trainers retain read via trainer_id.';

COMMENT ON COLUMN routines.source IS
  'Provenance: trainer library, member-created, or member self-assign clone.';

CREATE INDEX IF NOT EXISTS idx_routines_owner_member
  ON routines (owner_member_id)
  WHERE owner_member_id IS NOT NULL;

-- Extend activity feed for member-created routines
ALTER TABLE member_activity_events
  DROP CONSTRAINT IF EXISTS member_activity_events_type;

ALTER TABLE member_activity_events
  ADD CONSTRAINT member_activity_events_type CHECK (
    event_type IN (
      'self_assigned_template',
      'exercise_substituted',
      'exercise_skipped',
      'member_created_routine'
    )
  );
