-- Create trigger function to auto-insert into NotificationQueue for specific EventLogs
CREATE OR REPLACE FUNCTION public.auto_notify_from_eventlogs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger for specific event names
  IF NEW.event_name IN ('campaign_published', 'campaign_deleted') THEN
    -- Get user email for notification
    INSERT INTO public."NotificationQueue" (
      event_id,
      event_name,
      user_id,
      payload,
      status,
      created_at
    )
    VALUES (
      NEW.id,
      NEW.event_name,
      NEW.user_id,
      jsonb_build_object(
        'event_name', NEW.event_name,
        'project_id', NEW.project_id,
        'metadata', NEW.metadata,
        'timestamp', NEW.timestamp
      ),
      'pending',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on EventLogs
DROP TRIGGER IF EXISTS trigger_auto_notify_from_eventlogs ON public."EventLogs";
CREATE TRIGGER trigger_auto_notify_from_eventlogs
  AFTER INSERT ON public."EventLogs"
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_notify_from_eventlogs();