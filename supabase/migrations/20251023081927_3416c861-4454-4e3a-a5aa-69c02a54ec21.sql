-- Function to automatically create campaign from completed AI request
CREATE OR REPLACE FUNCTION public.auto_create_campaign_from_airequest()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  campaign_name TEXT;
  campaign_content TEXT;
BEGIN
  -- Only trigger for campaign_generator type that just completed
  IF NEW.type = 'campaign_generator' 
     AND NEW.status = 'completed' 
     AND (OLD.status IS NULL OR OLD.status != 'completed')
     AND NEW.response IS NOT NULL THEN
    
    -- Extract campaign name from prompt (first 100 chars) or use default
    campaign_name := COALESCE(
      SUBSTRING(NEW.prompt FROM 1 FOR 100),
      'AI Kampaň'
    );
    
    -- Use the AI response as campaign content
    campaign_content := NEW.response;
    
    -- Insert new campaign
    INSERT INTO public."Campaigns" (
      name,
      status,
      project_id,
      ai_request_id,
      user_id,
      email,
      created_at
    ) VALUES (
      campaign_name,
      'draft',
      NEW.project_id,
      NEW.id,
      NEW.user_id,
      campaign_content,
      now()
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_create_campaign_from_airequest ON public."AIRequests";

-- Create trigger on AIRequests
CREATE TRIGGER trigger_auto_create_campaign_from_airequest
  AFTER INSERT OR UPDATE OF status
  ON public."AIRequests"
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_campaign_from_airequest();