-- ============================================================
-- PHASE 1: Verify and ensure user_devices table structure
-- ============================================================

-- Check if user_devices table exists, if not create it
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL UNIQUE,
  device_type TEXT NOT NULL DEFAULT 'web',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add email column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_devices' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.user_devices ADD COLUMN email TEXT;
  END IF;
END $$;

-- Create index on user_id if not exists
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_player_id ON public.user_devices(player_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_email ON public.user_devices(email);

-- Enable RLS on user_devices
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_devices
DROP POLICY IF EXISTS "Users can view their own devices" ON public.user_devices;
CREATE POLICY "Users can view their own devices"
  ON public.user_devices FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all devices" ON public.user_devices;
CREATE POLICY "Service role can manage all devices"
  ON public.user_devices FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- PHASE 2: Verify and ensure audit_logs table structure
-- ============================================================

-- Check if audit_logs table exists, if not create it
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_data JSONB,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add details column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_logs' 
    AND column_name = 'details'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN details TEXT;
  END IF;
END $$;

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_name ON public.audit_logs(event_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit_logs
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view their own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all audit logs" ON public.audit_logs;
CREATE POLICY "Service role can manage all audit logs"
  ON public.audit_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- PHASE 3: Update save_player_id function to include email
-- ============================================================

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
AS $function$
BEGIN
  -- Insert or update user_devices with email
  INSERT INTO public.user_devices (user_id, player_id, device_type, email, created_at, updated_at)
  VALUES (p_user_id, p_player_id, p_device_type, p_email, now(), now())
  ON CONFLICT (player_id)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    device_type = EXCLUDED.device_type,
    email = COALESCE(EXCLUDED.email, user_devices.email),
    updated_at = now();
    
  -- Also update profiles.onesignal_player_id if profiles table has that column
  UPDATE public.profiles 
  SET onesignal_player_id = p_player_id
  WHERE user_id = p_user_id;
END;
$function$;

-- ============================================================
-- PHASE 4: Create verification function for OneSignal setup
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_onesignal_setup()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_app_id TEXT;
  v_api_key TEXT;
  v_device_count BIGINT;
  v_recent_syncs BIGINT;
BEGIN
  -- Check 1: OneSignal App ID in settings
  SELECT value INTO v_app_id FROM public.settings WHERE key = 'onesignal_app_id';
  RETURN QUERY SELECT 
    'OneSignal App ID'::TEXT,
    CASE WHEN v_app_id IS NOT NULL THEN '✅ OK' ELSE '❌ CHYBÍ' END,
    COALESCE('App ID: ' || LEFT(v_app_id, 20) || '...', 'Není nastaveno v tabulce settings')::TEXT;

  -- Check 2: OneSignal REST API Key in settings
  SELECT value INTO v_api_key FROM public.settings WHERE key = 'onesignal_rest_api_key';
  RETURN QUERY SELECT 
    'OneSignal REST API Key'::TEXT,
    CASE WHEN v_api_key IS NOT NULL THEN '✅ OK' ELSE '❌ CHYBÍ' END,
    CASE WHEN v_api_key IS NOT NULL THEN 'Klíč je nastaven' ELSE 'Není nastaveno v tabulce settings' END::TEXT;

  -- Check 3: user_devices table has entries
  SELECT COUNT(*) INTO v_device_count FROM public.user_devices;
  RETURN QUERY SELECT 
    'Registrovaná zařízení'::TEXT,
    CASE WHEN v_device_count > 0 THEN '✅ OK' ELSE '⚠️ PRÁZDNÉ' END,
    v_device_count || ' zařízení v databázi'::TEXT;

  -- Check 4: Recent sync attempts in last 24 hours
  SELECT COUNT(*) INTO v_recent_syncs 
  FROM public.audit_logs 
  WHERE event_name IN ('player_id_sync', 'player_id_sync_failed')
    AND created_at > now() - interval '24 hours';
  RETURN QUERY SELECT 
    'Nedávné synchronizace (24h)'::TEXT,
    CASE WHEN v_recent_syncs > 0 THEN '✅ AKTIVNÍ' ELSE '⚠️ ŽÁDNÉ' END,
    v_recent_syncs || ' pokusů o sync za posledních 24 hodin'::TEXT;

  -- Check 5: Overall status
  IF v_app_id IS NOT NULL AND v_api_key IS NOT NULL AND v_device_count > 0 THEN
    RETURN QUERY SELECT 
      '🎯 CELKOVÝ STAV'::TEXT,
      '✅ Sofinity ↔ OneMil Push Sync aktivní'::TEXT,
      'Vše je správně nakonfigurováno a funguje'::TEXT;
  ELSE
    RETURN QUERY SELECT 
      '🎯 CELKOVÝ STAV'::TEXT,
      '⚠️ VYŽADUJE KONFIGURACI'::TEXT,
      'Zkontrolujte chybějící položky výše'::TEXT;
  END IF;
END;
$function$;

COMMENT ON FUNCTION public.verify_onesignal_setup() IS 'Ověří nastavení OneSignal integrace a vrátí detailní report';

-- ============================================================
-- PHASE 5: Grant necessary permissions
-- ============================================================

-- Grant execute on verification function to authenticated users
GRANT EXECUTE ON FUNCTION public.verify_onesignal_setup() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_player_id(UUID, TEXT, TEXT, TEXT) TO service_role;