-- Test function for OneMil → Sofinity player sync
CREATE OR REPLACE FUNCTION public.test_onemil_player_sync(
  test_email TEXT DEFAULT 'veru.enge@gmail.com',
  test_player_id TEXT DEFAULT '033c7a06-bba8-47b7-b214-0699b434a6b8',
  test_device_type TEXT DEFAULT 'web'
)
RETURNS TABLE(
  method TEXT,
  status_code INTEGER,
  response_body TEXT,
  headers TEXT,
  test_timestamp TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_service_key TEXT;
  v_response RECORD;
  v_has_pg_net BOOLEAN;
  v_has_http BOOLEAN;
  v_url TEXT := 'https://million-ticket-draw.functions.supabase.co/sofinity-player-sync';
  v_body JSONB;
BEGIN
  -- Get service role key from environment
  v_service_key := current_setting('app.settings.service_role_key', true);
  
  IF v_service_key IS NULL THEN
    RAISE EXCEPTION '❌ SERVICE_ROLE_KEY není nastavený v app.settings.service_role_key';
  END IF;

  -- Build request body
  v_body := jsonb_build_object(
    'email', test_email,
    'player_id', test_player_id,
    'device_type', test_device_type
  );

  -- Detect available HTTP extensions
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
  ) INTO v_has_pg_net;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'http'
  ) INTO v_has_http;

  -- Log test attempt
  INSERT INTO public.audit_logs (
    event_name,
    event_data,
    created_at
  ) VALUES (
    'onemil_player_sync_test',
    jsonb_build_object(
      'email', test_email,
      'player_id', test_player_id,
      'device_type', test_device_type,
      'url', v_url,
      'pg_net_available', v_has_pg_net,
      'http_available', v_has_http
    ),
    now()
  );

  -- Use pg_net if available (preferred)
  IF v_has_pg_net THEN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := v_body
    );
    
    -- pg_net is async, so we can't get immediate response
    RETURN QUERY SELECT 
      'pg_net (async)'::TEXT,
      NULL::INTEGER,
      '✅ Request odeslán asynchronně přes pg_net. Zkontroluj audit_logs v OneMil projektu.'::TEXT,
      jsonb_pretty(jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer [HIDDEN]'
      ))::TEXT,
      now();
    
  -- Fallback to http extension if available
  ELSIF v_has_http THEN
    SELECT 
      status,
      content::TEXT
    INTO v_response
    FROM http((
      'POST',
      v_url,
      ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer ' || v_service_key)
      ],
      'application/json',
      v_body::TEXT
    )::http_request);
    
    RETURN QUERY SELECT 
      'http (sync)'::TEXT,
      v_response.status,
      v_response.content,
      'Authorization: Bearer [HIDDEN], Content-Type: application/json'::TEXT,
      now();
      
  ELSE
    RAISE EXCEPTION '❌ Žádná HTTP extension není dostupná (ani pg_net, ani http)';
  END IF;

END;
$function$;

COMMENT ON FUNCTION public.test_onemil_player_sync IS 'Testovací funkce pro ověření OneMil → Sofinity player sync. Automaticky detekuje dostupné HTTP extension (pg_net nebo http) a odešle test request.';
