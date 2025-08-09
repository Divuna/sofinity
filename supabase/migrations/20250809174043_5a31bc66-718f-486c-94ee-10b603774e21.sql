-- Add missing columns to Contacts table for Opravo integration
ALTER TABLE public.Contacts 
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS role text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.Projects(id);

-- Create unique constraint on email per user to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS contacts_user_email_unique 
ON public.Contacts(user_id, email);

-- Update RLS policies to ensure proper access control for authenticated users
DROP POLICY IF EXISTS "Users can insert their own contacts" ON public.Contacts;
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.Contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.Contacts;

CREATE POLICY "Users can insert their own contacts" 
ON public.Contacts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own contacts" 
ON public.Contacts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" 
ON public.Contacts 
FOR UPDATE 
USING (auth.uid() = user_id);