-- Fix send_push_via_onesignal to include user_id in push_log inserts
CREATE OR REPLACE FUNCTION public.send_push_via_onesignal(target_user_id uuid, title text, message text, event_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_app_id text;
  v_api_key text;
  v_profile record;
  v_player_id text;
  v_body jsonb;
BEGIN
  -- 🔹 Načti API klíče
  SELECT value INTO v_app_id FROM public.settings WHERE key = 'onesignal_app_id';
  SELECT value INTO v_api_key FROM public.settings WHERE key = 'onesignal_rest_api_key';

  -- 🔹 Najdi uživatele a jeho OneSignal ID
  SELECT * INTO v_profile FROM public.profiles WHERE id = target_user_id;
  v_player_id := v_profile.onesignal_player_id;

  IF v_player_id IS NULL THEN
    RAISE NOTICE '⚠️ Uživatel % nemá OneSignal ID, notifikace přeskočena', target_user_id;
    RETURN;
  END IF;

  -- 🔹 Připrav payload
  v_body := jsonb_build_object(
    'app_id', v_app_id,
    'include_player_ids', jsonb_build_array(v_player_id),
    'headings', jsonb_build_object('en', title),
    'contents', jsonb_build_object('en', message)
  );

  -- 🔹 Zavolej Edge funkci
  PERFORM net.http_post(
    'https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/send_push_via_onesignal',
    v_body,
    jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );

  -- 🔹 Zaloguj výsledek s user_id
  INSERT INTO public.push_log (user_id, notification_id, project_id, event_name, status, created_at)
  VALUES (target_user_id, event_id, 'defababe-004b-4c63-9ff1-311540b0a3c9', title, 'sent', now());
END;
$function$;