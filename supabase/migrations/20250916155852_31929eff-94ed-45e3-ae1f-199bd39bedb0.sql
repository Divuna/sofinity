-- Fix security definer view issue by recreating the view without security definer
-- and adding proper RLS policies instead
DROP VIEW IF EXISTS public.onemill_reporting;

-- Create the reporting view without security definer
CREATE VIEW public.onemill_reporting 
SECURITY INVOKER AS
SELECT 
  al.id,
  al.event_name,
  al.event_data,
  al.created_at,
  p.name as project_name,
  p.id as project_id
FROM public.audit_logs al
JOIN public."Projects" p ON al.project_id = p.id
WHERE p.name = 'OneMil' OR p.external_connection = 'onemill';

-- Create RLS policy for the view access (users can only see their own project data)
CREATE POLICY "Users can view OneMil reporting for their projects"
ON public.audit_logs
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM public."Projects" 
    WHERE id = audit_logs.project_id
  )
);