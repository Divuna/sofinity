-- Create table for webhook request tracking (idempotency and rate limiting)
CREATE TABLE IF NOT EXISTS public.webhook_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idempotency_key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  source_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(idempotency_key, endpoint)
);

-- Enable RLS on webhook_requests
ALTER TABLE public.webhook_requests ENABLE ROW LEVEL SECURITY;

-- Create policy allowing service role to manage webhook requests
CREATE POLICY "Service role can manage webhook requests"
ON public.webhook_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create index for timestamp-based queries (replay protection)
CREATE INDEX idx_webhook_requests_timestamp ON public.webhook_requests(timestamp);

-- Create index for rate limiting queries
CREATE INDEX idx_webhook_requests_endpoint_timestamp ON public.webhook_requests(endpoint, timestamp);

-- Create index for idempotency checks
CREATE INDEX idx_webhook_requests_idempotency ON public.webhook_requests(idempotency_key, endpoint);

-- Function to cleanup old webhook requests (older than 10 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.webhook_requests
  WHERE timestamp < now() - interval '10 minutes';
END;
$$;

COMMENT ON TABLE public.webhook_requests IS 'Tracks webhook requests for idempotency and rate limiting';
COMMENT ON FUNCTION public.cleanup_old_webhook_requests() IS 'Removes webhook request records older than 10 minutes';