-- Phase 4 Security Fix: Enable RLS and fix function search_path

-- Fix 1: Update find_or_create_user_project function with proper search_path
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
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_source_system IS NOT NULL THEN
    SELECT id INTO v_project_id
    FROM public."Projects"
    WHERE user_id = p_user_id
      AND is_active = true
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

  SELECT id INTO v_project_id
  FROM public."Projects"
  WHERE user_id = p_user_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    RETURN v_project_id;
  END IF;

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

-- Fix 2: Enable RLS on Phase4_MigrationLog table
ALTER TABLE public."Phase4_MigrationLog" ENABLE ROW LEVEL SECURITY;

-- Fix 3: Add RLS policies for Phase4_MigrationLog
-- Only service role and authenticated users can view migration logs
CREATE POLICY "Service role can manage Phase4_MigrationLog"
ON public."Phase4_MigrationLog"
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can view Phase4_MigrationLog"
ON public."Phase4_MigrationLog"
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add helpful comment
COMMENT ON TABLE public."Phase4_MigrationLog" 
IS 'Tracks migration of records from Sofinity System fallback project to user projects during Phase 4 cleanup';