-- Index guest_passes.created_by FK (audit-unindexed-fks)

CREATE INDEX IF NOT EXISTS idx_guest_passes_created_by ON guest_passes (created_by);
