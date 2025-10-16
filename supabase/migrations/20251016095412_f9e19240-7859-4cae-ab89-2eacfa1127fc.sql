-- Update trigger function for correct event type mapping
CREATE OR REPLACE FUNCTION public.eventlogs_to_airequests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ai_id uuid;
    v_request_type text;
BEGIN
    -- Map event names to AIRequest types
    v_request_type := CASE 
        WHEN NEW.event_name = 'voucher_redeemed' THEN 'campaign_generator'
        WHEN NEW.event_name = 'contest_joined' THEN 'evaluator'
        WHEN NEW.event_name = 'bonus_awarded' THEN 'autoresponder'
        ELSE 'event_forward'
    END;

    -- Insert into AIRequests with mapped type
    INSERT INTO public."AIRequests" (
        id, 
        user_id, 
        project_id, 
        type, 
        event_name, 
        metadata, 
        prompt, 
        status, 
        created_at
    )
    VALUES (
        gen_random_uuid(),
        NEW.user_id,
        NEW.project_id,
        v_request_type,
        NEW.event_name,
        NEW.metadata,
        CONCAT(
            'Event: ', COALESCE(NEW.event_name, '<NULL>'),
            ' | Type: ', v_request_type,
            ' | Metadata: ', COALESCE(NEW.metadata::text, '<NULL>')
        ),
        'waiting',
        NOW()
    )
    RETURNING id INTO v_ai_id;

    RETURN NEW;
END;
$$;

-- Ensure trigger is active
DROP TRIGGER IF EXISTS eventlogs_to_airequests_trigger ON public."EventLogs";
CREATE TRIGGER eventlogs_to_airequests_trigger
    AFTER INSERT ON public."EventLogs"
    FOR EACH ROW
    EXECUTE FUNCTION public.eventlogs_to_airequests();