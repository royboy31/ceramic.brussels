-- VIP guests get an approval state (docs/vip-access.md, "The guest list in
-- the Studio").
--
-- Until now a guest existed only once the team had put them in the
-- spreadsheet, so every row was a yes. Two things change that: the "not a
-- VIP yet?" form now files its request as a row, and the Studio's VIP tool
-- lets a Sanity administrator grant or deny it. A row's code is derivable
-- from its email the moment it exists, so the gate reads `status` - only an
-- approved guest's code opens anything.
--
-- Additive on purpose: every existing row is a guest the team chose, so the
-- default is 'approved' and nothing about them changes. The code that ran
-- before this migration never names these columns and keeps working, which
-- is what lets the migration go in ahead of the deploy.
ALTER TABLE guests ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'; -- pending | approved | denied
ALTER TABLE guests ADD COLUMN requested_at TEXT;  -- set when the row came from the request form
ALTER TABLE guests ADD COLUMN decided_at TEXT;
ALTER TABLE guests ADD COLUMN decided_by TEXT;    -- the Sanity administrator, by name

CREATE INDEX IF NOT EXISTS guests_status ON guests (status);
