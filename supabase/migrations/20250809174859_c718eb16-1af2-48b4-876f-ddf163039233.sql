-- Fix search_path security warning for the trigger function
CREATE OR REPLACE FUNCTION auto_fill_project_user_id()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
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