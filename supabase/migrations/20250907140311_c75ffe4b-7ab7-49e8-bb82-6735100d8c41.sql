-- Add unique constraint to campaign_contacts table to prevent duplicate entries
-- and enable ON CONFLICT DO NOTHING functionality
ALTER TABLE public.campaign_contacts 
ADD CONSTRAINT unique_campaign_contact 
UNIQUE (campaign_id, contact_id);

-- Add index for better performance on queries
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign_id 
ON public.campaign_contacts (campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_contacts_contact_id 
ON public.campaign_contacts (contact_id);