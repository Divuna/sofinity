-- ============================================================
-- SECURE PUSH PIPELINE FIXES (Sofinity Core)
-- Based on Deep Audit findings #2-#6
-- ============================================================

-- FIX #1: Allow nullable user_id for anonymous devices
-- Current: user_id UUID NOT NULL (blocks anonymous entries)
-- Fix: Make nullable + add CHECK constraint for identification
ALTER TABLE public.user_devices 
ALTER COLUMN user_id DROP NOT NULL;

-- Add CHECK constraint: Either user_id OR email must exist
ALTER TABLE public.user_devices 
ADD CONSTRAINT require_user_or_email 
CHECK (
  (user_id IS NOT NULL) OR (email IS NOT NULL AND email != '')
);

-- FIX #2: Create partial unique index for anonymous users
-- Prevents duplicate (email, player_id) combinations for anonymous entries
CREATE UNIQUE INDEX IF NOT EXISTS user_devices_email_player_unique 
ON public.user_devices (email, player_id) 
WHERE user_id IS NULL AND email IS NOT NULL;

-- FIX #3: Add RLS INSERT policy for authenticated users
-- Allows frontend to directly insert devices (currently only via RPC)
DROP POLICY IF EXISTS "Users can insert own devices" ON public.user_devices;
CREATE POLICY "Users can insert own devices"
  ON public.user_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- FIX #4: Create claim_anonymous_device() function
-- Links anonymous devices to newly registered users
CREATE OR REPLACE FUNCTION public.claim_anonymous_device(
  p_email TEXT,
  p_new_user_id UUID
)
RETURNS INTEGER  -- Returns count of claimed devices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Transfer anonymous devices to authenticated user
  UPDATE public.user_devices 
  SET 
    user_id = p_new_user_id,
    updated_at = now()
  WHERE 
    email = p_email 
    AND user_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Audit log for tracking device claims
  IF updated_count > 0 THEN
    INSERT INTO public.audit_logs (event_name, user_id, event_data, created_at)
    VALUES (
      'device_claimed',
      p_new_user_id,
      jsonb_build_object(
        'email', p_email,
        'devices_claimed', updated_count,
        'timestamp', now()
      ),
      now()
    );
  END IF;
  
  RETURN updated_count;
END;
$$;

-- FIX #5: Update save_player_id to STOP dual-write
-- Remove update to profiles.onesignal_player_id (single source of truth: user_devices)
CREATE OR REPLACE FUNCTION public.save_player_id(
  p_user_id UUID, 
  p_player_id TEXT, 
  p_device_type TEXT DEFAULT 'web',
  p_email TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Upsert to user_devices ONLY (no more dual-write to profiles)
  INSERT INTO public.user_devices (user_id, player_id, device_type, email, created_at, updated_at)
  VALUES (p_user_id, p_player_id, p_device_type, p_email, now(), now())
  ON CONFLICT (player_id)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    device_type = EXCLUDED.device_type,
    email = COALESCE(EXCLUDED.email, user_devices.email),
    updated_at = now();
  
  -- ✅ REMOVED: Dual-write to profiles.onesignal_player_id
  -- Single source of truth is now user_devices table
END;
$$;

-- FIX #6: Trigger to auto-claim devices on user signup
-- Automatically links anonymous devices when user registers
CREATE OR REPLACE FUNCTION public.auto_claim_devices_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  claimed_count INTEGER;
BEGIN
  -- Attempt to claim anonymous devices for this email
  SELECT public.claim_anonymous_device(NEW.email, NEW.id) INTO claimed_count;
  
  IF claimed_count > 0 THEN
    RAISE NOTICE 'Auto-claimed % device(s) for user % (email: %)', claimed_count, NEW.id, NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to profiles INSERT (after user signup creates profile)
DROP TRIGGER IF EXISTS trigger_auto_claim_devices ON public.profiles;
CREATE TRIGGER trigger_auto_claim_devices
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_claim_devices_on_signup();

-- FIX #7: Helper view for multi-device push sending
-- Simplified view without non-existent columns
CREATE OR REPLACE VIEW public.user_devices_active AS
SELECT 
  ud.user_id,
  ud.player_id,
  ud.device_type,
  ud.email,
  p.email as profile_email
FROM public.user_devices ud
LEFT JOIN public.profiles p ON p.user_id = ud.user_id
WHERE ud.player_id IS NOT NULL
  AND ud.player_id != ''
  AND ud.player_id NOT LIKE '%TVŮJ%'
  AND ud.player_id NOT LIKE '%PLAYER-ID%';

-- Grant SELECT on view to authenticated users
GRANT SELECT ON public.user_devices_active TO authenticated;
GRANT SELECT ON public.user_devices_active TO service_role;