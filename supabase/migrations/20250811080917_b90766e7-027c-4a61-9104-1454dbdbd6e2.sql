-- Fix all remaining functions to have proper search_path set

-- Update all existing functions to use proper security definer with search path

-- Fix update_user_preferences_updated_at function
CREATE OR REPLACE FUNCTION public.update_user_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Fix auto_fill_project_user_id function  
CREATE OR REPLACE FUNCTION public.auto_fill_project_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Auto-fill user_id if missing during INSERT
    IF NEW.user_id IS NULL THEN
        NEW.user_id = auth.uid();
    END IF;
    
    -- Ensure user_id is never NULL after this point
    IF NEW.user_id IS NULL THEN
        RAISE EXCEPTION 'Projects must have a valid user_id. Please ensure you are authenticated.';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Fix handle_project_connection_change function
CREATE OR REPLACE FUNCTION public.handle_project_connection_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Nový uživatel'),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'team_lead')
  );
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;