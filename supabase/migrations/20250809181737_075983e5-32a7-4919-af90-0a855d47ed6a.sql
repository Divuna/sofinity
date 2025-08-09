-- Create offers table for Opravo integration
-- This table stores offer data from Opravo events with proper constraints and RLS policies

CREATE TABLE IF NOT EXISTS public.offers (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id uuid,
    repairer_id uuid,
    price numeric,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    project_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Users can view their own offers" 
ON public.offers 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.Projects p 
        WHERE p.id = offers.project_id AND p.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert offers for their projects" 
ON public.offers 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.Projects p 
        WHERE p.id = offers.project_id AND p.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update offers for their projects" 
ON public.offers 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.Projects p 
        WHERE p.id = offers.project_id AND p.user_id = auth.uid()
    )
);

-- Create unique index to prevent duplicates per project
CREATE UNIQUE INDEX IF NOT EXISTS offers_project_request_unique
ON public.offers(project_id, request_id) 
WHERE project_id IS NOT NULL AND request_id IS NOT NULL;

-- Create updated_at trigger
CREATE TRIGGER update_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();