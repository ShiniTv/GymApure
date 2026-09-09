-- Versioned health-data consent for DSR / privacy compliance.
ALTER TABLE member_health_profiles
  ADD COLUMN IF NOT EXISTS health_consent_version TEXT,
  ADD COLUMN IF NOT EXISTS health_consent_policy_at TIMESTAMPTZ;

COMMENT ON COLUMN member_health_profiles.health_consent_version IS
  'Policy id accepted by the member (app constant HEALTH_CONSENT_VERSION).';
COMMENT ON COLUMN member_health_profiles.health_consent_policy_at IS
  'When the current consent version was accepted.';
