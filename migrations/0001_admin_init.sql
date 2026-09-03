-- Admin users for the custom editor panel.
--
-- These are NOT Sanity accounts. Everyone here edits through one Sanity write
-- token, which is why `audit_log` exists: Sanity's own document history will
-- show every change as that single token, so who-did-what only survives here.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  -- pbkdf2$<iterations>$<salt b64>$<hash b64>. Never a plaintext password.
  password_hash TEXT NOT NULL,
  -- 'admin' may manage users; 'editor' may only edit content.
  role          TEXT NOT NULL CHECK (role IN ('admin', 'editor')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  -- Set when an admin creates or resets an account: the user must choose a new
  -- password before anything else is allowed.
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  last_login_at TEXT
);

-- Only the SHA-256 of the session token is stored, so a dump of this table
-- cannot be replayed as a live session.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip         TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS sessions_user_idx    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

-- Failed logins, for throttling. Successful logins clear the row.
CREATE TABLE IF NOT EXISTS login_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL,
  ip         TEXT NOT NULL,
  at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS login_attempts_idx ON login_attempts(email, ip, at);

-- Every content write, with the user id attached. This is the only record that
-- ties a Sanity change to a person.
CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  at         TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  user_email TEXT NOT NULL,
  action     TEXT NOT NULL,
  doc_type   TEXT,
  doc_id     TEXT,
  -- JSON: { "field.path": "new value", ... } as actually sent to Sanity.
  changes    TEXT,
  ip         TEXT
);
CREATE INDEX IF NOT EXISTS audit_at_idx   ON audit_log(at DESC);
CREATE INDEX IF NOT EXISTS audit_user_idx ON audit_log(user_id, at DESC);
CREATE INDEX IF NOT EXISTS audit_doc_idx  ON audit_log(doc_id, at DESC);
