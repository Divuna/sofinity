-- Create audit_logs table for tracking integration events
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES public."Projects"(id),
  event_name TEXT NOT NULL,
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit_logs
CREATE POLICY "Users can view their own audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON public.audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_name ON public.audit_logs(event_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Create reporting view for OneMil integration
CREATE OR REPLACE VIEW public.onemill_reporting AS
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