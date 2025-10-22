-- ============================================
-- Oprava triggerů: Zajistit, že všechny AIRequests mají prompt
-- ============================================

-- 1. Opravit fn_eventlogs_to_airequests - přidat výchozí prompt
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

  -- Insert new AIRequest with prompt
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

-- 2. Opravit auto_create_evaluator_request - přidat prompt
CREATE OR REPLACE FUNCTION public.auto_create_evaluator_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  created_event_id uuid;
  evaluator_id uuid;
  evt_project_id uuid := COALESCE(NEW.project_id, '00000000-0000-0000-0000-000000000001'::uuid);
  evaluation_prompt text;
BEGIN
  IF NEW.type = 'campaign_generator'
     AND NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed') THEN

    -- Vytvořit prompt pro evaluátor
    evaluation_prompt := CONCAT(
      'Vyhodnoť úspěšnost vygenerované kampaně. Původní požadavek: ',
      COALESCE(SUBSTRING(NEW.prompt, 1, 200), 'Neznámý prompt')
    );

    INSERT INTO public."EventLogs" (
      event_name, source_system, project_id, user_id, metadata, timestamp
    )
    VALUES (
      'auto_evaluator_created',
      'sofinity',
      evt_project_id,
      NEW.user_id,
      jsonb_build_object(
        'parent_request_id', NEW.id,
        'parent_type', NEW.type,
        'trigger_reason', 'campaign_generator_completed'
      ),
      now()
    )
    RETURNING id INTO created_event_id;

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