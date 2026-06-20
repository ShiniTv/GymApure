-- Add receptionist role for front-desk staff
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'receptionist';
