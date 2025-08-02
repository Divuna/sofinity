-- Create table for tracking external integrations
CREATE TABLE public.external_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  external_system TEXT NOT NULL, -- 'opravo', 'other'
  external_user_id TEXT,
  external_email TEXT,
  mapping_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_integrations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own integrations" 
ON public.external_integrations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integrations" 
ON public.external_integrations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations" 
ON public.external_integrations 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_external_integrations_external_email ON public.external_integrations(external_email);
CREATE INDEX idx_external_integrations_system_user ON public.external_integrations(external_system, external_user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_external_integrations_updated_at
BEFORE UPDATE ON public.external_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();