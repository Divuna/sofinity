-- Create table for nonce tracking (replay attack prevention)
CREATE TABLE IF NOT EXISTS public.cron_request_nonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce TEXT NOT NULL UNIQUE,
  timestamp TIMESTAMPTZ NOT NULL,
  function_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cron_request_nonces ENABLE ROW LEVEL SECURITY;

-- Service role can manage all nonces
CREATE POLICY "Service role can manage nonces"
  ON public.cron_request_nonces
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for efficient nonce lookups
CREATE INDEX IF NOT EXISTS idx_cron_nonces_lookup 
  ON public.cron_request_nonces(nonce, timestamp);

-- Create function to cleanup old nonces (older than 10 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_old_nonces()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.cron_request_nonces
  WHERE timestamp < now() - interval '10 minutes';
END;
$$;

-- Log security migration
INSERT INTO public.audit_logs (event_name, event_data)
VALUES (
  'security_migration_cron_hardening',
  jsonb_build_object(
    'description', 'Added nonce tracking for replay attack prevention',
    'timestamp', now()
  )
);