-- Create function to trigger AI evaluation on new OneMil events
CREATE OR REPLACE FUNCTION public.trigger_ai_evaluation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger for specific OneMil event types
  IF NEW.event_name IN (
    'prize_won', 
    'coin_redeemed', 
    'voucher_purchased', 
    'user_registered', 
    'notification_sent', 
    'contest_closed'
  ) THEN
    -- Call the ai-evaluator edge function asynchronously
    PERFORM
      net.http_post(
        url := 'https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/ai-evaluator',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'event_id', NEW.id,
          'event_name', NEW.event_name,
          'metadata', NEW.metadata,
          'user_id', NEW.user_id,
          'project_id', NEW.project_id
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on EventLogs table
DROP TRIGGER IF EXISTS on_onemill_event_inserted ON public."EventLogs";

CREATE TRIGGER on_onemill_event_inserted
  AFTER INSERT ON public."EventLogs"
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_ai_evaluation();