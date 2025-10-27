-- Update trigger to use NotificationQueue instead of http_post
CREATE OR REPLACE FUNCTION public.trigger_send_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert into queue instead of calling http_post
  INSERT INTO public."NotificationQueue" (
    event_name,
    user_id,
    payload,
    target_email,
    status
  )
  VALUES (
    'notification_created',
    NEW.user_id,
    jsonb_build_object(
      'notification_id', NEW.id,
      'source_app', 'sofinity',
      'type', NEW.type,
      'title', NEW.title,
      'message', NEW.message
    ),
    (SELECT email FROM public.profiles WHERE user_id = NEW.user_id),
    'pending'
  );
  
  RETURN NEW;
END;
$$;

-- Create notification stats view for monitoring
CREATE OR REPLACE VIEW notification_stats AS
SELECT 
  DATE(created_at) as date,
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE status = 'sent') * 100.0 / NULLIF(COUNT(*), 0) as success_rate
FROM public."NotificationQueue"
GROUP BY DATE(created_at), status
ORDER BY date DESC;