-- The name step, the guest's language and the delayed decline
-- (docs/vip-access.md; Baïlo, 3 and 4 Nov 2026).
--
-- Most of the list came in with an email and no name, so the gate asks for
-- it once (`details_at`). `code_name` was written for codes made from the
-- first name; codes are made from the email now, so it is unused and stays
-- empty. Applied to VIP_DB on 5 Nov 2026; the SQL below must not change.
--
-- Additive, like 0003: the code that runs before this migration never names
-- these columns and keeps working, so it can go in ahead of the deploy.
ALTER TABLE guests ADD COLUMN code_name TEXT;         -- the first name the code is made from; NULL = first_name
ALTER TABLE guests ADD COLUMN details_at TEXT;        -- when the guest gave their name at the gate
ALTER TABLE guests ADD COLUMN lang TEXT;              -- en | fr | nl: the page the request form was sent from
ALTER TABLE guests ADD COLUMN decline_mail_id TEXT;   -- Brevo messageId of a decline still scheduled
