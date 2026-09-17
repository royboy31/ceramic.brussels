-- The VIP guest list (docs/vip-access.md).
--
-- This database held the site accounts removed on 2026-09-15 (migration
-- 0001, no longer in the repo). Their tables go; nothing in them is needed.
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS login_attempts;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

-- One row per VIP. The code is never stored: `code_hash` is the SHA-256 of
-- the code with the VIP_CODE_PEPPER secret in front, and the code itself is
-- derived from the guest's email and `code_version` by scripts/vip-guests.mjs,
-- which is how a re-run of the import reproduces it and a lost code is
-- reissued (version + 1) without the old one working any more.
CREATE TABLE IF NOT EXISTS guests (
  id            TEXT PRIMARY KEY,          -- first 20 hex of sha256(lower(email))
  code_hash     TEXT NOT NULL UNIQUE,
  code_version  INTEGER NOT NULL DEFAULT 1,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  institution   TEXT,
  function      TEXT,
  revoked       INTEGER NOT NULL DEFAULT 0,
  entries       INTEGER NOT NULL DEFAULT 0, -- how many times a code was entered
  last_entry_at TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  note          TEXT
);

-- The few values that must not sit in the public Sanity dataset: the hotel
-- code, for one. Written with `npm run vip -- --set key=value`.
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
