-- Remove group-class bookings module (class_types / class_sessions / class_bookings).
-- Leave trainer_member_assignments indexes from 20260717000003 intact.

DROP TABLE IF EXISTS class_bookings CASCADE;
DROP TABLE IF EXISTS class_sessions CASCADE;
DROP TABLE IF EXISTS class_types CASCADE;
