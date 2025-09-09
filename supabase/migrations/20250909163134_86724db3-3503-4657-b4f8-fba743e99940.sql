-- Add email_mode to UserPreferences table
ALTER TABLE public."UserPreferences" 
ADD COLUMN email_mode text DEFAULT 'production' CHECK (email_mode IN ('test', 'production'));

-- Add subject to Emails table
ALTER TABLE public."Emails" 
ADD COLUMN subject text;