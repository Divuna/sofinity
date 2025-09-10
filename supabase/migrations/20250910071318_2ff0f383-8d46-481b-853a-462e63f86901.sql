-- Enable RLS on EmailEvents table which was missing RLS
ALTER TABLE public."EmailEvents" ENABLE ROW LEVEL SECURITY;

-- Create policies for EmailEvents table to allow users to view events for their emails
CREATE POLICY "Users can view events for their own emails" 
ON public."EmailEvents" 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public."Emails" e 
  WHERE e.id = "EmailEvents".email_id 
  AND e.user_id = auth.uid()
));