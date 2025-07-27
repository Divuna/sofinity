-- Create Emails table for AI generated emails
CREATE TABLE IF NOT EXISTS public."Emails" (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL,
  content text NOT NULL,
  recipient text,
  project text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public."Emails" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Emails
CREATE POLICY "Users can insert their own emails" 
ON public."Emails" 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own emails" 
ON public."Emails" 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own emails" 
ON public."Emails" 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_emails_updated_at
BEFORE UPDATE ON public."Emails"
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();