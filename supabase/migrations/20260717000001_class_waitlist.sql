-- Allow members to wait for a full group class and preserve one active booking per session.

ALTER TABLE class_bookings
  DROP CONSTRAINT IF EXISTS class_bookings_status_check;

ALTER TABLE class_bookings
  ADD CONSTRAINT class_bookings_status_check
  CHECK (status IN ('booked', 'waitlisted', 'cancelled', 'attended', 'no_show'));

DROP INDEX IF EXISTS idx_class_bookings_active_session_user;

CREATE UNIQUE INDEX idx_class_bookings_active_session_user
  ON class_bookings (session_id, user_id)
  WHERE status IN ('booked', 'waitlisted');

CREATE INDEX IF NOT EXISTS idx_class_bookings_waitlist_queue
  ON class_bookings (session_id, created_at, id)
  WHERE status = 'waitlisted';
