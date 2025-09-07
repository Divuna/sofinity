-- Create campaign_contacts join table for many-to-many relationship
CREATE TABLE public.campaign_contacts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL,
    contact_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    user_id UUID NOT NULL DEFAULT auth.uid(),
    UNIQUE(campaign_id, contact_id)
);

-- Enable Row Level Security
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own campaign contacts" 
ON public.campaign_contacts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaign contacts" 
ON public.campaign_contacts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaign contacts" 
ON public.campaign_contacts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaign contacts" 
ON public.campaign_contacts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic user_id filling
CREATE TRIGGER auto_fill_campaign_contacts_user_id
BEFORE INSERT ON public.campaign_contacts
FOR EACH ROW
EXECUTE FUNCTION public.auto_fill_campaign_schedule_user_id();