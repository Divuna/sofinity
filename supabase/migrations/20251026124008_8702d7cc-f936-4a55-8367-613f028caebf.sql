-- ============================================================
-- Push Notification Integration Fix for Sofinity
-- ============================================================

-- 1. Create push_logs audit table
CREATE TABLE IF NOT EXISTS public.push_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public."EventLogs"(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on push_logs
ALTER TABLE public.push_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for push_logs
CREATE POLICY "Users can view their own push logs"
  ON public.push_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage push logs"
  ON public.push_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_push_logs_user_id ON public.push_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_push_logs_event_id ON public.push_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_push_logs_created_at ON public.push_logs(created_at DESC);

-- 2. Drop old send_push_via_onesignal function
DROP FUNCTION IF EXISTS public.send_push_via_onesignal(uuid, text, text);

-- 3. Create new send_push_via_onesignal with audit logging
CREATE OR REPLACE FUNCTION public.send_push_via_onesignal(
  target_user_id UUID, 
  title TEXT, 
  message TEXT,
  event_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_id TEXT;
  api_key TEXT;
  player_id TEXT;
  log_id UUID;
  http_response JSONB;
BEGIN
  -- Create initial log entry
  INSERT INTO public.push_logs (user_id, event_id, status, created_at)
  VALUES (target_user_id, event_id, 'pending', NOW())
  RETURNING id INTO log_id;

  -- Get OneSignal credentials from settings
  SELECT value INTO app_id FROM public.settings WHERE key = 'onesignal_app_id';
  SELECT value INTO api_key FROM public.settings WHERE key = 'onesignal_rest_api_key';

  IF app_id IS NULL OR api_key IS NULL THEN
    UPDATE public.push_logs 
    SET status = 'failed', 
        response = jsonb_build_object('error', 'OneSignal credentials not configured')
    WHERE id = log_id;
    
    RAISE WARNING 'OneSignal keys not found in settings';
    RETURN log_id;
  END IF;

  -- Get player_id from auth.users
  SELECT raw_user_meta_data->>'onesignal_player_id' 
  INTO player_id 
  FROM auth.users 
  WHERE id = target_user_id;

  IF player_id IS NULL THEN
    UPDATE public.push_logs 
    SET status = 'failed',
        response = jsonb_build_object('error', 'User does not have OneSignal player_id')
    WHERE id = log_id;
    
    RAISE NOTICE 'User % does not have OneSignal player_id', target_user_id;
    RETURN log_id;
  END IF;

  -- Send push notification via OneSignal API
  BEGIN
    SELECT net.http_post(
      url := 'https://onesignal.com/api/v1/notifications',
      headers := jsonb_build_object(
        'Authorization', 'Basic ' || api_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'app_id', app_id,
        'include_player_ids', jsonb_build_array(player_id),
        'headings', jsonb_build_object('en', title, 'cs', title),
        'contents', jsonb_build_object('en', message, 'cs', message)
      )
    ) INTO http_response;

    -- Update log with success
    UPDATE public.push_logs 
    SET status = 'success',
        response = jsonb_build_object(
          'player_id', player_id,
          'title', title,
          'message', message,
          'sent_at', NOW()
        )
    WHERE id = log_id;

    RAISE NOTICE 'Push notification sent to user %', target_user_id;

  EXCEPTION WHEN OTHERS THEN
    UPDATE public.push_logs 
    SET status = 'failed',
        response = jsonb_build_object(
          'error', SQLERRM,
          'player_id', player_id
        )
    WHERE id = log_id;
    
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
  END;

  RETURN log_id;
END;
$$;

-- 4. Update trigger_push_on_event with proper user resolution
CREATE OR REPLACE FUNCTION public.trigger_push_on_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_user_id UUID;
  push_title TEXT;
  push_message TEXT;
BEGIN
  -- Only process notification_sent events
  IF NEW.event_name = 'notification_sent' THEN
    
    -- Resolve auth.users.id from EventLogs.user_id
    -- EventLogs.user_id references profiles.user_id which references auth.users.id
    SELECT p.user_id INTO resolved_user_id
    FROM public.profiles p
    WHERE p.user_id = NEW.user_id;

    -- If no profile found, try direct user_id (fallback)
    IF resolved_user_id IS NULL THEN
      resolved_user_id := NEW.user_id;
    END IF;

    -- Extract title and message from metadata
    push_title := COALESCE(NEW.metadata->>'title', 'Oznámení z Sofinity');
    push_message := COALESCE(NEW.metadata->>'message', 'Máte nové oznámení.');

    -- Send push notification with audit logging
    PERFORM public.send_push_via_onesignal(
      resolved_user_id, 
      push_title, 
      push_message,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Create test function for push delivery verification
CREATE OR REPLACE FUNCTION public.test_push_notification(test_user_id UUID)
RETURNS TABLE(
  test_status TEXT,
  log_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  test_event_id UUID;
  test_log_id UUID;
BEGIN
  -- Create test event in EventLogs
  INSERT INTO public."EventLogs" (
    project_id,
    user_id,
    event_name,
    source_system,
    metadata,
    timestamp
  )
  VALUES (
    '00000000-0000-0000-0000-000000000999'::UUID, -- fallback project
    test_user_id,
    'notification_sent',
    'sofinity_test',
    jsonb_build_object(
      'title', 'Test push z Sofinity',
      'message', 'Toto je testovací push notifikace z platformy Sofinity. Pokud vidíte tuto zprávu, integrace funguje správně.',
      'test', true
    ),
    NOW()
  )
  RETURNING id INTO test_event_id;

  -- Wait a moment for trigger to execute
  PERFORM pg_sleep(1);

  -- Check push_logs for result
  SELECT id INTO test_log_id
  FROM public.push_logs
  WHERE event_id = test_event_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF test_log_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      pl.status::TEXT,
      pl.id,
      CASE 
        WHEN pl.status = 'success' THEN 'Push notifikace byla úspěšně odeslána.'
        WHEN pl.status = 'failed' THEN 'Push notifikace selhala: ' || COALESCE(pl.response->>'error', 'Neznámá chyba')
        ELSE 'Push notifikace je ve stavu: ' || pl.status
      END::TEXT
    FROM public.push_logs pl
    WHERE pl.id = test_log_id;
  ELSE
    RETURN QUERY
    SELECT 
      'no_log'::TEXT,
      NULL::UUID,
      'Nebyl nalezen záznam v push_logs. Trigger možná není aktivní.'::TEXT;
  END IF;
END;
$$;

-- 6. Verify EventLogs foreign key to profiles
-- Check if the constraint exists, if not add it
DO $$
BEGIN
  -- Note: EventLogs.user_id should reference profiles.user_id (which references auth.users.id)
  -- This is typically already set up, but we verify it here
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'eventlogs_user_id_fkey' 
    AND table_name = 'EventLogs'
  ) THEN
    -- Add foreign key if missing
    ALTER TABLE public."EventLogs"
      ADD CONSTRAINT eventlogs_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES public.profiles(user_id)
      ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint eventlogs_user_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint eventlogs_user_id_fkey already exists';
  END IF;
END $$;

-- 7. Add helpful comments
COMMENT ON TABLE public.push_logs IS 'Audit log for push notifications sent via OneSignal integration';
COMMENT ON FUNCTION public.send_push_via_onesignal IS 'Sends push notification via OneSignal with audit logging';
COMMENT ON FUNCTION public.trigger_push_on_event IS 'Trigger function that sends push notifications when notification_sent events occur';
COMMENT ON FUNCTION public.test_push_notification IS 'Test function to verify OneSignal push delivery - Usage: SELECT * FROM test_push_notification(''user-uuid'');';