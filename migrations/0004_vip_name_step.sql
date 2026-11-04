-- The name step, the guest's language and the delayed decline
-- (docs/vip-access.md; Baïlo, 3 and 4 Nov 2026).
--
-- Most of the list came in with an email and no name. A guest asked for
-- theirs once, at the gate, must keep the code already mailed to them - and
-- a code is made from the first name (vipGuests.ts makeCode). So the first
-- name a code was made from is kept apart: `code_name`. NULL means "the
-- first name", which is every row until its name is filled in, so nothing
-- is backfilled and no existing code moves.
--
-- Additive, like 0003: the code that runs before this migration never names
-- these columns and keeps working, so it can go in ahead of the deploy.
ALTER TABLE guests ADD COLUMN code_name TEXT;         -- the first name the code is made from; NULL = first_name
ALTER TABLE guests ADD COLUMN details_at TEXT;        -- when the guest gave their name at the gate
ALTER TABLE guests ADD COLUMN lang TEXT;              -- en | fr | nl: the page the request form was sent from
ALTER TABLE guests ADD COLUMN decline_mail_id TEXT;   -- Brevo messageId of a decline still scheduled
