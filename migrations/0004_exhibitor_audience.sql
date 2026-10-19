-- The exhibitors platform (docs/exhibitors-platform.md) reuses the VIP guest
-- table for a second audience: one row per participating gallery, a personal
-- code ("password" in the design), the same hashing and the same Studio tool.
-- `audience` says which door a code opens - a VIP code must never open the
-- exhibitors platform, nor the other way round. Every existing row is a VIP.
--
-- Apply BEFORE deploying code that selects the column (code-before-data):
--   npx wrangler d1 migrations apply ceramic-brussels-admin --remote
ALTER TABLE guests ADD COLUMN audience TEXT NOT NULL DEFAULT 'vip';
CREATE INDEX IF NOT EXISTS guests_audience ON guests (audience);
