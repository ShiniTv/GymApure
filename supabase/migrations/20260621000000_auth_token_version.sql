-- Session invalidation: bump token_version to revoke outstanding JWT cookies.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
