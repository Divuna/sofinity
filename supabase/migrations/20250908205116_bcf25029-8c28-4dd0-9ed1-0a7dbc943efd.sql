-- Add external_request_id columns to handle text-based Opravo IDs
-- while keeping request_id as UUID for internal consistency

ALTER TABLE public.opravojobs 
ADD COLUMN external_request_id TEXT;

ALTER TABLE public.offers 
ADD COLUMN external_request_id TEXT;

-- Create indexes on external_request_id for better query performance
CREATE INDEX idx_opravojobs_external_request_id ON public.opravojobs(external_request_id);
CREATE INDEX idx_offers_external_request_id ON public.offers(external_request_id);

-- RLS policies for external_request_id (same as existing policies)
-- No additional policies needed as external_request_id follows same user ownership pattern

-- Comments for documentation
COMMENT ON COLUMN public.opravojobs.external_request_id IS 'Original Opravo request ID (may be text-based)';
COMMENT ON COLUMN public.offers.external_request_id IS 'Original Opravo request ID (may be text-based)';