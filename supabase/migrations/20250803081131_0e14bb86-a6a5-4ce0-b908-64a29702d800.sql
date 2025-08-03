-- Fix the function to have proper search_path
CREATE OR REPLACE FUNCTION public.handle_project_connection_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  is_connected BOOLEAN;
BEGIN
  -- Determine if project is connected or disconnected
  is_connected := NEW.external_connection IS NOT NULL;
  
  -- Only trigger if external_connection actually changed
  IF (OLD.external_connection IS DISTINCT FROM NEW.external_connection) THEN
    -- Call the edge function to send webhook
    PERFORM
      net.http_post(
        url := 'https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/on-project-connection',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
          'project_id', NEW.id,
          'project_name', NEW.name,
          'connected', is_connected,
          'external_connection', NEW.external_connection,
          'timestamp', NOW()
        )::text
      );
  END IF;
  
  RETURN NEW;
END;
$$;