-- Add foreign key constraints to campaign_contacts table
ALTER TABLE public.campaign_contacts 
ADD CONSTRAINT fk_campaign_contacts_contact_id 
FOREIGN KEY (contact_id) REFERENCES public."Contacts"(id) ON DELETE CASCADE;

ALTER TABLE public.campaign_contacts 
ADD CONSTRAINT fk_campaign_contacts_campaign_id 
FOREIGN KEY (campaign_id) REFERENCES public."Campaigns"(id) ON DELETE CASCADE;