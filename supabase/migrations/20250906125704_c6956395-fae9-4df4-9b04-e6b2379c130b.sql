-- Create trigger function for auto-filling user_id in CampaignSchedule table
CREATE OR REPLACE FUNCTION public.auto_fill_campaign_schedule_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Auto-fill user_id if missing during INSERT
    IF NEW.user_id IS NULL THEN
        NEW.user_id = auth.uid();
    END IF;
    
    -- Ensure user_id is never NULL after this point
    IF NEW.user_id IS NULL THEN
        RAISE EXCEPTION 'CampaignSchedule must have a valid user_id. Please ensure you are authenticated.';
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create trigger for CampaignSchedule table
CREATE TRIGGER auto_fill_campaign_schedule_user_id_trigger
    BEFORE INSERT ON public."CampaignSchedule"
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_fill_campaign_schedule_user_id();