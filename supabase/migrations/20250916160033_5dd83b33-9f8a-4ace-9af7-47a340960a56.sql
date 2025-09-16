-- Drop the existing view and recreate it properly
DROP VIEW IF EXISTS public.onemill_reporting CASCADE;

-- Create the reporting view correctly
CREATE VIEW public.onemill_reporting AS
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

-- Grant access to the view
GRANT SELECT ON public.onemill_reporting TO authenticated;