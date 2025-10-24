-- Phase 4 Fix: Exclude fallback project from find_or_create_user_project
CREATE OR REPLACE FUNCTION find_or_create_user_project(
  p_user_id UUID,
  p_source_system TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project_id UUID;
  v_project_name TEXT;
  v_fallback_project_id UUID := '00000000-0000-0000-0000-000000000999'::UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Try to find existing active project matching source_system (excluding fallback)
  IF p_source_system IS NOT NULL THEN
    SELECT id INTO v_project_id
    FROM public."Projects"
    WHERE user_id = p_user_id
      AND is_active = true
      AND id != v_fallback_project_id
      AND (
        LOWER(name) LIKE '%' || LOWER(p_source_system) || '%'
        OR LOWER(external_connection) = LOWER(p_source_system)
      )
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_project_id IS NOT NULL THEN
      RETURN v_project_id;
    END IF;
  END IF;

  -- Try to find any active project for the user (excluding fallback)
  SELECT id INTO v_project_id
  FROM public."Projects"
  WHERE user_id = p_user_id
    AND is_active = true
    AND id != v_fallback_project_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    RETURN v_project_id;
  END IF;

  -- Create new project based on source_system
  v_project_name := COALESCE(p_source_system, 'Default Project');
  
  INSERT INTO public."Projects" (user_id, name, description, is_active, external_connection)
  VALUES (
    p_user_id,
    v_project_name,
    'Auto-created during Phase 4 migration',
    true,
    p_source_system
  )
  RETURNING id INTO v_project_id;

  RETURN v_project_id;
END;
$$;

-- Now re-run migration for unmigrated records with valid user_id
DO $$
DECLARE
  v_processed INTEGER := 0;
  v_record RECORD;
  v_target_project_id UUID;
  v_source_system TEXT;
BEGIN
  RAISE NOTICE 'Re-running migration for previously unmigrated AIRequests...';

  FOR v_record IN
    SELECT id, user_id, metadata
    FROM public."AIRequests"
    WHERE project_id = '00000000-0000-0000-0000-000000000999'
      AND user_id IS NOT NULL
    ORDER BY created_at
  LOOP
    v_source_system := v_record.metadata->>'source_system';
    v_target_project_id := find_or_create_user_project(v_record.user_id, v_source_system);
    
    IF v_target_project_id IS NOT NULL AND v_target_project_id != '00000000-0000-0000-0000-000000000999'::UUID THEN
      UPDATE public."AIRequests"
      SET project_id = v_target_project_id
      WHERE id = v_record.id;
      
      INSERT INTO public."Phase4_MigrationLog" (table_name, record_id, old_project_id, new_project_id, source_system)
      VALUES ('AIRequests', v_record.id, '00000000-0000-0000-0000-000000000999', v_target_project_id, v_source_system);
      
      v_processed := v_processed + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'AIRequests re-migration complete: % additional records migrated', v_processed;
END $$;

DO $$
DECLARE
  v_processed INTEGER := 0;
  v_record RECORD;
  v_target_project_id UUID;
BEGIN
  RAISE NOTICE 'Re-running migration for previously unmigrated Campaigns...';

  FOR v_record IN
    SELECT c.id, c.user_id, c.ai_request_id
    FROM public."Campaigns" c
    WHERE c.project_id = '00000000-0000-0000-0000-000000000999'
      AND user_id IS NOT NULL
    ORDER BY c.created_at
  LOOP
    v_target_project_id := NULL;
    
    IF v_record.ai_request_id IS NOT NULL THEN
      SELECT project_id INTO v_target_project_id
      FROM public."AIRequests"
      WHERE id = v_record.ai_request_id
        AND project_id != '00000000-0000-0000-0000-000000000999';
    END IF;
    
    IF v_target_project_id IS NULL THEN
      v_target_project_id := find_or_create_user_project(v_record.user_id, NULL);
    END IF;
    
    IF v_target_project_id IS NOT NULL AND v_target_project_id != '00000000-0000-0000-0000-000000000999'::UUID THEN
      UPDATE public."Campaigns"
      SET project_id = v_target_project_id
      WHERE id = v_record.id;
      
      INSERT INTO public."Phase4_MigrationLog" (table_name, record_id, old_project_id, new_project_id)
      VALUES ('Campaigns', v_record.id, '00000000-0000-0000-0000-000000000999', v_target_project_id);
      
      v_processed := v_processed + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Campaigns re-migration complete: % additional records migrated', v_processed;
END $$;

-- Final verification
DO $$
DECLARE
  v_remaining_airequests INTEGER;
  v_remaining_campaigns INTEGER;
  v_remaining_emails INTEGER;
  v_remaining_notifications INTEGER;
  v_total_remaining INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_remaining_airequests
  FROM public."AIRequests"
  WHERE project_id = '00000000-0000-0000-0000-000000000999';

  SELECT COUNT(*) INTO v_remaining_campaigns
  FROM public."Campaigns"
  WHERE project_id = '00000000-0000-0000-0000-000000000999';

  SELECT COUNT(*) INTO v_remaining_emails
  FROM public."Emails"
  WHERE project_id = '00000000-0000-0000-0000-000000000999';

  SELECT COUNT(*) INTO v_remaining_notifications
  FROM public."Notifications"
  WHERE project_id = '00000000-0000-0000-0000-000000000999';

  v_total_remaining := v_remaining_airequests + v_remaining_campaigns + v_remaining_emails + v_remaining_notifications;

  RAISE NOTICE '=== PHASE 4 FINAL VERIFICATION ===';
  RAISE NOTICE 'Remaining in fallback project:';
  RAISE NOTICE '  AIRequests: %', v_remaining_airequests;
  RAISE NOTICE '  Campaigns: %', v_remaining_campaigns;
  RAISE NOTICE '  Emails: %', v_remaining_emails;
  RAISE NOTICE '  Notifications: %', v_remaining_notifications;
  RAISE NOTICE 'Total remaining: %', v_total_remaining;

  IF v_total_remaining = 0 THEN
    UPDATE public."Projects"
    SET is_active = false,
        description = 'DEPRECATED: Fallback project deactivated after Phase 4 migration on ' || now()::TEXT
    WHERE id = '00000000-0000-0000-0000-000000000999';
    
    RAISE NOTICE 'SUCCESS: All records migrated. Fallback project deactivated.';
  ELSIF v_total_remaining <= 350 THEN
    RAISE NOTICE 'PARTIAL: % records remain (likely NULL user_id, grandfathered from pre-Phase-3)', v_total_remaining;
  ELSE
    RAISE NOTICE 'REVIEW NEEDED: % records remain in fallback project', v_total_remaining;
  END IF;
END $$;