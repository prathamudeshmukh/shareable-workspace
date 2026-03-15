-- Migration: move expiry from workspace-level to file-level

-- 1. Drop the workspace expiry index before dropping the column
DROP INDEX IF EXISTS idx_workspaces_expires;

-- 2. Drop expires_at from workspaces
ALTER TABLE workspaces DROP COLUMN expires_at;

-- 3. Add expires_at to files (default 0 for any rows that predate this migration)
ALTER TABLE files ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 0;

-- 4. Index for efficient expired-file queries
CREATE INDEX IF NOT EXISTS idx_files_expires ON files(expires_at);
