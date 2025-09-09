-- Add email_mode field to Emails table for filtering by test/production mode
-- This field will track whether email was created/sent in test or production mode
ALTER TABLE public."Emails" ADD COLUMN email_mode TEXT DEFAULT 'production' CHECK (email_mode IN ('test', 'production'));

-- Update existing emails to have production mode as default
UPDATE public."Emails" SET email_mode = 'production' WHERE email_mode IS NULL;

-- Make the field NOT NULL after setting defaults
ALTER TABLE public."Emails" ALTER COLUMN email_mode SET NOT NULL;