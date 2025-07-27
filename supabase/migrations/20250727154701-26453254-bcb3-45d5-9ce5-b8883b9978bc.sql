-- Update Campaigns table to include email, post, video columns
ALTER TABLE public."Campaigns" 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS post text,
ADD COLUMN IF NOT EXISTS video text;

-- Ensure user_id is not nullable for RLS
ALTER TABLE public."Campaigns" 
ALTER COLUMN user_id SET NOT NULL;