-- Add missing fields to existing EmailLogs table
ALTER TABLE public."EmailLogs" 
ADD COLUMN IF NOT EXISTS project TEXT,
ADD COLUMN IF NOT EXISTS type TEXT;

-- Ensure user_id column is not nullable for RLS (current RLS policies depend on it)
ALTER TABLE public."EmailLogs" 
ALTER COLUMN user_id SET NOT NULL;