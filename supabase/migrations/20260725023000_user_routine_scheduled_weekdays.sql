-- Planned weekdays are assignment-specific: the same routine can follow
-- different schedules for different members.

ALTER TABLE user_routines
  ADD COLUMN scheduled_weekdays SMALLINT[];

ALTER TABLE user_routines
  ADD CONSTRAINT user_routines_scheduled_weekdays_valid
  CHECK (
    scheduled_weekdays IS NULL OR (
      cardinality(scheduled_weekdays) BETWEEN 1 AND 7
      AND scheduled_weekdays <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::SMALLINT[]
    )
  );

CREATE INDEX idx_user_routines_scheduled_weekdays
  ON user_routines USING GIN (scheduled_weekdays);
