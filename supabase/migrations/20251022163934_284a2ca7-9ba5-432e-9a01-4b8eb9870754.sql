-- Add ai_request_id to Campaigns table to link back to AIRequests
ALTER TABLE public."Campaigns"
ADD COLUMN ai_request_id uuid REFERENCES public."AIRequests"(id);

-- Add index for faster lookups
CREATE INDEX idx_campaigns_ai_request_id ON public."Campaigns"(ai_request_id);