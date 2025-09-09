-- Add email_mode column to campaigns table
ALTER TABLE "Campaigns" 
ADD COLUMN email_mode text CHECK (email_mode IN ('test', 'production'));