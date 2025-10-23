-- Fix campaign logging triggers to always log with fallback UUIDs

CREATE OR REPLACE FUNCTION public.after_insert_campaign_log_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  fallback_uuid uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  INSERT INTO public."EventLogs" (
    project_id,
    user_id,
    event_name,
    metadata,
    timestamp
  )
  VALUES (
    COALESCE(NEW.project_id, fallback_uuid),
    COALESCE(NEW.user_id, fallback_uuid),
    'campaign_auto_created',
    jsonb_build_object(
      'campaign_id', NEW.id,
      'campaign_name', NEW.name,
      'ai_request_id', NEW.ai_request_id
    ),
    NOW()
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.after_insert_campaign_create_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  fallback_uuid uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  INSERT INTO public."EventLogs" (
    id,
    project_id,
    user_id,
    event_name,
    metadata,
    timestamp
  )
  VALUES (
    gen_random_uuid(),
    COALESCE(NEW.project_id, fallback_uuid),
    COALESCE(NEW.user_id, fallback_uuid),
    'campaign_auto_created',
    jsonb_build_object(
      'campaign_id', NEW.id,
      'campaign_name', NEW.name,
      'ai_request_id', NEW.ai_request_id
    ),
    NOW()
  );
  RETURN NEW;
END;
$function$;