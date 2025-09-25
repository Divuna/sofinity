-- Create EmailMedia table for storing generated multimedia content
CREATE TABLE public."EmailMedia" (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  media_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  generation_prompt TEXT,
  generated_by_ai BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public."EmailMedia" ENABLE ROW LEVEL SECURITY;

-- Create policies for EmailMedia
CREATE POLICY "Users can view media for their own emails" 
ON public."EmailMedia" 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public."Emails" e 
  WHERE e.id = "EmailMedia".email_id AND e.user_id = auth.uid()
));

CREATE POLICY "Users can insert media for their own emails" 
ON public."EmailMedia" 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public."Emails" e 
  WHERE e.id = "EmailMedia".email_id AND e.user_id = auth.uid()
));

CREATE POLICY "Users can update media for their own emails" 
ON public."EmailMedia" 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public."Emails" e 
  WHERE e.id = "EmailMedia".email_id AND e.user_id = auth.uid()
));

CREATE POLICY "Users can delete media for their own emails" 
ON public."EmailMedia" 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public."Emails" e 
  WHERE e.id = "EmailMedia".email_id AND e.user_id = auth.uid()
));

-- Create storage bucket for email media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('email-media', 'email-media', true);

-- Create storage policies for email media
CREATE POLICY "Users can view email media" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'email-media');

CREATE POLICY "Users can upload email media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'email-media' AND 
  auth.uid() IS NOT NULL
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_emailmedia_updated_at
BEFORE UPDATE ON public."EmailMedia"
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();