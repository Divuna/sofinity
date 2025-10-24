-- Phase 1: Database Function Validation
-- Add strict project_id validation to prevent orphaned records

-- Fix 1: Update fn_eventlogs_to_airequests() to require valid project_id
CREATE OR REPLACE FUNCTION public.fn_eventlogs_to_airequests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  req_type text;
  default_prompt text;
BEGIN
  -- ✅ VALIDATION: Require valid project_id
  IF NEW.project_id IS NULL THEN
    RAISE EXCEPTION 'EventLogs must have valid project_id before creating AIRequest (EventLog ID: %)', NEW.id
      USING HINT = 'Ensure project_id is set in EventLogs before this trigger fires';
  END IF;

  -- Determine AIRequest type based on event
  CASE NEW.event_name
    WHEN 'voucher_redeemed' THEN 
      req_type := 'campaign_generator';
      default_prompt := 'Vygeneruj marketingovou kampaň na základě uplatnění voucheru.';
    WHEN 'contest_joined' THEN 
      req_type := 'evaluator';
      default_prompt := 'Vyhodnoť účast v soutěži a navrhni další kroky.';
    WHEN 'bonus_awarded' THEN 
      req_type := 'autoresponder';
      default_prompt := 'Vytvoř automatickou odpověď pro udělení bonusu.';
    ELSE 
      req_type := 'event_forward';
      default_prompt := CONCAT('Zpracuj událost: ', NEW.event_name);
  END CASE;

  -- Insert new AIRequest with validated project_id
  INSERT INTO public."AIRequests"(
    event_id, 
    type, 
    status, 
    created_at, 
    user_id, 
    project_id,
    prompt
  )
  VALUES (
    NEW.id, 
    req_type, 
    'waiting', 
    now(), 
    NEW.user_id, 
    NEW.project_id,
    default_prompt
  );

  RETURN NEW;
END;
$function$;

-- Fix 2: Update auto_create_evaluator_request() to validate project_id
CREATE OR REPLACE FUNCTION public.auto_create_evaluator_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  created_event_id uuid;
  evaluator_id uuid;
  evaluation_prompt text;
BEGIN
  IF NEW.type = 'campaign_generator'
     AND NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed') THEN

    -- ✅ VALIDATION: Require valid project_id
    IF NEW.project_id IS NULL THEN
      RAISE EXCEPTION 'Cannot create evaluator request: parent AIRequest has NULL project_id (AIRequest ID: %)', NEW.id
        USING HINT = 'Ensure AIRequests have valid project_id before completion';
    END IF;

    -- Create prompt for evaluator
    evaluation_prompt := CONCAT(
      'Vyhodnoť úspěšnost vygenerované kampaně. Původní požadavek: ',
      COALESCE(SUBSTRING(NEW.prompt, 1, 200), 'Neznámý prompt')
    );

    -- Create EventLog with validated project_id
    INSERT INTO public."EventLogs" (
      event_name, 
      source_system, 
      project_id, 
      user_id, 
      metadata, 
      timestamp
    )
    VALUES (
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
    )
    RETURNING id INTO created_event_id;

    -- Create AIRequest with validated project_id
    INSERT INTO public."AIRequests" (
      type, 
      status, 
      project_id, 
      event_id, 
      user_id, 
      event_name, 
      metadata, 
      created_at,
      prompt
    )
    VALUES (
      'evaluator',
      'waiting',
      NEW.project_id,
      created_event_id,
      NEW.user_id,
      COALESCE(NEW.event_name, 'auto_evaluator_created'),
      jsonb_build_object(
        'auto_generated', true,
        'source', 'auto_evaluator',
        'parent_request_id', NEW.id
      ),
      now(),
      evaluation_prompt
    )
    RETURNING id INTO evaluator_id;

    -- Update EventLog with evaluator request ID
    UPDATE public."EventLogs"
    SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{evaluator_request_id}',
        to_jsonb(evaluator_id),
        true
    )
    WHERE id = created_event_id;

  END IF;
  RETURN NEW;
END;
$function$;

-- Fix 3: Update auto_create_campaign_from_airequest() to validate project_id
CREATE OR REPLACE FUNCTION public.auto_create_campaign_from_airequest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  campaign_name TEXT;
  campaign_content TEXT;
  new_campaign_id UUID;
BEGIN
  IF NEW.type = 'campaign_generator' 
     AND NEW.status = 'completed' 
     AND (OLD.status IS NULL OR OLD.status != 'completed')
     AND NEW.response IS NOT NULL THEN

    -- ✅ VALIDATION: Require valid project_id
    IF NEW.project_id IS NULL THEN
      RAISE WARNING 'Cannot auto-create campaign: AIRequest % has NULL project_id. Skipping campaign creation.', NEW.id;
      RETURN NEW;  -- Don't fail, just skip campaign creation to prevent cascade failures
    END IF;

    campaign_name := COALESCE(SUBSTRING(NEW.prompt FROM 1 FOR 100), 'AI Kampaň');
    campaign_content := NEW.response;

    -- Create Campaign with validated project_id
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
    )
    RETURNING id INTO new_campaign_id;

    -- Log campaign creation to EventLogs
    INSERT INTO public."EventLogs" (
      project_id, 
      user_id, 
      event_name, 
      metadata, 
      timestamp
    ) VALUES (
      NEW.project_id,
      NEW.user_id,
      'campaign_auto_created',
      jsonb_build_object(
        'campaign_id', new_campaign_id,
        'ai_request_id', NEW.id,
        'campaign_name', campaign_name
      ),
      now()
    );

  END IF;

  RETURN NEW;
END;
$function$;