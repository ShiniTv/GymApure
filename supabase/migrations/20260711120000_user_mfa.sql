-- MFA TOTP for staff (admin, receptionist)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mfa_secret TEXT,
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN users.mfa_secret IS 'Base32 TOTP secret; only set for staff with MFA enabled or pending setup';
COMMENT ON COLUMN users.mfa_enabled IS 'When true, login requires TOTP verification for this user';
