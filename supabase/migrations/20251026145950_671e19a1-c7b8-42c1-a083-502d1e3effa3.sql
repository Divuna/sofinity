-- ============================================================================
-- SOFINITY PUSH NOTIFICATION INTEGRATION REPAIR
-- ============================================================================
-- Fixes OneSignal push notification integration:
-- - Cleans orphaned push_logs records
-- - Establishes correct FK relationships
-- - Fixes trigger_push_on_event to use auth.users.id directly
-- - Updates send_push_via_onesignal to only check profiles table
-- - Updates test_push_notification function
-- ============================================================================

-- Clean orphaned push_logs records
CREATE TABLE IF NOT EXISTS public.push_logs_backup_20250126 AS
SELECT * FROM public.push_logs WHERE false;

INSERT INTO public.push_logs_backup_20250126
SELECT pl.* FROM public.push_logs pl
WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = pl.user_id);

DELETE FROM public.push_logs
WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = push_logs.user_id);

-- Drop incorrect FK constraints
DO $$
DECLARE constraint_record RECORD;
BEGIN
  FOR constraint_record IN 
    SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name = 'EventLogs' AND constraint_type = 'FOREIGN KEY' 
    AND constraint_name LIKE '%user_id%'
  LOOP
    EXECUTE format('ALTER TABLE public."EventLogs" DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_record.constraint_name);
  END LOOP;
END $$;

DO $$
DECLARE constraint_record RECORD;
BEGIN
  FOR constraint_record IN 
    SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name = 'push_logs' AND constraint_type = 'FOREIGN KEY'
  LOOP
    EXECUTE format('ALTER TABLE public.push_logs DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_record.constraint_name);
  END LOOP;
END $$;

-- Add correct FK constraints
ALTER TABLE public."EventLogs"
  ADD CONSTRAINT eventlogs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.push_logs
  ADD CONSTRAINT push_logs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.push_logs
  ADD CONSTRAINT push_logs_event_id_fkey 
  FOREIGN KEY (event_id) REFERENCES public."EventLogs"(id) ON DELETE CASCADE;

-- Fix trigger_push_on_event
CREATE OR REPLACE FUNCTION public.trigger_push_on_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  push_title TEXT;
  push_message TEXT;
BEGIN
  IF NEW.event_name = 'notification_sent' THEN
    push_title := COALESCE(NEW.metadata->>'title', 'Oznámení z Sofinity');
    push_message := COALESCE(NEW.metadata->>'message', 'Máte nové oznámení.');
    PERFORM public.send_push_via_onesignal(NEW.user_id, push_title, push_message, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Fix send_push_via_onesignal
CREATE OR REPLACE FUNCTION public.send_push_via_onesignal(
  target_user_id UUID, title TEXT, message TEXT, event_id UUID DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  app_id TEXT;
  api_key TEXT;
  player_id TEXT;
  log_id UUID;
  http_response JSONB;
BEGIN
  INSERT INTO public.push_logs (user_id, event_id, status, created_at)
  VALUES (target_user_id, event_id, 'pending', NOW()) RETURNING id INTO log_id;

  SELECT value INTO app_id FROM public.settings WHERE key = 'onesignal_app_id';
  SELECT value INTO api_key FROM public.settings WHERE key = 'onesignal_rest_api_key';
  SELECT onesignal_player_id INTO player_id FROM public.profiles WHERE user_id = target_user_id;

  IF player_id IS NULL OR player_id = '' OR player_id LIKE '%TVŮJ%' OR player_id LIKE '%PLAYER-ID%' THEN
    UPDATE public.push_logs SET status = 'failed',
        response = jsonb_build_object('error', 'User does not have valid OneSignal player_id', 'player_id_found', COALESCE(player_id, 'NULL'))
    WHERE id = log_id;
    RETURN log_id;
  END IF;

  SELECT net.http_post(
    url := 'https://onesignal.com/api/v1/notifications',
    headers := jsonb_build_object('Authorization', 'Basic ' || api_key, 'Content-Type', 'application/json'),
    body := jsonb_build_object('app_id', app_id, 'include_player_ids', jsonb_build_array(player_id),
      'headings', jsonb_build_object('en', title, 'cs', title),
      'contents', jsonb_build_object('en', message, 'cs', message))
  ) INTO http_response;

  UPDATE public.push_logs SET status = 'success',
      response = jsonb_build_object('player_id', player_id, 'message', message, 'sent_at', NOW(), 'onesignal_response', http_response)
  WHERE id = log_id;

  RETURN log_id;
EXCEPTION
  WHEN OTHERS THEN
    UPDATE public.push_logs SET status = 'failed',
        response = jsonb_build_object('error', SQLERRM, 'player_id', player_id)
    WHERE id = log_id;
    RETURN log_id;
END;
$$;

-- Update test_push_notification
CREATE OR REPLACE FUNCTION public.test_push_notification(test_email TEXT DEFAULT NULL)
RETURNS TABLE(test_status TEXT, log_id UUID, message TEXT, user_id_used UUID, player_id TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  test_event_id UUID;
  test_log_id UUID;
  actual_user_id UUID;
  actual_player_id TEXT;
  test_project_id UUID := '00000000-0000-0000-0000-000000000999';
BEGIN
  IF test_email IS NOT NULL THEN
    SELECT au.id INTO actual_user_id FROM auth.users au WHERE au.email = test_email;
  ELSE
    SELECT au.id INTO actual_user_id FROM auth.users au ORDER BY au.created_at DESC LIMIT 1;
  END IF;

  IF actual_user_id IS NULL THEN
    RETURN QUERY SELECT 'error'::TEXT, NULL::UUID,
      CASE WHEN test_email IS NOT NULL THEN 'Uživatel ' || test_email || ' neexistuje'
        ELSE 'Žádní uživatelé. Vytvořte účet přes Supabase Auth UI' END::TEXT,
      NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  SELECT onesignal_player_id INTO actual_player_id FROM public.profiles WHERE user_id = actual_user_id;

  INSERT INTO public."Projects" (id, name, description, user_id, is_active)
  VALUES (test_project_id, 'Test Project - Push Notifications', 'Auto-created for testing', actual_user_id, true)
  ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, is_active = true;

  INSERT INTO public."EventLogs" (project_id, user_id, event_name, metadata, timestamp, source_system)
  VALUES (test_project_id, actual_user_id, 'notification_sent',
    jsonb_build_object('title', 'Test push z Sofinity', 'message', 'Sofinity → OneSignal integrace funguje!', 'test', true),
    NOW(), 'sofinity_test')
  RETURNING id INTO test_event_id;

  PERFORM pg_sleep(2);

  SELECT id INTO test_log_id FROM public.push_logs WHERE event_id = test_event_id ORDER BY created_at DESC LIMIT 1;

  IF test_log_id IS NOT NULL THEN
    RETURN QUERY SELECT pl.status::TEXT, pl.id,
      CASE WHEN pl.status = 'success' THEN 'Push úspěšně odeslán'
        WHEN pl.status = 'failed' THEN 'Push selhal: ' || COALESCE(pl.response->>'error', 'Neznámá chyba')
        ELSE 'Status: ' || pl.status END,
      actual_user_id, COALESCE(actual_player_id, 'NULL - Nastavte onesignal_player_id')
    FROM public.push_logs pl WHERE pl.id = test_log_id;
  ELSE
    RETURN QUERY SELECT 'no_log'::TEXT, NULL::UUID, 'Záznam v push_logs nebyl vytvořen'::TEXT,
      actual_user_id, COALESCE(actual_player_id, 'NULL');
  END IF;
END;
$$;