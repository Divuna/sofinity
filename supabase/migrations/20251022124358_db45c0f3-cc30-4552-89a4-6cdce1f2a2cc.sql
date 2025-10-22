-- Create function to automatically create evaluator AI requests when campaign generator completes
CREATE OR REPLACE FUNCTION public.auto_create_evaluator_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only proceed if type is 'campaign_generator' and status changed to 'completed'
  IF NEW.type = 'campaign_generator' AND NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    
    -- Insert new evaluator AI request
    INSERT INTO public."AIRequests" (
      type,
      status,
      project_id,
      event_id,
      user_id,
      metadata,
      created_at
    ) VALUES (
      'evaluator',
      'waiting',
      NEW.project_id,
      NEW.event_id,
      NEW.user_id,
      jsonb_build_object(
        'auto_generated', true,
        'source', 'auto_evaluator',
        'parent_request_id', NEW.id
      ),
      now()
    );
    
    -- Log the auto-creation in EventLogs
    INSERT INTO public."EventLogs" (
      event_name,
      source_system,
      project_id,
      user_id,
      metadata,
      timestamp
    ) VALUES (
      'auto_evaluator_created',
      'sofinity',
      NEW.project_id,
      NEW.user_id,
      jsonb_build_object(
        'parent_request_id', NEW.id,
        'parent_type', NEW.type,
        'trigger_reason', 'campaign_generator_completed'
      ),
      now()
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on AIRequests table
DROP TRIGGER IF EXISTS trigger_auto_create_evaluator ON public."AIRequests";

CREATE TRIGGER trigger_auto_create_evaluator
AFTER UPDATE ON public."AIRequests"
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_evaluator_request();

-- Add comment for documentation
COMMENT ON FUNCTION public.auto_create_evaluator_request() IS 
'Automatically creates an evaluator AI request when a campaign_generator request is completed. Logs the creation in EventLogs.';
