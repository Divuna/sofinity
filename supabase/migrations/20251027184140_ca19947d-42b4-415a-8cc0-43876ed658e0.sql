-- Make user_id nullable in user_devices to support anonymous entries
ALTER TABLE public.user_devices 
ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing unique constraint and recreate to allow multiple anonymous entries
ALTER TABLE public.user_devices 
DROP CONSTRAINT IF EXISTS user_devices_user_id_player_id_key;

-- Add new unique constraint that allows multiple rows with null user_id
-- but still prevents duplicate player_id for the same user
CREATE UNIQUE INDEX user_devices_user_player_unique 
ON public.user_devices (user_id, player_id) 
WHERE user_id IS NOT NULL;

-- Add unique constraint on email+player_id for anonymous entries
CREATE UNIQUE INDEX user_devices_email_player_unique 
ON public.user_devices (email, player_id) 
WHERE user_id IS NULL AND email IS NOT NULL;

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_devices_email 
ON public.user_devices(email) 
WHERE email IS NOT NULL;