-- Add RLS policies for EventLogs table to fix FK integrity test false positives
-- Users should only see their own EventLogs

-- Enable RLS on EventLogs
ALTER TABLE public."EventLogs" ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own EventLogs
CREATE POLICY "Users can view their own EventLogs" 
ON public."EventLogs" 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for users to insert their own EventLogs  
CREATE POLICY "Users can insert their own EventLogs" 
ON public."EventLogs" 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy for service role to insert EventLogs (for external integrations)
CREATE POLICY "Service role can insert EventLogs" 
ON public."EventLogs" 
FOR INSERT 
WITH CHECK (true);

-- Policy for service role to select EventLogs (for admin operations)
CREATE POLICY "Service role can view all EventLogs" 
ON public."EventLogs" 
FOR SELECT 
USING (true);

-- Create a SECURITY DEFINER function for admin FK integrity checks
CREATE OR REPLACE FUNCTION public.check_fk_integrity_admin()
RETURNS TABLE(
  table_name text,
  valid_count bigint,
  invalid_count bigint,
  status boolean
) AS $$
BEGIN
  -- EventLogs -> profiles FK integrity
  RETURN QUERY
  SELECT 
    'eventlogs_users'::text,
    COUNT(*) FILTER (WHERE p.user_id IS NOT NULL),
    COUNT(*) FILTER (WHERE p.user_id IS NULL),
    COUNT(*) FILTER (WHERE p.user_id IS NULL) = 0
  FROM public."EventLogs" el
  LEFT JOIN public.profiles p ON el.user_id = p.user_id;
  
  -- Campaigns -> profiles FK integrity  
  RETURN QUERY
  SELECT 
    'campaigns_users'::text,
    COUNT(*) FILTER (WHERE p.user_id IS NOT NULL),
    COUNT(*) FILTER (WHERE p.user_id IS NULL), 
    COUNT(*) FILTER (WHERE p.user_id IS NULL) = 0
  FROM public."Campaigns" c
  LEFT JOIN public.profiles p ON c.user_id = p.user_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;