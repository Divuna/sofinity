-- Step 1: Modify BOTH versions of find_or_create_user_project to STOP auto-creating projects

-- Version 1: Two parameters (target_user_id, fallback_project_id)
CREATE OR REPLACE FUNCTION public.find_or_create_user_project(target_user_id uuid, fallback_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_project_id uuid;
  fallback_id uuid := '00000000-0000-0000-0000-000000000999';
BEGIN
  SELECT id INTO result_project_id
  FROM public."Projects"
  WHERE user_id = target_user_id
    AND is_active = true
    AND id != fallback_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF result_project_id IS NOT NULL THEN
    RETURN result_project_id;
  END IF;

  -- NO AUTO-CREATE: Return NULL instead of creating "Default Project"
  RETURN NULL;
END;
$$;

-- Version 2: Two parameters (p_user_id, p_source_system)
CREATE OR REPLACE FUNCTION public.find_or_create_user_project(p_user_id uuid, p_source_system text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id UUID;
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

  -- NO AUTO-CREATE: Return NULL instead of creating "Default Project"
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.find_or_create_user_project(uuid, uuid) IS 
'Modified to NOT auto-create projects. Returns NULL if no active project exists.';

COMMENT ON FUNCTION public.find_or_create_user_project(uuid, text) IS 
'Modified to NOT auto-create projects. Returns NULL if no active project exists.';


-- Step 2: Rollback data from "Default Project" back to original project_id using Phase4_MigrationLog

-- Rollback AIRequests
UPDATE public."AIRequests" AS a
SET project_id = log.old_project_id
FROM public."Phase4_MigrationLog" AS log
JOIN public."Projects" AS p ON p.id = log.new_project_id
WHERE log.table_name = 'AIRequests'
  AND a.id = log.record_id
  AND (p.description ILIKE '%Phase 4%' OR p.name ILIKE 'Default Project%');

-- Rollback Campaigns
UPDATE public."Campaigns" AS c
SET project_id = log.old_project_id
FROM public."Phase4_MigrationLog" AS log
JOIN public."Projects" AS p ON p.id = log.new_project_id
WHERE log.table_name = 'Campaigns'
  AND c.id = log.record_id
  AND (p.description ILIKE '%Phase 4%' OR p.name ILIKE 'Default Project%');

-- Rollback Emails
UPDATE public."Emails" AS e
SET project_id = log.old_project_id
FROM public."Phase4_MigrationLog" AS log
JOIN public."Projects" AS p ON p.id = log.new_project_id
WHERE log.table_name = 'Emails'
  AND e.id = log.record_id
  AND (p.description ILIKE '%Phase 4%' OR p.name ILIKE 'Default Project%');

-- Rollback Notifications
UPDATE public."Notifications" AS n
SET project_id = log.old_project_id
FROM public."Phase4_MigrationLog" AS log
JOIN public."Projects" AS p ON p.id = log.new_project_id
WHERE log.table_name = 'Notifications'
  AND n.id = log.record_id
  AND (p.description ILIKE '%Phase 4%' OR p.name ILIKE 'Default Project%');


-- Step 3: Deactivate auto-created "Default Project" entries (keep for audit)
UPDATE public."Projects"
SET is_active = false
WHERE (description ILIKE '%Phase 4%' OR name ILIKE 'Default Project%')
  AND id != '00000000-0000-0000-0000-000000000999';  -- Never deactivate the fallback project
