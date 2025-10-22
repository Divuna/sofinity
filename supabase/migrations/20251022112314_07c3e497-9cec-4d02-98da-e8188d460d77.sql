-- Fix duplicate triggers on EventLogs table
-- Remove old problematic trigger that doesn't populate the 'type' field
DROP TRIGGER IF EXISTS eventlogs_to_airequests_trigger ON public."EventLogs";

-- Remove old function that caused null constraint violations
DROP FUNCTION IF EXISTS public.eventlogs_to_airequests();

-- Keep the correct trigger (trg_eventlogs_to_airequests) and its function
-- Update fn_eventlogs_to_airequests to add security hardening
CREATE OR REPLACE FUNCTION public.fn_eventlogs_to_airequests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  req_type text;
BEGIN
  -- Determine AIRequest type based on event
  CASE NEW.event_name
    WHEN 'voucher_redeemed' THEN req_type := 'campaign_generator';
    WHEN 'contest_joined' THEN req_type := 'evaluator';
    WHEN 'bonus_awarded' THEN req_type := 'autoresponder';
    ELSE req_type := 'event_forward';
  END CASE;

  -- Insert new AIRequest with all required fields
  INSERT INTO public."AIRequests"(event_id, type, status, created_at, user_id, project_id)
  VALUES (NEW.id, req_type, 'waiting', now(), NEW.user_id, NEW.project_id);

  RETURN NEW;
END;
$function$;