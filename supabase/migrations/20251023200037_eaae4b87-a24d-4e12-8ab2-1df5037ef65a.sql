-- Create AuditHistory table for tracking data integrity audit runs
CREATE TABLE IF NOT EXISTS public."AuditHistory" (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  summary_text TEXT,
  valid_ratio NUMERIC,
  total_tables INTEGER,
  created_by UUID REFERENCES auth.users(id),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public."AuditHistory" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for AuditHistory
CREATE POLICY "Users can view their own audit history"
  ON public."AuditHistory"
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own audit history"
  ON public."AuditHistory"
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Service role can manage audit history"
  ON public."AuditHistory"
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_audit_history_created_by ON public."AuditHistory"(created_by);
CREATE INDEX IF NOT EXISTS idx_audit_history_run_at ON public."AuditHistory"(run_at DESC);