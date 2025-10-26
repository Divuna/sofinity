
-- ============================================
-- Phase 1: Auto-populate missing profiles
-- ============================================

-- Function to ensure profile exists for a user
CREATE OR REPLACE FUNCTION public.ensure_profile_exists(target_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_id UUID;
  user_email TEXT;
BEGIN
  -- Check if profile already exists
  SELECT id INTO profile_id
  FROM public.profiles
  WHERE user_id = target_user_id;
  
  IF profile_id IS NOT NULL THEN
    RETURN profile_id;
  END IF;
  
  -- Get email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = target_user_id;
  
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'User % does not exist in auth.users', target_user_id;
  END IF;
  
  -- Create profile
  INSERT INTO public.profiles (user_id, email, name, onboarding_complete)
  VALUES (target_user_id, user_email, COALESCE(SPLIT_PART(user_email, '@', 1), 'User'), false)
  RETURNING id INTO profile_id;
  
  RETURN profile_id;
END;
$$;

COMMENT ON FUNCTION public.ensure_profile_exists IS 'Ensures a profile exists for the given user_id, creating one if necessary';

-- ============================================
-- Phase 2: Backfill missing profiles for existing EventLogs
-- ============================================

DO $$
DECLARE
  missing_user RECORD;
BEGIN
  FOR missing_user IN 
    SELECT DISTINCT e.user_id
    FROM public."EventLogs" e
    LEFT JOIN public.profiles p ON e.user_id = p.user_id
    WHERE p.id IS NULL AND e.user_id IS NOT NULL
  LOOP
    BEGIN
      PERFORM public.ensure_profile_exists(missing_user.user_id);
      RAISE NOTICE 'Created profile for user %', missing_user.user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not create profile for user %: %', missing_user.user_id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- ============================================
-- Phase 3: Add Foreign Key Constraints
-- ============================================

-- Add foreign key from EventLogs.user_id to profiles.user_id
-- (using profiles instead of auth.users for better API access)
ALTER TABLE public."EventLogs"
DROP CONSTRAINT IF EXISTS eventlogs_user_id_fkey;

ALTER TABLE public."EventLogs"
ADD CONSTRAINT eventlogs_user_id_profiles_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

-- Add foreign key from push_logs.user_id to profiles.user_id
ALTER TABLE public.push_logs
DROP CONSTRAINT IF EXISTS push_logs_user_id_fkey;

ALTER TABLE public.push_logs
ADD CONSTRAINT push_logs_user_id_profiles_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

-- Add foreign key from push_logs.event_id to EventLogs.id
ALTER TABLE public.push_logs
DROP CONSTRAINT IF EXISTS push_logs_event_id_fkey;

ALTER TABLE public.push_logs
ADD CONSTRAINT push_logs_event_id_eventlogs_fkey 
FOREIGN KEY (event_id) 
REFERENCES public."EventLogs"(id) 
ON DELETE CASCADE;

-- ============================================
-- Phase 4: Create trigger to auto-create profiles
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_create_profile_for_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.ensure_profile_exists(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_profile_before_event ON public."EventLogs";

CREATE TRIGGER ensure_profile_before_event
BEFORE INSERT ON public."EventLogs"
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_profile_for_event();

COMMENT ON TRIGGER ensure_profile_before_event ON public."EventLogs" 
IS 'Automatically creates a profile if one does not exist when an event is logged';

-- ============================================
-- Phase 5: Update test_push_notification function
-- ============================================

CREATE OR REPLACE FUNCTION public.test_push_notification(test_user_id UUID DEFAULT NULL)
RETURNS TABLE(test_status text, log_id uuid, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  test_event_id UUID;
  test_log_id UUID;
  actual_user_id UUID;
  test_project_id UUID := '00000000-0000-0000-0000-000000000999'::UUID;
BEGIN
  -- If no user_id provided, use current user or create test user
  IF test_user_id IS NULL THEN
    actual_user_id := auth.uid();
    IF actual_user_id IS NULL THEN
      RETURN QUERY
      SELECT 'error', NULL::UUID, 'Musíte být přihlášeni nebo zadat test_user_id'::TEXT;
      RETURN;
    END IF;
  ELSE
    actual_user_id := test_user_id;
  END IF;

  -- Ensure profile exists
  BEGIN
    PERFORM public.ensure_profile_exists(actual_user_id);
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY
    SELECT 'error', NULL::UUID, ('Nepodařilo se vytvořit profil: ' || SQLERRM)::TEXT;
    RETURN;
  END;

  -- Ensure test project exists
  INSERT INTO public."Projects" (id, name, description, user_id, is_active)
  VALUES (test_project_id, 'Test Project - Push Notifications', 'Auto-created for push notification testing', actual_user_id, true)
  ON CONFLICT (id) DO NOTHING;

  -- Insert test event
  BEGIN
    INSERT INTO public."EventLogs" (
      project_id, user_id, event_name, metadata, timestamp, source_system
    )
    VALUES (
      test_project_id,
      actual_user_id,
      'notification_sent',
      jsonb_build_object(
        'title', 'Test push z Sofinity',
        'message', 'Toto je testovací push notifikace ze Sofinity. Pokud ji vidíš, integrace funguje správně.',
        'test', true,
        'timestamp', NOW()
      ),
      NOW(),
      'sofinity_test'
    )
    RETURNING id INTO test_event_id;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY
    SELECT 'error', NULL::UUID, ('Chyba při vkládání EventLog: ' || SQLERRM)::TEXT;
    RETURN;
  END;

  -- Wait for trigger to process
  PERFORM pg_sleep(2);

  -- Check if push_logs entry was created
  SELECT id INTO test_log_id
  FROM public.push_logs
  WHERE event_id = test_event_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF test_log_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      pl.status,
      pl.id,
      CASE 
        WHEN pl.status = 'success' THEN 
          'Push notifikace byla úspěšně odeslána na OneSignal. Event ID: ' || test_event_id::TEXT
        WHEN pl.status = 'failed' THEN 
          'Push notifikace selhala: ' || COALESCE(pl.response->>'error', 'Neznámá chyba')
        WHEN pl.status = 'pending' THEN
          'Push notifikace čeká na zpracování'
        ELSE 
          'Push notifikace je ve stavu: ' || pl.status
      END
    FROM public.push_logs pl
    WHERE pl.id = test_log_id;
  ELSE
    RETURN QUERY
    SELECT 
      'no_log'::TEXT, 
      NULL::UUID, 
      ('Event byl vytvořen (ID: ' || test_event_id::TEXT || '), ale nebyl nalezen záznam v push_logs. Zkontrolujte trigger trigger_push_on_event.')::TEXT;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.test_push_notification IS 
'Tests push notification flow: creates test user profile if needed, inserts EventLog, verifies push_logs entry. 
Usage: SELECT * FROM test_push_notification() or SELECT * FROM test_push_notification(''user-uuid-here'')';

-- ============================================
-- Phase 6: Verification queries
-- ============================================

COMMENT ON TABLE public.push_logs IS 'Audit log for all push notifications sent via OneSignal';
COMMENT ON TABLE public."EventLogs" IS 'System event logs with automatic profile creation on insert';
COMMENT ON TABLE public.profiles IS 'User profiles linked to auth.users, used as FK target for better API access';
