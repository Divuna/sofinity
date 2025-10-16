-- Replace handle_project_connection_change to use pgsql-http (public.http_post) instead of pg_net
CREATE OR REPLACE FUNCTION public.handle_project_connection_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_connected BOOLEAN;
  v_url text := 'https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/on-project-connection';
  v_body text;
  v_resp public.http_response;
BEGIN
  -- Determine if project is connected or disconnected
  is_connected := NEW.external_connection IS NOT NULL;

  -- Only trigger if external_connection actually changed
  IF (OLD.external_connection IS DISTINCT FROM NEW.external_connection) THEN
    -- Prepare JSON body
    v_body := json_build_object(
      'project_id', NEW.id,
      'project_name', NEW.name,
      'connected', is_connected,
      'external_connection', NEW.external_connection,
      'timestamp', NOW()
    )::text;

    -- Use pgsql-http extension (public.http_post) instead of pg_net
    -- This avoids dependency on the missing net.http_post
    v_resp := public.http_post(
      v_url,
      v_body,
      'application/json'
    );
    -- Optionally, you could check v_resp.status here if needed
  END IF;

  RETURN NEW;
END;
$function$;